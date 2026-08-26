/**
 * Parser CSV minimalista (sin dependencias) para el CSV publicado desde Google Sheets.
 * Soporta comillas, comas dentro de comillas y comillas escapadas ("").
 */
function parsearCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let dentroComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const siguiente = texto[i + 1];

    if (dentroComillas) {
      if (c === '"' && siguiente === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        dentroComillas = false;
      } else {
        campo += c;
      }
    } else {
      if (c === '"') {
        dentroComillas = true;
      } else if (c === ",") {
        fila.push(campo);
        campo = "";
      } else if (c === "\n") {
        fila.push(campo);
        filas.push(fila);
        fila = [];
        campo = "";
      } else if (c === "\r") {
        // ignorar, lo maneja el \n siguiente
      } else {
        campo += c;
      }
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  if (filas.length === 0) return [];
  const encabezados = filas[0].map((h) => h.trim());
  return filas.slice(1)
    .filter((f) => f.some((v) => v.trim() !== ""))
    .map((f) => {
      const obj = {};
      encabezados.forEach((h, i) => (obj[h] = (f[i] || "").trim()));
      return obj;
    });
}

/**
 * Traduce una fila cruda del CSV (encabezados en español, tal como en la planilla)
 * a un objeto de comercio con nombres de campo estables para el resto del sitio.
 */
function filaAComercio(fila) {
  return {
    nombre: fila["Nombre del comercio"] || "",
    barrio: fila["Barrio"] || "",
    rubro: fila["Rubro"] || "Otros",
    whatsapp: fila["WhatsApp"] || "",
    sitioWeb: fila["Sitio web"] || "",
    direccion: (fila["Dirección (si tiene local físico)"] || "").trim(),
    imagen: fila["Link imagen de portada (Google Drive)"] || "",
  };
}
