/* =========================================================
   Calzada Compra — búsqueda semántica en el navegador
   ---------------------------------------------------------
   Esto es el "Nivel 4" del buscador: en vez de necesitar que
   cada palabra que un vecino escriba ya esté cargada a mano
   (en los tags de comercios.json o en el mini-tesauro de
   site.js), un modelo de embeddings entiende el significado
   de la consulta y la compara contra el significado de cada
   comercio. Así "remera" encuentra comercios de "ropa" aunque
   la palabra "remera" no esté escrita en ningún lado.

   Corre 100% en el navegador de quien visita el sitio, sin
   backend ni API key ni costo por búsqueda:
   - El modelo (Xenova/paraphrase-multilingual-MiniLM-L12-v2,
     una versión del modelo multilingüe MiniLM convertida para
     correr en el navegador) se descarga UNA VEZ desde la CDN
     pública de Hugging Face, la primera vez que alguien entra
     a la vidriera digital, y el propio navegador lo guarda en
     caché (IndexedDB) para las próximas visitas.
   - Esa descarga pesa unos cuantos MB y tarda unos segundos la
     primera vez (después es instantáneo). No se guarda en el
     hosting de la Cámara: lo sirve Hugging Face.
   - Si por lo que sea el modelo no llega a cargar (sin
     conexión la primera vez, la CDN bloqueada, etc.), el sitio
     no se rompe: site.js vuelve a usar el buscador anterior
     (TF-IDF + sinónimos) como respaldo automático.

   Este archivo se carga como <script type="module"> porque la
   librería que lo hace posible (@xenova/transformers) se
   distribuye como módulo ES. Expone su función a través de
   window.Semantic para que site.js (que es un script clásico)
   la pueda usar.
   ========================================================= */

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// No hay modelos propios para servir desde este hosting: todo se
// descarga de la CDN pública de Hugging Face.
env.allowLocalModels = false;

const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

let extractor = null;
let catalogEmbeddings = null; // Float32Array[], mismo orden que window.BUSINESSES
let loadingPromise = null;

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

// El mismo criterio que usa buildIndex() en site.js para armar el
// texto de cada comercio, así el motor semántico "ve" lo mismo que
// el motor de palabras clave.
function businessText(b) {
  const rubro = (window.RUBROS || []).find(r => r.key === b.rubro);
  const rubroLabel = rubro ? rubro.label : b.rubro;
  return [b.name, b.desc, rubroLabel, (b.tags || []).join(', ')].join('. ');
}

async function embed(text) {
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return output.data;
}

function setStatus(status) {
  window.dispatchEvent(new CustomEvent('calzada:semantic-status', { detail: status }));
}

async function ensureReady() {
  if (catalogEmbeddings) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    setStatus('loading');
    extractor = await pipeline('feature-extraction', MODEL_NAME);

    const businesses = window.BUSINESSES || [];
    const vectors = [];
    for (const b of businesses) {
      vectors.push(await embed(businessText(b)));
    }
    catalogEmbeddings = vectors;
    setStatus('ready');
    return true;
  })().catch(err => {
    console.warn('No se pudo cargar el buscador semántico — se usa el buscador por palabras clave como respaldo.', err);
    setStatus('unavailable');
    loadingPromise = null;
    return false;
  });

  return loadingPromise;
}

async function semanticScores(query) {
  const ok = await ensureReady();
  if (!ok || !catalogEmbeddings) return null;
  const qVec = await embed(query);
  return catalogEmbeddings.map(v => cosineSim(qVec, v));
}

window.Semantic = {
  ensureReady,
  semanticScores,
  isReady: () => !!catalogEmbeddings
};

// Precalienta el modelo y los embeddings del catálogo en segundo plano
// apenas BUSINESSES está disponible, para que cuando la persona
// realmente escriba una búsqueda ya esté (o esté por estar) listo.
function warmUpWhenReady() {
  if (window.BUSINESSES && window.BUSINESSES.length && document.getElementById('cardsGrid')) {
    ensureReady();
  }
}
window.addEventListener('calzada:businesses-loaded', warmUpWhenReady);
// por si el catálogo ya se cargó antes de que este módulo terminara de evaluarse
warmUpWhenReady();
