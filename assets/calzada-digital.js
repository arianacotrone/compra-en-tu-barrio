/* =========================================================
   Calzada Digital — capa nueva (vidriera por categoría, historias,
   banners, seguir/dar like, cupones y analítica por comercio)
   ---------------------------------------------------------
   Se carga DESPUÉS de assets/site.js (y de assets/categorias.js) en
   todas las páginas — reutiliza sus funciones de siempre (sesión,
   backendCall, cardHtml, RUBROS, etc.) en vez de duplicarlas. Cada
   función de acá revisa primero si el elemento que necesita existe en
   la página, así este mismo archivo se puede incluir en todas partes
   sin romper nada.

   Igual que el resto del sitio: si SHEETS_CONFIG.backendUrl está
   vacío, todo esto funciona en modo maqueta guardado en localStorage
   (para poder probar y mostrar el flujo completo); con el backend real
   configurado (ver la sección nueva al final de backend/Code.gs), se
   guarda de verdad y es compartido entre todos.
   ========================================================= */

/* ---------------- 0) identidad del "seguidor" para el modo maqueta ---------------- */
// Sin backend, seguir/dar like/canjear un cupón se guarda en localStorage
// bajo un id propio del navegador (mismo mecanismo que getVisitorId() de
// site.js, pero separado: acá lo que importa es "quién sigue a quién", no
// solo contar visitantes). Con sesión de vecino iniciada, se usa su email
// en vez del id del navegador, así el seguimiento viaja con la cuenta
// apenas haya backend real.
function cdIdentidadLocal_() {
  const session = getSession();
  if (session && session.tipo === 'vecino') return 'v:' + session.email;
  try {
    let id = localStorage.getItem('calzadaDigitalGuestId');
    if (!id) { id = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('calzadaDigitalGuestId', id); }
    return id;
  } catch (e) { return 'g_sin-id'; }
}
function cdRequiereVecino_() {
  const session = getSession();
  return session && session.tipo === 'vecino';
}

const CD_FOLLOWS_KEY = 'calzadaDigitalFollowsLocal';
const CD_LIKES_KEY = 'calzadaDigitalLikesLocal';
const CD_CUPONES_KEY = 'calzadaDigitalCuponesLocal';

function cdLeerJSON_(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (e) { return fallback; }
}
function cdGuardarJSON_(key, valor) {
  try { localStorage.setItem(key, JSON.stringify(valor)); } catch (e) { /* noop */ }
}

function cdMisSeguidosLocal_() {
  const todos = cdLeerJSON_(CD_FOLLOWS_KEY, {});
  return todos[cdIdentidadLocal_()] || [];
}
function cdEstaSiguiendoLocal_(comercioId) {
  return cdMisSeguidosLocal_().indexOf(comercioId) !== -1;
}
function cdToggleSeguirLocal_(comercioId) {
  const todos = cdLeerJSON_(CD_FOLLOWS_KEY, {});
  const yo = cdIdentidadLocal_();
  const lista = todos[yo] || [];
  const i = lista.indexOf(comercioId);
  if (i === -1) lista.push(comercioId); else lista.splice(i, 1);
  todos[yo] = lista;
  cdGuardarJSON_(CD_FOLLOWS_KEY, todos);
  return i === -1; // true = ahora lo sigue
}
function cdMisLikesLocal_() {
  const todos = cdLeerJSON_(CD_LIKES_KEY, {});
  return todos[cdIdentidadLocal_()] || {};
}
function cdToggleLikeLocal_(targetId) {
  const todos = cdLeerJSON_(CD_LIKES_KEY, {});
  const yo = cdIdentidadLocal_();
  const mios = todos[yo] || {};
  mios[targetId] = !mios[targetId];
  todos[yo] = mios;
  cdGuardarJSON_(CD_LIKES_KEY, todos);
  return !!mios[targetId];
}

/* ---------------- 1) pie de navegación fijo (Home / Vidriera / Farmacias / Cuenta) ---------------- */
// La página incluye <div id="cdBottomNav"></div> justo antes de </body> —
// esto arma su contenido. Solo se ve en mobile (ver .cd-bottom-nav en
// assets/calzada-digital.css) — en escritorio se sigue usando el menú de
// siempre del header.
const CD_NAV_ICONS = {
  home: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  vidriera: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  farmacias: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  cuenta: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"/></svg>'
};
const CD_NAV_ITEMS = [
  { page: 'home', href: 'index.html', label: 'Home' },
  { page: 'vidriera', href: 'vidriera.html', label: 'Vidriera' },
  { page: 'farmacias', href: 'farmacias.html', label: 'Farmacias' },
  { page: 'cuenta', href: 'cuenta.html', label: 'Cuenta' }
];
function cdRenderBottomNav() {
  const mount = document.getElementById('cdBottomNav');
  if (!mount) return;
  const actual = document.body.dataset.page || '';
  mount.innerHTML = '<nav class="cd-bottom-nav" aria-label="Navegación principal">'
    + CD_NAV_ITEMS.map(function (item) {
      const activa = item.page === actual;
      return '<a href="' + item.href + '" class="' + (activa ? 'is-active' : '') + '">' + CD_NAV_ICONS[item.page] + '<span>' + item.label + '</span></a>';
    }).join('')
    + '</nav>';
}

/* ---------------- 2) historias: datos, orden y visor ---------------- */
// Formato de una historia/banner: { id, comercioId, comercioNombre, rubro,
// tipo:'historia'|'banner', texto, imagenUrl, publicadoAt, expiraAt, estado }
let CD_HISTORIAS = [];

async function cdCargarHistorias() {
  if (hasBackend()) {
    const res = await backendCall('listarHistoriasVigentes', {});
    if (res && res.ok && Array.isArray(res.historias)) { CD_HISTORIAS = res.historias; return CD_HISTORIAS; }
  }
  try {
    const res = await fetch('assets/data/historias.json');
    CD_HISTORIAS = await res.json();
  } catch (e) { CD_HISTORIAS = []; }
  return CD_HISTORIAS;
}

// Orden pedido: 1) comercios que seguís, 2) las que están por vencer,
// 3) las recién cargadas — sin tocar el resto del array más de lo
// necesario (un sort estable).
function cdOrdenarHistorias_(lista) {
  const siguiendo = cdMisSeguidosLocal_();
  return lista.slice().sort(function (a, b) {
    const aSigue = siguiendo.indexOf(a.comercioId) !== -1 ? 0 : 1;
    const bSigue = siguiendo.indexOf(b.comercioId) !== -1 ? 0 : 1;
    if (aSigue !== bSigue) return aSigue - bSigue;
    const aVence = new Date(a.expiraAt).getTime();
    const bVence = new Date(b.expiraAt).getTime();
    return aVence - bVence; // vence antes = más arriba
  });
}

function cdHorasRestantes_(expiraAt) {
  const ms = new Date(expiraAt).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 3600000));
}

// Rail de círculos por RUBRO (nivel raíz de la vidriera) — un círculo
// agrupa todas las historias vigentes de ese rubro.
function cdRenderStoriesPorRubro(historias) {
  const mount = document.getElementById('cdStoriesRubro');
  if (!mount) return;
  const porRubro = {};
  historias.forEach(function (h) { (porRubro[h.rubro] = porRubro[h.rubro] || []).push(h); });
  const keys = Object.keys(porRubro);
  if (!keys.length) { mount.innerHTML = ''; mount.closest('.cd-section') && mount.closest('.cd-section').classList.add('hidden'); return; }
  mount.closest('.cd-section') && mount.closest('.cd-section').classList.remove('hidden');
  mount.innerHTML = keys.map(function (rubro) {
    return '<button type="button" class="cd-story" onclick="cdAbrirHistoriasDeRubro(\'' + rubro + '\')">'
      + '<span class="cd-story__ring"><span class="cd-story__inner">' + (window.ICONS && ICONS[rubro] ? ICONS[rubro] : '🏷️') + '</span></span>'
      + '<span>' + rubroLabel(rubro) + '</span></button>';
  }).join('');
}

// Rail de círculos por COMERCIO (dentro de una categoría/rubro abierto).
function cdRenderStoriesPorComercio(historias, mountId) {
  const mount = document.getElementById(mountId || 'cdStoriesComercio');
  if (!mount) return;
  const porComercio = {};
  historias.forEach(function (h) { (porComercio[h.comercioId] = porComercio[h.comercioId] || []).push(h); });
  const ids = Object.keys(porComercio);
  const siguiendo = cdMisSeguidosLocal_();
  if (!ids.length) { mount.innerHTML = ''; return; }
  mount.innerHTML = ids.map(function (id) {
    const grupo = porComercio[id];
    const primero = grupo[0];
    const horas = Math.min.apply(null, grupo.map(function (h) { return cdHorasRestantes_(h.expiraAt); }));
    let claseRing = 'cd-story__ring';
    let badge = '';
    if (siguiendo.indexOf(id) !== -1) claseRing += ' following';
    else if (horas <= 4) { claseRing += ' expiring'; badge = '<span class="badge">' + horas + 'h</span>'; }
    return '<button type="button" class="cd-story" onclick="cdAbrirHistoriasDeComercio(\'' + id + '\')">'
      + badge
      + '<span class="' + claseRing + '"><span class="cd-story__inner">' + (window.ICONS && ICONS[primero.rubro] ? ICONS[primero.rubro] : '🏷️') + '</span></span>'
      + '<span>' + escapeHtml(primero.comercioNombre) + '</span></button>';
  }).join('');
}

let CD_VISOR_LISTA = [];
let CD_VISOR_INDEX = 0;
function cdAbrirHistoriasDeRubro(rubro) {
  const lista = cdOrdenarHistorias_(CD_HISTORIAS.filter(function (h) { return h.rubro === rubro; }));
  cdAbrirVisor_(lista);
}
function cdAbrirHistoriasDeComercio(comercioId) {
  const lista = CD_HISTORIAS.filter(function (h) { return h.comercioId === comercioId; });
  cdAbrirVisor_(lista);
}
function cdAbrirVisor_(lista) {
  if (!lista.length) return;
  CD_VISOR_LISTA = lista;
  CD_VISOR_INDEX = 0;
  cdMontarVisor_();
  cdPintarVisor_();
}
function cdMontarVisor_() {
  if (document.getElementById('cdVisor')) return;
  const div = document.createElement('div');
  div.id = 'cdVisor';
  div.className = 'cd-visor';
  document.body.appendChild(div);
}
function cdPintarVisor_() {
  const el = document.getElementById('cdVisor');
  if (!el || !CD_VISOR_LISTA.length) return;
  const h = CD_VISOR_LISTA[CD_VISOR_INDEX];
  const yaLike = !!cdMisLikesLocal_()['historia:' + h.id];
  el.innerHTML = ''
    + '<div class="cd-visor__inner">'
    + '<div class="cd-visor__segs">' + CD_VISOR_LISTA.map(function (_, i) {
        return '<i class="' + (i < CD_VISOR_INDEX ? 'seen' : (i === CD_VISOR_INDEX ? 'current' : 'pending')) + '"><b></b></i>';
      }).join('') + '</div>'
    + '<div class="cd-visor__top">'
    + '<span class="avatar">' + escapeHtml((h.comercioNombre || '?').slice(0, 2).toUpperCase()) + '</span>'
    + '<div><strong>' + escapeHtml(h.comercioNombre) + '</strong><small>' + rubroLabel(h.rubro) + ' · vence en ' + cdHorasRestantes_(h.expiraAt) + ' h</small></div>'
    + '<button type="button" class="x" onclick="cdCerrarVisor()">✕</button>'
    + '</div>'
    + '<div class="cd-visor__mid" onclick="cdVisorSiguiente_(event)">' + (h.imagenUrl ? '<img src="' + h.imagenUrl + '" alt="">' : '<span class="cd-visor__ph">' + (window.ICONS && ICONS[h.rubro] ? ICONS[h.rubro] : '🏷️') + '</span>') + '</div>'
    + '<div class="cd-visor__cap">'
    + '<p>' + escapeHtml(h.texto || '') + '</p>'
    + '<div class="cd-visor__row">'
    + '<button type="button" class="cd-heart-btn ' + (yaLike ? 'is-liked' : '') + '" onclick="CDlike(\'historia\',\'' + h.id + '\',\'' + h.comercioId + '\')">♥</button>'
    + '<a class="cd-visor__cta" href="' + waLink('', h.comercioNombre) + '" target="_blank" rel="noopener">Escribir por WhatsApp →</a>'
    + '</div></div></div>';
}
function cdVisorSiguiente_(e) {
  if (e) e.stopPropagation();
  CD_VISOR_INDEX++;
  if (CD_VISOR_INDEX >= CD_VISOR_LISTA.length) { cdCerrarVisor(); return; }
  cdPintarVisor_();
}
function cdCerrarVisor() {
  const el = document.getElementById('cdVisor');
  if (el) el.remove();
  CD_VISOR_LISTA = [];
}

/* ---------------- 3) seguir / dar like (usados desde las tarjetas y el visor) ---------------- */
async function CDseguir(comercioId, comercioNombre) {
  if (!cdRequiereVecino_()) { if (typeof openModal === 'function') openModal('login'); return; }
  const session = getSession();
  let siguiendoAhora;
  if (hasBackend()) {
    const res = await backendCall('seguirComercio', { vecinoEmail: session.email, vecinoPasswordHash: session.passwordHash, comercioId: comercioId });
    if (!res || !res.ok) { alert((res && res.error) || 'No pudimos guardar el seguimiento — probá de nuevo.'); return; }
    siguiendoAhora = res.siguiendo;
  } else {
    siguiendoAhora = cdToggleSeguirLocal_(comercioId);
  }
  cdEnhanceCards();
  return siguiendoAhora;
}
async function CDlike(tipo, targetId, comercioId) {
  if (!cdRequiereVecino_()) { if (typeof openModal === 'function') openModal('login'); return; }
  const session = getSession();
  let liked;
  if (hasBackend()) {
    const res = await backendCall('likear', { vecinoEmail: session.email, vecinoPasswordHash: session.passwordHash, tipo: tipo, targetId: targetId, comercioId: comercioId });
    if (!res || !res.ok) { alert((res && res.error) || 'No pudimos guardar el "me gusta" — probá de nuevo.'); return; }
    liked = res.liked;
  } else {
    liked = cdToggleLikeLocal_(tipo + ':' + targetId);
  }
  cdEnhanceCards();
  if (document.getElementById('cdVisor')) cdPintarVisor_();
  return liked;
}

// Le agrega a cada tarjeta ya renderizada (cardHtml, en site.js) la fila
// de "Seguir" + "♥ Me gusta" — se llama sola cada vez que la vidriera
// vuelve a pintar tarjetas (observamos el contenedor con MutationObserver
// en vez de tocar renderCards()/cardHtml() en site.js).
function cdEnhanceCards() {
  const siguiendo = cdMisSeguidosLocal_();
  const misLikes = cdMisLikesLocal_();
  document.querySelectorAll('[data-cd-card-social]').forEach(function (slot) {
    const id = slot.getAttribute('data-cd-card-social');
    if (slot.dataset.cdDone === id && slot.dataset.cdFollowState === (siguiendo.indexOf(id) !== -1 ? '1' : '0') && slot.dataset.cdLikeState === (misLikes['oferta:' + id] ? '1' : '0')) return;
    const card = slot.closest('.card');
    const nombre = card ? card.getAttribute('data-comercio-nombre') : '';
    const sig = siguiendo.indexOf(id) !== -1;
    const liked = !!misLikes['oferta:' + id];
    slot.innerHTML = ''
      + '<button type="button" class="cd-follow-btn ' + (sig ? 'is-following' : '') + '" onclick="CDseguir(\'' + id + '\',\'' + escapeHtml(nombre) + '\')">' + (sig ? '✓ Siguiendo' : '+ Seguir') + '</button>'
      + '<button type="button" class="cd-like-btn ' + (liked ? 'is-liked' : '') + '" onclick="CDlike(\'oferta\',\'' + id + '\',\'' + id + '\')">♥</button>';
    slot.dataset.cdDone = id;
    slot.dataset.cdFollowState = sig ? '1' : '0';
    slot.dataset.cdLikeState = liked ? '1' : '0';
  });
}
function cdObservarTarjetas() {
  ['cardsGrid', 'cardsRows'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    new MutationObserver(function () { cdEnhanceCards(); }).observe(el, { childList: true, subtree: true });
  });
}

/* ---------------- 4) vidriera raíz: categorías + toggle producto/servicio ---------------- */
let CD_MODO_BUSQUEDA = 'producto'; // 'producto' | 'servicio' — ver cdAplicarModoBusqueda_()
const CD_CATEGORIAS_SERVICIO = ['servicios', 'profesionales', 'salud'];

function cdRenderCategorias() {
  const mount = document.getElementById('cdCategorias');
  if (!mount || typeof CATEGORIAS === 'undefined') return;
  mount.innerHTML = CATEGORIAS.map(function (cat, i) {
    const accent = ACCENTS[i % ACCENTS.length];
    return '<a class="cd-tile" href="vidriera.html?cat=' + cat.key + '" style="--cd-tile-color:' + accent + '">'
      + '<span class="cd-tile__icon">' + cat.icon + '</span><span class="cd-tile__label">' + cat.label + '</span></a>';
  }).join('');
}

function cdWireModoBusqueda() {
  const grupo = document.getElementById('cdModoBusqueda');
  if (!grupo) return;
  grupo.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      grupo.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      CD_MODO_BUSQUEDA = btn.dataset.modo;
      trackEvent('modo_busqueda', CD_MODO_BUSQUEDA);
      cdAplicarModoBusqueda_();
    });
  });
}
// Reordena, dentro de lo que ya filtró/ordenó el buscador de site.js, los
// resultados según el modo elegido: si buscás "un servicio" los rubros de
// Servicios/Profesionales/Salud pasan primero (y al revés para
// "un producto") — así un taller mecánico no queda compitiendo mal
// rankeado contra una remera para la misma búsqueda. Es un reordenamiento
// simple sobre el resultado ya calculado, no toca el motor de búsqueda.
function cdAplicarModoBusqueda_() {
  const grid = document.getElementById('cardsGrid');
  if (!grid || grid.classList.contains('hidden')) return;
  const cards = Array.from(grid.children);
  if (!cards.length || typeof categoriaDeRubro === 'undefined') return;
  const esServicio = function (card) {
    // el rubro no viaja en el DOM, pero el ícono/CLASE del comercio sí —
    // lo simple y confiable es leerlo de CURRENT_RESULTS por índice de id.
    const id = card.getAttribute('data-comercio-id');
    const b = (window.CURRENT_RESULTS || []).find(function (x) { return (x.id || slugify(x.name)) === id; });
    if (!b) return false;
    return CD_CATEGORIAS_SERVICIO.indexOf(categoriaDeRubro(b.rubro)) !== -1;
  };
  const primero = cards.filter(function (c) { return esServicio(c) === (CD_MODO_BUSQUEDA === 'servicio'); });
  const segundo = cards.filter(function (c) { return esServicio(c) !== (CD_MODO_BUSQUEDA === 'servicio'); });
  primero.concat(segundo).forEach(function (c) { grid.appendChild(c); });
}

/* ---------------- 5) categoría abierta: subcategorías + filtra por rubro/tag ---------------- */
function cdInicializarCategoriaAbierta() {
  const params = new URLSearchParams(location.search);
  const catKey = params.get('cat');
  const mount = document.getElementById('cdSubcategorias');
  if (!catKey || !mount || typeof categoriaByKey === 'undefined') return;
  const cat = categoriaByKey(catKey);
  if (!cat) return;

  const titulo = document.getElementById('cdCategoriaTitulo');
  if (titulo) titulo.textContent = cat.label;
  document.getElementById('cdCategoriaRoot') && document.getElementById('cdCategoriaRoot').classList.add('hidden');
  document.getElementById('cdCategoriaAbierta') && document.getElementById('cdCategoriaAbierta').classList.remove('hidden');

  function aplicarSubcat(sub) {
    const input = document.getElementById('searchInput');
    const sel = document.getElementById('rubroSelect');
    if (sub && sub.rubro && sel) {
      sel.value = sub.rubro;
      if (input) input.value = '';
    } else if (sub && sub.tag && input) {
      sel && (sel.value = '');
      input.value = sub.tag;
    } else if (sel) {
      // "Más" / categoría completa: no filtra por un rubro puntual, pero
      // acota el resultado a los rubros de esta categoría (ver más abajo).
      sel.value = '';
      if (input) input.value = '';
    }
    if (typeof runSearch === 'function') runSearch();
    cdFiltrarPorCategoriaSiHaceFalta_(cat);
  }

  const pills = (cat.subcats || []).concat([{ label: 'Todo ' + cat.label }]);
  mount.innerHTML = pills.map(function (sub, i) {
    return '<button type="button" class="pill' + (i === pills.length - 1 ? ' is-active' : '') + '" data-i="' + i + '">' + sub.label + '</button>';
  }).join('');
  mount.querySelectorAll('.pill').forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      mount.querySelectorAll('.pill').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      aplicarSubcat(pills[i]);
    });
  });
  aplicarSubcat(pills[pills.length - 1]);

  // Historias de los comercios de ESTA categoría.
  cdCargarHistorias().then(function (historias) {
    const deLaCategoria = historias.filter(function (h) { return categoriaDeRubro(h.rubro) === cat.key; });
    cdRenderStoriesPorComercio(cdOrdenarHistorias_(deLaCategoria));
  });
}
// Cuando el rubro elegido no alcanza para acotar (pill "Todo X" o una
// subcategoría por tag), esto igual restringe la grilla a los rubros que
// pertenecen a la categoría — para no mezclar, p. ej., Construcción con
// Indumentaria dentro de la misma pantalla.
function cdFiltrarPorCategoriaSiHaceFalta_(cat) {
  const sel = document.getElementById('rubroSelect');
  if (sel && sel.value) return; // ya hay un rubro puntual elegido, no hace falta acotar más
  if (!window.CURRENT_RESULTS) return;
  const grid = document.getElementById('cardsGrid');
  const rows = document.getElementById('cardsRows');
  const target = (!grid.classList.contains('hidden')) ? grid : rows;
  if (!target) return;
  Array.from(target.querySelectorAll('.card')).forEach(function (card) {
    const id = card.getAttribute('data-comercio-id');
    const b = (window.CURRENT_RESULTS || []).find(function (x) { return (x.id || slugify(x.name)) === id; });
    const dentro = b && cat.rubros.indexOf(b.rubro) !== -1;
    card.style.display = dentro ? '' : 'none';
  });
}

/* ---------------- 6) "consultas más populares": se etiquetan las búsquedas ---------------- */
// Se envuelve runSearch() (función global de site.js) para, además de
// buscar como siempre, dejar registrado en la analítica qué búsqueda
// llevó a ver a cada comercio del resultado — sin tocar el motor de
// búsqueda. Con esto arma "Consultas más populares" en analitica.html
// (ver obtenerAnaliticaComercio_ en backend/Code.gs).
(function envolverRunSearch() {
  if (typeof window === 'undefined') return;
  const original = window.runSearch;
  if (typeof original !== 'function') return;
  window.runSearch = function () {
    original.apply(this, arguments);
    try {
      const q = (document.getElementById('searchInput') || {}).value || '';
      if (q.trim() && Array.isArray(window.CURRENT_RESULTS)) {
        window.CURRENT_RESULTS.slice(0, 8).forEach(function (b) {
          const id = b.id || slugify(b.name);
          trackEvent('consulta', 'consulta:' + id + '|' + q.trim().slice(0, 80));
        });
      }
    } catch (e) { /* la analítica nunca debe romper la búsqueda */ }
    cdAplicarModoBusqueda_();
  };
})();

/* ---------------- 7) Cuenta (comprador): puntos, cupones y feed de seguidos ---------------- */
async function cdRenderCuenta() {
  const mount = document.getElementById('cdCuenta');
  if (!mount) return;
  const session = getSession();

  if (!session) {
    mount.innerHTML = '<div class="cd-empty"><h3>Todavía no iniciaste sesión</h3>'
      + '<p>Iniciá sesión o registrate para ver tus puntos, tus cupones y las novedades de los comercios que seguís.</p>'
      + '<button class="btn btn-navy" type="button" onclick="openModal(\'login\')">Iniciar sesión</button></div>';
    return;
  }

  if (session.tipo === 'comerciante') {
    mount.innerHTML = '<div class="cd-comercio-links">'
      + '<h3>Hola, ' + escapeHtml(session.nombre) + '</h3>'
      + '<a class="cd-big-link" href="index.html#sumate"><span>🏪</span><div><b>Mi comercio</b><small>Editar tu tarjeta, oferta y logo</small></div></a>'
      + '<a class="cd-big-link" href="analitica.html"><span>📊</span><div><b>Tu analítica</b><small>Seguidores, likes, clicks a WhatsApp y consultas</small></div></a>'
      + '<a class="cd-big-link" href="publicar.html"><span>📸</span><div><b>Publicar historia o banner</b><small>24 horas o por los días que quieras</small></div></a>'
      + '</div>';
    return;
  }

  // Vecino: puntos + cupones + feed de seguidos.
  const telefono = normTelefono(session.telefono || '');
  const saldo = hasBackend()
    ? ((await backendCall('saldoPuntos', { telefono: telefono })).saldo || 0)
    : calcularSaldoLocal(telefono);

  let cupones = [];
  if (hasBackend()) {
    const res = await backendCall('listarCupones', {});
    if (res && res.ok) cupones = res.cupones;
  } else {
    try { cupones = await (await fetch('assets/data/cupones.json')).json(); } catch (e) { cupones = []; }
  }

  const siguiendo = cdMisSeguidosLocal_();
  await cdCargarHistorias();
  const feed = cdOrdenarHistorias_(CD_HISTORIAS.filter(function (h) { return siguiendo.indexOf(h.comercioId) !== -1; }));

  mount.innerHTML = ''
    + '<p class="section-label" style="margin-top:0;">Hola, ' + escapeHtml(session.nombre) + '</p>'
    + '<div class="cd-points-card"><div><span class="n">' + saldo + '</span><span class="lbl">Puntos acumulados</span></div>'
    + '<button type="button" onclick="openSaldoModal()">Ver detalle</button></div>'
    + '<p class="section-label">Cupones disponibles</p>'
    + '<div class="cd-coupons">' + (cupones.length ? cupones.map(function (c) {
        const alcanza = saldo >= Number(c.costoPuntos || 0);
        return '<div class="cd-coupon"><div class="ico">🎁</div><div class="info"><b>' + escapeHtml(c.titulo) + '</b><span>' + escapeHtml(c.comercioNombre) + ' · ' + c.costoPuntos + ' pts</span></div>'
          + '<button type="button" ' + (alcanza ? '' : 'class="locked" disabled') + ' onclick="CDcanjearCupon(\'' + c.id + '\')">' + (alcanza ? 'Canjear' : 'Te faltan ' + (Number(c.costoPuntos) - saldo)) + '</button></div>';
      }).join('') : '<p class="cd-empty-inline">Todavía no hay cupones cargados por los comercios.</p>') + '</div>'
    + '<p class="section-label">Historias y publicaciones de tus seguidos</p>'
    + (feed.length
        ? '<div class="cd-stories" id="cdFeedStories"></div><div class="cd-feed">' + feed.map(function (h) {
            return '<div class="cd-feed-item"><span class="avatar">' + escapeHtml(h.comercioNombre.slice(0, 2).toUpperCase()) + '</span>'
              + '<div><p><b>' + escapeHtml(h.comercioNombre) + '</b> ' + (h.tipo === 'banner' ? 'activó un banner' : 'publicó una historia') + (h.texto ? ': ' + escapeHtml(h.texto) : '') + '</p>'
              + '<small>vence en ' + cdHorasRestantes_(h.expiraAt) + ' h</small></div></div>';
          }).join('') + '</div>'
        : '<p class="cd-empty-inline">Todavía no seguís a ningún comercio — desde la vidriera, tocá "+ Seguir" en las tarjetas que te interesen.</p>');

  if (feed.length) cdRenderStoriesPorComercio(feed, 'cdFeedStories');
}
async function CDcanjearCupon(cuponId) {
  const session = getSession();
  if (!session || session.tipo !== 'vecino') { openModal('login'); return; }
  if (hasBackend()) {
    const res = await backendCall('canjearCupon', { vecinoEmail: session.email, vecinoPasswordHash: session.passwordHash, telefono: normTelefono(session.telefono || ''), cuponId: cuponId });
    if (!res || !res.ok) { alert((res && res.error) || 'No pudimos canjear el cupón.'); return; }
    alert('¡Listo! Mostrale esta pantalla al comercio para retirar tu ' + res.titulo + '.');
  } else {
    alert('Esto es una demo sin backend conectado: cuando conectes backend/Code.gs, el canje descuenta los puntos de verdad.');
  }
  cdRenderCuenta();
}

/* ---------------- 8) Analítica del comercio (analitica.html) ---------------- */
async function cdRenderAnalitica() {
  const mount = document.getElementById('cdAnalitica');
  if (!mount) return;
  const session = getSession();
  if (!session || session.tipo !== 'comerciante') {
    mount.innerHTML = '<div class="cd-empty"><h3>Esta página es solo para comercios</h3><p>Iniciá sesión con tu cuenta de comercio para ver tu analítica.</p><button class="btn btn-navy" type="button" onclick="openModal(\'login\')">Iniciar sesión</button></div>';
    return;
  }
  let rango = '7d';
  async function pintar() {
    let data = { seguidores: 0, likes7d: 0, clicksWa7d: 0, consultas: [] };
    if (hasBackend()) {
      const res = await backendCall('obtenerAnaliticaComercio', { email: session.email, passwordHash: session.passwordHash, rango: rango });
      if (res && res.ok) data = res;
      else { mount.innerHTML = '<p class="cd-empty-inline">' + escapeHtml((res && res.error) || 'No pudimos cargar tu analítica.') + '</p>'; return; }
    } else {
      data = { seguidores: cdContarLocal_(session), likes7d: 0, clicksWa7d: 0, consultas: [], demo: true };
    }
    mount.innerHTML = ''
      + '<p class="section-label" style="margin-top:0;">' + escapeHtml(session.nombre) + ' · privado, solo vos lo ves</p>'
      + (data.demo ? '<p class="cd-empty-inline">Modo demo (sin backend conectado): "seguidores" cuenta lo guardado en este navegador; likes, clicks y consultas necesitan el backend real para acumularse entre visitantes — ver backend/Code.gs.</p>' : '')
      + '<div class="cd-kpis">'
      + '<div class="cd-kpi"><b>' + data.seguidores + '</b><span>Seguidores</span></div>'
      + '<div class="cd-kpi"><b>' + data.likes7d + '</b><span>Likes a tus historias y ofertas (7 días)</span></div>'
      + '<div class="cd-kpi"><b>' + data.clicksWa7d + '</b><span>Clicks a WhatsApp (7 días)</span></div>'
      + '</div>'
      + '<p class="section-label">Consultas más populares</p>'
      + '<div class="segmented" id="cdRango"><button data-r="24h" class="' + (rango === '24h' ? 'is-active' : '') + '">24 horas</button><button data-r="7d" class="' + (rango === '7d' ? 'is-active' : '') + '">7 días</button><button data-r="30d" class="' + (rango === '30d' ? 'is-active' : '') + '">30 días</button></div>'
      + '<div class="cd-rank">' + (data.consultas.length ? data.consultas.map(function (c) {
          const max = data.consultas[0].n || 1;
          return '<div class="rank-row"><span class="term">' + escapeHtml(c.termino) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.round((c.n / max) * 100) + '%"></span></span><span class="n">' + c.n + '</span></div>';
        }).join('') : '<p class="cd-empty-inline">Todavía no hay consultas registradas en este período.</p>') + '</div>'
      + '<div class="premium-card"><span class="tag">Analítica Premium</span><h4>Sacale más jugo a tus datos</h4>'
      + '<ul><li>Comparación con el resto de tu rubro</li><li>Evolución en el tiempo, con gráfico</li><li>Quién te empezó a seguir esta semana</li><li>Exportar todo a Excel/CSV</li></ul>'
      + '<button type="button" onclick="alert(\'Escribinos por WhatsApp para sumarte a Analítica Premium.\')">Quiero saber más</button></div>';
    document.querySelectorAll('#cdRango button').forEach(function (btn) {
      btn.addEventListener('click', function () { rango = btn.dataset.r; pintar(); });
    });
  }
  pintar();
}
function cdContarLocal_(session) {
  const todos = cdLeerJSON_(CD_FOLLOWS_KEY, {});
  const miId = session.id || slugify(session.nombre);
  let n = 0;
  Object.keys(todos).forEach(function (k) { if ((todos[k] || []).indexOf(miId) !== -1) n++; });
  return n;
}

/* ---------------- 9) Publicar historia o banner (publicar.html) ---------------- */
const CD_HISTORIA_MAX_DIM = 1080;
function cdLeerImagenHistoria(file) {
  return new Promise(function (resolve, reject) {
    if (!file) { resolve(''); return; }
    if (!file.type || file.type.indexOf('image/') !== 0) { reject(new Error('Tiene que ser una imagen (jpg, png o webp).')); return; }
    if (file.size > 8 * 1024 * 1024) { reject(new Error('La imagen pesa demasiado (máximo 8MB).')); return; }
    const reader = new FileReader();
    reader.onerror = function () { reject(new Error('No pudimos leer el archivo.')); };
    reader.onload = function () {
      const img = new Image();
      img.onerror = function () { reject(new Error('No pudimos leer esa imagen.')); };
      img.onload = function () {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > CD_HISTORIA_MAX_DIM || h > CD_HISTORIA_MAX_DIM) {
          const ratio = Math.min(CD_HISTORIA_MAX_DIM / w, CD_HISTORIA_MAX_DIM / h);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function cdWirePublicar() {
  const form = document.getElementById('cdPublicarForm');
  if (!form) return;
  const session = getSession();
  const aviso = document.getElementById('cdPublicarAviso');
  if (!session || session.tipo !== 'comerciante') {
    form.classList.add('hidden');
    if (aviso) { aviso.classList.remove('hidden'); aviso.innerHTML = 'Iniciá sesión con tu cuenta de comercio para publicar una historia o un banner. <button class="btn btn-navy btn-sm" type="button" onclick="openModal(\'login\')">Iniciar sesión</button>'; }
    return;
  }
  const tipoGrupo = document.getElementById('cdTipoPublicacion');
  const diasWrap = document.getElementById('cdDiasBanner');
  let tipo = 'historia', dias = 3;
  if (tipoGrupo) tipoGrupo.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      tipoGrupo.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      tipo = btn.dataset.tipo;
      if (diasWrap) diasWrap.classList.toggle('hidden', tipo !== 'banner');
    });
  });
  if (diasWrap) diasWrap.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      diasWrap.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      dias = Number(chip.dataset.dias);
    });
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const status = document.getElementById('cdPublicarStatus');
    const imagenInput = document.getElementById('cdImagenInput');
    const comprobanteInput = document.getElementById('cdComprobanteInput');
    const texto = (document.getElementById('cdTextoHistoria') || {}).value || '';
    if (!imagenInput.files[0]) { status.textContent = 'Falta la imagen o video.'; return; }
    if (!comprobanteInput.files[0]) { status.textContent = 'Falta el comprobante de la transferencia.'; return; }
    btn.disabled = true; status.textContent = 'Subiendo…';
    try {
      const imagenBase64 = await cdLeerImagenHistoria(imagenInput.files[0]);
      const comprobanteBase64 = await cdLeerImagenHistoria(comprobanteInput.files[0]);
      if (hasBackend()) {
        const res = await backendCall('cargarHistoriaBanner', {
          email: session.email, passwordHash: session.passwordHash,
          tipo: tipo, diasBanner: dias, texto: texto,
          imagenBase64: imagenBase64, comprobanteBase64: comprobanteBase64
        });
        if (!res || !res.ok) { status.textContent = (res && res.error) || 'No pudimos enviarlo — probá de nuevo.'; btn.disabled = false; return; }
      } else {
        await new Promise(function (r) { setTimeout(r, 400); }); // simula el envío en modo demo
      }
      status.textContent = '¡Listo! Queda pendiente de aprobación — te avisamos por WhatsApp dentro de las próximas 24 hs.';
      form.reset();
    } catch (err) {
      status.textContent = err.message || 'Ocurrió un error — probá de nuevo.';
    }
    btn.disabled = false;
  });
}

/* ---------------- 10) admin.html: aprobar historias/banners ---------------- */
async function cdCargarAdminHistorias() {
  const body = document.getElementById('cdAdminHistoriasBody');
  if (!body || typeof ADMIN_PASSWORD_SESSION === 'undefined' || !ADMIN_PASSWORD_SESSION) return;
  const res = await backendCall('adminListHistorias', { adminPassword: ADMIN_PASSWORD_SESSION });
  if (!res || !res.ok) return;
  body.innerHTML = res.historias.map(function (h) {
    return '<tr><td>' + escapeHtml(h.comercioNombre) + '</td><td>' + h.tipo + '</td>'
      + '<td>' + (h.imagenUrl ? '<a href="' + h.imagenUrl + '" target="_blank" rel="noopener">Ver imagen</a>' : '') + '</td>'
      + '<td>' + (h.comprobanteUrl ? '<a href="' + h.comprobanteUrl + '" target="_blank" rel="noopener">Ver comprobante</a>' : '') + '</td>'
      + '<td>' + String(h.fecha || '').slice(0, 10) + '</td>'
      + '<td>' + (h.estado === 'aprobado' ? '✅ Aprobado' : (h.estado === 'rechazado' ? '🚫 Rechazado' : '⏳ Pendiente')) + '</td>'
      + '<td>' + (h.estado !== 'aprobado' ? '<button class="btn btn-navy btn-sm" onclick="cdAdminSetEstadoHistoria(\'' + h.id + '\',\'aprobado\')">✅ Aprobar</button> ' : '')
      + (h.estado !== 'rechazado' ? '<button class="btn btn-outline btn-sm" onclick="cdAdminSetEstadoHistoria(\'' + h.id + '\',\'rechazado\')">🚫 Rechazar</button>' : '') + '</td></tr>';
  }).join('') || '<tr><td colspan="7">Todavía no hay historias ni banners cargados.</td></tr>';
}
async function cdAdminSetEstadoHistoria(id, estado) {
  await backendCall('adminSetEstadoHistoria', { adminPassword: ADMIN_PASSWORD_SESSION, id: id, estado: estado });
  cdCargarAdminHistorias();
}

/* ---------------- 11) arranque ---------------- */
document.addEventListener('DOMContentLoaded', function () {
  cdRenderBottomNav();
  cdRenderCategorias();
  cdWireModoBusqueda();
  cdInicializarCategoriaAbierta();
  cdObservarTarjetas();
  cdWirePublicar();
  cdRenderCuenta();
  cdRenderAnalitica();
  if (document.getElementById('cdAdminHistoriasBody') && typeof window.adminLogin === 'function') {
    // admin.html llama a adminLogin() con el botón "Entrar" — la envolvemos
    // para, además de lo que ya hace (cargar usuarios y movimientos),
    // cargar también la tabla nueva de historias/banners pendientes.
    const originalAdminLogin = window.adminLogin;
    window.adminLogin = function () { originalAdminLogin.apply(this, arguments); cdCargarAdminHistorias(); };
  }
  if (document.getElementById('cdStoriesRubro')) {
    cdCargarHistorias().then(function (historias) { cdRenderStoriesPorRubro(cdOrdenarHistorias_(historias)); });
  }
});
window.addEventListener('calzada:businesses-loaded', function () {
  (window.BUSINESSES || []).forEach(function (b) { if (!b.id) b.id = slugify(b.name); });
  cdEnhanceCards();
});
