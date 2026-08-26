(function () {
  const CFG = window.SITE_CONFIG;

  // ---------- Utilidades ----------

  function normalizarImagenDrive(url) {
    if (!url) return "";
    const m = url.match(/[-\w]{25,}/); // ID de Drive: letras/números/guiones largos
    if (!m) return url;
    return `https://drive.google.com/thumbnail?id=${m[0]}&sz=w800`;
  }

  function linkMapaComercio(comercio) {
    if (!comercio.direccion) return null;
    const q = encodeURIComponent(`${comercio.direccion}, ${comercio.barrio || CFG.barrio}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function iniciales(nombre) {
    return (nombre || "?").trim().charAt(0).toUpperCase();
  }

  // ---------- Carga de datos ----------

  async function cargarComercios() {
    if (!CFG.sheetCsvUrl) {
      return window.DEMO_COMERCIOS.slice();
    }
    try {
      const res = await fetch(CFG.sheetCsvUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const texto = await res.text();
      const filas = parsearCSV(texto);
      const comercios = filas.map(filaAComercio).filter((c) => c.nombre);
      const delBarrio = comercios.filter(
        (c) => !c.barrio || c.barrio.trim().toLowerCase() === CFG.barrio.trim().toLowerCase()
      );
      return delBarrio.length ? delBarrio : comercios;
    } catch (err) {
      console.error("No se pudo leer la planilla, muestro datos de ejemplo.", err);
      mostrarAvisoDatosDemo();
      return window.DEMO_COMERCIOS.slice();
    }
  }

  function mostrarAvisoDatosDemo() {
    const aviso = document.getElementById("aviso-demo");
    if (aviso) aviso.hidden = false;
  }

  // ---------- Render ----------

  function renderTarjeta(c) {
    const img = normalizarImagenDrive(c.imagen);
    const wa = linkWhatsapp(c.whatsapp, `Hola ${c.nombre}! Te escribo desde Compra en tu Barrio.`);
    const mapa = linkMapaComercio(c);

    const portada = img
      ? `<img src="${img}" alt="${escapeHtml(c.nombre)}" loading="lazy" onerror="this.parentElement.classList.add('sin-imagen')">`
      : "";

    const portadaClickable = c.sitioWeb
      ? `<a class="tarjeta__portada ${img ? "" : "sin-imagen"}" href="${escapeHtml(c.sitioWeb)}" target="_blank" rel="noopener" aria-label="Ir al sitio de ${escapeHtml(c.nombre)}">${portada}<span class="tarjeta__inicial">${iniciales(c.nombre)}</span></a>`
      : `<div class="tarjeta__portada ${img ? "" : "sin-imagen"}">${portada}<span class="tarjeta__inicial">${iniciales(c.nombre)}</span></div>`;

    return `
      <article class="tarjeta">
        ${portadaClickable}
        <div class="tarjeta__cuerpo">
          <span class="tarjeta__rubro">${escapeHtml(c.rubro)}</span>
          <h3 class="tarjeta__nombre">${escapeHtml(c.nombre)}</h3>
          <div class="tarjeta__acciones">
            ${wa ? `<a class="btn btn--whatsapp" href="${wa}" target="_blank" rel="noopener" aria-label="Escribir por WhatsApp a ${escapeHtml(c.nombre)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.9 14.2c-.3.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-5-4.3-5.1-4.5-.2-.2-1.2-1.6-1.2-3.1s.8-2.2 1.1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5.3.7.9 2.2 1 2.4.1.2.1.4 0 .6-.2.4-.4.5-.6.8-.2.2-.4.4-.2.8.2.4.9 1.5 1.9 2.4 1.3 1.1 2.4 1.5 2.8 1.6.3.1.6.1.8-.1.2-.3.9-1 1.1-1.4.2-.3.4-.3.7-.2l2 1c.2.1.4.2.5.3.1.3.1.7-.1 1.1z"/></svg>WhatsApp</a>` : ""}
            ${mapa ? `<a class="btn btn--mapa" href="${mapa}" target="_blank" rel="noopener" aria-label="Ver ubicación de ${escapeHtml(c.nombre)} en el mapa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.5 7.3 11.7.2.2.5.3.7.3s.5-.1.7-.3C13 21.5 20 15.4 20 10c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>Mapa</a>` : ""}
          </div>
        </div>
      </article>`;
  }

  function renderTarjetas(comercios) {
    const cont = document.getElementById("lista-comercios");
    if (!comercios.length) {
      cont.innerHTML = `<p class="mensaje-vacio">Todavía no hay comercios cargados para ${escapeHtml(CFG.barrio)}.</p>`;
      return;
    }
    cont.innerHTML = comercios.map(renderTarjeta).join("");
  }

  function renderMapa() {
    const cont = document.getElementById("vista-mapa");
    if (CFG.myMapsEmbedUrl) {
      cont.innerHTML = `<iframe src="${escapeHtml(CFG.myMapsEmbedUrl)}" loading="lazy" title="Mapa de comercios de ${escapeHtml(CFG.barrio)}"></iframe>`;
    } else {
      const q = encodeURIComponent(CFG.barrioMapQuery || CFG.barrio);
      cont.innerHTML = `<iframe src="https://maps.google.com/maps?q=${q}&z=15&output=embed" loading="lazy" title="Mapa de ${escapeHtml(CFG.barrio)}"></iframe>`;
    }
  }

  function renderContador(n) {
    document.getElementById("contador-comercios").textContent = n;
  }

  // ---------- Selector Lista / Mapa ----------

  function initSelector() {
    const btns = document.querySelectorAll(".selector__btn");
    const vistaLista = document.getElementById("lista-comercios");
    const vistaMapa = document.getElementById("vista-mapa");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) => b.classList.remove("is-activo"));
        btn.classList.add("is-activo");
        const modo = btn.dataset.vista;
        vistaLista.hidden = modo !== "lista";
        vistaMapa.hidden = modo !== "mapa";
      });
    });
  }

  // ---------- Inicio ----------

  function aplicarConfigVisual() {
    document.title = `Compra en tu Barrio — ${CFG.barrio}`;
    document.getElementById("nombre-barrio").textContent = CFG.barrio;
    document.getElementById("texto-bajada").textContent = CFG.bajada;
    document.getElementById("link-farmacias").href = CFG.farmaciasDeTurnoUrl;
    document.documentElement.style.setProperty("--color-primario", CFG.colorPrimario);
    document.documentElement.style.setProperty("--color-acento", CFG.colorAcento);
  }

  async function iniciar() {
    aplicarConfigVisual();
    initSelector();
    renderMapa();
    const comercios = await cargarComercios();
    renderContador(comercios.length);
    renderTarjetas(comercios);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
