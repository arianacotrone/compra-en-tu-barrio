/* =========================================================
   Calzada Compra — lógica del sitio
   Incluye un motor de búsqueda con procesamiento de lenguaje:
   normalización + stemming + expansión de sinónimos + TF-IDF
   y similitud de coseno, 100% en el navegador (sin backend).
   ========================================================= */

const RUBROS = [
  { key: 'minorista', label: 'Minorista / Almacén' },
  { key: 'mayorista', label: 'Mayorista' },
  { key: 'retaceria', label: 'Retacería / Telas' },
  { key: 'carniceria', label: 'Carnicería' },
  { key: 'ropa', label: 'Ropa e indumentaria' },
  { key: 'carpinteria', label: 'Carpintería' },
  { key: 'optica', label: 'Oftalmología / Óptica' },
  { key: 'abogados', label: 'Abogados' },
  { key: 'electricista', label: 'Electricista' },
  { key: 'ferreteria', label: 'Ferretería / Bazar' }
];

const ICONS = {
  minorista: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 12H5z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
  mayorista: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M3 9v7l9 5 9-5V9"/><path d="M12 14v7"/></svg>',
  retaceria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="6" r="3"/><circle cx="17" cy="18" r="3"/><path d="M9.5 7.5 20 18"/><path d="M14.5 16.5 4 6"/></svg>',
  carniceria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a6 6 0 0 0-6 6c0 2 1 3 1 3l-8 8 2 2 8-8s1 1 3 1a6 6 0 0 0 0-12z"/></svg>',
  ropa: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3a3 3 0 0 1-6 0z"/></svg>',
  carpinteria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5 18 3l3 3-3.5 3.5"/><path d="M3 21l7-7"/><path d="M12.5 8.5 21 17l-4 4-8.5-8.5"/></svg>',
  optica: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="15.5" r="3.5"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M10 15.5h4M3 15.5 5 7h3M21 15.5 19 7h-3"/></svg>',
  abogados: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M4 8l4-2 4 2-4 8H4l4-8zM16 8l4-2 4 2-4 8h-4l4-8zM6 19h12M12 6v13"/></svg>',
  electricista: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  ferreteria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2-2z"/></svg>'
};

const ACCENTS = ['#15335c', '#c98a1e', '#2f5488', '#eea52a', '#5c6773', '#0b2038', '#8a6a2c', '#3d6d9e'];

const SUGGESTIONS = [
  'se me cortó la luz', 'carne para el asado', 'un regalo para mi mamá', 'anteojos nuevos',
  'ropa de invierno', 'mueble a medida', 'un juicio de tránsito', 'comprar por mayor'
];

let BUSINESSES = [];   // se carga desde assets/data/comercios.json
let DOC_INDEX = [];    // vectores TF-IDF, uno por comercio (mismo orden que BUSINESSES)
let IDF = new Map();   // idf por término, calculado sobre todo el catálogo

/* ============================================================
   1) NORMALIZACIÓN, STOPWORDS Y STEMMER LIVIANO EN ESPAÑOL
   ============================================================ */

const STOPWORDS = new Set([
  'de','la','el','en','un','una','unos','unas','para','con','que','se','me','mi','por','los','las',
  'del','al','y','o','a','lo','le','les','su','sus','es','soy','tengo','estoy','esta','este','esa',
  'ese','como','muy','mas','más','pero','sin','sobre','entre','ya','no','si','sí','donde','cual',
  'quien','todo','toda','todos','todas','hay','ser','fue','son','hace','desde'
]);

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function norm(s) {
  return stripAccents(String(s).toLowerCase());
}

function tokenize(text) {
  return norm(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

// Stemmer de sufijos para español — no es un stemmer académico completo,
// pero alcanza para emparentar variantes frecuentes (singular/plural,
// sustantivo/adjetivo, "-ería", "-idad", "-mente", etc.) sin diccionario.
const SUFFIXES = [
  'aciones', 'amiento', 'imiento', 'adores', 'idades', 'ancia', 'encia',
  'mente', 'ativo', 'itivo', 'ico', 'ica', 'idad', 'eria', 'dora', 'dor',
  'ista', 'anza', 'oso', 'osa'
];
function stem(word) {
  let w = word;
  if (w.length > 6) {
    for (const suf of SUFFIXES) {
      if (w.endsWith(suf) && w.length - suf.length >= 3) { w = w.slice(0, -suf.length); break; }
    }
  }
  if (w.length > 4 && /(os|as|es)$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s')) w = w.slice(0, -1);
  return w;
}

function stemmedTokens(text) {
  return tokenize(text).filter(w => !STOPWORDS.has(w)).map(stem);
}

/* ============================================================
   2) EXPANSIÓN DE SINÓNIMOS (mini-tesauro por concepto)
   Cada grupo son palabras que, para este catálogo, significan
   "lo mismo" a fines de búsqueda. Se guardan ya stemmizadas.
   ============================================================ */
const SYNONYM_GROUPS_RAW = [
  ['luz', 'corte', 'cortocircuito', 'electricidad', 'instalacion electrica', 'tablero', 'enchufe', 'electricista'],
  ['carne', 'asado', 'milanesa', 'achuras', 'vacio', 'parrilla', 'pollo', 'cerdo', 'carniceria'],
  ['anteojos', 'lentes', 'vista', 'optica', 'armazon', 'oftalmologo', 'ojos'],
  ['abogado', 'abogada', 'legal', 'multa', 'juicio', 'divorcio', 'herencia', 'sucesion', 'tramite', 'derecho'],
  ['mueble', 'madera', 'placard', 'carpintero', 'carpinteria', 'melamina', 'ebanisteria'],
  ['tela', 'costura', 'retazo', 'merceria', 'hilo', 'tapiceria', 'cortina'],
  ['mayorista', 'distribuidora', 'por mayor', 'reventa', 'mayoreo'],
  ['ropa', 'indumentaria', 'vestimenta', 'moda', 'vestido', 'talles', 'uniforme', 'guardapolvo'],
  ['ferreteria', 'herramienta', 'tornillo', 'bazar', 'pintura', 'cerrajeria'],
  ['almacen', 'kiosco', 'despensa', 'autoservicio', 'fiambre', 'golosinas', 'verduleria'],
  ['regalo', 'regaleria', 'obsequio']
];
// pre-stemizamos cada grupo una sola vez
const SYNONYM_GROUPS = SYNONYM_GROUPS_RAW.map(group =>
  [...new Set(group.flatMap(phrase => stemmedTokens(phrase)))]
);
// índice inverso: stem -> índice de su grupo, para expandir rápido
const SYNONYM_INDEX = new Map();
SYNONYM_GROUPS.forEach((group, i) => group.forEach(s => SYNONYM_INDEX.set(s, i)));

/* ============================================================
   3) TF-IDF + SIMILITUD DE COSENO
   ============================================================ */

function termCounts(stems) {
  const m = new Map();
  stems.forEach(s => m.set(s, (m.get(s) || 0) + 1));
  return m;
}

function buildIndex() {
  const N = BUSINESSES.length;
  const df = new Map();
  const docStems = BUSINESSES.map(b => {
    const text = [b.name, b.desc, rubroLabel(b.rubro), (b.tags || []).join(' ')].join(' ');
    const stems = stemmedTokens(text);
    new Set(stems).forEach(s => df.set(s, (df.get(s) || 0) + 1));
    return stems;
  });

  IDF = new Map();
  df.forEach((count, term) => IDF.set(term, Math.log((N + 1) / (count + 1)) + 1));

  DOC_INDEX = docStems.map(stems => {
    const tf = termCounts(stems);
    const vec = new Map();
    let normSq = 0;
    tf.forEach((count, term) => {
      const idf = IDF.get(term) || 0;
      const w = count * idf;
      vec.set(term, w);
      normSq += w * w;
    });
    return { vec, norm: Math.sqrt(normSq) || 1 };
  });
}

// Expande los tokens de una consulta con sus sinónimos (peso reducido)
function expandQueryTerms(stems) {
  const weights = new Map();
  stems.forEach(s => {
    weights.set(s, (weights.get(s) || 0) + 1); // término literal, peso completo
    const gi = SYNONYM_INDEX.get(s);
    if (gi !== undefined) {
      SYNONYM_GROUPS[gi].forEach(rel => {
        if (rel !== s) weights.set(rel, (weights.get(rel) || 0) + 0.6); // relacionado, peso parcial
      });
    }
  });
  return weights;
}

function cosineScore(queryWeights) {
  let qNormSq = 0;
  const qVec = new Map();
  queryWeights.forEach((count, term) => {
    const idf = IDF.get(term) || 0;
    if (idf === 0) return; // término ausente del catálogo: no aporta
    const w = count * idf;
    qVec.set(term, w);
    qNormSq += w * w;
  });
  const qNorm = Math.sqrt(qNormSq) || 1;

  return DOC_INDEX.map(doc => {
    let dot = 0;
    qVec.forEach((w, term) => { if (doc.vec.has(term)) dot += w * doc.vec.get(term); });
    return dot / (qNorm * doc.norm);
  });
}

/* ============================================================
   4) UI: render, filtros, modal (igual que antes + la búsqueda nueva)
   ============================================================ */

function rubroLabel(key) {
  const r = RUBROS.find(r => r.key === key);
  return r ? r.label : key;
}
function iconFor(key) { return ICONS[key] || ICONS.minorista; }

function populateSelects() {
  const sel = document.getElementById('rubroSelect');
  sel.innerHTML = '<option value="">Todos los rubros</option>' + RUBROS.map(r => '<option value="' + r.key + '">' + r.label + '</option>').join('');
  const formSel = document.getElementById('rubroFormSelect');
  formSel.innerHTML = RUBROS.map(r => '<option value="' + r.key + '">' + r.label + '</option>').join('');
  const chips = document.getElementById('chipsRow');
  chips.innerHTML = SUGGESTIONS.map(s => '<button onclick="quickSearch(\'' + s.replace(/'/g, "\\'") + '\')">' + s + '</button>').join('');
}

function quickSearch(text) {
  document.getElementById('searchInput').value = text;
  runSearch();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('rubroSelect').value = '';
  renderCards(BUSINESSES);
}

function runSearch() {
  const rawQuery = document.getElementById('searchInput').value.trim();
  const rubroFilter = document.getElementById('rubroSelect').value;
  let list = BUSINESSES.slice();

  if (rawQuery) {
    const stems = stemmedTokens(rawQuery);
    const queryWeights = expandQueryTerms(stems);
    const cosine = cosineScore(queryWeights);
    const normQuery = norm(rawQuery);

    list = BUSINESSES
      .map((b, i) => {
        // pequeño refuerzo por coincidencia literal exacta (además del TF-IDF)
        const literalBonus = (b.tags || []).some(t => norm(t) === normQuery || normQuery.includes(norm(t))) ? 0.2 : 0;
        return { b, score: cosine[i] + literalBonus };
      })
      .filter(x => x.score > 0.05)
      .sort((a, b2) => b2.score - a.score)
      .map(x => x.b);
  }
  if (rubroFilter) list = list.filter(b => b.rubro === rubroFilter);
  renderCards(list, rawQuery);
}

function mapLink(addr) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addr + ', Rafael Calzada, Buenos Aires');
}
function waLink(phone, name) {
  const digits = phone.replace(/\D/g, '');
  return 'https://wa.me/549' + digits + '?text=' + encodeURIComponent('Hola ' + name + ', te escribo desde Calzada Compra.');
}

function renderCards(list, q) {
  const grid = document.getElementById('cardsGrid');
  const count = document.getElementById('resultsCount');
  if (q) {
    count.textContent = list.length + (list.length === 1 ? ' comercio encontrado para "' : ' comercios encontrados para "') + document.getElementById('searchInput').value + '"';
  } else {
    count.textContent = list.length + ' comercios socios de la Cámara';
  }
  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><b>Todavía no encontramos un comercio para eso</b>Es una gran oportunidad para invitar a un vecino con ese rubro a sumarse a la Cámara.</div>';
    return;
  }
  grid.innerHTML = list.map((b) => {
    const accent = ACCENTS[BUSINESSES.indexOf(b) % ACCENTS.length];
    const webBtn = b.web
      ? '<a class="btn btn-outline btn-sm" href="https://' + b.web + '" target="_blank" rel="noopener">Ver sitio web</a>'
      : '<span class="web-pending">Sin sitio web — disponible con Espar Co.</span>';
    return '<div class="card">'
      + '<div class="top" style="background:' + accent + '"></div>'
      + '<div class="card-body">'
      + '<div class="icon-badge" style="background:' + accent + '">' + iconFor(b.rubro) + '</div>'
      + '<span class="rubro-tag">' + rubroLabel(b.rubro) + '</span>'
      + '<h3>' + b.name + '</h3>'
      + '<p class="desc">' + b.desc + '</p>'
      + '<div class="meta-line">📍 <a href="' + mapLink(b.addr) + '" target="_blank" rel="noopener">' + b.addr + '</a></div>'
      + '<div class="meta-line">📞 <a href="' + waLink(b.phone, b.name) + '" target="_blank" rel="noopener">' + b.phone + '</a></div>'
      + '<div class="card-actions">' + webBtn + '</div>'
      + '</div></div>';
  }).join('');
}

function renderCompareTable() {
  const rows = [
    { prod: 'Zapatillas urbanas talle 42', biz: 'Indumentaria Sur Moda', price: '$48.000' },
    { prod: 'Zapatillas urbanas talle 42', biz: 'Ropa de Trabajo El Overol', price: '$41.500' },
    { prod: 'Zapatillas urbanas talle 42', biz: 'Boutique Almafuerte', price: 'Consultar' }
  ];
  document.getElementById('compareBody').innerHTML = rows.map(r => {
    return '<tr><td><span class="prod-thumb">👟</span>' + r.prod + '</td><td>' + r.biz + '</td><td class="price">' + r.price + '</td><td><button class="btn btn-outline btn-sm" disabled>Consultar</button></td></tr>';
  }).join('');
}

/* MODAL LOGIC */
function openModal(tab) {
  document.getElementById('modalOverlay').classList.add('open');
  switchTab(tab);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}
function switchTab(tab) {
  document.getElementById('tabVecino').classList.toggle('active', tab === 'vecino');
  document.getElementById('tabComerciante').classList.toggle('active', tab === 'comerciante');
  document.getElementById('paneVecino').classList.toggle('active', tab === 'vecino');
  document.getElementById('paneComerciante').classList.toggle('active', tab === 'comerciante');
  document.getElementById('modalTitle').textContent = tab === 'vecino' ? 'Registrate como vecino' : 'Sumá tu comercio a la Cámara';
  document.getElementById('modalSub').textContent = tab === 'vecino'
    ? 'Cargá tu domicilio y encontrá primero lo que tenés cerca.'
    : 'Sumate a la vidriera digital de Calzada Compra — la membresía a la Cámara incluye una cuota societaria.';
}
function submitForm(e, type) {
  e.preventDefault();
  document.getElementById('form' + (type === 'vecino' ? 'Vecino' : 'Comerciante')).classList.add('hidden');
  document.getElementById('confirm' + (type === 'vecino' ? 'Vecino' : 'Comerciante')).classList.remove('hidden');
  return false;
}

/* ============================================================
   5) CARGA DE DATOS E INICIO
   ============================================================ */
async function init() {
  populateSelects();
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><b>Cargando comercios…</b></div>';
  try {
    const res = await fetch('assets/data/comercios.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    BUSINESSES = await res.json();
  } catch (err) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><b>No pudimos cargar el catálogo de comercios</b>Si abriste este archivo con doble clic desde tu computadora, el navegador bloquea la carga de assets/data/comercios.json por seguridad (CORS). Probalo subido a un hosting, o corriendo un servidor local (por ejemplo <code>python3 -m http.server</code>) y abriendo http://localhost:8000.</div>';
    console.error('Error cargando comercios.json:', err);
    return;
  }
  buildIndex();
  renderCards(BUSINESSES);
  renderCompareTable();
}

init();
