/* =========================================================
   Calzada Digital — lógica del sitio
   Incluye un motor de búsqueda con procesamiento de lenguaje:
   normalización + stemming + expansión de sinónimos + TF-IDF
   y similitud de coseno, 100% en el navegador (sin backend).
   También incluye registro/login (persistidos en localStorage,
   ver sección 5) y la carga de farmacias de turno.
   Este mismo archivo se comparte entre index.html, vidriera.html
   y farmacias.html — cada función revisa si el elemento que
   necesita existe antes de tocarlo, así funciona en cualquiera
   de las tres páginas sin generar errores.
   ========================================================= */

/* ============================================================
   0) FUENTE DE DATOS: local (por defecto) o Google Sheets
   ---------------------------------------------------------
   Por defecto el catálogo de comercios y las farmacias de turno se leen
   de assets/data/comercios.json y assets/data/farmacias.json (los
   archivos que vienen con el sitio).

   Si preferís cargarlos y editarlos desde Google Drive, pegá acá abajo
   las URLs de dos hojas de Google Sheets publicadas como CSV, y el sitio
   va a leer los datos desde ahí. Para conseguir esa URL: con la hoja
   abierta, Archivo > Compartir > "Publicar en la web" > elegís la hoja
   correspondiente y el formato CSV > Publicar. Google te da un link que
   termina en "output=csv" — ese es el que va acá.

   Importante: esto tiene que ser específicamente una hoja de Sheets
   "publicada en la web", no un archivo CSV suelto subido a una carpeta
   de Drive (aunque esté compartido como "cualquiera con el link puede
   ver"). Un archivo de Drive no le permite a una página de otro dominio
   leer su contenido (el navegador lo bloquea por seguridad, vía CORS);
   una hoja de Sheets publicada sí está pensada para eso.

   El formato de columnas esperado es el mismo que el de los CSV que te
   pasé (comercios.csv y farmacias.csv) — abrilos con Sheets, completá
   los datos reales ahí, y cuando quieras probarlos pegá la URL acá.

   backendUrl (cuentas y puntos de fidelidad):
   Por defecto ('') las cuentas de usuario y los puntos de fidelidad
   funcionan como una maqueta guardada en el navegador (localStorage) —
   sirve para probar y mostrar el flujo completo, pero cada cuenta/punto
   queda solo en ese navegador, no es compartido ni visible como admin.

   Para que sea de verdad (cuentas y puntos compartidos entre todos los
   comercios y vecinos, y visibles desde admin.html) hay que:
   1) Abrir backend/Code.gs (viene con este mismo sitio) y seguir las
      instrucciones de instalación que están en su encabezado —
      resumen: crear una Google Sheet nueva, pegar ese código en
      Extensiones > Apps Script, cambiar la clave de administrador, e
      "Implementar" como aplicación web.
   2) Pegar acá abajo la URL que te da ese paso (termina en /exec).
   El sitio detecta sola si hay una URL cargada acá y usa el backend
   real; si está vacío, sigue funcionando como maqueta sin romper nada.

   gaMeasurementId (opcional, analítica con Google Analytics):
   Si además de la analítica propia (que ya se guarda sola en la
   planilla, en la hoja "Analitica") querés el detalle mucho más
   completo de Google Analytics (de dónde vienen las visitas,
   dispositivo, ubicación aproximada, etc.), creá una propiedad
   gratuita en analytics.google.com, copiá el "ID de medición" (algo
   así como "G-XXXXXXXXXX") y pegalo acá abajo. Si lo dejás vacío, el
   sitio simplemente no manda nada a Google Analytics — la analítica
   propia en la planilla sigue funcionando igual.
   ============================================================ */
const SHEETS_CONFIG = {
  comerciosCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQsDarnbD8Qgjjmvjuo4td6Dckvl_wJfnWvWiTdtVDNYsj1hkbNenFfoQlldseZdKNFSHkll_wGq_KE/pub?output=csv',
  farmaciasCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQx06h6G506x6Y9hbsQZVLFCCNyhOPo43EkdVHHbF_l8YFpYrY-guW_3VQWFgvQuzaripL42r40n1NM/pub?output=csv',
  // Opcionales — igual que comerciosCsvUrl/farmaciasCsvUrl: si se dejan
  // vacíos (como vienen por defecto), "Eventos próximos" y "Actividades de
  // la Cámara" se leen de assets/data/eventos.json y actividades.json.
  eventosCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhOJbL8EY3d3LtmhMwaugnnkPtsyS7DANTXaDqlaDw1Z_Wbo9SK4PMYRGsbzRkot6mxWJfe47KJ9YK/pub?output=csv',
  actividadesCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5VFSr9CmkkXtV1_ayIm7jS3FQCNa6fhQWvkQ0Cir6WE35oIOT29iyQB_806jDKo_fo8hRUpF-tQW9/pub?output=csv',
  backendUrl: 'https://script.google.com/macros/s/AKfycbw0XoxwJ5p9VX8kYlNX4GyXzCICP8oRz0z-qvmE2kXJDy5abG8tHjL3qBrGs-Wyc5k_/exec',
  gaMeasurementId: ''
};

const RUBROS = [
  { key: 'minorista', label: 'Minorista / Almacén' },
  { key: 'mayorista', label: 'Mayorista' },
  { key: 'retaceria', label: 'Retacería / Telas' },
  { key: 'carniceria', label: 'Carnicería' },
  { key: 'ropa', label: 'Ropa e indumentaria' },
  { key: 'carpinteria', label: 'Carpintería' },
  { key: 'optica', label: 'Oftalmología / Óptica' },
  { key: 'Servicios Profesionales', label: 'Servicios Profesionales' },
  { key: 'electricista', label: 'Electricista' },
  { key: 'ferreteria', label: 'Ferretería / Bazar' },
  { key: 'automovil', label: 'Automóvil / Taller mecánico' },
  // ------------------------------------------------------------------
  // Sumados para Calzada Digital (ver assets/categorias.js): al abrir la
  // Cámara a más rubros que indumentaria, hicieron falta estos nuevos
  // valores de "rubro". Cada uno se agrupa después, en la vidriera por
  // categoría, dentro de una de las 8 categorías grandes — esa
  // agrupación vive en assets/categorias.js, no acá, así este archivo
  // sigue siendo la única fuente de verdad de "qué rubros existen" (el
  // desplegable de rubro de la vidriera clásica los sigue usando igual).
  { key: 'abogados', label: 'Abogados' },
  { key: 'hogar_bazar', label: 'Bazar / Hogar' },
  { key: 'colchoneria', label: 'Colchonería' },
  { key: 'corralon', label: 'Corralón' },
  { key: 'pintureria', label: 'Pinturería' },
  { key: 'bar', label: 'Bar' },
  { key: 'cafeteria', label: 'Cafetería' },
  { key: 'panaderia', label: 'Panadería y pastelería' },
  { key: 'rotiseria', label: 'Rotisería' },
  { key: 'servicios_oficios', label: 'Oficios (plomería, gas, etc.)' },
  { key: 'peluqueria', label: 'Peluquería' },
  { key: 'estetica', label: 'Estética' },
  { key: 'dietetica', label: 'Dietética' },
  { key: 'veterinaria', label: 'Veterinaria' }
];

// Convierte un nombre de comercio en un id corto y estable ("Ferretería
// Don Osvaldo" -> "ferreteria-don-osvaldo") — se usa como identificador
// público del comercio (seguir, dar like, historias, cupones, analítica)
// en vez del email, que nunca se expone públicamente. Si dos comercios
// tuvieran el mismo nombre exacto, backend/Code.gs les agrega un sufijo
// numérico al guardarlos (ver slugify_ allá) para que no choquen.
function slugify(s) {
  return stripAccents(String(s || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'comercio';
}

const ICONS = {
  minorista: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 12H5z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
  mayorista: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M3 9v7l9 5 9-5V9"/><path d="M12 14v7"/></svg>',
  retaceria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="6" r="3"/><circle cx="17" cy="18" r="3"/><path d="M9.5 7.5 20 18"/><path d="M14.5 16.5 4 6"/></svg>',
  carniceria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a6 6 0 0 0-6 6c0 2 1 3 1 3l-8 8 2 2 8-8s1 1 3 1a6 6 0 0 0 0-12z"/></svg>',
  ropa: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3a3 3 0 0 1-6 0z"/></svg>',
  carpinteria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5 18 3l3 3-3.5 3.5"/><path d="M3 21l7-7"/><path d="M12.5 8.5 21 17l-4 4-8.5-8.5"/></svg>',
  optica: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="15.5" r="3.5"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M10 15.5h4M3 15.5 5 7h3M21 15.5 19 7h-3"/></svg>',
  abogados: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M4 8l4-2 4 2-4 8H4l4-8zM16 8l4-2 4 2-4 8h-4l4-8zM6 19h12M12 6v13"/></svg>',
  // Key igual a la de RUBROS ("Servicios Profesionales", con mayúscula y
  // espacio — así viene el rubro en el catálogo real) — antes esta entrada
  // no existía con esa key exacta y el ícono nunca matcheaba, cayendo
  // siempre al de "minorista" por el fallback de iconFor().
  'Servicios Profesionales': '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M4 8l4-2 4 2-4 8H4l4-8zM16 8l4-2 4 2-4 8h-4l4-8zM6 19h12M12 6v13"/></svg>',
  electricista: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  ferreteria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2-2z"/></svg>',
  automovil: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M4 17l1.5-5.5A2 2 0 0 1 7.4 10h9.2a2 2 0 0 1 1.9 1.5L20 17M6 11l1-3h10l1 3"/></svg>',
  hogar_bazar: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/></svg>',
  colchoneria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M3 13h18M7 9V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>',
  corralon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17V9l5-3 5 3v8"/><rect x="13" y="11" width="8" height="6" rx="1"/><circle cx="7" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/></svg>',
  pintureria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21c1-3 0-5-1-6 2-2 6-2 8 0s2 6 0 8c-1-1-3-2-6-1z"/><path d="M11 13 20 4l1 1-9 9"/></svg>',
  bar: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14l-6 9v7h-2v-7z"/></svg>',
  cafeteria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2"/><path d="M7 3c0 1-1 1-1 2s1 1 1 2M11 3c0 1-1 1-1 2s1 1 1 2"/></svg>',
  panaderia: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 0 6 2.5 6 5.5 0 1-.3 1.8-.8 2.5H6.8c-.5-.7-.8-1.5-.8-2.5C6 5.5 8 3 12 3z"/><path d="M4 11h16l-1.5 9h-13z"/></svg>',
  rotiseria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/></svg>',
  servicios_oficios: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2-2z"/><path d="M4 4l3 3M17 17l3 3"/></svg>',
  peluqueria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 5 8.5 12 20 19M8.5 12 5 15"/></svg>',
  estetica: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c2 3 5 4 5 8a5 5 0 0 1-10 0c0-4 3-5 5-8z"/><path d="M12 21v-6"/></svg>',
  dietetica: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-5-2-8-6-8-10a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 4-3 8-8 10z"/></svg>',
  veterinaria: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10c-1.5 0-3-1.5-3-3.5S6.5 3 8 4c1 .7 1.5 2 1.5 3M16 10c1.5 0 3-1.5 3-3.5S17.5 3 16 4c-1 .7-1.5 2-1.5 3"/><path d="M12 22c-3 0-5-2-5-4.5 0-2 1.2-3 1.2-5C8.2 10 10 9 12 9s3.8 1 3.8 3.5c0 2 1.2 3 1.2 5 0 2.5-2 4.5-5 4.5z"/></svg>'
};

const ACCENTS = ['#15335c', '#c98a1e', '#2f5488', '#eea52a', '#5c6773', '#0b2038', '#8a6a2c', '#3d6d9e'];

// se exponen en window para que assets/semantic.js (un módulo aparte) pueda
// armar el mismo texto por comercio que usa el motor de palabras clave
window.RUBROS = RUBROS;

// Atajos de "compras por ocasión" — pensados sobre todo para fechas especiales
// (Día del Padre, Navidad, vuelta al cole, etc). Cada uno arma una búsqueda
// como si el usuario la hubiera escrito él mismo (texto + opcionalmente un
// rubro), reusando el mismo buscador de siempre — no hace falta nada nuevo
// del lado del motor de búsqueda. Para sumar uno nuevo alcanza con agregar
// una línea acá (icon = un emoji, label = lo que se ve en el botón, query =
// lo que se busca, rubro = una key de RUBROS para acotar, o '' para todos).
const OCASIONES = [
  { icon: '🎁', label: 'Día del Padre', query: 'regalo para el día del padre', rubro: '' },
  { icon: '🧸', label: 'Regalos para chicos', query: 'juguete regalo para chicos', rubro: '' },
  { icon: '👔', label: 'Ropa de hombre', query: 'ropa de hombre', rubro: 'ropa' }
];

let BUSINESSES = [];      // se carga desde assets/data/comercios.json
let CURRENT_RESULTS = []; // último resultado de búsqueda/filtro renderizado (para la vista de mapa)
let FARMACIAS = [];       // se carga desde la API de farmaturno.com.ar, Google Sheets o assets/data/farmacias.json
let FARMACIAS_MODE = 'local'; // 'api' (farmaturno.com.ar, fechas reales) | 'sheet' | 'local' (día de la semana, ejemplo)

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
   2) UI: render, filtros, buscador
   ============================================================ */

function rubroLabel(key) {
  const r = RUBROS.find(r => r.key === key);
  return r ? r.label : key;
}
function iconFor(key) { return ICONS[key] || ICONS.minorista; }

// Convierte un link de "Compartir" de Google Drive (el que copia cualquiera
// sin saber nada técnico) en una URL que sirve la imagen directamente, para
// poder usarla como src de un <img>. Así, en la planilla de comercios, la
// columna "logo" puede tener pegado el link tal cual lo da Drive al tocar
// "Compartir → Copiar enlace" — no hace falta ningún formato especial.
// Soporta los formatos más comunes:
//   https://drive.google.com/file/d/ID/view?usp=sharing
//   https://drive.google.com/open?id=ID
//   https://drive.google.com/uc?id=ID  (o con &export=view)
//   o directamente el ID pegado solo
// Si "logo" no es un link de Drive (por ejemplo una ruta local como
// assets/img/logo.png, o ya una URL de imagen de otro lado), se devuelve
// tal cual, sin tocarlo.
function driveFileIdFrom(text) {
  let m = text.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (m) return m[1];
  m = text.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(text)) return text;
  return null;
}
function resolveLogoUrl(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/drive\.google\.com/.test(trimmed) || /^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    const id = driveFileIdFrom(trimmed);
    if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w200';
  }
  return trimmed;
}

// Si el logo de un comercio no carga (link roto, archivo que todavía no
// se compartió como "cualquiera con el link", etc.), lo reemplazamos por
// el mismo ícono genérico de rubro que se usaba antes de tener logos —
// así ninguna tarjeta queda rota.
function logoFallback(imgEl, rubro, accent) {
  const div = document.createElement('div');
  div.className = 'icon-badge';
  div.style.background = accent;
  div.innerHTML = iconFor(rubro);
  imgEl.replaceWith(div);
}

// Lee un <input type="file"> con la foto del logo, la redimensiona y la
// comprime en el propio navegador (nunca se manda la imagen original tal
// cual) y devuelve una "data URL" en base64 lista para mandar al backend
// (o para guardarla directo en localStorage en modo maqueta, sin backend).
// Esto mantiene el pedido liviano y evita que alguien suba, sin querer, una
// foto de varios MB tomada directo del celular.
const LOGO_MAX_DIM = 500;      // lado máximo del logo ya redimensionado, en píxeles
const LOGO_CALIDAD = 0.85;     // calidad JPEG (0 a 1)
const LOGO_MAX_ARCHIVO_MB = 8; // tamaño máximo del ARCHIVO ORIGINAL que se acepta leer
// Cuántos logos anteriores se guardan como "historial" (más nuevo primero) —
// mismo tope que MAX_LOGO_HISTORIAL en backend/Code.gs, para el modo maqueta
// sin backend.
const MAX_LOGO_HISTORIAL_LOCAL = 3;
function leerImagenComoBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(''); return; }
    if (!file.type || file.type.indexOf('image/') !== 0) {
      reject(new Error('El archivo tiene que ser una imagen (jpg, png o webp).'));
      return;
    }
    if (file.size > LOGO_MAX_ARCHIVO_MB * 1024 * 1024) {
      reject(new Error('La imagen pesa demasiado (máximo ' + LOGO_MAX_ARCHIVO_MB + 'MB) — probá con una más liviana.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No pudimos leer el archivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No pudimos leer esa imagen — probá con otro archivo.'));
      img.onload = () => {
        let width = img.naturalWidth, height = img.naturalHeight;
        if (width > LOGO_MAX_DIM || height > LOGO_MAX_DIM) {
          const ratio = Math.min(LOGO_MAX_DIM / width, LOGO_MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Fondo blanco antes de dibujar: un logo con transparencia (PNG) se
        // ve bien igual sobre las tarjetas claras del sitio, y el archivo
        // final (JPEG) queda mucho más liviano que guardar la transparencia.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', LOGO_CALIDAD));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Muestra una vista previa chica del logo elegido, apenas el usuario elige
// el archivo (antes incluso de enviar el formulario) — así confirma que
// subió la imagen correcta.
function wireLogoPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) { preview.classList.add('hidden'); preview.src = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { preview.src = reader.result; preview.classList.remove('hidden'); };
    reader.readAsDataURL(file);
  });
}

// Contador "X/N" visible bajo un campo con maxlength — avisa antes de que
// el campo simplemente deje de aceptar más texto en vez de que el usuario
// se quede sin entender por qué no puede seguir escribiendo.
function wireCharCounter(inputId, counterId) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (!input || !counter) return;
  const max = Number(input.getAttribute('maxlength')) || 0;
  function actualizar() {
    const len = input.value.length;
    counter.textContent = len + '/' + max;
    counter.classList.toggle('char-counter-limite', max > 0 && len >= max);
    counter.classList.toggle('char-counter-cerca', max > 0 && len >= max * 0.9 && len < max);
  }
  input.addEventListener('input', actualizar);
  actualizar();
}

function populateSelects() {
  const sel = document.getElementById('rubroSelect');
  if (sel) {
    sel.innerHTML = '<option value="">Todos los rubros</option>' + RUBROS.map(r => '<option value="' + r.key + '">' + r.label + '</option>').join('');
  }
  const formSel = document.getElementById('rubroFormSelect');
  if (formSel) {
    formSel.innerHTML = RUBROS.map(r => '<option value="' + r.key + '">' + r.label + '</option>').join('');
  }
  const miComercioSel = document.getElementById('miComercioRubro');
  if (miComercioSel) {
    miComercioSel.innerHTML = RUBROS.map(r => '<option value="' + r.key + '">' + r.label + '</option>').join('');
  }
  const occasions = document.getElementById('occasionRow');
  if (occasions) {
    occasions.innerHTML = OCASIONES.map(o =>
      '<button onclick="quickSearch(\'' + o.query.replace(/'/g, "\\'") + '\',\'' + o.rubro + '\')">' + o.icon + ' ' + o.label + '</button>'
    ).join('');
  }
}

function quickSearch(text, rubro) {
  document.getElementById('searchInput').value = text;
  const sel = document.getElementById('rubroSelect');
  if (sel) sel.value = rubro || '';
  runSearch();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('rubroSelect').value = '';
  renderCards(BUSINESSES);
}

// Junta, ya "stemmizadas", las palabras de las tags de un comercio por un
// lado y las de su nombre/descripción/rubro por otro — separadas porque las
// tags (las que carga la Cámara a mano pensando justo en la búsqueda) pesan
// más que una coincidencia suelta en la descripción.
function businessSearchTokens(b) {
  return {
    tagTokens: (b.tags || []).flatMap(t => stemmedTokens(t)),
    textTokens: stemmedTokens([b.name, b.desc, rubroLabel(b.rubro)].join(' '))
  };
}

// Buscador simple y 100% predecible: sin sinónimos ni modelos de por medio,
// matchea por tags (lo que carga la Cámara a mano para cada comercio, con
// ese fin) y, en menor medida, por nombre/descripción/rubro. Cada palabra
// de la búsqueda que aparece suma puntos; si la búsqueda entera aparece tal
// cual dentro de una tag (por ejemplo, buscar "kiosco" y que el comercio
// tenga la tag "kiosco"), eso pesa más que una coincidencia suelta.
function runSearch() {
  const rawQuery = document.getElementById('searchInput').value.trim();
  const rubroFilter = document.getElementById('rubroSelect').value;
  let list = BUSINESSES.slice();

  if (rawQuery) {
    const queryTokens = stemmedTokens(rawQuery);
    const normQuery = norm(rawQuery);

    list = BUSINESSES
      .map(b => {
        let score = 0;
        const literalTagHit = (b.tags || []).some(t => {
          const nt = norm(t);
          return nt === normQuery || nt.includes(normQuery) || normQuery.includes(nt);
        });
        if (literalTagHit) score += 5;

        const { tagTokens, textTokens } = businessSearchTokens(b);
        queryTokens.forEach(qt => {
          if (tagTokens.includes(qt)) score += 3;
          else if (textTokens.includes(qt)) score += 1;
        });

        return { b, score };
      })
      .filter(x => x.score > 0)
      .sort((a, c) => c.score - a.score)
      .map(x => x.b);
  }
  if (rubroFilter) list = list.filter(b => b.rubro === rubroFilter);
  renderCards(list, rawQuery);
  if (rawQuery) trackEvent('busqueda', rawQuery);
  if (rubroFilter) trackEvent('rubro', rubroFilter);
}

// Enter en el campo de búsqueda hace lo mismo que tocar "Buscar".
function wireSearchEnter() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
  });
}

// Menú desplegable del header en pantallas angostas (mobile/tablet).
const MOBILE_MENU_BREAKPOINT = 900;
function wireMobileMenu() {
  const burger = document.getElementById('burgerBtn');
  const panel = document.getElementById('navCollapse');
  if (!burger || !panel) return;

  function isOpen() { return panel.classList.contains('open'); }
  function closeMenu() {
    panel.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }
  function openMenu() {
    panel.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
  }
  function toggleMenu() { isOpen() ? closeMenu() : openMenu(); }

  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Cerrar al elegir un link o un botón de la sesión (Ingresar/Registrarme/Salir).
  panel.addEventListener('click', (e) => {
    if (e.target.closest('a,button')) closeMenu();
  });

  // Cerrar al tocar/clickear afuera del menú.
  document.addEventListener('click', (e) => {
    if (isOpen() && !panel.contains(e.target) && e.target !== burger && !burger.contains(e.target)) {
      closeMenu();
    }
  });

  // Cerrar con Escape.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeMenu();
  });

  // Si la ventana pasa a tamaño de escritorio, aseguramos que el panel quede cerrado.
  window.addEventListener('resize', () => {
    if (window.innerWidth > MOBILE_MENU_BREAKPOINT && isOpen()) closeMenu();
  });
}

// Dropdown "Menú" del header en escritorio (agrupa Conocé el barrio, Comparar
// Productos y Sumá tu comercio detrás de un solo botón). En mobile el burger
// ya colapsa todo el header, así que este dropdown se aplana por CSS y este
// código simplemente no tiene nada para togglear ahí.
function wireNavDropdown() {
  const dropdown = document.getElementById('navDropdown');
  const toggle = document.getElementById('navDropdownToggle');
  if (!dropdown || !toggle) return;

  function isOpen() { return dropdown.classList.contains('open'); }
  function closeDropdown() {
    dropdown.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  function openDropdown() {
    dropdown.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen() ? closeDropdown() : openDropdown();
  });

  // Cerrar al elegir un link del menú.
  dropdown.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeDropdown();
  });

  // Cerrar al tocar/clickear afuera del menú.
  document.addEventListener('click', (e) => {
    if (isOpen() && !dropdown.contains(e.target)) closeDropdown();
  });

  // Cerrar con Escape.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeDropdown();
  });

  // Si la ventana pasa a tamaño angosto, el dropdown queda aplanado por CSS: cerramos su estado igual.
  window.addEventListener('resize', () => {
    if (window.innerWidth <= MOBILE_MENU_BREAKPOINT && isOpen()) closeDropdown();
  });
}

// Todos los teléfonos del sitio se cargan como "11" (fijo, Rafael Calzada/GBA)
// + 8 dígitos que escribe el usuario — nunca como texto libre. Esto evita a
// propósito el problema que rompió la vidriera una vez: un comercio cargó su
// teléfono como puros números sin ningún separador y Google Sheets lo guardó
// como valor numérico en vez de texto. Con el "11" fijo aparte y el input
// restringido a 8 dígitos (maxlength+pattern+filtro en cada tecla), lo que
// llega al backend es siempre previsible: "11" + 8 dígitos, como string.
const PHONE_PREFIJO = '11';
function wirePhoneInput(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    if (digits !== input.value) input.value = digits;
  });
}
// Arma el teléfono completo a partir de lo que hay cargado en el input de 8
// dígitos. Si el campo está vacío devuelve '' (para campos opcionales, como
// el teléfono en "Mi comercio", que se puede dejar como estaba).
function telefonoCompleto(id) {
  const input = document.getElementById(id);
  const digits = input ? input.value.replace(/\D/g, '').slice(0, 8) : '';
  return digits ? (PHONE_PREFIJO + digits) : '';
}
// Precarga un input de teléfono a partir de un valor ya guardado (que puede
// venir con el "11" adelante, o sin él, de datos viejos) — nos quedamos
// siempre con los últimos 8 dígitos, que es lo único que el input muestra.
function setPhoneInputValue(id, telefonoGuardado) {
  const input = document.getElementById(id);
  if (!input) return;
  const digits = String(telefonoGuardado || '').replace(/\D/g, '');
  input.value = digits.slice(-8);
}

function mapLink(addr) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addr + ', Rafael Calzada, Buenos Aires');
}
function waLink(phone, name) {
  // Ojo: si el teléfono llega desde Google Sheets como un número (por
  // ejemplo un comercio autogestionado que lo cargó sin espacios, tipo
  // "1141889724"), Sheets puede auto-detectarlo como valor numérico en vez
  // de texto — y un Number no tiene .replace(). Por eso se fuerza siempre a
  // String() antes de tocarlo, así nunca rompe el render de toda la vidriera.
  const digits = String(phone || '').replace(/\D/g, '');
  return 'https://wa.me/549' + digits + '?text=' + encodeURIComponent('Hola ' + name + ', te escribo desde Calzada Digital.');
}

// HTML de una tarjeta de comercio — se usa tanto en la grilla plana (resultado
// de una búsqueda o de un rubro elegido) como en las filas tipo Netflix
// (navegación libre, sin búsqueda ni rubro elegido).
// Una oferta cargada sin fecha de vencimiento se considera vigente siempre
// (queda a criterio del comercio sacarla cuando quiera); con fecha, deja de
// mostrarse sola apenas pasa ese día — así nunca queda una oferta vieja
// dando vueltas por el sitio.
function isOfertaVigente(vence) {
  if (!vence) return true;
  const d = new Date(vence + 'T23:59:59');
  if (isNaN(d.getTime())) return true;
  return d.getTime() >= Date.now();
}

// "Cerca tuyo": un placeholder simple y liviano — sin geocoding ni ninguna
// API externa — que compara, por texto, la dirección guardada del vecino
// logueado contra la de cada comercio. Si comparten alguna palabra "de
// calle" (ignorando números de altura y palabras genéricas como "avenida"
// o "block"), se considera un match. A propósito es así de simple: sirve
// para destacar algo mientras tanto, pero la idea es reemplazarlo más
// adelante por una API de recomendación real (cercanía geográfica +
// historial de clicks + género + rango etario) que se vaya puliendo con
// el tiempo — esto no intenta ser esa API todavía.
const DIRECCION_STOPWORDS = new Set([
  'calle', 'avenida', 'av', 'ruta', 'pasaje', 'block', 'altura', 'piso', 'depto', 'dto',
  'nro', 'num', 'numero', 'barrio', 'esquina', 'entre'
]);
function direccionTokens_(direccion) {
  return tokenize(direccion).filter(w =>
    !STOPWORDS.has(w) && !DIRECCION_STOPWORDS.has(w) && !/^\d+$/.test(w) && w.length >= 3
  );
}
function esCercaTuyo_(direccionVecino, direccionComercio) {
  if (!direccionVecino || !direccionComercio) return false;
  const tokensVecino = direccionTokens_(direccionVecino);
  if (!tokensVecino.length) return false;
  const tokensComercio = new Set(direccionTokens_(direccionComercio));
  return tokensVecino.some(t => tokensComercio.has(t));
}

function cardHtml(b) {
  const accent = ACCENTS[BUSINESSES.indexOf(b) % ACCENTS.length];
  // data-track lleva el nombre del comercio en la etiqueta de analítica,
  // así en admin.html se puede ver, por ejemplo, cuántos clicks tuvo el
  // sitio web de un comercio puntual — no solo "Ver sitio web" en general.
  const trackWeb = escapeHtml('Sitio web: ' + b.name);
  const trackAddr = escapeHtml('Dirección: ' + b.name);
  // El id del comercio (ver slugify() más arriba) viaja dentro del propio
  // detalle del evento de analítica — así assets/calzada-digital.js puede
  // armar, desde la misma hoja "Analitica" de siempre, el ranking de
  // "clicks a WhatsApp" y "consultas más populares" de CADA comercio, sin
  // necesitar una hoja nueva ni tocar trackEvent_() del backend.
  const comercioId = b.id || slugify(b.name);
  const trackPhone = escapeHtml('whatsapp:' + comercioId + ' | ' + b.name);
  const webBtn = b.web
    ? '<a class="btn btn-outline btn-sm" data-track="' + trackWeb + '" href="https://' + b.web + '" target="_blank" rel="noopener">Ver sitio web</a>'
    : '<span class="web-pending">Sin sitio web — disponible con Espar Co.</span>';
  const logoUrl = resolveLogoUrl(b.logo);
  const ofertaBadge = (b.oferta && isOfertaVigente(b.ofertaVence))
    ? '<div class="oferta-ribbon">🏷️ ' + escapeHtml(b.oferta) + '</div>'
    : '';
  // Ver esCercaTuyo_() más arriba: un placeholder simple, no una recomendación real todavía.
  const cercaBadge = b._cercaTuyo ? '<div class="cerca-tuyo-badge">🏠 Cerca tuyo</div>' : '';
  return '<div class="card" data-comercio-id="' + escapeHtml(comercioId) + '" data-comercio-nombre="' + escapeHtml(b.name) + '">'
    + '<div class="top" style="background:' + accent + '"></div>'
    + '<div class="card-body">'
    + (logoUrl
        ? '<img class="card-logo" src="' + logoUrl + '" alt="Logo de ' + escapeHtml(b.name) + '" onerror="logoFallback(this,\'' + b.rubro + '\',\'' + accent + '\')">'
        : '<div class="icon-badge" style="background:' + accent + '">' + iconFor(b.rubro) + '</div>')
    + '<span class="rubro-tag">' + rubroLabel(b.rubro) + '</span>'
    + cercaBadge
    + ofertaBadge
    + '<h3>' + b.name + '</h3>'
    + '<p class="desc">' + b.desc + '</p>'
    + '<div class="meta-line">📍 <a data-track="' + trackAddr + '" href="' + mapLink(b.addr) + '" target="_blank" rel="noopener">Cómo ir</a></div>'
    + '<div class="meta-line">📞 <a data-track="' + trackPhone + '" href="' + waLink(b.phone, b.name) + '" target="_blank" rel="noopener">' + b.phone + '</a></div>'
    + '<div class="card-social" data-cd-card-social="' + escapeHtml(comercioId) + '"></div>'
    + '<div class="card-actions">' + webBtn + '</div>'
    + '</div></div>';
}

function renderFlatGrid(list) {
  const grid = document.getElementById('cardsGrid');
  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><b>Todavía no encontramos un comercio para eso</b>Es una gran oportunidad para invitar a un vecino con ese rubro a sumarse a la Cámara.</div>';
  } else {
    grid.innerHTML = list.map(cardHtml).join('');
  }
}

// Fila con scroll horizontal (como en Netflix), llamada por rubro. Cada
// botón de "‹ ›" desplaza esa fila con scrollRow() de más abajo.
function scrollRow(rowId, dir) {
  const el = document.getElementById(rowId);
  if (!el) return;
  const amount = Math.max(240, el.clientWidth * 0.8) * dir;
  el.scrollBy({ left: amount, behavior: 'smooth' });
}

let rowIdCounter = 0;
function renderRubroRows(list) {
  const rows = document.getElementById('cardsRows');
  if (!rows) return;
  if (list.length === 0) {
    rows.innerHTML = '<div class="empty-state"><b>Todavía no hay comercios cargados</b>Es una gran oportunidad para invitar a un vecino a sumarse a la Cámara.</div>';
    return;
  }
  // "Cerca tuyo" (ver esCercaTuyo_ más arriba): solo se calcula acá, en la
  // navegación libre (sin búsqueda ni rubro elegido) — es donde tiene
  // sentido reordenar un poco la vidriera. Un vecino sin sesión, o sin
  // dirección cargada, no ve ningún cambio.
  const session = getSession();
  const direccionVecino = (session && session.tipo === 'vecino') ? (session.direccion || '') : '';
  list.forEach(b => { b._cercaTuyo = direccionVecino ? esCercaTuyo_(direccionVecino, b.addr) : false; });

  const byRubro = new Map();
  list.forEach(b => {
    if (!byRubro.has(b.rubro)) byRubro.set(b.rubro, []);
    byRubro.get(b.rubro).push(b);
  });
  // Dentro de cada rubro, los comercios "cerca tuyo" pasan primero (sin
  // alterar el orden relativo del resto).
  byRubro.forEach((items, key) => {
    byRubro.set(key, items.filter(b => b._cercaTuyo).concat(items.filter(b => !b._cercaTuyo)));
  });
  // respeta el orden de RUBROS; un rubro cargado a mano que no esté en esa
  // lista igual aparece, al final, para no perder ningún comercio de vista.
  const orderedKeys = RUBROS.map(r => r.key).filter(k => byRubro.has(k));
  byRubro.forEach((_, k) => { if (!orderedKeys.includes(k)) orderedKeys.push(k); });

  rows.innerHTML = orderedKeys.map(key => {
    const items = byRubro.get(key);
    const rowId = 'rubroRow' + (rowIdCounter++);
    return '<div class="rubro-row">'
      + '<div class="rubro-row-head">'
      + '<h3>' + rubroLabel(key) + '<span class="rubro-row-count">' + items.length + '</span></h3>'
      + '<div class="rubro-row-nav">'
      + '<button type="button" aria-label="Ver anteriores" onclick="scrollRow(\'' + rowId + '\',-1)">‹</button>'
      + '<button type="button" aria-label="Ver siguientes" onclick="scrollRow(\'' + rowId + '\',1)">›</button>'
      + '</div></div>'
      + '<div class="rubro-row-scroll" id="' + rowId + '">' + items.map(cardHtml).join('') + '</div>'
      + '</div>';
  }).join('');
}

function renderCards(list, q) {
  CURRENT_RESULTS = list;
  const grid = document.getElementById('cardsGrid');
  const rows = document.getElementById('cardsRows');
  const count = document.getElementById('resultsCount');
  if (!grid) return;

  const rubroSel = document.getElementById('rubroSelect');
  const rubroFilter = rubroSel ? rubroSel.value : '';
  // "Navegando" (sin búsqueda ni rubro elegido) muestra filas tipo Netflix,
  // una por rubro. En cuanto hay una búsqueda o un rubro puntual elegido,
  // agrupar por rubro ya no suma nada — se muestra la grilla de siempre.
  const browsing = !q && !rubroFilter;

  if (count) {
    if (q) {
      count.textContent = list.length + (list.length === 1 ? ' comercio encontrado para "' : ' comercios encontrados para "') + document.getElementById('searchInput').value + '"';
    } else {
      count.textContent = list.length + ' comercios socios de la Cámara';
    }
  }

  if (browsing && rows) {
    grid.classList.add('hidden');
    rows.classList.remove('hidden');
    renderRubroRows(list);
  } else {
    if (rows) rows.classList.add('hidden');
    grid.classList.remove('hidden');
    renderFlatGrid(list);
  }

  // si la vista de mapa está activa, la mantenemos sincronizada con el resultado actual
  const mapView = document.getElementById('mapView');
  if (mapView && !mapView.classList.contains('hidden') && typeof renderMapMarkers === 'function') {
    renderMapMarkers(list);
  }
}

function renderCompareTable() {
  const body = document.getElementById('compareBody');
  if (!body) return;
  const rows = [
    { prod: 'Zapatillas urbanas talle 42', biz: 'Indumentaria Sur Moda', price: '$48.000' },
    { prod: 'Zapatillas urbanas talle 42', biz: 'Ropa de Trabajo El Overol', price: '$41.500' },
    { prod: 'Zapatillas urbanas talle 42', biz: 'Boutique Almafuerte', price: 'Consultar' }
  ];
  body.innerHTML = rows.map(r => {
    return '<tr><td><span class="prod-thumb">👟</span>' + r.prod + '</td><td>' + r.biz + '</td><td class="price">' + r.price + '</td><td><button class="btn btn-outline btn-sm" disabled>Consultar</button></td></tr>';
  }).join('');
}

/* ============================================================
   5) CUENTAS: registro y login
   ---------------------------------------------------------
   Si SHEETS_CONFIG.backendUrl está vacío, las cuentas funcionan como
   una maqueta guardada en localStorage: quedan solo en el navegador de
   quien se registra, no son compartidas ni visibles para nadie más.
   Si backendUrl apunta a un backend real (ver backend/Code.gs), las
   cuentas se guardan de verdad en una Google Sheet compartida — desde
   ahí (o desde admin.html) se pueden ver todas, y es lo que hace
   posible que el sistema de puntos funcione entre distintos comercios
   y vecinos de verdad.
   ============================================================ */

const USERS_KEY = 'calzadaCompraUsers';
const SESSION_KEY = 'calzadaCompraSession';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Hash de la contraseña antes de guardarla o enviarla. Con contexto seguro
// (https o localhost) usa SHA-256 nativo del navegador (crypto.subtle). Si no
// hay contexto seguro (por ejemplo, abriendo el archivo directo con file://),
// usa un hash simple de respaldo — no es criptográficamente fuerte, pero
// evita al menos manejar la contraseña en texto plano. En ningún caso la
// contraseña real viaja ni se guarda: solo este hash.
async function hashPassword(pw) {
  if (window.isSecureContext && window.crypto && crypto.subtle) {
    try {
      const enc = new TextEncoder().encode(pw);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return 'sha256:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // sigue al fallback
    }
  }
  let h = 0;
  for (let i = 0; i < pw.length; i++) { h = ((h << 5) - h) + pw.charCodeAt(i); h |= 0; }
  return 'fallback:' + h.toString(16);
}

function hasBackend() {
  return !!(SHEETS_CONFIG.backendUrl && SHEETS_CONFIG.backendUrl.trim());
}

// Llama al backend de Google Apps Script (ver backend/Code.gs). Usamos
// Content-Type text/plain a propósito: así el pedido cuenta como "simple"
// para el navegador y evita el preflight CORS que Apps Script no siempre
// responde bien. El propio backend igual lo interpreta como JSON.
async function backendCall(action, payload) {
  try {
    const res = await fetch(SHEETS_CONFIG.backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action }, payload))
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    console.error('Error llamando al backend (' + action + '):', err);
    return { ok: false, error: 'No pudimos conectar con el servidor de puntos/cuentas. Probá de nuevo — si sigue sin funcionar, entrá a admin.html y usá "Probar conexión con el backend" para ver el detalle exacto del problema.' };
  }
}

// Chequeo de diagnóstico: a diferencia de backendCall(), acá mostramos el
// error real (no un mensaje genérico) para poder detectar exactamente en
// qué paso está fallando la conexión con Apps Script (URL mal pegada,
// permisos de la implementación, el código no se guardó, etc.)
async function testBackendConnection() {
  if (!hasBackend()) {
    return { ok: false, error: 'SHEETS_CONFIG.backendUrl está vacío — todavía no pegaste la URL del backend en assets/site.js (y volviste a subir ese archivo a tu hosting).' };
  }
  let res;
  try {
    res = await fetch(SHEETS_CONFIG.backendUrl, { method: 'GET' });
  } catch (err) {
    return { ok: false, error: 'No se pudo conectar a esa URL (error de red/CORS): ' + err.message + '. Revisá que la URL sea correcta y que la implementación en Apps Script tenga "Quién tiene acceso: Cualquier usuario".' };
  }
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: 'El servidor respondió con un error HTTP ' + res.status + '. Contenido: ' + text.slice(0, 300) };
  }
  let json;
  try { json = JSON.parse(text); } catch (e) {
    return { ok: false, error: 'La URL respondió, pero no con el JSON esperado (¿es realmente la URL que termina en /exec, y no la de edición del script?). Respuesta recibida: ' + text.slice(0, 300) };
  }
  if (json && json.ok) {
    return {
      ok: true, msg: 'Conexión OK — el backend respondió: "' + json.msg + '".',
      spreadsheetName: json.spreadsheetName || '', spreadsheetUrl: json.spreadsheetUrl || ''
    };
  }
  return { ok: false, error: 'El backend respondió pero de forma inesperada: ' + JSON.stringify(json).slice(0, 300) };
}

// --- Cuentas en modo maqueta (localStorage), usado solo si no hay backend ---
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch (e) { return []; }
}
function saveUsers(users) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); return true; }
  catch (e) { return false; }
}
function findUserLocal(email) {
  const target = String(email).trim().toLowerCase();
  return getUsers().find(u => u.email.toLowerCase() === target);
}

// Un comercio recién registrado queda 'pendiente' hasta que la Cámara lo
// aprueba desde admin.html — mientras tanto no puede sumar/canjear puntos,
// no puede editar los datos de su tarjeta, y su tarjeta no aparece en la
// vidriera pública. Los vecinos no usan este campo.
const ESTADO_PENDIENTE = 'pendiente';
const ESTADO_APROBADO = 'aprobado';

// Independiente del estado de aprobación: un comercio ya aprobado puede
// quedar "desactivado" más adelante si no está al día con la cuota
// societaria (ver el botón "Activar/Desactivar" en admin.html) — deja de
// sumar/canjear puntos, de editar su tarjeta y de aparecer en la vidriera,
// sin volver a "pendiente" (no hace falta que la Cámara lo revise de
// nuevo). Mismo mirror que CUOTA_AL_DIA/CUOTA_VENCIDA en backend/Code.gs.
const CUOTA_AL_DIA = 'si';
const CUOTA_VENCIDA = 'no';

// --- Registro y login: eligen automáticamente backend real o maqueta local ---
async function registrarCuenta(user) {
  if (hasBackend()) return backendCall('register', user);
  if (findUserLocal(user.email)) {
    return { ok: false, error: 'Ya hay una cuenta registrada en este navegador con ese correo electrónico.' };
  }
  const estado = user.tipo === 'comerciante' ? ESTADO_PENDIENTE : '';
  const cuotaAlDia = user.tipo === 'comerciante' ? CUOTA_AL_DIA : '';
  const users = getUsers();
  const nuevo = Object.assign({ createdAt: new Date().toISOString(), estado, cuotaAlDia, descripcion: '', tags: '', sitioWeb: '', oferta: '', ofertaVence: '', logoUrl: '', logoHistorial: [] }, user);
  // En modo maqueta (sin backend) no hay Google Drive disponible: la imagen
  // ya redimensionada y comprimida (ver leerImagenComoBase64) se guarda
  // directo en este navegador como si fuera la URL del logo — así la demo
  // se puede probar de punta a punta sin depender de un backend real.
  if (user.logoBase64) nuevo.logoUrl = user.logoBase64;
  delete nuevo.logoBase64;
  users.push(nuevo);
  saveUsers(users);
  return { ok: true, user: nuevo };
}
async function loginCuenta(email, passwordHash) {
  if (hasBackend()) return backendCall('login', { email, passwordHash });
  const user = findUserLocal(email);
  if (!user) return { ok: false, error: 'No encontramos ninguna cuenta con ese correo en este navegador.' };
  if (user.passwordHash !== passwordHash) return { ok: false, error: 'La contraseña no es correcta.' };
  return { ok: true, user };
}

// Si el navegador bloquea localStorage (modo incógnito con "bloquear
// cookies/datos de sitios" activado, configuración de privacidad estricta,
// etc.), el sitio antes fallaba en silencio: la cuenta parecía crearse pero
// al recargar la página no había sesión, sin ningún aviso de por qué. Esto
// lo detecta apenas carga la página y lo avisa clarito, en vez de dejar que
// el usuario piense que el sitio está roto.
function localStorageDisponible_() {
  try {
    const testKey = '__calzada_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}
function wireLocalStorageWarning() {
  if (localStorageDisponible_()) return;
  const bar = document.createElement('div');
  bar.className = 'storage-warning';
  bar.innerHTML = '⚠️ Tu navegador está bloqueando el almacenamiento local de esta página (pasa, por ejemplo, en una ventana de incógnito con "bloquear cookies y datos de sitios" activado) — el sitio necesita eso para recordar tu cuenta y tus puntos. Activalo para este sitio en la configuración de privacidad de tu navegador, o abrí la página en una ventana normal.'
    + '<button type="button" class="storage-warning-close" aria-label="Cerrar aviso">✕</button>';
  const closeBtn = bar.querySelector('.storage-warning-close');
  if (closeBtn) closeBtn.addEventListener('click', () => bar.remove());
  if (document.body) document.body.insertBefore(bar, document.body.firstChild);
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch (e) { return null; }
}
// Guardamos también el teléfono (para mostrar el saldo de puntos del vecino)
// y el hash de la contraseña (nunca la contraseña real) — ese hash es lo que
// permite re-confirmar la identidad del comercio cada vez que suma o canjea
// puntos, sin pedirle que la vuelva a tipear en cada operación. Para un
// comercio guardamos además los datos de su tarjeta (para poder editarla
// sin pedirle que los vuelva a tipear) y el estado de aprobación. Para un
// vecino, guardamos la franja etaria y el género ya agrupados (nunca el
// año exacto) — así la analítica de clicks los puede usar sin tener que
// volver a calcularlos ni exponer el dato individual.
function setSession(user) {
  try {
    const anioActual = new Date().getFullYear();
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      email: user.email, nombre: user.nombre, tipo: user.tipo,
      telefono: user.telefono || '', passwordHash: user.passwordHash,
      direccion: user.direccion || '', rubro: user.rubro || '', tieneSitio: user.tieneSitio || '',
      descripcion: user.descripcion || '', tags: user.tags || '', sitioWeb: user.sitioWeb || '',
      oferta: user.oferta || '', ofertaVence: user.ofertaVence || '', logoUrl: user.logoUrl || '',
      logoHistorial: Array.isArray(user.logoHistorial) ? user.logoHistorial : [],
      estado: user.estado || '',
      cuotaAlDia: user.cuotaAlDia || '',
      franjaEtaria: user.tipo === 'vecino' ? franjaEtaria(user.anioNacimiento, anioActual) : '',
      genero: user.tipo === 'vecino' ? generoLabel(user.genero) : ''
    }));
  } catch (e) { /* localStorage no disponible: seguimos sin sesión persistida */ }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* noop */ }
}

// Reglas de contraseña pedidas: mínimo 8 caracteres, una mayúscula y un número.
function passwordRules(pw) {
  return {
    len: pw.length >= 8,
    upper: /[A-ZÁÉÍÓÚÑ]/.test(pw),
    num: /[0-9]/.test(pw)
  };
}
function passwordValid(pw) {
  const r = passwordRules(pw);
  return r.len && r.upper && r.num;
}
function updatePwChecklist(inputId, checklistId) {
  const input = document.getElementById(inputId);
  const ul = document.getElementById(checklistId);
  if (!input || !ul) return;
  const rules = passwordRules(input.value);
  ul.querySelectorAll('li').forEach(li => {
    const rule = li.getAttribute('data-rule');
    li.classList.toggle('ok', !!rules[rule]);
  });
}

// Barra de fuerza de la contraseña: además del checklist de reglas mínimas
// (que ya existía), suma una idea visual rápida de "qué tan fuerte es" —
// una contraseña puede cumplir las 3 reglas mínimas y aun así ser bastante
// débil (ej: "Aaaaaaa1"), así que acá se puntúa un poco más fino.
function passwordStrengthScore(pw) {
  if (!pw) return 0;
  const rules = passwordRules(pw);
  let score = 0;
  if (rules.len) score++;
  if (rules.upper) score++;
  if (rules.num) score++;
  if (pw.length >= 12) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++; // algún símbolo o espacio
  return score; // 0 a 5
}
function updatePwStrength(inputId, fillId, labelId) {
  const input = document.getElementById(inputId);
  const fill = document.getElementById(fillId);
  const label = document.getElementById(labelId);
  if (!input || !fill || !label) return;
  const pw = input.value;
  const score = passwordStrengthScore(pw);
  let nivel = 'debil', texto = 'Débil', pct = 0;
  if (!pw) {
    pct = 0; texto = '';
  } else if (score <= 2) {
    nivel = 'debil'; texto = 'Débil'; pct = 33;
  } else if (score <= 3) {
    nivel = 'media'; texto = 'Media'; pct = 66;
  } else {
    nivel = 'fuerte'; texto = 'Fuerte'; pct = 100;
  }
  fill.style.width = pct + '%';
  fill.classList.toggle('media', nivel === 'media');
  fill.classList.toggle('fuerte', nivel === 'fuerte');
  label.textContent = texto;
}
function wirePasswordFields() {
  [
    ['vecinoPassword', 'vecinoPwChecklist', 'vecinoPwStrengthFill', 'vecinoPwStrengthLabel'],
    ['comerciantePassword', 'comerciantePwChecklist', 'comerciantePwStrengthFill', 'comerciantePwStrengthLabel']
  ].forEach(([inputId, listId, fillId, labelId]) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', () => {
      updatePwChecklist(inputId, listId);
      updatePwStrength(inputId, fillId, labelId);
    });
  });
}

// Botón de "mostrar/ocultar" (ojito) en cualquier campo de contraseña —
// alterna el type entre password y text, así el usuario puede revisar lo
// que escribió antes de enviar el formulario.
function wirePasswordToggles() {
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-target'));
      if (!input) return;
      const mostrando = input.type === 'text';
      input.type = mostrando ? 'password' : 'text';
      btn.textContent = mostrando ? '👁️' : '🙈';
      btn.setAttribute('aria-label', mostrando ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
  });
}

// "Prefiero no decirlo" para el año de nacimiento: deshabilita y vacía el
// campo, para que quede claro que es una decisión y no un olvido.
function toggleAnioNacimiento() {
  const check = document.getElementById('vecinoAnioNoDecir');
  const input = document.getElementById('vecinoAnioNacimiento');
  if (!check || !input) return;
  input.disabled = check.checked;
  if (check.checked) input.value = '';
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}
function hideFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function renderNavActions() {
  const el = document.getElementById('navActions');
  if (!el) return;
  const session = getSession();
  if (session) {
    const label = session.nombre ? session.nombre.split(' ')[0] : session.email;
    let acciones;
    if (session.tipo === 'comerciante') {
      if (session.estado === ESTADO_APROBADO && session.cuotaAlDia !== CUOTA_VENCIDA) {
        acciones = '<button class="btn btn-outline btn-sm" onclick="openPuntosModal()">➕ Puntos</button>'
          + '<button class="btn btn-outline btn-sm" onclick="openMiComercioModal()">🏪 Mi comercio</button>';
      } else if (session.estado !== ESTADO_APROBADO) {
        acciones = '<span class="nav-pendiente" title="La Cámara todavía no aprobó tu comercio — puede demorar hasta 10 días desde el registro.">⏳ Pendiente de aprobación</span>';
      } else {
        acciones = '<span class="nav-pendiente" title="La Cámara desactivó tu comercio por falta de pago de la cuota societaria — regularizala y volvé a iniciar sesión.">🚫 Desactivado (cuota pendiente)</span>';
      }
    } else {
      acciones = '<button class="btn btn-outline btn-sm" onclick="openSaldoModal()">🏆 Mis puntos</button>';
    }
    el.innerHTML = '<div class="nav-user"><span>Hola, ' + escapeHtml(label) + '</span>'
      + acciones
      + '<button class="btn btn-outline btn-sm" onclick="logout()">Salir</button></div>';
  } else {
    el.innerHTML = '<button class="btn btn-outline btn-sm" onclick="openSaldoModal()">🏆 Puntos</button>'
      + '<button class="btn btn-outline btn-sm" onclick="openModal(\'login\')">Ingresar</button>'
      + '<button class="btn btn-navy btn-sm" onclick="openModal(\'vecino\')">Registrarme</button>';
  }
}
function logout() {
  clearSession();
  renderNavActions();
}

async function submitForm(e, type) {
  e.preventDefault();
  const prefix = type === 'vecino' ? 'vecino' : 'comerciante';
  const panelName = type === 'vecino' ? 'Vecino' : 'Comerciante';
  const errorId = prefix + 'FormError';
  hideFieldError(errorId);

  const email = document.getElementById(prefix + 'Email').value.trim();
  const pw = document.getElementById(prefix + 'Password').value;
  const pw2 = document.getElementById(prefix + 'Password2').value;

  if (!passwordValid(pw)) {
    showFieldError(errorId, 'La contraseña necesita mínimo 8 caracteres, una letra mayúscula y un número.');
    return false;
  }
  if (pw !== pw2) {
    showFieldError(errorId, 'Las contraseñas no coinciden.');
    return false;
  }

  const passwordHash = await hashPassword(pw);
  const user = {
    tipo: type,
    email,
    passwordHash,
    nombre: type === 'vecino'
      ? document.getElementById('vecinoNombre').value.trim()
      : document.getElementById('comercianteNombre').value.trim(),
    telefono: telefonoCompleto(prefix + 'Telefono')
  };
  if (type === 'vecino') {
    user.direccion = document.getElementById('vecinoDomicilio').value.trim();

    const anioInput = document.getElementById('vecinoAnioNacimiento');
    const anioNoDecir = document.getElementById('vecinoAnioNoDecir');
    const anioRaw = (anioNoDecir && anioNoDecir.checked) ? '' : (anioInput ? anioInput.value.trim() : '');
    if (anioRaw) {
      const anio = Number(anioRaw);
      const anioActual = new Date().getFullYear();
      if (!Number.isInteger(anio) || anio < 1900 || anio > anioActual) {
        showFieldError(errorId, 'El año de nacimiento no es válido (dejalo vacío o marcá "Prefiero no decirlo" si preferís no darlo).');
        return false;
      }
      user.anioNacimiento = anio;
    } else {
      user.anioNacimiento = '';
    }
    const generoSel = document.getElementById('vecinoGenero');
    user.genero = generoSel ? generoSel.value : '';
  } else {
    user.rubro = document.getElementById('rubroFormSelect').value;
    user.direccion = document.getElementById('comercianteDireccion').value.trim();
    user.tieneSitio = document.getElementById('tieneSitio').value;

    const logoInput = document.getElementById('comercianteLogo');
    const logoFile = logoInput && logoInput.files ? logoInput.files[0] : null;
    if (!logoFile) {
      showFieldError(errorId, 'Subí una foto del logo de tu comercio.');
      return false;
    }
    try {
      user.logoBase64 = await leerImagenComoBase64(logoFile);
    } catch (err) {
      showFieldError(errorId, err.message || 'No pudimos procesar la imagen del logo. Probá con otro archivo.');
      return false;
    }
  }

  const result = await registrarCuenta(user);
  if (!result.ok) {
    showFieldError(errorId, result.error || 'No pudimos crear la cuenta. Probá de nuevo.');
    return false;
  }

  setSession(Object.assign({}, user, result.user || {}));
  renderNavActions();

  document.getElementById('form' + panelName).classList.add('hidden');
  document.getElementById('confirm' + panelName).classList.remove('hidden');
  return false;
}

async function submitLogin(e) {
  e.preventDefault();
  hideFieldError('loginError');
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  const passwordHash = await hashPassword(pw);

  const result = await loginCuenta(email, passwordHash);
  if (!result.ok) {
    showFieldError('loginError', result.error || 'No pudimos iniciar sesión. Probá de nuevo.');
    return false;
  }

  setSession(result.user);
  renderNavActions();
  document.getElementById('formLogin').classList.add('hidden');
  document.getElementById('loginWelcomeMsg').textContent = 'Ingresaste como ' + (result.user.nombre || result.user.email) + '.';
  document.getElementById('confirmLogin').classList.remove('hidden');
  return false;
}

/* MODAL LOGIC */
// El registro de comercio ya no vive en este modal — está en la sección
// "Sumate a la Cámara" de index.html (ver toggleSumateForm), con el aviso
// de que la cuenta queda pendiente de aprobación. Este modal solo maneja
// login y registro de vecino.
function openModal(tab) {
  // al reabrir el modal, volvemos cada panel a su formulario (por si había
  // quedado mostrando el mensaje de confirmación de una vez anterior)
  ['Login', 'Vecino'].forEach(t => {
    const form = document.getElementById('form' + t);
    const confirmPanel = document.getElementById('confirm' + t);
    if (form) form.classList.remove('hidden');
    if (confirmPanel) confirmPanel.classList.add('hidden');
  });
  document.getElementById('modalOverlay').classList.add('open');
  switchTab(tab);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// Sección "Sumate a la Cámara" (#sumate, index.html): el formulario de
// registro de comercio arranca oculto y se despliega ahí mismo al tocar
// "Sumar mi comercio" — ya no abre el modal de login/vecino.
function toggleSumateForm() {
  const wrap = document.getElementById('sumateFormWrap');
  const btn = document.getElementById('sumateFormBtn');
  if (!wrap) return;
  wrap.classList.remove('hidden');
  if (btn) btn.classList.add('hidden');
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function switchTab(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabVecino').classList.toggle('active', tab === 'vecino');
  document.getElementById('paneLogin').classList.toggle('active', tab === 'login');
  document.getElementById('paneVecino').classList.toggle('active', tab === 'vecino');

  const titles = {
    login: 'Ingresá a tu cuenta',
    vecino: 'Registrate como vecino'
  };
  const subs = {
    login: 'Ingresá con el correo y la contraseña con los que te registraste.',
    vecino: 'Cargá tu domicilio y encontrá primero lo que tenés cerca.'
  };
  document.getElementById('modalTitle').textContent = titles[tab];
  document.getElementById('modalSub').textContent = subs[tab];
}

/* ============================================================
   6) FARMACIAS DE TURNO
   ---------------------------------------------------------
   Orden de fuentes (la primera que funcione, gana):
   1) La agenda pública en vivo de farmaturno.com.ar — fechas reales
      de turno por farmacia, se actualiza sola.
   2) La hoja de Google Sheets de farmaciasCsvUrl (día de la semana fijo,
      editable a mano por la Cámara).
   3) assets/data/farmacias.json (ejemplo local, siempre disponible).
   Si el navegador no puede acceder a farmaturno.com.ar (por ejemplo
   porque ese sitio no habilita CORS para otros dominios), se cae
   automáticamente a la fuente siguiente — nunca rompe la página.
   ============================================================ */

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const FARMATURNO_API_URL = 'https://farmaturno.com.ar/api/farmacias';

function todayYYYYMMDD() {
  const d = new Date();
  return '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

function fechaDesdeYYYYMMDD(yyyymmdd) {
  return new Date(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8));
}

function fechaCorta(yyyymmdd) {
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const f = fechaDesdeYYYYMMDD(yyyymmdd);
  return dias[f.getDay()] + ' ' + f.getDate() + '/' + (f.getMonth() + 1);
}

function fechaLarga(yyyymmdd) {
  const f = fechaDesdeYYYYMMDD(yyyymmdd);
  const dia = DIAS_SEMANA[f.getDay()];
  return dia.charAt(0).toUpperCase() + dia.slice(1) + ' ' + f.getDate() + ' de ' + MESES[f.getMonth()];
}

// "01-02-2026 al 15-02-2026" -> [Date, Date], o null si no hay formato reconocible.
function parseVacaciones(str) {
  if (!str) return null;
  const m = /(\d{2})-(\d{2})-(\d{4})\s*al\s*(\d{2})-(\d{2})-(\d{4})/.exec(str);
  if (!m) return null;
  const start = new Date(+m[3], +m[2] - 1, +m[1]);
  const end = new Date(+m[6], +m[5] - 1, +m[4]);
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

function estaDeVacaciones(farmacia, fecha) {
  const rango = parseVacaciones(farmacia.vacaciones);
  return !!rango && fecha >= rango[0] && fecha <= rango[1];
}

function farmaciasFromApi(items) {
  return (items || [])
    .filter(o => o && o.name)
    .map(o => ({
      name: o.name,
      addr: o.formatted_address || '',
      phone: (o.phone !== undefined && o.phone !== null) ? String(o.phone) : '',
      turnos: Array.isArray(o.turnos) ? o.turnos : [],
      vacaciones: o.vacaciones || ''
    }));
}

async function loadFarmacias() {
  // 1) Fuente en vivo: agenda pública de farmaturno.com.ar.
  try {
    const res = await fetch(FARMATURNO_API_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.Items || data.items || []);
    const parsed = farmaciasFromApi(items);
    if (!parsed.length) throw new Error('la API no devolvió farmacias');
    FARMACIAS = parsed;
    FARMACIAS_MODE = 'api';
    return true;
  } catch (err) {
    console.warn('No se pudo leer la agenda en vivo de farmaturno.com.ar (puede ser una restricción de CORS del lado de ese sitio) — se prueba con un respaldo.', err);
  }
  // 2) Respaldo editable desde Google Sheets (día de la semana fijo).
  if (SHEETS_CONFIG.farmaciasCsvUrl) {
    try {
      const res = await fetch(SHEETS_CONFIG.farmaciasCsvUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const parsed = farmaciasFromCsvObjects(csvToObjects(await res.text()));
      if (!parsed.length) throw new Error('la hoja no tiene filas válidas (revisá la columna dia_de_turno: domingo, lunes, martes...)');
      FARMACIAS = parsed;
      FARMACIAS_MODE = 'sheet';
      return true;
    } catch (err) {
      console.warn('No se pudo leer las farmacias desde Google Sheets — se usa assets/data/farmacias.json como respaldo.', err);
    }
  }
  // 3) Respaldo local de ejemplo.
  try {
    const res = await fetch('assets/data/farmacias.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    FARMACIAS = await res.json();
    FARMACIAS_MODE = 'local';
    return true;
  } catch (err) {
    console.error('Error cargando farmacias.json:', err);
    return false;
  }
}

// Fila por farmacia dentro del cuadro "de turno hoy": el nombre en grande y,
// en vez de la dirección completa, un botón chico "Ver en mapa" propio de
// esa farmacia (así cada una linkea a su propia ubicación, no a un recorrido
// combinado).
function turnoListHtml(list) {
  return '<div class="turno-list">' + list.map(f =>
    '<div class="turno-item">'
    + '<h3>' + f.name + '</h3>'
    + '<a class="turno-map-link" href="' + mapLink(f.addr) + '" target="_blank" rel="noopener" aria-label="Ver ' + f.name + ' en el mapa">📍 Ver en mapa</a>'
    + '</div>'
  ).join('') + '</div>';
}

function renderFarmaciasApi() {
  const hoyStr = todayYYYYMMDD();
  const hoyFecha = fechaDesdeYYYYMMDD(hoyStr);
  const turnoHoy = document.getElementById('farmaciaTurnoHoy');
  const disponiblesHoy = FARMACIAS.filter(f => f.turnos.includes(hoyStr) && !estaDeVacaciones(f, hoyFecha));

  if (turnoHoy) {
    if (disponiblesHoy.length) {
      turnoHoy.className = 'turno-card';
      turnoHoy.innerHTML =
        '<span class="turno-badge">De turno hoy · ' + fechaLarga(hoyStr) + '</span>'
        + turnoListHtml(disponiblesHoy);
    } else {
      turnoHoy.className = 'turno-loading';
      turnoHoy.innerHTML = '<b>No encontramos una farmacia de turno cargada para hoy en la agenda de farmaturno.com.ar.</b>';
    }
  }

  const semana = document.getElementById('farmaciaSemana');
  if (semana) {
    const porFecha = new Map();
    FARMACIAS.forEach(f => {
      f.turnos.forEach(fecha => {
        if (fecha < hoyStr) return; // solo de hoy en adelante
        if (!porFecha.has(fecha)) porFecha.set(fecha, []);
        porFecha.get(fecha).push(f);
      });
    });
    const fechas = Array.from(porFecha.keys()).sort().slice(0, 14);
    const filas = fechas.map(fecha => {
      const fechaObj = fechaDesdeYYYYMMDD(fecha);
      const farmacias = porFecha.get(fecha).filter(f => !estaDeVacaciones(f, fechaObj));
      if (!farmacias.length) return '';
      const isToday = fecha === hoyStr;
      const principal = farmacias[0];
      const nombres = farmacias.map(f => f.name).join(', ');
      return '<div class="farmacia-row' + (isToday ? ' is-today' : '') + '">'
        + '<span class="dia-tag">' + fechaCorta(fecha) + '</span>'
        + '<div><b>' + nombres + '</b><span class="addr">' + (principal.addr || '') + '</span></div>'
        + (principal.phone ? '<a class="btn btn-outline btn-sm" href="' + waLink(principal.phone, principal.name) + '" target="_blank" rel="noopener">Contactar</a>' : '<span></span>')
        + '</div>';
    }).filter(Boolean);
    semana.innerHTML = filas.length ? filas.join('') : '<p class="example-tag">No hay próximos turnos cargados todavía en la agenda.</p>';
  }
}

function renderFarmaciasFallback() {
  const hoyIdx = new Date().getDay();
  const turnoHoy = document.getElementById('farmaciaTurnoHoy');
  if (turnoHoy) {
    const deTurnoHoy = FARMACIAS.filter(f => f.turnoDia === hoyIdx);
    if (deTurnoHoy.length) {
      turnoHoy.className = 'turno-card';
      turnoHoy.innerHTML =
        '<span class="turno-badge">De turno hoy · ' + DIAS_SEMANA[hoyIdx] + '</span>'
        + turnoListHtml(deTurnoHoy);
    } else {
      turnoHoy.className = 'turno-loading';
      turnoHoy.innerHTML = '<b>No encontramos una farmacia de turno cargada para hoy.</b>';
    }
  }

  const semana = document.getElementById('farmaciaSemana');
  if (semana) {
    semana.innerHTML = FARMACIAS.slice().sort((a, b) => a.turnoDia - b.turnoDia).map(f => {
      const isToday = f.turnoDia === hoyIdx;
      const diaLabel = DIAS_SEMANA[f.turnoDia];
      return '<div class="farmacia-row' + (isToday ? ' is-today' : '') + '">'
        + '<span class="dia-tag">' + diaLabel.charAt(0).toUpperCase() + diaLabel.slice(1) + '</span>'
        + '<div><b>' + f.name + '</b><span class="addr">' + f.addr + '</span></div>'
        + '<a class="btn btn-outline btn-sm" href="' + waLink(f.phone, f.name) + '" target="_blank" rel="noopener">Contactar</a>'
        + '</div>';
    }).join('');
  }
}

function renderFarmaciasDisclaimer() {
  const el = document.getElementById('farmaciasDisclaimer');
  if (!el) return;
  if (FARMACIAS_MODE === 'api') {
    el.textContent = '* Turnos obtenidos en vivo desde la agenda pública de farmaturno.com.ar — se actualizan solos, no hace falta cargarlos a mano.';
  } else if (FARMACIAS_MODE === 'sheet') {
    el.textContent = '* No se pudo leer la agenda en vivo de farmaturno.com.ar en este momento — se muestran los turnos cargados a mano en la hoja de cálculo de la Cámara, como respaldo.';
  } else {
    el.textContent = '* Esta es una maqueta con farmacias y un cronograma de ejemplo (no se pudo leer ni la agenda en vivo de farmaturno.com.ar ni la hoja de cálculo de respaldo). El turno real de Rafael Calzada lo publica el Colegio de Farmacéuticos de la Provincia de Buenos Aires.';
  }
}

function renderFarmacias() {
  if (FARMACIAS_MODE === 'api') renderFarmaciasApi();
  else renderFarmaciasFallback();
  renderFarmaciasDisclaimer();
}

/* ============================================================
   7) PUNTOS DE FIDELIDAD
   ---------------------------------------------------------
   1 punto cada $1.000 de compra. Los puntos se identifican por el
   número de teléfono del vecino (no hace falta que tenga una cuenta
   creada) y solo una cuenta de tipo "comerciante" logueada puede
   sumarlos o canjearlos — eso ya es una primera barrera antifraude.
   Si SHEETS_CONFIG.backendUrl está configurado, todo esto se guarda
   de verdad y es compartido entre todos los comercios y vecinos (ver
   backend/Code.gs, que además pone topes por transacción y por día).
   Si no, funciona como una maqueta local en este navegador, para
   poder mostrar el flujo completo sin backend todavía.
   ============================================================ */

const PUNTOS_LOCAL_KEY = 'calzadaCompraPuntosLocal';
const PUNTOS_POR_CADA = 1000;

function getPuntosLocal() {
  try { return JSON.parse(localStorage.getItem(PUNTOS_LOCAL_KEY) || '{"movimientos":[],"canjes":[]}'); }
  catch (e) { return { movimientos: [], canjes: [] }; }
}
function savePuntosLocal(data) {
  try { localStorage.setItem(PUNTOS_LOCAL_KEY, JSON.stringify(data)); } catch (e) { /* noop */ }
}
function normTelefono(t) { return String(t || '').replace(/\D/g, ''); }
function calcularSaldoLocal(telefono) {
  const data = getPuntosLocal();
  const tel = normTelefono(telefono);
  const sumados = data.movimientos.filter(m => m.telefono === tel).reduce((a, m) => a + m.puntos, 0);
  const usados = data.canjes.filter(c => c.telefono === tel).reduce((a, c) => a + c.puntos, 0);
  return Math.max(0, sumados - usados);
}

function noAprobadoError_() {
  return { ok: false, error: 'Tu comercio todavía está pendiente de aprobación de la Cámara (puede demorar hasta 10 días desde el registro) — mientras tanto no podés sumar ni canjear puntos, ni editar los datos de tu comercio. Volvé a iniciar sesión más adelante para ver si ya te habilitaron.' };
}
function noCuotaError_() {
  return { ok: false, error: 'Tu comercio está desactivado por la Cámara (cuota societaria pendiente de pago) — mientras tanto no podés sumar ni canjear puntos, ni editar los datos de tu comercio, ni aparecés en la vidriera. Regularizá la cuota con la Cámara y volvé a iniciar sesión para ver si ya te reactivaron.' };
}

async function sumarPuntos(telefono, monto) {
  const session = getSession();
  if (!session || session.tipo !== 'comerciante') {
    return { ok: false, error: 'Solo una cuenta de comercio puede sumar puntos. Iniciá sesión como comerciante.' };
  }
  if (!hasBackend() && session.estado !== ESTADO_APROBADO) return noAprobadoError_();
  if (!hasBackend() && session.cuotaAlDia === CUOTA_VENCIDA) return noCuotaError_();
  if (hasBackend()) {
    return backendCall('sumarPuntos', {
      comercioEmail: session.email, comercioPasswordHash: session.passwordHash,
      telefono, monto
    });
  }
  const tel = normTelefono(telefono);
  const montoNum = Number(monto);
  if (!tel || tel.length < 8) return { ok: false, error: 'Ingresá un teléfono válido.' };
  if (!montoNum || montoNum <= 0) return { ok: false, error: 'Ingresá un monto de compra válido.' };
  const puntos = Math.floor(montoNum / PUNTOS_POR_CADA);
  const data = getPuntosLocal();
  data.movimientos.push({ fecha: new Date().toISOString(), comercioEmail: session.email, comercioNombre: session.nombre, telefono: tel, monto: montoNum, puntos });
  savePuntosLocal(data);
  return { ok: true, puntosSumados: puntos, saldoActual: calcularSaldoLocal(tel) };
}

async function canjearPuntos(telefono, puntos, descripcion) {
  const session = getSession();
  if (!session || session.tipo !== 'comerciante') {
    return { ok: false, error: 'Solo una cuenta de comercio puede canjear puntos. Iniciá sesión como comerciante.' };
  }
  if (!hasBackend() && session.estado !== ESTADO_APROBADO) return noAprobadoError_();
  if (!hasBackend() && session.cuotaAlDia === CUOTA_VENCIDA) return noCuotaError_();
  if (hasBackend()) {
    return backendCall('canjearPuntos', {
      comercioEmail: session.email, comercioPasswordHash: session.passwordHash,
      telefono, puntos, descripcion
    });
  }
  const tel = normTelefono(telefono);
  const puntosNum = Number(puntos);
  if (!tel || tel.length < 8) return { ok: false, error: 'Ingresá un teléfono válido.' };
  if (!puntosNum || puntosNum <= 0) return { ok: false, error: 'Ingresá una cantidad de puntos válida.' };
  const saldo = calcularSaldoLocal(tel);
  if (puntosNum > saldo) return { ok: false, error: 'Ese vecino solo tiene ' + saldo + ' puntos disponibles.' };
  const data = getPuntosLocal();
  data.canjes.push({ fecha: new Date().toISOString(), comercioEmail: session.email, comercioNombre: session.nombre, telefono: tel, puntos: puntosNum, descripcion: descripcion || '' });
  savePuntosLocal(data);
  return { ok: true, puntosUsados: puntosNum, saldoActual: calcularSaldoLocal(tel) };
}

async function consultarSaldo(telefono) {
  const tel = normTelefono(telefono);
  if (!tel || tel.length < 8) return { ok: false, error: 'Ingresá un teléfono válido.' };
  if (hasBackend()) return backendCall('saldoPuntos', { telefono: tel });
  return { ok: true, saldo: calcularSaldoLocal(tel) };
}

// Autogestión de la tarjeta de comercio — solo disponible una vez que la
// Cámara aprobó la cuenta (ver ESTADO_APROBADO). Actualiza rubro,
// descripción, dirección, teléfono, sitio web y tags.
async function actualizarComercio(datos) {
  const session = getSession();
  if (!session || session.tipo !== 'comerciante') {
    return { ok: false, error: 'Solo una cuenta de comercio puede editar su tarjeta.' };
  }
  if (session.estado !== ESTADO_APROBADO) return noAprobadoError_();
  if (session.cuotaAlDia === CUOTA_VENCIDA) return noCuotaError_();

  if (hasBackend()) {
    const result = await backendCall('actualizarComercio', Object.assign({
      email: session.email, passwordHash: session.passwordHash
    }, datos));
    if (result.ok) {
      // El backend sube la imagen a Drive y nos devuelve la URL final (sea
      // la nueva, si mandamos una, o la que ya tenía si no tocamos el logo),
      // más el historial de logos anteriores ya actualizado — nunca
      // guardamos logoBase64 (la imagen cruda) en la sesión.
      const datosSesion = Object.assign({}, datos);
      delete datosSesion.logoBase64;
      delete datosSesion.logoUrlHistorial;
      if (result.logoUrl !== undefined) datosSesion.logoUrl = result.logoUrl;
      if (result.logoHistorial !== undefined) datosSesion.logoHistorial = result.logoHistorial;
      setSession(Object.assign({}, session, datosSesion));
    }
    return result;
  }

  // En modo maqueta (sin backend): igual que en registrarCuenta(), si se
  // eligió un logo nuevo la imagen ya redimensionada se guarda directo como
  // logoUrl; el logo que tenía hasta ahora pasa al historial (más nuevo
  // primero, tope MAX_LOGO_HISTORIAL_LOCAL). Si en cambio se pidió volver a
  // uno de esos logos anteriores (logoUrlHistorial, ver
  // revertirLogoAnterior), se intercambian sin volver a subir nada.
  const users = getUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === session.email.toLowerCase());
  if (idx === -1) return { ok: false, error: 'No encontramos tu cuenta en este navegador.' };
  const datosLocal = Object.assign({}, datos);
  let logoUrl = users[idx].logoUrl || '';
  let historial = Array.isArray(users[idx].logoHistorial) ? users[idx].logoHistorial.slice() : [];
  if (datos.logoBase64) {
    const nuevoLogoUrl = datos.logoBase64;
    if (logoUrl && logoUrl !== nuevoLogoUrl) {
      historial = [logoUrl].concat(historial.filter(u => u !== nuevoLogoUrl)).slice(0, MAX_LOGO_HISTORIAL_LOCAL);
    }
    logoUrl = nuevoLogoUrl;
    datosLocal.logoUrl = logoUrl;
    datosLocal.logoHistorial = historial;
  } else if (datos.logoUrlHistorial && historial.indexOf(datos.logoUrlHistorial) !== -1) {
    const elegido = datos.logoUrlHistorial;
    if (logoUrl && logoUrl !== elegido) {
      historial = [logoUrl].concat(historial.filter(u => u !== elegido)).slice(0, MAX_LOGO_HISTORIAL_LOCAL);
    } else {
      historial = historial.filter(u => u !== elegido);
    }
    logoUrl = elegido;
    datosLocal.logoUrl = logoUrl;
    datosLocal.logoHistorial = historial;
  }
  delete datosLocal.logoBase64;
  delete datosLocal.logoUrlHistorial;
  users[idx] = Object.assign({}, users[idx], datosLocal);
  saveUsers(users);
  setSession(users[idx]);
  return { ok: true, logoUrl: logoUrl, logoHistorial: historial };
}

/* MODAL DE CONSULTA DE SALDO (para cualquier vecino, con o sin cuenta) */
function openSaldoModal() {
  const overlay = document.getElementById('saldoModalOverlay');
  if (!overlay) return;
  document.getElementById('saldoForm').classList.remove('hidden');
  document.getElementById('saldoResultado').classList.add('hidden');
  hideFieldError('saldoError');
  const session = getSession();
  const input = document.getElementById('saldoTelefono');
  if (input && session && session.telefono) {
    setPhoneInputValue('saldoTelefono', session.telefono);
    // Si ya sabemos su teléfono (vecino logueado), le mostramos el saldo directo.
    consultarYMostrarSaldo();
  } else if (input) {
    input.value = '';
  }
  overlay.classList.add('open');
}
function closeSaldoModal() {
  document.getElementById('saldoModalOverlay').classList.remove('open');
}
async function consultarYMostrarSaldo(e) {
  if (e) e.preventDefault();
  hideFieldError('saldoError');
  const telefono = telefonoCompleto('saldoTelefono');
  const result = await consultarSaldo(telefono);
  if (!result.ok) {
    showFieldError('saldoError', result.error || 'No pudimos consultar el saldo.');
    return false;
  }
  document.getElementById('saldoForm').classList.add('hidden');
  document.getElementById('saldoResultado').classList.remove('hidden');
  document.getElementById('saldoNumero').textContent = result.saldo;
  return false;
}
function volverAConsultarSaldo() {
  document.getElementById('saldoForm').classList.remove('hidden');
  document.getElementById('saldoResultado').classList.add('hidden');
}

/* MODAL DE COMERCIO: sumar / canjear puntos */
function openPuntosModal() {
  const overlay = document.getElementById('puntosModalOverlay');
  if (!overlay) return;
  ['Sumar', 'Canjear'].forEach(t => {
    const form = document.getElementById('form' + t + 'Puntos');
    const confirmPanel = document.getElementById('confirm' + t + 'Puntos');
    if (form) form.classList.remove('hidden');
    if (confirmPanel) confirmPanel.classList.add('hidden');
  });
  overlay.classList.add('open');
  switchPuntosTab('sumar');
}
function closePuntosModal() {
  document.getElementById('puntosModalOverlay').classList.remove('open');
}
function switchPuntosTab(tab) {
  document.getElementById('tabSumar').classList.toggle('active', tab === 'sumar');
  document.getElementById('tabCanjear').classList.toggle('active', tab === 'canjear');
  document.getElementById('paneSumar').classList.toggle('active', tab === 'sumar');
  document.getElementById('paneCanjear').classList.toggle('active', tab === 'canjear');
}
function updatePuntosPreview() {
  const monto = Number(document.getElementById('sumarMonto').value) || 0;
  const puntos = Math.floor(monto / PUNTOS_POR_CADA);
  document.getElementById('sumarPreview').textContent =
    'Se sumarán ' + puntos + ' punto' + (puntos === 1 ? '' : 's') + ' (1 punto cada $' + PUNTOS_POR_CADA.toLocaleString('es-AR') + ' de compra).';
}
async function submitSumarPuntos(e) {
  e.preventDefault();
  hideFieldError('sumarPuntosError');
  const telefono = telefonoCompleto('sumarTelefono');
  const monto = document.getElementById('sumarMonto').value;
  const result = await sumarPuntos(telefono, monto);
  if (!result.ok) {
    showFieldError('sumarPuntosError', result.error || 'No pudimos sumar los puntos.');
    return false;
  }
  document.getElementById('formSumarPuntos').classList.add('hidden');
  document.getElementById('confirmSumarPuntos').classList.remove('hidden');
  document.getElementById('sumarPuntosMsg').textContent =
    'Sumaste ' + result.puntosSumados + ' punto' + (result.puntosSumados === 1 ? '' : 's') + '. Ese vecino ahora tiene ' + result.saldoActual + ' puntos en total.';
  return false;
}
async function submitCanjearPuntos(e) {
  e.preventDefault();
  hideFieldError('canjearPuntosError');
  const telefono = telefonoCompleto('canjearTelefono');
  const puntos = document.getElementById('canjearPuntos').value;
  const descripcion = document.getElementById('canjearDescripcion').value.trim();
  const result = await canjearPuntos(telefono, puntos, descripcion);
  if (!result.ok) {
    showFieldError('canjearPuntosError', result.error || 'No pudimos canjear los puntos.');
    return false;
  }
  document.getElementById('formCanjearPuntos').classList.add('hidden');
  document.getElementById('confirmCanjearPuntos').classList.remove('hidden');
  document.getElementById('canjearPuntosMsg').textContent =
    'Descontaste ' + result.puntosUsados + ' punto' + (result.puntosUsados === 1 ? '' : 's') + '. Ese vecino le quedan ' + result.saldoActual + ' puntos.';
  return false;
}

/* MODAL: "Mi comercio" — el propio comercio carga/actualiza los datos de
   su tarjeta. Solo aparece (ver renderNavActions) una vez que la Cámara
   aprobó la cuenta. */
// Dibuja la galería de "logos anteriores" dentro de "Mi comercio" — cada uno
// con un botón para volver a usarlo sin tener que subir el archivo de
// nuevo. Se arma con elementos del DOM (no con HTML armado a mano) porque
// en modo maqueta (sin backend) cada logo es una data URL en base64 —
// larguísima y con comillas — que no conviene meter dentro de un atributo.
function renderLogoHistorial_(historial) {
  const wrap = document.getElementById('miComercioLogoHistorial');
  const lista = document.getElementById('miComercioLogoHistorialLista');
  if (!wrap || !lista) return;
  lista.innerHTML = '';
  const items = Array.isArray(historial) ? historial.filter(Boolean) : [];
  if (!items.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  items.forEach(url => {
    const item = document.createElement('div');
    item.className = 'logo-historial-item';
    const img = document.createElement('img');
    img.src = resolveLogoUrl(url) || '';
    img.alt = 'Uno de tus logos anteriores';
    img.onerror = () => { img.style.visibility = 'hidden'; };
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Usar este';
    btn.addEventListener('click', () => revertirLogoAnterior(url));
    item.appendChild(img);
    item.appendChild(btn);
    lista.appendChild(item);
  });
}
// Refresca la parte del modal "Mi comercio" relacionada al logo (el logo
// activo, el input de archivo + su vista previa, y la galería de
// historial) a partir de la sesión — se usa tanto al abrir el modal como
// después de guardar un cambio de logo, sin tener que cerrarlo y volver a
// abrirlo.
function refrescarLogoMiComercioUI_(session) {
  const logoActual = document.getElementById('miComercioLogoActual');
  const logoUrlActual = resolveLogoUrl(session.logoUrl);
  if (logoActual) {
    if (logoUrlActual) { logoActual.src = logoUrlActual; logoActual.classList.remove('hidden'); }
    else { logoActual.classList.add('hidden'); logoActual.src = ''; }
  }
  const logoInput = document.getElementById('miComercioLogo');
  if (logoInput) logoInput.value = '';
  const logoPreview = document.getElementById('miComercioLogoPreview');
  if (logoPreview) { logoPreview.classList.add('hidden'); logoPreview.src = ''; }
  renderLogoHistorial_(session.logoHistorial);
}
// Vuelve a un logo anterior sin subir ningún archivo nuevo — el backend (o,
// en modo maqueta, actualizarComercio() mismo) se encarga de intercambiarlo
// con el que está activo ahora. Al terminar, se vuelve a abrir el modal para
// que se vean el logo activo y el historial ya actualizados.
async function revertirLogoAnterior(url) {
  hideFieldError('miComercioError');
  document.getElementById('miComercioGuardadoMsg').classList.add('hidden');
  const result = await actualizarComercio({ logoUrlHistorial: url });
  if (!result.ok) {
    showFieldError('miComercioError', result.error || 'No pudimos volver a ese logo — probá de nuevo.');
    return;
  }
  openMiComercioModal();
  document.getElementById('miComercioGuardadoMsg').classList.remove('hidden');
}
function openMiComercioModal() {
  const overlay = document.getElementById('miComercioModalOverlay');
  const session = getSession();
  if (!overlay || !session) return;
  document.getElementById('miComercioRubro').value = session.rubro || '';
  document.getElementById('miComercioDescripcion').value = session.descripcion || '';
  document.getElementById('miComercioDireccion').value = session.direccion || '';
  setPhoneInputValue('miComercioTelefono', session.telefono);
  document.getElementById('miComercioTieneSitio').value = session.tieneSitio || 'no';
  document.getElementById('miComercioSitioWeb').value = session.sitioWeb || '';
  document.getElementById('miComercioTags').value = session.tags || '';
  document.getElementById('miComercioOferta').value = session.oferta || '';
  document.getElementById('miComercioOfertaVence').value = session.ofertaVence || '';
  toggleMiComercioSitioWeb();

  // Logo: mostramos el que ya tiene cargado (si tiene), el historial de
  // logos anteriores, y dejamos el input de archivo y la vista previa del
  // "nuevo" logo limpios — elegir un archivo acá es opcional, solo hace
  // falta si quiere reemplazarlo.
  refrescarLogoMiComercioUI_(session);

  hideFieldError('miComercioError');
  document.getElementById('miComercioGuardadoMsg').classList.add('hidden');
  overlay.classList.add('open');

  // Los contadores de caracteres solo se actualizan solos al escribir — como
  // acabamos de precargar los campos con lo que ya tenía guardado, hay que
  // refrescarlos acá para que no arranquen mostrando "0/N".
  ['miComercioDescripcion', 'miComercioDireccion', 'miComercioSitioWeb', 'miComercioTags', 'miComercioOferta']
    .forEach(id => {
      const input = document.getElementById(id);
      if (input) input.dispatchEvent(new Event('input'));
    });
}
function closeMiComercioModal() {
  document.getElementById('miComercioModalOverlay').classList.remove('open');
}
function toggleMiComercioSitioWeb() {
  const tieneSitio = document.getElementById('miComercioTieneSitio').value;
  const wrap = document.getElementById('miComercioSitioWebGroup');
  if (wrap) wrap.classList.toggle('hidden', tieneSitio !== 'si');
}
async function submitMiComercio(e) {
  e.preventDefault();
  hideFieldError('miComercioError');
  document.getElementById('miComercioGuardadoMsg').classList.add('hidden');

  const datos = {
    rubro: document.getElementById('miComercioRubro').value,
    descripcion: document.getElementById('miComercioDescripcion').value.trim(),
    direccion: document.getElementById('miComercioDireccion').value.trim(),
    telefono: telefonoCompleto('miComercioTelefono'),
    tieneSitio: document.getElementById('miComercioTieneSitio').value,
    sitioWeb: document.getElementById('miComercioSitioWeb').value.trim(),
    tags: document.getElementById('miComercioTags').value.trim(),
    oferta: document.getElementById('miComercioOferta').value.trim(),
    ofertaVence: document.getElementById('miComercioOfertaVence').value.trim()
  };

  // El logo es opcional acá: solo lo mandamos si eligió un archivo nuevo —
  // si no, ni se incluye la clave, así el backend deja el que ya tenía.
  const logoInput = document.getElementById('miComercioLogo');
  const logoFile = logoInput && logoInput.files ? logoInput.files[0] : null;
  if (logoFile) {
    try {
      datos.logoBase64 = await leerImagenComoBase64(logoFile);
    } catch (err) {
      showFieldError('miComercioError', err.message || 'No pudimos procesar la imagen del logo. Probá con otro archivo.');
      return false;
    }
  }

  const result = await actualizarComercio(datos);
  if (!result.ok) {
    showFieldError('miComercioError', result.error || 'No pudimos guardar los cambios.');
    return false;
  }
  document.getElementById('miComercioGuardadoMsg').classList.remove('hidden');
  // El logo (y su historial) puede haber cambiado — refrescamos esa parte
  // de la vista sin cerrar el modal ni perder de vista el mensaje recién
  // mostrado.
  const sessionActualizada = getSession();
  if (sessionActualizada) refrescarLogoMiComercioUI_(sessionActualizada);
  return false;
}

/* ============================================================
   PANEL DE ADMINISTRACIÓN (admin.html)
   ---------------------------------------------------------
   Página aparte, sin enlace público en el menú del sitio. Con
   backend configurado, la clave de administrador es la que se
   definió en backend/Code.gs (ADMIN_PASSWORD) y los datos vienen
   de la planilla real. Sin backend, funciona en modo demo local
   con la clave ADMIN_LOCAL_DEMO_PASSWORD de acá abajo, mostrando
   solo lo guardado en este navegador.
   ============================================================ */

const ADMIN_LOCAL_DEMO_PASSWORD = 'calzada-admin';
let ADMIN_PASSWORD_SESSION = '';

function adminLogin() {
  const pw = document.getElementById('adminPasswordInput').value;
  hideFieldError('adminError');
  ADMIN_PASSWORD_SESSION = pw;
  loadAdminData();
}

async function probarConexionBackend() {
  const el = document.getElementById('testConexionResultado');
  if (!el) return;
  el.textContent = 'Probando…';
  el.style.color = '';
  const result = await testBackendConnection();
  el.style.color = result.ok ? '#2f8f5b' : '#b23b3b';
  if (result.ok && result.spreadsheetUrl) {
    el.innerHTML = '✅ ' + escapeHtml(result.msg) + ' Está guardando los datos en la planilla: <b>'
      + '<a href="' + escapeHtml(result.spreadsheetUrl) + '" target="_blank" rel="noopener">' + escapeHtml(result.spreadsheetName) + '</a></b> — fijate que sea la que estás mirando.';
  } else {
    el.textContent = result.ok ? ('✅ ' + result.msg) : ('❌ ' + result.error);
  }
}

async function loadAdminData() {
  let usuarios, movimientos, canjes;
  if (hasBackend()) {
    const [resUsuarios, resMov] = await Promise.all([
      backendCall('adminListUsuarios', { adminPassword: ADMIN_PASSWORD_SESSION }),
      backendCall('adminListMovimientos', { adminPassword: ADMIN_PASSWORD_SESSION })
    ]);
    if (!resUsuarios.ok) {
      showFieldError('adminError', resUsuarios.error || 'Clave de administrador incorrecta.');
      return;
    }
    usuarios = resUsuarios.usuarios || [];
    movimientos = resMov.movimientos || [];
    canjes = resMov.canjes || [];
  } else {
    if (ADMIN_PASSWORD_SESSION !== ADMIN_LOCAL_DEMO_PASSWORD) {
      showFieldError('adminError', 'Clave incorrecta. En modo demo local la clave es "' + ADMIN_LOCAL_DEMO_PASSWORD + '" — configurá el backend real (ver backend/Code.gs) para usar tu propia clave.');
      return;
    }
    usuarios = getUsers();
    const data = getPuntosLocal();
    movimientos = data.movimientos;
    canjes = data.canjes;
  }
  renderAdminComercios(usuarios.filter(u => u.tipo === 'comerciante'));
  renderAdminVecinos(usuarios.filter(u => u.tipo === 'vecino'), movimientos, canjes);
  renderAdminMovimientos(movimientos, canjes);
  await loadAdminResumenPrincipal();
  document.getElementById('adminGate').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
}

function renderAdminComercios(comercios) {
  const body = document.getElementById('adminComerciosBody');
  if (!body) return;
  document.getElementById('adminComerciosCount').textContent =
    comercios.length + ' comercio' + (comercios.length === 1 ? '' : 's') + ' registrado' + (comercios.length === 1 ? '' : 's') + '.';
  if (!comercios.length) {
    body.innerHTML = '<tr><td colspan="10">Todavía no hay comercios registrados.</td></tr>';
    return;
  }
  body.innerHTML = comercios.map(u => {
    const aprobado = u.estado === ESTADO_APROBADO;
    const cuotaVencida = u.cuotaAlDia === CUOTA_VENCIDA;
    const emailAttr = escapeHtml(u.email || '').replace(/'/g, '&#39;');

    const accionAprobacion = aprobado
      ? '<button class="btn btn-outline btn-sm" onclick="toggleEstadoComercio(\'' + emailAttr + '\',\'' + ESTADO_PENDIENTE + '\')">Marcar pendiente</button>'
      : '<button class="btn btn-gold btn-sm" onclick="toggleEstadoComercio(\'' + emailAttr + '\',\'' + ESTADO_APROBADO + '\')">✅ Aprobar</button>';
    // La cuota solo importa una vez aprobado — un comercio pendiente todavía
    // no tuvo ocasión de pagar nada.
    const accionCuota = !aprobado ? '' : (cuotaVencida
      ? '<button class="btn btn-gold btn-sm" onclick="toggleCuotaComercio(\'' + emailAttr + '\',\'' + CUOTA_AL_DIA + '\')">✅ Activar</button>'
      : '<button class="btn btn-outline btn-sm" onclick="toggleCuotaComercio(\'' + emailAttr + '\',\'' + CUOTA_VENCIDA + '\')">🚫 Desactivar</button>');

    // Si el comercio ya cargó un logo (al registrarse o desde "Mi comercio"),
    // le sirve al admin para confirmar de un vistazo que la cuenta es
    // legítima antes de aprobarla. Si no cargó, o el link no carga, no queda
    // ningún hueco raro — simplemente no se muestra nada.
    const logoUrl = resolveLogoUrl(u.logoUrl);
    const logoCell = logoUrl
      ? '<img src="' + logoUrl + '" alt="Logo de ' + escapeHtml(u.nombre || '') + '" style="width:36px;height:36px;object-fit:cover;border-radius:8px;" onerror="this.remove()">'
      : '—';
    return '<tr>'
      + '<td>' + logoCell + '</td>'
      + '<td>' + escapeHtml(u.nombre || '') + '</td>'
      + '<td>' + escapeHtml(u.email || '') + '</td>'
      + '<td>' + escapeHtml(u.telefono || '') + '</td>'
      + '<td>' + escapeHtml(u.direccion || '') + '</td>'
      + '<td>' + escapeHtml(u.rubro || '') + '</td>'
      + '<td>' + escapeHtml(String(u.createdAt || '').slice(0, 10)) + '</td>'
      + '<td>' + (aprobado ? '✅ Aprobado' : '⏳ Pendiente') + '</td>'
      + '<td>' + (!aprobado ? '—' : (cuotaVencida ? '🚫 Vencida' : '✅ Al día')) + '</td>'
      + '<td>' + accionAprobacion + ' ' + accionCuota + '</td>'
      + '</tr>';
  }).join('');
}

// Puntos actuales de un vecino a partir de los movimientos/canjes ya
// cargados (los mismos que ya se piden para la tabla de "Movimientos y
// canjes" de más abajo) — evita pedirle una lista aparte al backend solo
// para poder ordenar a los vecinos por puntos.
function calcularSaldoDesdeListas_(telefono, movimientos, canjes) {
  const tel = normTelefono(telefono);
  const sumados = (movimientos || [])
    .filter(m => normTelefono(m.telefonoVecino || m.telefono) === tel && String(m.estado || 'confirmado') !== 'anulado')
    .reduce((a, m) => a + Number(m.puntos || 0), 0);
  const usados = (canjes || [])
    .filter(c => normTelefono(c.telefonoVecino || c.telefono) === tel && String(c.estado || 'confirmado') !== 'anulado')
    .reduce((a, c) => a + Number(c.puntos || 0), 0);
  return Math.max(0, sumados - usados);
}

function renderAdminVecinos(vecinos, movimientos, canjes) {
  const body = document.getElementById('adminVecinosBody');
  if (!body) return;
  document.getElementById('adminVecinosCount').textContent =
    vecinos.length + ' vecino' + (vecinos.length === 1 ? '' : 's') + ' registrado' + (vecinos.length === 1 ? '' : 's') + '.';
  if (!vecinos.length) {
    body.innerHTML = '<tr><td colspan="8">Todavía no hay vecinos registrados.</td></tr>';
    return;
  }
  const conPuntos = vecinos
    .map(u => Object.assign({ _puntos: calcularSaldoDesdeListas_(u.telefono, movimientos, canjes) }, u))
    .sort((a, b) => b._puntos - a._puntos);

  body.innerHTML = conPuntos.map(u => '<tr>'
    + '<td>' + escapeHtml(u.nombre || '') + '</td>'
    + '<td>' + escapeHtml(u.email || '') + '</td>'
    + '<td>' + escapeHtml(u.telefono || '') + '</td>'
    + '<td>' + escapeHtml(u.direccion || '') + '</td>'
    + '<td>' + escapeHtml(u.anioNacimiento ? String(u.anioNacimiento) : '—') + '</td>'
    + '<td>' + escapeHtml(generoLabel(u.genero)) + '</td>'
    + '<td>' + escapeHtml(String(u.createdAt || '').slice(0, 10)) + '</td>'
    + '<td><b>' + u._puntos + '</b></td>'
    + '</tr>').join('');
}

// La Cámara aprueba/desaprueba un comercio desde acá — recién ahí puede
// sumar/canjear puntos y su tarjeta se hace visible en la vidriera.
async function toggleEstadoComercio(email, nuevoEstado) {
  if (hasBackend()) {
    const result = await backendCall('adminSetEstadoComercio', { adminPassword: ADMIN_PASSWORD_SESSION, email: email, estado: nuevoEstado });
    if (!result || !result.ok) {
      // Antes esto fallaba en silencio (el botón parecía no hacer nada). Si
      // ves este cartel, lo más probable es que backend/Code.gs se haya
      // actualizado después de la última vez que hiciste "Implementar" en
      // Apps Script — hace falta repetir Implementar → Gestionar
      // implementaciones → editar → Nueva versión → Implementar para que el
      // sitio vea el cambio (la URL no cambia).
      alert('No pudimos actualizar el estado del comercio.\n\n' + (result && result.error ? result.error : 'Error desconocido al conectar con el backend.') + '\n\nSi hace poco modificaste backend/Code.gs, revisá que hayas vuelto a "Implementar → Gestionar implementaciones → editar → Nueva versión → Implementar" en Apps Script — si no, el sitio sigue hablando con la versión vieja del código.');
      return;
    }
  } else {
    const users = getUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) { users[idx].estado = nuevoEstado; saveUsers(users); }
  }
  await loadAdminData();
}

// La Cámara activa/desactiva un comercio YA APROBADO según esté al día o no
// con la cuota societaria — independiente de la aprobación (ver
// adminSetCuotaComercio_ en backend/Code.gs para el detalle).
async function toggleCuotaComercio(email, nuevaCuota) {
  if (hasBackend()) {
    const result = await backendCall('adminSetCuotaComercio', { adminPassword: ADMIN_PASSWORD_SESSION, email: email, cuotaAlDia: nuevaCuota });
    if (!result || !result.ok) {
      alert('No pudimos actualizar la cuota del comercio.\n\n' + (result && result.error ? result.error : 'Error desconocido al conectar con el backend.'));
      return;
    }
  } else {
    const users = getUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) { users[idx].cuotaAlDia = nuevaCuota; saveUsers(users); }
  }
  await loadAdminData();
}

function renderAdminMovimientos(movimientos, canjes) {
  const body = document.getElementById('adminMovimientosBody');
  if (!body) return;
  const filas = []
    .concat((movimientos || []).map(m => ({
      fecha: m.fecha, tipo: 'Suma',
      comercio: m.comercioNombre || m.comercioEmail || '',
      telefono: m.telefonoVecino || m.telefono || '',
      detalle: '$' + Number(m.monto || 0).toLocaleString('es-AR'),
      puntos: '+' + m.puntos, estado: m.estado || 'confirmado'
    })))
    .concat((canjes || []).map(c => ({
      fecha: c.fecha, tipo: 'Canje',
      comercio: c.comercioNombre || c.comercioEmail || '',
      telefono: c.telefonoVecino || c.telefono || '',
      detalle: c.descripcion || '',
      puntos: '-' + c.puntos, estado: c.estado || 'confirmado'
    })))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  if (!filas.length) {
    body.innerHTML = '<tr><td colspan="7">Todavía no hay movimientos de puntos.</td></tr>';
    return;
  }
  body.innerHTML = filas.map(f => '<tr' + (f.estado === 'anulado' ? ' style="opacity:.5;text-decoration:line-through;"' : '') + '>'
    + '<td>' + escapeHtml(String(f.fecha).slice(0, 16).replace('T', ' ')) + '</td>'
    + '<td>' + f.tipo + '</td>'
    + '<td>' + escapeHtml(String(f.comercio)) + '</td>'
    + '<td>' + escapeHtml(String(f.telefono)) + '</td>'
    + '<td>' + escapeHtml(String(f.detalle)) + '</td>'
    + '<td>' + f.puntos + ' pts</td>'
    + '<td>' + escapeHtml(f.estado) + '</td>'
    + '</tr>').join('');
}

// Franja etaria a partir del año de nacimiento — se usa tanto acá (modo
// demo local) como en backend/Code.gs (misma lógica, dos runtimes distintos).
// Nunca se muestra el año individual de nadie en la analítica, solo el
// conteo por franja.
function franjaEtaria(anioNacimiento, anioActual) {
  const a = Number(anioNacimiento);
  if (!a || a < 1900 || a > anioActual) return 'Sin especificar';
  const edad = anioActual - a;
  if (edad < 18) return 'Menos de 18';
  if (edad <= 25) return '18-25';
  if (edad <= 35) return '26-35';
  if (edad <= 45) return '36-45';
  if (edad <= 60) return '46-60';
  return '60+';
}
function generoLabel(g) {
  const norm = String(g || '').toLowerCase().trim();
  if (norm === 'femenino') return 'Femenino';
  if (norm === 'masculino') return 'Masculino';
  if (norm === 'otro') return 'Otro';
  return 'Sin especificar';
}

// Cuántas semanas hacia atrás cuenta como "reciente" para el número de
// visitantes únicos del panel principal — mismo valor que
// VENTANA_VISITANTES_SEMANAS en backend/Code.gs. El detalle completo (qué
// páginas, qué clicks, qué búsquedas, etc.) se procesa aparte sobre los
// registros del backend y se exporta como CSV (ver exportarAnaliticaAdmin
// más abajo).
const VENTANA_VISITANTES_SEMANAS = 4;

function visitantesUnicosRecientesLocal_(eventos, semanas) {
  const desde = Date.now() - semanas * 7 * 24 * 60 * 60 * 1000;
  const visitantes = {};
  (eventos || []).forEach(ev => {
    if (ev.tipo !== 'pageview' || !ev.sessionId) return;
    const t = new Date(ev.fecha).getTime();
    if (isNaN(t) || t < desde) return;
    visitantes[ev.sessionId] = true;
  });
  return Object.keys(visitantes).length;
}

async function loadAdminResumenPrincipal() {
  let visitantesUnicosRecientes = 0;
  if (hasBackend()) {
    const res = await backendCall('adminResumenPrincipal', { adminPassword: ADMIN_PASSWORD_SESSION });
    if (res.ok) visitantesUnicosRecientes = res.visitantesUnicosRecientes || 0;
  } else {
    visitantesUnicosRecientes = visitantesUnicosRecientesLocal_(getAnalyticsLocal(), VENTANA_VISITANTES_SEMANAS);
  }
  const totalesEl = document.getElementById('adminAnalyticsTotales');
  if (totalesEl) {
    totalesEl.innerHTML = '<div class="admin-stat-box"><b>' + visitantesUnicosRecientes + '</b>'
      + '<span>visitantes únicos (últimas ' + VENTANA_VISITANTES_SEMANAS + ' semanas)</span></div>';
  }
}

// Genera el CSV con el detalle completo de analítica (qué páginas, qué
// clicks, qué búsquedas, cuándo, franja etaria/género agrupado — nunca
// nombres ni datos personales) y lo guarda en una carpeta privada de Drive
// (dentro de la carpeta de logos, pero sin heredar su sharing público —
// ver el comentario de carpetaAnaliticaExports_ en backend/Code.gs).
// Solo funciona con el backend real configurado: en modo maqueta local no
// hay ningún Google Drive real donde guardar el archivo.
async function exportarAnaliticaAdmin() {
  const el = document.getElementById('adminExportarAnaliticaResultado');
  if (!hasBackend()) {
    if (el) el.textContent = 'La exportación a Drive necesita el backend real configurado (ver backend/Code.gs) — en modo maqueta local no hay ningún Google Drive donde guardar el archivo.';
    return;
  }
  if (el) { el.textContent = 'Generando el CSV…'; el.style.color = ''; }
  const result = await backendCall('adminExportarAnalitica', { adminPassword: ADMIN_PASSWORD_SESSION });
  if (!el) return;
  if (result.ok) {
    el.style.color = '#2f8f5b';
    el.innerHTML = '✅ Se guardó <b>' + escapeHtml(result.nombre || 'el archivo') + '</b> (' + (result.filas || 0) + ' filas) en una carpeta privada de tu Drive — '
      + (result.url ? '<a href="' + escapeHtml(result.url) + '" target="_blank" rel="noopener">abrirlo</a>.' : '');
  } else {
    el.style.color = '#b23b3b';
    el.textContent = '❌ ' + (result.error || 'No pudimos generar el CSV.');
  }
}

/* ============================================================
   ANALÍTICA DEL SITIO
   ---------------------------------------------------------
   Registra, de forma liviana y anónima (nada de nombres, ni IP, ni
   datos personales — solo un ID al azar por navegador, para poder
   contar "visitantes distintos"), qué páginas se visitan, en qué
   botones/links hace click la gente, qué buscan en el buscador de
   comercios, y cuánto tiempo se quedan en cada página. Se guarda en
   la misma planilla del backend real (hoja "Analitica"), o en
   localStorage si todavía no configuraste el backend. El resumen se
   ve en el panel de administración (admin.html).
   ============================================================ */
const ANALYTICS_LOCAL_KEY = 'calzadaAnalyticsLocal';
const ANALYTICS_VISITOR_KEY = 'calzadaVisitorId';
const ANALYTICS_EXCLUDE_PAGES = ['admin.html'];
const ANALYTICS_MAX_LOCAL_EVENTS = 500;

function analyticsPaginaActual() {
  return location.pathname.split('/').pop() || 'index.html';
}
function analyticsExcluida() {
  return ANALYTICS_EXCLUDE_PAGES.indexOf(analyticsPaginaActual()) !== -1;
}
function getVisitorId() {
  try {
    let id = localStorage.getItem(ANALYTICS_VISITOR_KEY);
    if (!id) {
      id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(ANALYTICS_VISITOR_KEY, id);
    }
    return id;
  } catch (e) { return 'sin-id'; }
}
function getAnalyticsLocal() {
  try { return JSON.parse(localStorage.getItem(ANALYTICS_LOCAL_KEY) || '[]'); }
  catch (e) { return []; }
}
function saveAnalyticsLocal(list) {
  try {
    if (list.length > ANALYTICS_MAX_LOCAL_EVENTS) list = list.slice(list.length - ANALYTICS_MAX_LOCAL_EVENTS);
    localStorage.setItem(ANALYTICS_LOCAL_KEY, JSON.stringify(list));
  } catch (e) { /* la analítica nunca debe romper el sitio */ }
}

// Envía un evento de analítica. Nunca bloquea ni rompe nada de la
// experiencia del vecino: si falla (sin conexión, backend caído, etc.)
// simplemente no queda registrado, sin mostrar ningún error visible.
function trackEvent(tipo, detalle) {
  try {
    if (analyticsExcluida()) return;
    const payload = {
      action: 'track', tipo: tipo, pagina: analyticsPaginaActual(),
      detalle: String(detalle == null ? '' : detalle).slice(0, 200),
      sessionId: getVisitorId(), ts: new Date().toISOString()
    };
    // Si hay un vecino logueado que además cargó edad/género (los dos
    // opcionales), se manda la ETIQUETA agrupada — nunca su identidad —
    // para poder segmentar la analítica sin saber quién hizo cada click.
    const session = getSession();
    if (session && session.tipo === 'vecino') {
      payload.franjaEtaria = session.franjaEtaria || '';
      payload.genero = session.genero || '';
    }
    if (hasBackend()) {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(SHEETS_CONFIG.backendUrl, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
      } else {
        fetch(SHEETS_CONFIG.backendUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, keepalive: true }).catch(() => {});
      }
    } else {
      const list = getAnalyticsLocal();
      list.push(payload);
      saveAnalyticsLocal(list);
    }
    if (SHEETS_CONFIG.gaMeasurementId && typeof gtag === 'function') {
      gtag('event', tipo, { pagina: payload.pagina, detalle: payload.detalle });
    }
  } catch (e) { /* noop */ }
}

// Tiempo en la página: se manda una sola vez, cuando la persona cambia
// de pestaña, cierra o navega a otra página.
let __analyticsPageStart = Date.now();
let __analyticsTiempoEnviado = false;
function __enviarTiempoEnPagina() {
  if (__analyticsTiempoEnviado) return;
  const segundos = Math.round((Date.now() - __analyticsPageStart) / 1000);
  if (segundos > 0 && segundos < 6 * 60 * 60) {
    __analyticsTiempoEnviado = true;
    trackEvent('tiempo', String(segundos));
  }
}

// Clicks: delegado en todo el documento — cualquier link o botón que se
// toque queda registrado con su texto (o su atributo data-track, para
// ponerle una etiqueta más clara a mano donde haga falta).
function wireAnalyticsClicks() {
  document.addEventListener('click', function (e) {
    const el = e.target.closest('a, button, [data-track]');
    if (!el) return;
    const label = el.getAttribute('data-track')
      || el.getAttribute('aria-label')
      || (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!label) return;
    trackEvent('click', label);
  });
}

function wireAnalytics() {
  if (analyticsExcluida()) return;
  loadGoogleAnalytics();
  trackEvent('pageview', document.title || analyticsPaginaActual());
  wireAnalyticsClicks();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') __enviarTiempoEnPagina();
  });
  window.addEventListener('pagehide', __enviarTiempoEnPagina);
}

// Carga Google Analytics (GA4) si se configuró un Measurement ID —
// opcional, además del registro propio en la planilla.
function loadGoogleAnalytics() {
  if (!SHEETS_CONFIG.gaMeasurementId) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(SHEETS_CONFIG.gaMeasurementId);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', SHEETS_CONFIG.gaMeasurementId);
}

/* ============================================================
   8) CARGA DE DATOS E INICIO
   ============================================================ */

// Parser de CSV chico (soporta campos entre comillas con comas o saltos
// de línea adentro, y comillas escapadas como ""). Alcanza para lo que
// exporta Google Sheets — no es para archivos CSV raros/no estándar.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // se ignora: el \n que sigue cierra la fila
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

// Convierte las filas del CSV en objetos {columna: valor}, usando la
// primera fila como encabezado (nombre, rubro, descripcion, etc. — los
// mismos nombres de columna que trae comercios.csv/farmacias.csv).
function csvToObjects(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] !== undefined ? r[i] : '').trim(); });
    return obj;
  });
}

function comerciosFromCsvObjects(objs) {
  return objs.filter(o => o.nombre).map(o => ({
    name: o.nombre,
    rubro: o.rubro,
    desc: o.descripcion,
    addr: o.direccion,
    phone: o.telefono,
    web: o.sitio_web ? o.sitio_web : null,
    logo: o.logo ? o.logo : null,
    tags: o.tags ? o.tags.split(/;\s*/).filter(Boolean) : [],
    // Columnas opcionales — el catálogo estático (comercios.csv/json) también
    // puede tener una oferta cargada a mano, igual que un comercio autogestionado.
    oferta: o.oferta || '',
    ofertaVence: o.oferta_vence || ''
  }));
}

function eventosFromCsvObjects(objs) {
  return objs
    .filter(o => o.titulo && o.fecha)
    .map(o => ({ title: o.titulo, fecha: o.fecha, hora: o.hora || '', lugar: o.lugar || '', desc: o.descripcion || '' }));
}

function actividadesFromCsvObjects(objs) {
  return objs
    .filter(o => o.titulo)
    .map(o => ({ title: o.titulo, desc: o.descripcion || '', frecuencia: o.frecuencia || '', modalidad: o.modalidad || '' }));
}

function dayNameToIndex(name) {
  const n = norm(name || '');
  return DIAS_SEMANA.findIndex(d => norm(d) === n);
}

function farmaciasFromCsvObjects(objs) {
  return objs
    .filter(o => o.nombre)
    .map(o => {
      let turnoDia = o.dia_de_turno ? dayNameToIndex(o.dia_de_turno) : -1;
      if (turnoDia < 0 && o.turno_dia !== undefined && o.turno_dia !== '') turnoDia = parseInt(o.turno_dia, 10);
      return { name: o.nombre, addr: o.direccion, phone: o.telefono, turnoDia };
    })
    .filter(f => Number.isInteger(f.turnoDia) && f.turnoDia >= 0 && f.turnoDia <= 6);
}

// Comercios que se registraron ellos mismos (ver #sumate) y ya fueron
// aprobados por la Cámara desde admin.html — conviven con el catálogo de
// comercios.csv/comercios.json de siempre, en el mismo formato de tarjeta.
// Mientras un comercio está "pendiente" no aparece acá.
async function loadComerciosRegistrados() {
  try {
    if (hasBackend()) {
      const res = await backendCall('listarComercios', {});
      return (res && res.ok && Array.isArray(res.comercios)) ? res.comercios : [];
    }
    return getUsers()
      .filter(u => u.tipo === 'comerciante' && u.estado === ESTADO_APROBADO && u.cuotaAlDia !== CUOTA_VENCIDA)
      .map(u => ({
        name: u.nombre || '', rubro: u.rubro || '', desc: u.descripcion || '',
        addr: u.direccion || '', phone: u.telefono || '',
        web: (u.tieneSitio === 'si' && u.sitioWeb) ? String(u.sitioWeb).replace(/^https?:\/\//i, '') : null,
        // En modo maqueta el logo se guardó directo como data URL (base64)
        // en registrarCuenta()/actualizarComercio() — resolveLogoUrl() lo
        // deja pasar tal cual porque no es un link de Drive.
        logo: u.logoUrl || null,
        tags: u.tags ? String(u.tags).split(/;\s*/).filter(Boolean) : [],
        oferta: u.oferta || '',
        ofertaVence: u.ofertaVence || ''
      }));
  } catch (e) {
    return [];
  }
}

async function loadBusinesses() {
  let ok = false;
  if (SHEETS_CONFIG.comerciosCsvUrl) {
    try {
      const res = await fetch(SHEETS_CONFIG.comerciosCsvUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const parsed = comerciosFromCsvObjects(csvToObjects(await res.text()));
      if (!parsed.length) throw new Error('la hoja no tiene filas con al menos la columna "nombre" cargada');
      BUSINESSES = parsed;
      ok = true;
    } catch (err) {
      console.warn('No se pudo leer el catálogo de comercios desde Google Sheets — se usa assets/data/comercios.json como respaldo.', err);
    }
  }
  if (!ok) {
    try {
      const res = await fetch('assets/data/comercios.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      BUSINESSES = await res.json();
      ok = true;
    } catch (err) {
      console.error('Error cargando comercios.json:', err);
    }
  }
  if (!ok) return false;

  const registrados = await loadComerciosRegistrados();
  if (registrados.length) BUSINESSES = BUSINESSES.concat(registrados);

  window.BUSINESSES = BUSINESSES; // visible para assets/semantic.js (es un módulo aparte)
  window.dispatchEvent(new Event('calzada:businesses-loaded'));
  return true;
}

/* ============================================================
   "Ofertas de la semana", "Eventos próximos" y "Actividades de
   la Cámara" — las tres secciones nuevas de la portada, debajo
   del hero corto.
   - Ofertas: se leen del mismo BUSINESSES (catálogo + comercios
     autogestionados) — cada uno carga la propia desde "Mi
     comercio" (o se la agrega a mano en comercios.json/csv), y
     desaparece sola si venció (ver isOfertaVigente más arriba).
   - Eventos y actividades: igual patrón dual que comercios/
     farmacias — Google Sheets publicada (opcional, ver
     SHEETS_CONFIG) o assets/data/eventos.json /
     actividades.json como respaldo/valor por defecto.
   ============================================================ */
let EVENTOS = [];
let ACTIVIDADES = [];

async function loadEventos() {
  if (SHEETS_CONFIG.eventosCsvUrl) {
    try {
      const res = await fetch(SHEETS_CONFIG.eventosCsvUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const parsed = eventosFromCsvObjects(csvToObjects(await res.text()));
      if (!parsed.length) throw new Error('la hoja no tiene filas con al menos "titulo" y "fecha" cargados');
      EVENTOS = parsed;
      return true;
    } catch (err) {
      console.warn('No se pudo leer los eventos desde Google Sheets — se usa assets/data/eventos.json como respaldo.', err);
    }
  }
  try {
    const res = await fetch('assets/data/eventos.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    EVENTOS = await res.json();
    return true;
  } catch (err) {
    console.error('Error cargando eventos.json:', err);
    return false;
  }
}

async function loadActividades() {
  if (SHEETS_CONFIG.actividadesCsvUrl) {
    try {
      const res = await fetch(SHEETS_CONFIG.actividadesCsvUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const parsed = actividadesFromCsvObjects(csvToObjects(await res.text()));
      if (!parsed.length) throw new Error('la hoja no tiene filas con al menos "titulo" cargado');
      ACTIVIDADES = parsed;
      return true;
    } catch (err) {
      console.warn('No se pudo leer las actividades desde Google Sheets — se usa assets/data/actividades.json como respaldo.', err);
    }
  }
  try {
    const res = await fetch('assets/data/actividades.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ACTIVIDADES = await res.json();
    return true;
  } catch (err) {
    console.error('Error cargando actividades.json:', err);
    return false;
  }
}

function formatFechaEvento(fechaStr) {
  const d = new Date(fechaStr + 'T00:00:00');
  if (isNaN(d.getTime())) return fechaStr;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderOfertas() {
  const el = document.getElementById('ofertasLista');
  const vacioEl = document.getElementById('ofertasVacio');
  if (!el) return;
  const list = (BUSINESSES || []).filter(b => b.oferta && isOfertaVigente(b.ofertaVence));
  if (!list.length) {
    el.innerHTML = '';
    if (vacioEl) vacioEl.classList.remove('hidden');
    return;
  }
  if (vacioEl) vacioEl.classList.add('hidden');
  el.innerHTML = list.map(b => (
    '<div class="oferta-card">'
    + '<span class="rubro-tag">' + rubroLabel(b.rubro) + '</span>'
    + '<h3>' + escapeHtml(b.name) + '</h3>'
    + '<p class="oferta-texto">🏷️ ' + escapeHtml(b.oferta) + '</p>'
    + (b.ofertaVence ? '<div class="oferta-vence">Válida hasta el ' + formatFechaEvento(b.ofertaVence) + '</div>' : '')
    + '</div>'
  )).join('');
}

// Solo eventos de hoy en adelante, del más próximo al más lejano — un
// evento con fecha ya pasada deja de mostrarse solo, sin que nadie tenga
// que borrarlo a mano de eventos.json/la planilla.
function renderEventos() {
  const el = document.getElementById('eventosLista');
  const vacioEl = document.getElementById('eventosVacio');
  if (!el) return;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const proximos = (EVENTOS || [])
    .filter(e => e && e.fecha)
    .map(e => Object.assign({}, e, { _d: new Date(e.fecha + 'T00:00:00') }))
    .filter(e => !isNaN(e._d.getTime()) && e._d.getTime() >= hoy.getTime())
    .sort((a, b) => a._d - b._d);
  if (!proximos.length) {
    el.innerHTML = '';
    if (vacioEl) vacioEl.classList.remove('hidden');
    return;
  }
  if (vacioEl) vacioEl.classList.add('hidden');
  el.innerHTML = proximos.map(e => (
    '<div class="evento-card">'
    + '<div class="evento-fecha">' + formatFechaEvento(e.fecha) + (e.hora ? ' · ' + escapeHtml(e.hora) : '') + '</div>'
    + '<h3>' + escapeHtml(e.title) + '</h3>'
    + (e.lugar ? '<div class="evento-lugar">📍 ' + escapeHtml(e.lugar) + '</div>' : '')
    + (e.desc ? '<p>' + escapeHtml(e.desc) + '</p>' : '')
    + '</div>'
  )).join('');
}

function renderActividades() {
  const el = document.getElementById('actividadesLista');
  const vacioEl = document.getElementById('actividadesVacio');
  if (!el) return;
  const list = ACTIVIDADES || [];
  if (!list.length) {
    el.innerHTML = '';
    if (vacioEl) vacioEl.classList.remove('hidden');
    return;
  }
  if (vacioEl) vacioEl.classList.add('hidden');
  el.innerHTML = list.map(a => (
    '<div class="actividad-card">'
    + '<h3>' + escapeHtml(a.title) + '</h3>'
    + (a.frecuencia ? '<div class="actividad-meta">🗓️ ' + escapeHtml(a.frecuencia) + '</div>' : '')
    + (a.modalidad ? '<div class="actividad-meta">📍 ' + escapeHtml(a.modalidad) + '</div>' : '')
    + (a.desc ? '<p>' + escapeHtml(a.desc) + '</p>' : '')
    + '</div>'
  )).join('');
}

async function init() {
  wireLocalStorageWarning();
  renderNavActions();
  wirePasswordFields();
  wirePasswordToggles();
  populateSelects();
  wireSearchEnter();
  wireMobileMenu();
  wireNavDropdown();
  ['comercianteTelefono', 'vecinoTelefono', 'saldoTelefono', 'sumarTelefono', 'canjearTelefono', 'miComercioTelefono']
    .forEach(wirePhoneInput);
  wireLogoPreview('comercianteLogo', 'comercianteLogoPreview');
  wireLogoPreview('miComercioLogo', 'miComercioLogoPreview');
  wireCharCounter('miComercioDescripcion', 'miComercioDescripcionCount');
  wireCharCounter('miComercioDireccion', 'miComercioDireccionCount');
  wireCharCounter('miComercioSitioWeb', 'miComercioSitioWebCount');
  wireCharCounter('miComercioTags', 'miComercioTagsCount');
  wireCharCounter('miComercioOferta', 'miComercioOfertaCount');
  wireAnalytics();

  const grid = document.getElementById('cardsGrid');
  if (grid) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><b>Cargando comercios…</b></div>';
    const ok = await loadBusinesses();
    if (!ok) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><b>No pudimos cargar el catálogo de comercios</b>Si abriste este archivo con doble clic desde tu computadora, el navegador bloquea la carga de assets/data/comercios.json por seguridad (CORS). Probalo subido a un hosting, o corriendo un servidor local (por ejemplo <code>python3 -m http.server</code>) y abriendo http://localhost:8000.</div>';
      return;
    }
    renderCards(BUSINESSES);
    renderCompareTable();
    if (typeof initMapView === 'function') initMapView();
  }

  const turnoEl = document.getElementById('farmaciaTurnoHoy');
  if (turnoEl) {
    const ok = await loadFarmacias();
    if (!ok) {
      turnoEl.className = 'turno-loading';
      turnoEl.innerHTML = '<b>No pudimos cargar las farmacias de turno</b><br>Si abriste este archivo con doble clic, corré un servidor local (<code>python3 -m http.server</code>) para probarlo — igual que con el catálogo de comercios.';
      return;
    }
    renderFarmacias();
  }

  // Portada (index.html): ofertas de la semana, eventos próximos y
  // actividades de la Cámara. Cada bloque es independiente — si uno falla
  // no afecta a los demás.
  const ofertasEl = document.getElementById('ofertasLista');
  if (ofertasEl) {
    if (BUSINESSES.length || await loadBusinesses()) renderOfertas();
  }
  const eventosEl = document.getElementById('eventosLista');
  if (eventosEl) {
    await loadEventos();
    renderEventos();
  }
  const actividadesEl = document.getElementById('actividadesLista');
  if (actividadesEl) {
    await loadActividades();
    renderActividades();
  }
}

init();

/* ============================================================
   8) PWA: registro del service worker (assets/../sw.js)
   ---------------------------------------------------------
   Con esto, el sitio queda instalable ("Agregar a pantalla de
   inicio") y funciona más rápido (y algo offline) en visitas
   siguientes. Si el navegador no soporta service workers, o si
   se abre el archivo con doble clic (file://) en vez de por un
   servidor, esto simplemente no hace nada — el sitio sigue
   funcionando igual, sin avisos de error.
   ============================================================ */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('No se pudo registrar el service worker (la PWA sigue sin instalar, pero el sitio funciona igual):', err);
    });
  });
}

/* ============================================================
   9) PWA: cartel para invitar a instalar la app
   ---------------------------------------------------------
   En Android/Chrome y en la computadora, el navegador avisa con
   el evento "beforeinstallprompt" que la app se puede instalar;
   ahí mostramos un cartel con un botón "Instalar" que dispara el
   instalador nativo del navegador (el mismo que aparecería solo,
   pero visible siempre, no escondido en un menú).
   En iPhone (Safari/iOS), Apple no le da a ningún sitio una forma
   de disparar la instalación por código — ni Calzada Digital ni
   ninguna otra app puede saltarse eso. Ahí lo único posible es un
   cartel bien visible con las instrucciones exactas (compartir →
   agregar a la pantalla de inicio), para que no dependa de que la
   persona sepa buscarlo sola.
   ============================================================ */
const INSTALL_DISMISS_KEY = 'calzadaInstallDismissedAt';
const INSTALL_DISMISS_DAYS = 14;
let deferredInstallPrompt = null;

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
function isStandaloneApp() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}
function installDismissedRecently() {
  try {
    const ts = +localStorage.getItem(INSTALL_DISMISS_KEY);
    return !!ts && (Date.now() - ts) < INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch (e) { return false; }
}
function dismissInstallBanner() {
  const el = document.getElementById('installBanner');
  if (el) el.remove();
  try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch (e) { /* noop */ }
}
function triggerInstallPrompt() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => {
    deferredInstallPrompt = null;
    dismissInstallBanner();
  });
}
function showInstallBanner(mode) {
  if (document.getElementById('installBanner') || isStandaloneApp() || installDismissedRecently()) return;
  const bar = document.createElement('div');
  bar.id = 'installBanner';
  bar.className = 'install-banner';
  bar.innerHTML = mode === 'ios'
    ? '<span class="install-banner-icon">📲</span>'
      + '<span class="install-banner-text"><b>Instalá Calzada Digital</b> — tocá <b>compartir</b> (el ícono ⬆️) y elegí <b>"Agregar a la pantalla de inicio"</b>.</span>'
      + '<button type="button" class="install-banner-close" onclick="dismissInstallBanner()" aria-label="Cerrar">✕</button>'
    : '<span class="install-banner-icon">📲</span>'
      + '<span class="install-banner-text"><b>Instalá Calzada Digital</b> en tu celular para acceder más rápido.</span>'
      + '<button type="button" class="btn btn-gold btn-sm" onclick="triggerInstallPrompt()">Instalar</button>'
      + '<button type="button" class="install-banner-close" onclick="dismissInstallBanner()" aria-label="Cerrar">✕</button>';
  document.body.appendChild(bar);
}
function wireInstallPrompt() {
  if (isStandaloneApp()) return; // ya la tiene instalada — no molestamos

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner('generic');
  });
  window.addEventListener('appinstalled', () => dismissInstallBanner());

  if (isIosDevice()) {
    // iOS nunca dispara beforeinstallprompt: este cartel con instrucciones
    // manuales es lo único que se puede ofrecer.
    showInstallBanner('ios');
  }
}
wireInstallPrompt();
