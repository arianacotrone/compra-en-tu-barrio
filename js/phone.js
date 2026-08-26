/**
 * Normaliza números argentinos escritos "como los escribe la gente"
 * (ej: "011 15-2233-4455", "11 15 2233 4455", "1122334455")
 * al formato que necesita WhatsApp: 54 9 <area> <número>, sin signos.
 *
 * Si tu barrio usa un código de área distinto a 011/11 (CABA/GBA),
 * cambiá CONFIG.areaCodeDigits o ajustá ÁREA_POR_DEFECTO más abajo.
 */
const ÁREA_POR_DEFECTO = "11"; // Buenos Aires / CABA / GBA (Rafael Calzada incluido)

function normalizarWhatsapp(crudo) {
  if (!crudo) return null;
  let digitos = String(crudo).replace(/\D/g, "");
  if (!digitos) return null;

  // Ya viene en formato internacional (54...)
  if (digitos.startsWith("54")) {
    let resto = digitos.slice(2);
    if (!resto.startsWith("9")) resto = "9" + resto;
    return "54" + resto;
  }

  // Formato local: sacamos el 0 inicial si está
  if (digitos.startsWith("0")) digitos = digitos.slice(1);

  const areaLen = window.SITE_CONFIG?.areaCodeDigits || 2;
  let area = digitos.slice(0, areaLen) || ÁREA_POR_DEFECTO;
  let resto = digitos.slice(areaLen);

  // Si el número no tenía código de área (muy corto), asumimos el de por defecto
  if (digitos.length <= 8) {
    area = ÁREA_POR_DEFECTO;
    resto = digitos;
  }

  // Sacamos el "15" de celular si está presente al principio del resto
  if (resto.startsWith("15")) resto = resto.slice(2);

  return "549" + area + resto;
}

function linkWhatsapp(crudo, mensaje) {
  const numero = normalizarWhatsapp(crudo);
  if (!numero) return null;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${numero}${texto}`;
}
