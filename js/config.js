/**
 * CONFIG — Lo único que hay que tocar para replicar este sitio en otro barrio.
 * Duplicá esta carpeta completa, cambiá los valores de acá abajo, y listo.
 */
window.SITE_CONFIG = {
  // Nombre del barrio, tal cual aparece en el encabezado y como filtro de la columna "Barrio"
  barrio: "Rafael Calzada",

  // Bajada / texto de presentación debajo del encabezado
  bajada:
    "Las vidrieras de Rafael Calzada, unificadas. Explorá el stock de cada comercio y cerrá tu pedido por WhatsApp.",

  // URL del CSV publicado de tu Google Sheet (Archivo > Compartir > Publicar en la web > CSV).
  // Dejalo vacío ("") para que el sitio muestre datos de ejemplo mientras armás la planilla real.
  sheetCsvUrl: "",

  // Botón "Farmacias de turno": a dónde lleva. Por defecto abre FarmaciasDeTurnoYa filtrado en Rafael Calzada.
  farmaciasDeTurnoUrl:
    "https://farmaciasdeturnoya.com.ar/localidad/rafael-calzada-P0-C243-Z13",

  // Vista de mapa: pegá acá la URL de "insertar mapa" de tu Google My Maps (Compartir > Insertar en mi sitio).
  // Si lo dejás vacío, el sitio muestra un mapa de Google Maps centrado en el barrio como alternativa simple.
  myMapsEmbedUrl: "",

  // Usado solo como respaldo si no hay My Maps configurado, para centrar el mapa simple.
  barrioMapQuery: "Rafael Calzada, Almirante Brown, Buenos Aires, Argentina",

  // Color de acento del barrio. Dejalo vacío ("") para usar el azul por
  // defecto, ya afinado para verse bien en modo claro y oscuro (css/style.css).
  // Si ponés un color acá, se usa el MISMO en los dos modos — sirve para
  // una réplica rápida, pero pierde el ajuste fino claro/oscuro.
  colorPrimario: "",

  // Publicidad: a dónde lleva el botón "Reservá este espacio" de los rieles
  // laterales (solo visibles en pantallas grandes). Poné acá tu WhatsApp o
  // email de contacto comercial. Si lo dejás vacío, el botón queda deshabilitado.
  contactoPublicidadUrl: "",
};
