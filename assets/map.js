/* =========================================================
   Calzada Compra — capa de mapa
   ---------------------------------------------------------
   Muestra los comercios de la vidriera digital sobre un mapa
   navegable (Leaflet + OpenStreetMap), como capa alternativa
   a la vista de tarjetas.

   Por qué OpenStreetMap y no Google Maps directamente:
   la API de mapas de Google (Maps JavaScript API) requiere una
   API key asociada a una cuenta de Google Cloud con facturación
   habilitada. Como este es un prototipo estático sin backend,
   esta capa usa OpenStreetMap (gratis, sin API key) para que la
   demo funcione hoy mismo. El día que la Cámara tenga su propia
   API key de Google Maps, este archivo es el único que hay que
   tocar: se reemplaza el tileLayer de abajo por el de Google
   Maps y el resto (marcadores, popups, alternancia de vista)
   sigue funcionando igual.
   ========================================================= */

let MAP_INSTANCE = null;
let MAP_MARKERS = [];

// Centro aproximado de Rafael Calzada (estación Rafael Calzada, línea Roca)
const CALZADA_CENTER = [-34.8261, -58.3894];

// Coordenadas ilustrativas para ubicar cada comercio en el mapa.
// No son geocodificación real de la dirección (los comercios de este
// catálogo son ficticios) — son una dispersión determinística alrededor
// del centro de Calzada, así el mismo comercio siempre cae en el mismo
// punto y el mapa se ve poblado de forma pareja por todo el barrio.
function approxCoordsFor(business, indexGlobal) {
  const seed = ((business.name.length * 13 + (indexGlobal + 1) * 37) % 97);
  const angle = (seed / 97) * Math.PI * 2;
  const radius = 0.006 + (seed % 23) / 2600;
  return [
    CALZADA_CENTER[0] + Math.cos(angle) * radius,
    CALZADA_CENTER[1] + Math.sin(angle) * radius * 1.3
  ];
}

function ensureMap() {
  const el = document.getElementById('mapView');
  if (!el || typeof L === 'undefined') return null;
  if (MAP_INSTANCE) return MAP_INSTANCE;
  MAP_INSTANCE = L.map(el).setView(CALZADA_CENTER, 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores de OpenStreetMap</a>'
  }).addTo(MAP_INSTANCE);
  return MAP_INSTANCE;
}

function renderMapMarkers(list) {
  const map = ensureMap();
  if (!map) return;
  MAP_MARKERS.forEach(m => map.removeLayer(m));
  MAP_MARKERS = [];

  list.forEach(b => {
    const idxGlobal = BUSINESSES.indexOf(b);
    const coords = approxCoordsFor(b, idxGlobal < 0 ? 0 : idxGlobal);
    const marker = L.marker(coords).addTo(map);
    const webLine = b.web
      ? '<br><a href="https://' + b.web + '" target="_blank" rel="noopener">Ver sitio web</a>'
      : '';
    marker.bindPopup(
      '<b>' + b.name + '</b><br>' + rubroLabel(b.rubro) +
      '<br>' + b.addr +
      '<br><a href="' + mapLink(b.addr) + '" target="_blank" rel="noopener">Cómo llegar (Google Maps)</a>' +
      webLine
    );
    MAP_MARKERS.push(marker);
  });

  if (list.length) {
    const group = L.featureGroup(MAP_MARKERS);
    map.fitBounds(group.getBounds().pad(0.25));
  } else {
    map.setView(CALZADA_CENTER, 15);
  }
}

function initMapView() {
  const toggleCards = document.getElementById('viewCardsBtn');
  const toggleMap = document.getElementById('viewMapBtn');
  const cardsGrid = document.getElementById('cardsGrid');
  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  if (!toggleCards || !toggleMap || !cardsGrid || !mapView) return;

  toggleCards.addEventListener('click', () => {
    toggleCards.classList.add('active');
    toggleMap.classList.remove('active');
    cardsGrid.classList.remove('hidden');
    mapView.classList.add('hidden');
    if (mapNote) mapNote.classList.add('hidden');
  });

  toggleMap.addEventListener('click', () => {
    toggleMap.classList.add('active');
    toggleCards.classList.remove('active');
    mapView.classList.remove('hidden');
    cardsGrid.classList.add('hidden');
    if (mapNote) mapNote.classList.remove('hidden');
    // el mapa necesita medirse recién cuando el contenedor ya es visible
    setTimeout(() => {
      const map = ensureMap();
      if (map) {
        map.invalidateSize();
        renderMapMarkers(typeof CURRENT_RESULTS !== 'undefined' && CURRENT_RESULTS.length ? CURRENT_RESULTS : BUSINESSES);
      }
    }, 60);
  });
}
