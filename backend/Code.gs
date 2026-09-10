/**
 * Calzada Compra — Backend en Google Sheets (Apps Script)
 * ============================================================
 * Qué hace: guarda las cuentas de vecinos y comerciantes, y lleva
 * el registro de puntos de fidelidad (sumas y canjes) — todo en
 * esta misma planilla de Google Sheets. La podés abrir en cualquier
 * momento y mirar todo directamente ahí, fila por fila.
 *
 * CÓMO INSTALARLO (una sola vez):
 * 1) Creá una Google Sheet nueva y vacía (sheets.new).
 * 2) Extensiones > Apps Script. Borrá el código de ejemplo que trae
 *    y pegá TODO este archivo en su lugar.
 * 3) Cambiá la constante ADMIN_PASSWORD acá abajo por una clave
 *    tuya — la vas a usar para entrar al panel de administración
 *    del sitio (admin.html) y ver usuarios y movimientos de puntos.
 * 4) Arriba a la derecha: "Implementar" > "Nueva implementación".
 *    Tipo: "Aplicación web". Ejecutar como: "Yo". Quién tiene
 *    acceso: "Cualquier usuario". Implementar.
 * 5) La primera vez Google te va a pedir autorizar el script (es tu
 *    propia cuenta pidiéndote permiso para tocar tu propia planilla:
 *    es seguro, aceptá los permisos).
 * 6) Copiá la URL que te da ("URL de la aplicación web", termina en
 *    /exec) y pegala en assets/site.js, en SHEETS_CONFIG.backendUrl.
 * 7) Si más adelante volvés a editar este código, tenés que ir a
 *    "Implementar" > "Gestionar implementaciones" > ícono de lápiz >
 *    "Nueva versión" > "Implementar", para que el sitio vea los
 *    cambios (la URL no cambia).
 *
 * La planilla se arma sola la primera vez que se usa: crea 4 hojas
 * (Usuarios, Puntos_Movimientos, Puntos_Canjes, Analitica) con sus
 * columnas. La hoja "Analitica" guarda, de forma anónima, qué páginas
 * se visitan, en qué se hace click, qué se busca y cuánto tiempo se
 * queda la gente — se puede ver un resumen en admin.html.
 *
 * Para anular a mano un movimiento o un canje sospechoso: abrí la
 * hoja correspondiente y escribí "anulado" en la columna "estado" de
 * esa fila (podés dejar una nota en "notaAdmin"). Los saldos de
 * puntos ya no cuentan las filas anuladas — no hace falta borrar
 * nada, así queda todo el historial para auditar.
 */

const ADMIN_PASSWORD = 'CAMBIAR-ESTA-CLAVE';

// --- Reglas antifraude — ajustá estos números si hace falta ---
const MAX_MONTO_POR_MOVIMIENTO = 100000;          // tope de $ por compra cargada de una vez (100 puntos)
const MAX_MOVIMIENTOS_POR_DIA_POR_COMERCIO = 50;  // tope de cargas de puntos por comercio por día
const PUNTOS_POR_CADA = 1000;                     // 1 punto cada $1.000 de compra

const SHEET_USUARIOS = 'Usuarios';
const SHEET_MOVIMIENTOS = 'Puntos_Movimientos';
const SHEET_CANJES = 'Puntos_Canjes';
const SHEET_ANALYTICS = 'Analitica';

// Ojo si en el futuro se suma alguna columna nueva acá: agregarla siempre
// al FINAL de esta lista, nunca insertarla en el medio ni reordenar las
// que ya existen. getSheet_() migra solo las planillas ya creadas
// agregando las columnas que falten al final del encabezado — si acá se
// reordena, esa migración deja de coincidir con lo que escribe
// sh.appendRow(...) más abajo y se puede pisar el dato de otra columna.
const HEAD_USUARIOS = ['email', 'passwordHash', 'nombre', 'telefono', 'tipo', 'direccion', 'rubro', 'tieneSitio', 'createdAt', 'anioNacimiento', 'genero', 'estado', 'descripcion', 'tags', 'sitioWeb', 'oferta', 'ofertaVence', 'logoUrl', 'logoHistorial', 'cuotaAlDia'];
const HEAD_MOVIMIENTOS = ['id', 'fecha', 'comercioEmail', 'comercioNombre', 'telefonoVecino', 'monto', 'puntos', 'estado', 'notaAdmin'];
const HEAD_CANJES = ['id', 'fecha', 'comercioEmail', 'comercioNombre', 'telefonoVecino', 'puntos', 'descripcion', 'estado', 'notaAdmin'];
const HEAD_ANALYTICS = ['fecha', 'tipo', 'pagina', 'detalle', 'visitanteId', 'franjaEtaria', 'genero'];

// Un comercio recién registrado queda en 'pendiente' hasta que la Cámara lo
// aprueba desde admin.html — mientras tanto no puede sumar/canjear puntos
// ni aparece en la vidriera pública. Los vecinos no usan este campo.
const ESTADO_PENDIENTE = 'pendiente';
const ESTADO_APROBADO = 'aprobado';

// Independiente del estado de aprobación: un comercio ya aprobado puede
// quedar "desactivado" más adelante si no está al día con la cuota
// societaria — deja de aparecer en la vidriera y de poder sumar/canjear
// puntos o editar su tarjeta, sin perder el historial ni tener que volver a
// pasar por la aprobación inicial de la Cámara. Vacío ('') se trata igual
// que 'si' (activo) — así ninguna cuenta ya cargada antes de este cambio
// queda desactivada por accidente.
const CUOTA_AL_DIA = 'si';
const CUOTA_VENCIDA = 'no';
function cuotaAlDia_(valor) { return String(valor || '') !== CUOTA_VENCIDA; }

// Tope de filas de analítica — por las dudas de que alguien intente
// saturar la planilla mandando eventos a lo loco. Con esto alcanza de
// sobra para años de uso normal del barrio.
const MAX_FILAS_ANALYTICS = 200000;

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    forzarColumnasComoTexto_(sh, name, headers);
    return sh;
  }
  // Migración automática: si esta hoja ya existía de una versión anterior
  // de este código y le faltan columnas nuevas (por ejemplo, al sumar el
  // año de nacimiento y el género), se agregan solas al final del
  // encabezado — nunca se reordenan ni se tocan las columnas que ya
  // existían, así no se corrompe ningún dato ya cargado.
  const lastCol = sh.getLastColumn();
  const currentHeaders = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const faltantes = headers.filter(h => currentHeaders.indexOf(h) === -1);
  if (faltantes.length) {
    sh.getRange(1, currentHeaders.length + 1, 1, faltantes.length).setValues([faltantes]);
  }
  return sh;
}

// --- Endurecer contra el bug de teléfonos que rompió la vidriera una vez ---
// Un teléfono cargado como puros dígitos (ej. "1141889724") puede quedar
// auto-detectado por Google Sheets como valor NUMÉRICO, no como texto, aunque
// el código lo haya escrito con appendRow() como string — y ahí es donde
// waLink()/listarComercios_() rompían (ver los comentarios ahí). Además de
// forzar String() en todos lados donde se usa ese dato, esto fija el FORMATO
// de esas columnas a "Texto sin formato" (@) para que Sheets ya no vuelva a
// reinterpretarlas nunca más, sin importar qué se les cargue de acá en más.
const COLUMNAS_TEXTO_FORZADO = {};
COLUMNAS_TEXTO_FORZADO[SHEET_USUARIOS] = ['telefono'];
COLUMNAS_TEXTO_FORZADO[SHEET_MOVIMIENTOS] = ['telefonoVecino'];
COLUMNAS_TEXTO_FORZADO[SHEET_CANJES] = ['telefonoVecino'];

function forzarColumnasComoTexto_(sh, nombreHoja, headers) {
  const columnas = COLUMNAS_TEXTO_FORZADO[nombreHoja];
  if (!columnas || !columnas.length) return;
  const maxRows = sh.getMaxRows();
  if (maxRows < 2) return;
  columnas.forEach(function (nombreCol) {
    const col = headers.indexOf(nombreCol);
    if (col === -1) return;
    sh.getRange(2, col + 1, maxRows - 1, 1).setNumberFormat('@');
  });
}

// Corre una única vez por planilla (se acuerda con PropertiesService, para
// no gastar tiempo de más en cada pedido) y arregla el formato de columnas
// en planillas que ya existían de ANTES de este arreglo — así no hace falta
// borrar ni recrear nada a mano.
function asegurarFormatoTelefono_() {
  const props = PropertiesService.getScriptProperties();
  const FLAG = 'telefonoTextoForzado_v1';
  if (props.getProperty(FLAG)) return;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(COLUMNAS_TEXTO_FORZADO).forEach(function (nombreHoja) {
      const sh = ss.getSheetByName(nombreHoja);
      if (!sh) return; // todavía no existe — se va a crear ya con el formato correcto.
      const lastCol = sh.getLastColumn();
      if (lastCol < 1) return;
      const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
      forzarColumnasComoTexto_(sh, nombreHoja, headers);
    });
    props.setProperty(FLAG, '1');
  } catch (err) {
    // Si esto falla no cortamos el pedido — el resto del sitio sigue andando
    // igual gracias a los String() defensivos en listarComercios_ y waLink().
  }
}

function sheetRows_(sh) {
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(c => c !== '' && c !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function normPhone_(p) { return String(p || '').replace(/\D/g, ''); }
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
// Mismo patrón que el pattern="" de los inputs de email en el sitio — se
// vuelve a chequear acá por si llega un pedido armado a mano, sin pasar por
// el formulario (que ya lo valida con el navegador antes de mandarlo).
function emailValido_(e) { return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(e || '')); }

/* ---------------- Logo del comercio (subida a Google Drive) ----------------
   Cuando un comercio se registra o actualiza su tarjeta desde "Mi comercio",
   la foto del logo llega ya redimensionada y comprimida por el navegador
   (ver leerImagenComoBase64 en assets/site.js) como "data URL" —
   "data:image/jpeg;base64,AAAA...". Acá se decodifica, se guarda como
   archivo nuevo en esta carpeta de Drive y se comparte como "cualquiera con
   el link puede ver" (si no, la imagen no se podría mostrar en la vidriera
   pública). La URL que devuelve queda guardada tal cual en la columna
   logoUrl — es el MISMO formato de link de Drive que ya entiende
   resolveLogoUrl() en assets/site.js para los logos que se cargan a mano en
   el catálogo estático (ver la sección "Un logo chiquito por comercio en
   las tarjetas" del README).

   Carpeta de Drive: la que se compartió para este proyecto —
   https://drive.google.com/drive/folders/1LXO8AGUSQ4VxljUTTY6NY91sDu85ftNV
   Si en algún momento hay que cambiarla, solo hace falta actualizar este ID
   (la parte de la URL después de /folders/). */
const CARPETA_LOGOS_ID = '1LXO8AGUSQ4VxljUTTY6NY91sDu85ftNV';

// Tope generoso para la imagen ya comprimida por el navegador (una imagen de
// 500px de lado y calidad .85 pesa muchísimo menos que esto) — sirve para
// cortar de entrada un pedido armado a mano con una imagen gigante.
const MAX_LOGO_BASE64_CHARS = 2000000;

// Cuántos logos viejos guardamos como "historial" por comercio — así el
// comercio puede volver a uno anterior con un click, sin tener que volver a
// subir el archivo. Se guarda como un JSON (array de URLs) en la columna
// logoHistorial, más nuevo primero.
const MAX_LOGO_HISTORIAL = 3;

function parseLogoHistorial_(raw) {
  try {
    const arr = JSON.parse(String(raw || '[]'));
    return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
  } catch (err) {
    return [];
  }
}

function guardarLogoEnDrive_(dataUrl, nombreArchivo) {
  const texto = String(dataUrl || '');
  if (texto.length > MAX_LOGO_BASE64_CHARS) {
    throw new Error('la imagen es demasiado pesada');
  }
  const match = texto.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('formato de imagen no reconocido');
  const mimeType = match[1];
  const base64 = match[2];

  let bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (err) {
    throw new Error('no se pudo leer la imagen');
  }

  const ext = mimeType === 'image/png' ? '.png' : (mimeType === 'image/webp' ? '.webp' : '.jpg');
  const nombreLimpio = String(nombreArchivo || 'comercio').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 60) || 'comercio';
  const blob = Utilities.newBlob(bytes, mimeType, 'logo - ' + nombreLimpio + ext);

  const carpeta = DriveApp.getFolderById(CARPETA_LOGOS_ID);
  const file = carpeta.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  // Devolvemos también el nombre y la URL de ESTA planilla (a la que el script
  // está atado) — sirve para confirmar sin dudas en qué Google Sheet están
  // quedando guardados los datos, sobre todo si tenés varias planillas
  // parecidas abiertas.
  let spreadsheetName = '', spreadsheetUrl = '';
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    spreadsheetName = ss.getName();
    spreadsheetUrl = ss.getUrl();
  } catch (err) {
    spreadsheetName = '(no se pudo determinar — ver más abajo)';
  }
  return json_({
    ok: true,
    msg: 'Backend de Calzada Compra activo. Las acciones se hacen por POST.',
    spreadsheetName: spreadsheetName,
    spreadsheetUrl: spreadsheetUrl
  });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: 'JSON inválido en el pedido.' }); }

  asegurarFormatoTelefono_();

  const action = body.action;
  try {
    switch (action) {
      case 'register': return registrar_(body);
      case 'login': return login_(body);
      case 'sumarPuntos': return sumarPuntos_(body);
      case 'canjearPuntos': return canjearPuntos_(body);
      case 'saldoPuntos': return json_({ ok: true, saldo: calcularSaldo_(normPhone_(body.telefono)) });
      case 'adminListUsuarios': return adminListUsuarios_(body);
      case 'adminListMovimientos': return adminListMovimientos_(body);
      case 'track': return trackEvent_(body);
      case 'adminAnalyticsResumen': return adminAnalyticsResumen_(body);
      case 'listarComercios': return listarComercios_();
      case 'actualizarComercio': return actualizarComercio_(body);
      case 'adminSetEstadoComercio': return adminSetEstadoComercio_(body);
      case 'adminSetCuotaComercio': return adminSetCuotaComercio_(body);
      case 'adminResumenPrincipal': return adminResumenPrincipal_(body);
      case 'adminExportarAnalitica': return adminExportarAnalitica_(body);
      // --- Calzada Digital: historias/banners, seguir, likes, cupones, analítica por comercio ---
      case 'seguirComercio': return seguirComercio_(body);
      case 'listarSeguidos': return listarSeguidos_(body);
      case 'likear': return likear_(body);
      case 'cargarHistoriaBanner': return cargarHistoriaBanner_(body);
      case 'listarHistoriasVigentes': return listarHistoriasVigentes_(body);
      case 'listarFeedSeguidos': return listarFeedSeguidos_(body);
      case 'adminListHistorias': return adminListHistorias_(body);
      case 'adminSetEstadoHistoria': return adminSetEstadoHistoria_(body);
      case 'listarCupones': return listarCupones_(body);
      case 'canjearCupon': return canjearCupon_(body);
      case 'obtenerAnaliticaComercio': return obtenerAnaliticaComercio_(body);
      default: return json_({ ok: false, error: 'Acción desconocida: ' + action });
    }
  } catch (err) {
    return json_({ ok: false, error: 'Error del servidor: ' + err.message });
  }
}

/* ---------------- Cuentas ---------------- */

function registrar_(body) {
  const sh = getSheet_(SHEET_USUARIOS, HEAD_USUARIOS);
  const email = normEmail_(body.email);
  if (!email || !body.passwordHash) return json_({ ok: false, error: 'Faltan datos obligatorios.' });
  if (!emailValido_(email)) return json_({ ok: false, error: 'Ese correo electrónico no parece válido — revisalo e intentá de nuevo.' });

  const existentes = sheetRows_(sh);
  if (existentes.some(u => normEmail_(u.email) === email)) {
    return json_({ ok: false, error: 'Ya hay una cuenta registrada con ese correo electrónico.' });
  }

  // Un comercio nuevo arranca 'pendiente' — recién puede sumar/canjear
  // puntos y aparecer en la vidriera cuando la Cámara lo aprueba desde
  // admin.html. Un vecino no usa este campo (queda vacío).
  const estado = String(body.tipo) === 'comerciante' ? ESTADO_PENDIENTE : '';
  // Un comercio nuevo arranca con la cuota al día — recién se marca "no"
  // más adelante, a mano, desde admin.html, si la Cámara detecta que dejó
  // de pagar. Un vecino no usa este campo (queda vacío).
  const cuotaAlDia = String(body.tipo) === 'comerciante' ? CUOTA_AL_DIA : '';

  // El teléfono siempre llega armado desde el sitio como "11"+8 dígitos (ver
  // PHONE_PREFIJO en assets/site.js) — igual se vuelve a limpiar acá por si
  // llega un pedido armado a mano, sin pasar por el formulario del sitio. El
  // resto de los campos de texto se acotan a un largo razonable, para que
  // nadie pueda cargar por error (o a propósito) un texto gigante en la
  // planilla.
  const telefono = normPhone_(body.telefono).slice(0, 15);
  const nombre = String(body.nombre || '').slice(0, 100);
  const direccion = String(body.direccion || '').slice(0, 150);

  // El logo se sube a Drive ANTES de crear la cuenta: si algo falla acá (la
  // imagen no se pudo guardar, por ejemplo), preferimos que la cuenta ni se
  // cree — así el comercio puede volver a intentar el registro completo, en
  // vez de quedar con una cuenta a medio cargar y sin darse cuenta.
  let logoUrl = '';
  if (body.logoBase64) {
    try {
      logoUrl = guardarLogoEnDrive_(body.logoBase64, nombre || email);
    } catch (err) {
      return json_({ ok: false, error: 'No pudimos guardar la foto del logo (' + err.message + '). Probá con otra imagen (o una más liviana) y volvé a completar el registro.' });
    }
  }

  sh.appendRow([
    email, body.passwordHash, nombre, telefono, body.tipo || '',
    direccion, body.rubro || '', body.tieneSitio || '', new Date().toISOString(),
    body.anioNacimiento || '', body.genero || '',
    estado, '', '', '', '', '', logoUrl, '[]', cuotaAlDia // estado, descripcion, tags, sitioWeb, oferta, ofertaVence, logoUrl, logoHistorial, cuotaAlDia — el resto se carga después, desde "Mi comercio"
  ]);

  return json_({
    ok: true,
    user: {
      email: email, nombre: nombre, telefono: telefono, tipo: body.tipo || '',
      passwordHash: body.passwordHash, direccion: direccion, rubro: body.rubro || '',
      tieneSitio: body.tieneSitio || '', anioNacimiento: body.anioNacimiento || '', genero: body.genero || '',
      estado: estado, descripcion: '', tags: '', sitioWeb: '', oferta: '', ofertaVence: '', logoUrl: logoUrl, logoHistorial: [],
      cuotaAlDia: cuotaAlDia
    }
  });
}

function login_(body) {
  const sh = getSheet_(SHEET_USUARIOS, HEAD_USUARIOS);
  const email = normEmail_(body.email);
  const user = sheetRows_(sh).find(u => normEmail_(u.email) === email);
  if (!user) return json_({ ok: false, error: 'No encontramos ninguna cuenta con ese correo electrónico.' });
  if (String(user.passwordHash) !== String(body.passwordHash)) {
    return json_({ ok: false, error: 'La contraseña no es correcta.' });
  }
  return json_({
    ok: true,
    user: {
      email: user.email, nombre: user.nombre, telefono: user.telefono, tipo: user.tipo, passwordHash: user.passwordHash,
      direccion: user.direccion, rubro: user.rubro, tieneSitio: user.tieneSitio,
      anioNacimiento: user.anioNacimiento, genero: user.genero,
      estado: user.estado || '', descripcion: user.descripcion || '', tags: user.tags || '', sitioWeb: user.sitioWeb || '',
      oferta: user.oferta || '', ofertaVence: user.ofertaVence || '', logoUrl: user.logoUrl || '',
      logoHistorial: parseLogoHistorial_(user.logoHistorial),
      cuotaAlDia: user.tipo === 'comerciante' ? (cuotaAlDia_(user.cuotaAlDia) ? CUOTA_AL_DIA : CUOTA_VENCIDA) : ''
    }
  });
}

// Cada acción que suma o canjea puntos vuelve a chequear el email + hash de
// contraseña del comercio contra la planilla — así nadie puede sumarse
// puntos falsos a sí mismo, o a nombre de otro comercio, aunque conozca su
// dirección de correo (necesita también la contraseña).
function verificarComercio_(comercioEmail, comercioPasswordHash) {
  const sh = getSheet_(SHEET_USUARIOS, HEAD_USUARIOS);
  const email = normEmail_(comercioEmail);
  const user = sheetRows_(sh).find(u => normEmail_(u.email) === email);
  if (!user) return { ok: false, error: 'No encontramos tu cuenta de comercio — volvé a iniciar sesión.' };
  if (String(user.passwordHash) !== String(comercioPasswordHash)) {
    return { ok: false, error: 'Tu sesión venció o no es válida — volvé a iniciar sesión.' };
  }
  if (String(user.tipo) !== 'comerciante') {
    return { ok: false, error: 'Solo las cuentas de comercio pueden sumar o canjear puntos.' };
  }
  if (String(user.estado) !== ESTADO_APROBADO) {
    return { ok: false, error: 'Tu comercio todavía está pendiente de aprobación de la Cámara (puede demorar hasta 10 días desde el registro) — mientras tanto no podés sumar ni canjear puntos, ni editar los datos de tu comercio. Volvé a iniciar sesión más adelante para ver si ya te habilitaron.' };
  }
  if (!cuotaAlDia_(user.cuotaAlDia)) {
    return { ok: false, error: 'Tu comercio está desactivado por la Cámara (cuota societaria pendiente de pago) — mientras tanto no podés sumar ni canjear puntos, ni editar los datos de tu comercio, ni aparecés en la vidriera. Poné al día la cuota con la Cámara y volvé a iniciar sesión para ver si ya te reactivaron.' };
  }
  return { ok: true, user: user };
}

// Busca la fila de un usuario por email y actualiza solo las columnas que
// se le pasan en "cambios" (por nombre de columna) — nunca reordena ni
// toca el resto de la fila. Se usa para que un comercio actualice los
// datos de su propia tarjeta, y para que la Cámara apruebe/desapruebe un
// comercio desde admin.html.
function actualizarFilaUsuario_(email, cambios) {
  const sh = getSheet_(SHEET_USUARIOS, HEAD_USUARIOS);
  const lastCol = sh.getLastColumn();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return false;
  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const emailCol = headerRow.indexOf('email');
  if (emailCol === -1) return false;

  const emails = sh.getRange(2, emailCol + 1, lastRow - 1, 1).getValues();
  const target = normEmail_(email);
  let rowIndex = -1;
  for (let i = 0; i < emails.length; i++) {
    if (normEmail_(emails[i][0]) === target) { rowIndex = i + 2; break; } // +2: 1-based, salteando el encabezado
  }
  if (rowIndex === -1) return false;

  Object.keys(cambios).forEach(function (campo) {
    const col = headerRow.indexOf(campo);
    if (col === -1) return;
    sh.getRange(rowIndex, col + 1).setValue(cambios[campo]);
  });
  return true;
}

/* ---------------- Puntos ---------------- */

function calcularSaldo_(telefono) {
  const movs = sheetRows_(getSheet_(SHEET_MOVIMIENTOS, HEAD_MOVIMIENTOS))
    .filter(m => normPhone_(m.telefonoVecino) === telefono && String(m.estado || 'confirmado') !== 'anulado');
  const canjes = sheetRows_(getSheet_(SHEET_CANJES, HEAD_CANJES))
    .filter(c => normPhone_(c.telefonoVecino) === telefono && String(c.estado || 'confirmado') !== 'anulado');
  const sumados = movs.reduce((acc, m) => acc + Number(m.puntos || 0), 0);
  const usados = canjes.reduce((acc, c) => acc + Number(c.puntos || 0), 0);
  return Math.max(0, sumados - usados);
}

function sumarPuntos_(body) {
  const auth = verificarComercio_(body.comercioEmail, body.comercioPasswordHash);
  if (!auth.ok) return json_(auth);

  const telefono = normPhone_(body.telefono);
  const monto = Number(body.monto);
  if (!telefono || telefono.length < 8) return json_({ ok: false, error: 'Ingresá un teléfono válido.' });
  if (!monto || monto <= 0) return json_({ ok: false, error: 'Ingresá un monto de compra válido.' });
  if (monto > MAX_MONTO_POR_MOVIMIENTO) {
    return json_({ ok: false, error: 'Ese monto supera el máximo permitido por carga ($' + MAX_MONTO_POR_MOVIMIENTO.toLocaleString('es-AR') + '). Cargalo en varias veces si hace falta.' });
  }

  const sh = getSheet_(SHEET_MOVIMIENTOS, HEAD_MOVIMIENTOS);
  const hoy = new Date();
  const hoyStr = Utilities.formatDate(hoy, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const movHoy = sheetRows_(sh).filter(m =>
    normEmail_(m.comercioEmail) === normEmail_(body.comercioEmail) &&
    String(m.fecha || '').slice(0, 10) === hoyStr
  );
  if (movHoy.length >= MAX_MOVIMIENTOS_POR_DIA_POR_COMERCIO) {
    return json_({ ok: false, error: 'Tu comercio alcanzó el máximo de cargas de puntos permitidas por hoy. Probá mañana o consultá a la Cámara.' });
  }

  const puntos = Math.floor(monto / PUNTOS_POR_CADA);
  const id = Utilities.getUuid();
  sh.appendRow([id, hoy.toISOString(), normEmail_(body.comercioEmail), auth.user.nombre, telefono, monto, puntos, 'confirmado', '']);

  return json_({ ok: true, puntosSumados: puntos, saldoActual: calcularSaldo_(telefono) });
}

function canjearPuntos_(body) {
  const auth = verificarComercio_(body.comercioEmail, body.comercioPasswordHash);
  if (!auth.ok) return json_(auth);

  const telefono = normPhone_(body.telefono);
  const puntos = Number(body.puntos);
  if (!telefono || telefono.length < 8) return json_({ ok: false, error: 'Ingresá un teléfono válido.' });
  if (!puntos || puntos <= 0) return json_({ ok: false, error: 'Ingresá una cantidad de puntos válida.' });

  const saldo = calcularSaldo_(telefono);
  if (puntos > saldo) {
    return json_({ ok: false, error: 'Ese vecino solo tiene ' + saldo + ' puntos disponibles.' });
  }

  const sh = getSheet_(SHEET_CANJES, HEAD_CANJES);
  const id = Utilities.getUuid();
  sh.appendRow([id, new Date().toISOString(), normEmail_(body.comercioEmail), auth.user.nombre, telefono, puntos, String(body.descripcion || '').slice(0, 200), 'confirmado', '']);

  return json_({ ok: true, puntosUsados: puntos, saldoActual: calcularSaldo_(telefono) });
}

/* ---------------- Panel de administración ---------------- */

function adminListUsuarios_(body) {
  if (String(body.adminPassword) !== String(ADMIN_PASSWORD)) return json_({ ok: false, error: 'Clave de administrador incorrecta.' });
  const usuarios = sheetRows_(getSheet_(SHEET_USUARIOS, HEAD_USUARIOS)).map(u => ({
    email: u.email, nombre: u.nombre, telefono: u.telefono, tipo: u.tipo,
    direccion: u.direccion, rubro: u.rubro, createdAt: u.createdAt,
    anioNacimiento: u.anioNacimiento, genero: u.genero,
    estado: u.estado, descripcion: u.descripcion, tags: u.tags, sitioWeb: u.sitioWeb,
    oferta: u.oferta, ofertaVence: u.ofertaVence, logoUrl: u.logoUrl,
    cuotaAlDia: u.tipo === 'comerciante' ? (cuotaAlDia_(u.cuotaAlDia) ? CUOTA_AL_DIA : CUOTA_VENCIDA) : ''
    // Ojo: nunca se devuelve passwordHash acá, ni siquiera al admin.
  }));
  return json_({ ok: true, usuarios: usuarios });
}

function adminListMovimientos_(body) {
  if (String(body.adminPassword) !== String(ADMIN_PASSWORD)) return json_({ ok: false, error: 'Clave de administrador incorrecta.' });
  const movimientos = sheetRows_(getSheet_(SHEET_MOVIMIENTOS, HEAD_MOVIMIENTOS));
  const canjes = sheetRows_(getSheet_(SHEET_CANJES, HEAD_CANJES));
  return json_({ ok: true, movimientos: movimientos, canjes: canjes });
}

// La Cámara aprueba o desaprueba un comercio desde admin.html — recién ahí
// puede sumar/canjear puntos y su tarjeta se hace visible en la vidriera.
function adminSetEstadoComercio_(body) {
  if (String(body.adminPassword) !== String(ADMIN_PASSWORD)) return json_({ ok: false, error: 'Clave de administrador incorrecta.' });
  const nuevoEstado = body.estado === ESTADO_APROBADO ? ESTADO_APROBADO : ESTADO_PENDIENTE;
  const ok = actualizarFilaUsuario_(body.email, { estado: nuevoEstado });
  if (!ok) return json_({ ok: false, error: 'No encontramos esa cuenta.' });
  invalidarCacheComercios_();
  return json_({ ok: true, estado: nuevoEstado });
}

// La Cámara activa/desactiva un comercio YA APROBADO según esté al día o no
// con la cuota societaria — independiente de la aprobación inicial: un
// comercio desactivado por esto no vuelve a "pendiente" (no hace falta que
// la Cámara lo revise de nuevo), simplemente deja de sumar/canjear puntos,
// de poder editar su tarjeta y de aparecer en la vidriera hasta que se
// regularice y se lo reactive.
function adminSetCuotaComercio_(body) {
  if (String(body.adminPassword) !== String(ADMIN_PASSWORD)) return json_({ ok: false, error: 'Clave de administrador incorrecta.' });
  const nuevaCuota = body.cuotaAlDia === CUOTA_VENCIDA ? CUOTA_VENCIDA : CUOTA_AL_DIA;
  const ok = actualizarFilaUsuario_(body.email, { cuotaAlDia: nuevaCuota });
  if (!ok) return json_({ ok: false, error: 'No encontramos esa cuenta.' });
  invalidarCacheComercios_();
  return json_({ ok: true, cuotaAlDia: nuevaCuota });
}

/* ---------------- Tarjeta de comercio (autogestión) ---------------- */

// Listado PÚBLICO (sin clave) de comercios aprobados, en el mismo formato
// que usa la vidriera para el catálogo de comercios.csv — así se pueden
// mostrar mezclados con normalidad. Nunca incluye email ni passwordHash.
// listarComercios_ es, con diferencia, la acción más pedida: se llama cada
// vez que CUALQUIERA abre la vidriera digital, tenga o no cuenta — a
// diferencia del resto de las acciones (login, sumar puntos, etc.), que
// cada persona hace solo de vez en cuando. Por eso conviene cachear su
// resultado un rato corto (CacheService, incluido gratis en Apps Script)
// en vez de releer y recorrer toda la hoja de Usuarios en cada visita: con
// muchos comercios y mucho tráfico simultáneo, esa relectura repetida es lo
// primero que se empieza a sentir. El cache se invalida solo (a los 2
// minutos) y, además, a mano cada vez que cambia algo que podría afectar
// el resultado (aprobar/desaprobar un comercio, activar/desactivar por
// cuota, o que el propio comercio edite su tarjeta) — ver
// invalidarCacheComercios_() más abajo.
const CACHE_COMERCIOS_KEY = 'comercios_publicos_v1';
const CACHE_COMERCIOS_SEGUNDOS = 120;

function invalidarCacheComercios_() {
  try { CacheService.getScriptCache().remove(CACHE_COMERCIOS_KEY); } catch (err) { /* no es grave: como mucho, el próximo pedido tarda un poco más */ }
}

function listarComercios_() {
  const cache = CacheService.getScriptCache();
  const cacheado = cache.get(CACHE_COMERCIOS_KEY);
  if (cacheado) return ContentService.createTextOutput(cacheado).setMimeType(ContentService.MimeType.JSON);

  const usuarios = sheetRows_(getSheet_(SHEET_USUARIOS, HEAD_USUARIOS));
  const comercios = usuarios
    .filter(function (u) { return String(u.tipo) === 'comerciante' && String(u.estado) === ESTADO_APROBADO && cuotaAlDia_(u.cuotaAlDia); })
    .map(function (u) {
      const tieneSitioSi = String(u.tieneSitio) === 'si' && u.sitioWeb;
      // Google Sheets guarda cada celda con su propio tipo, no como texto: un
      // teléfono cargado sin espacios (ej. "1141889724") puede quedar
      // auto-detectado como número. Si eso viaja como Number en vez de
      // string, el frontend rompe al intentar hacerle .replace() para armar
      // el link de WhatsApp — por eso todo lo que el sitio trata como texto
      // se fuerza acá con String().
      return {
        id: slugify_(u.nombre),
        name: String(u.nombre || ''),
        rubro: String(u.rubro || ''),
        desc: String(u.descripcion || ''),
        addr: String(u.direccion || ''),
        phone: String(u.telefono || ''),
        web: tieneSitioSi ? String(u.sitioWeb).replace(/^https?:\/\//i, '') : null,
        // El link de Drive que guardó guardarLogoEnDrive_() al registrarse o
        // desde "Mi comercio" — mismo formato que ya sabe leer
        // resolveLogoUrl() en assets/site.js para el catálogo estático.
        logo: u.logoUrl ? String(u.logoUrl) : null,
        tags: u.tags ? String(u.tags).split(/;\s*/).filter(Boolean) : [],
        oferta: String(u.oferta || ''),
        ofertaVence: String(u.ofertaVence || '')
      };
    });

  const cuerpo = JSON.stringify({ ok: true, comercios: comercios });
  try {
    // CacheService tiene un tope de 100KB por valor — un catálogo enorme
    // (miles de comercios con descripciones largas) podría superarlo; en
    // ese caso, simplemente no se cachea y se sigue sirviendo igual, solo
    // sin la aceleración.
    if (cuerpo.length < 95000) cache.put(CACHE_COMERCIOS_KEY, cuerpo, CACHE_COMERCIOS_SEGUNDOS);
  } catch (err) { /* no es grave: como mucho, no se acelera esta vez */ }
  return ContentService.createTextOutput(cuerpo).setMimeType(ContentService.MimeType.JSON);
}

// El propio comercio actualiza los datos de su tarjeta — requiere volver a
// confirmar su email + hash de contraseña (mismo mecanismo antifraude que
// sumar/canjear puntos) y, además, ya estar aprobado por la Cámara.
function actualizarComercio_(body) {
  const auth = verificarComercio_(body.email, body.passwordHash);
  if (!auth.ok) return json_(auth);

  const cambios = {
    rubro: body.rubro || '',
    descripcion: String(body.descripcion || '').slice(0, 500),
    direccion: String(body.direccion || '').slice(0, 150),
    // Igual que en registrar_(): el sitio siempre manda "11"+8 dígitos, pero
    // se vuelve a limpiar acá por las dudas. Un string vacío es válido (el
    // comercio puede borrar su teléfono a propósito).
    telefono: normPhone_(body.telefono).slice(0, 15),
    tieneSitio: body.tieneSitio || '',
    sitioWeb: String(body.sitioWeb || '').slice(0, 200),
    tags: String(body.tags || '').slice(0, 300),
    oferta: String(body.oferta || '').slice(0, 200),
    // formato esperado: YYYY-MM-DD (lo que manda un <input type="date">) —
    // cualquier otra cosa se descarta para no guardar basura en la columna.
    ofertaVence: /^\d{4}-\d{2}-\d{2}$/.test(String(body.ofertaVence || '')) ? body.ofertaVence : ''
  };

  // El logo es opcional acá: si no mandó una imagen nueva ni pidió volver a
  // un logo anterior, dejamos todo el logo tal cual (no tocamos logoUrl ni
  // logoHistorial). Si mandó una nueva imagen, el logo que tenía hasta ahora
  // pasa a la "pila" de historial (más nuevo primero, tope de
  // MAX_LOGO_HISTORIAL) — así el comercio puede volver a usarlo después sin
  // tener que guardar el archivo de nuevo. Si en cambio pidió volver a uno
  // de esos logos anteriores (logoUrlHistorial), se intercambian: el actual
  // pasa al historial y el elegido pasa a ser el logo activo — sin subir
  // nada nuevo a Drive.
  let logoUrl = auth.user.logoUrl || '';
  let historial = parseLogoHistorial_(auth.user.logoHistorial);

  if (body.logoBase64) {
    try {
      const nuevoLogoUrl = guardarLogoEnDrive_(body.logoBase64, auth.user.nombre || auth.user.email);
      if (logoUrl && logoUrl !== nuevoLogoUrl) {
        historial = [logoUrl].concat(historial.filter(function (u) { return u !== nuevoLogoUrl; })).slice(0, MAX_LOGO_HISTORIAL);
      }
      logoUrl = nuevoLogoUrl;
      cambios.logoUrl = logoUrl;
      cambios.logoHistorial = JSON.stringify(historial);
    } catch (err) {
      return json_({ ok: false, error: 'No pudimos guardar la foto del logo (' + err.message + '). El resto de los cambios todavía no se guardó — volvé a intentar (podés dejar el logo como estaba y guardar solo el resto).' });
    }
  } else if (body.logoUrlHistorial && historial.indexOf(String(body.logoUrlHistorial)) !== -1) {
    const elegido = String(body.logoUrlHistorial);
    if (logoUrl && logoUrl !== elegido) {
      historial = [logoUrl].concat(historial.filter(function (u) { return u !== elegido; })).slice(0, MAX_LOGO_HISTORIAL);
    } else {
      historial = historial.filter(function (u) { return u !== elegido; });
    }
    logoUrl = elegido;
    cambios.logoUrl = logoUrl;
    cambios.logoHistorial = JSON.stringify(historial);
  }

  const ok = actualizarFilaUsuario_(auth.user.email, cambios);
  if (!ok) return json_({ ok: false, error: 'No pudimos encontrar tu cuenta para actualizarla.' });
  invalidarCacheComercios_();
  return json_({ ok: true, logoUrl: logoUrl, logoHistorial: historial });
}

/* ---------------- Analítica del sitio ----------------
   Qué busca la gente, dónde hace click y cuánto tiempo se queda en
   cada página — todo anónimo (no se guarda nombre, ni IP, ni nada
   personal: solo un ID al azar generado en el navegador de cada
   visitante, para poder contar "visitantes distintos"). Se guarda acá
   mismo, en la hoja "Analitica", y se resume en el panel de
   administración. */

// Listas blancas de los únicos valores válidos para franjaEtaria/género en
// un evento — así un evento manipulado a mano nunca puede meter texto
// arbitrario en esas dos columnas.
const FRANJAS_VALIDAS = ['Menos de 18', '18-25', '26-35', '36-45', '46-60', '60+', 'Sin especificar'];
const GENEROS_VALIDOS = ['Femenino', 'Masculino', 'Otro', 'Sin especificar'];

function trackEvent_(body) {
  const sh = getSheet_(SHEET_ANALYTICS, HEAD_ANALYTICS);
  // Tope de seguridad: si por lo que sea la hoja creciera demasiado, se
  // deja de escribir (nunca se borra nada solo, eso lo decide la Cámara).
  if (sh.getLastRow() >= MAX_FILAS_ANALYTICS) return json_({ ok: true });

  const tipo = String(body.tipo || '').slice(0, 30);
  if (!tipo) return json_({ ok: false, error: 'Falta el tipo de evento.' });

  // Franja etaria y género: solo llegan si quien generó el evento es un
  // vecino logueado que además cargó ese dato opcional — nunca su
  // identidad, solo la etiqueta agrupada (por eso la lista blanca).
  const franja = FRANJAS_VALIDAS.indexOf(String(body.franjaEtaria)) !== -1 ? String(body.franjaEtaria) : '';
  const genero = GENEROS_VALIDOS.indexOf(String(body.genero)) !== -1 ? String(body.genero) : '';

  sh.appendRow([
    new Date().toISOString(),
    tipo,
    String(body.pagina || '').slice(0, 100),
    String(body.detalle || '').slice(0, 200),
    String(body.sessionId || '').slice(0, 60),
    franja,
    genero
  ]);
  return json_({ ok: true });
}

// Misma lógica que franjaEtaria()/generoLabel() en assets/site.js (modo
// demo local) — acá corre en Apps Script contra los datos reales. Nunca
// se devuelve el año o el género de una persona en particular, solo el
// conteo agrupado.
function franjaEtaria_(anioNacimiento, anioActual) {
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
function generoLabel_(g) {
  const norm = String(g || '').toLowerCase().trim();
  if (norm === 'femenino') return 'Femenino';
  if (norm === 'masculino') return 'Masculino';
  if (norm === 'otro') return 'Otro';
  return 'Sin especificar';
}

function adminAnalyticsResumen_(body) {
  if (String(body.adminPassword) !== String(ADMIN_PASSWORD)) return json_({ ok: false, error: 'Clave de administrador incorrecta.' });

  const eventos = sheetRows_(getSheet_(SHEET_ANALYTICS, HEAD_ANALYTICS));
  const resumen = { totalVisitas: 0, visitantesUnicos: 0, paginas: {}, clicks: {}, busquedas: {}, tiempos: {}, edades: {}, genero: {}, clicksPorGenero: {} };
  const visitantes = {};

  eventos.forEach(function (ev) {
    const tipo = String(ev.tipo || '');
    const pagina = String(ev.pagina || '');
    const detalle = String(ev.detalle || '');
    const visitanteId = String(ev.visitanteId || '');
    if (visitanteId) visitantes[visitanteId] = true;

    if (tipo === 'pageview') {
      resumen.totalVisitas++;
      resumen.paginas[pagina] = (resumen.paginas[pagina] || 0) + 1;
    } else if (tipo === 'click') {
      if (detalle) {
        resumen.clicks[detalle] = (resumen.clicks[detalle] || 0) + 1;
        // Solo se completa cuando quien clickeó era un vecino logueado
        // que además cargó su género (opcional) — el resto queda en
        // "Sin especificar", nunca se sabe quién en particular clickeó.
        const genEvento = GENEROS_VALIDOS.indexOf(String(ev.genero)) !== -1 ? String(ev.genero) : 'Sin especificar';
        if (!resumen.clicksPorGenero[detalle]) resumen.clicksPorGenero[detalle] = {};
        resumen.clicksPorGenero[detalle][genEvento] = (resumen.clicksPorGenero[detalle][genEvento] || 0) + 1;
      }
    } else if (tipo === 'busqueda') {
      const q = detalle.toLowerCase().trim();
      if (q) resumen.busquedas[q] = (resumen.busquedas[q] || 0) + 1;
    } else if (tipo === 'tiempo') {
      const seg = Number(detalle);
      if (seg > 0) {
        if (!resumen.tiempos[pagina]) resumen.tiempos[pagina] = { total: 0, cantidad: 0 };
        resumen.tiempos[pagina].total += seg;
        resumen.tiempos[pagina].cantidad++;
      }
    }
  });

  resumen.visitantesUnicos = Object.keys(visitantes).length;

  // Franja etaria y género: solo de cuentas de vecino (a los comercios no
  // se les pide este dato), y siempre agrupado — nunca por persona.
  const anioActual = new Date().getFullYear();
  sheetRows_(getSheet_(SHEET_USUARIOS, HEAD_USUARIOS))
    .filter(function (u) { return String(u.tipo) === 'vecino'; })
    .forEach(function (u) {
      const franja = franjaEtaria_(u.anioNacimiento, anioActual);
      resumen.edades[franja] = (resumen.edades[franja] || 0) + 1;
      const gen = generoLabel_(u.genero);
      resumen.genero[gen] = (resumen.genero[gen] || 0) + 1;
    });

  return json_({ ok: true, resumen: resumen });
}

// Cuántas semanas hacia atrás cuenta como "reciente" para el número de
// visitantes únicos que se muestra en admin.html. El detalle completo (qué
// páginas, qué clicks, qué búsquedas, etc.) ya no se muestra ahí — se
// exporta aparte como CSV (ver exportarAnaliticaCSV_ más abajo).
const VENTANA_VISITANTES_SEMANAS = 4;

// Versión liviana de adminAnalyticsResumen_, pensada para el panel
// principal de admin.html: solo cuenta visitantes únicos de las últimas
// VENTANA_VISITANTES_SEMANAS semanas — no arma ninguno de los desgloses
// detallados (páginas, clicks, búsquedas, tiempos, género), que quedan
// reservados para el CSV que se exporta a Drive. Esto además hace que
// abrir admin.html sea más liviano a medida que la hoja de Analítica crece.
function adminResumenPrincipal_(body) {
  if (String(body.adminPassword) !== String(ADMIN_PASSWORD)) return json_({ ok: false, error: 'Clave de administrador incorrecta.' });

  const desde = Date.now() - VENTANA_VISITANTES_SEMANAS * 7 * 24 * 60 * 60 * 1000;
  const eventos = sheetRows_(getSheet_(SHEET_ANALYTICS, HEAD_ANALYTICS));
  const visitantes = {};
  eventos.forEach(function (ev) {
    if (String(ev.tipo || '') !== 'pageview') return;
    const t = new Date(ev.fecha).getTime();
    if (isNaN(t) || t < desde) return;
    const id = String(ev.visitanteId || '');
    if (id) visitantes[id] = true;
  });

  return json_({
    ok: true,
    visitantesUnicosRecientes: Object.keys(visitantes).length,
    ventanaSemanas: VENTANA_VISITANTES_SEMANAS
  });
}

/* ---------------- Exportar la analítica detallada como CSV a Drive ----------------
   El detalle fila por fila (qué página, qué click, qué búsqueda, cuándo,
   con qué franja etaria/género agrupado) ya no se muestra en admin.html —
   se exporta acá como un archivo CSV nuevo en una carpeta privada de Drive
   (al lado de esta misma planilla, NO en la carpeta pública de logos), para
   que se pueda abrir con Excel/Sheets y armar los informes que se le venden
   a la Cámara. Cada exportación crea un archivo nuevo con fecha en el
   nombre — nada se pisa ni se borra, así queda el historial de cada corte. */

function csvEscape_(v) {
  let s = String(v === null || v === undefined ? '' : v);
  // Evita "CSV injection": el campo "detalle" de un evento de analítica lo
  // escribe cualquier visitante (por ejemplo, lo que busca) — si una celda
  // empieza con =, +, - o @, Excel/Sheets puede llegar a interpretarla como
  // una fórmula al abrir el archivo. Anteponerle una comilla simple hace
  // que siempre se lea como texto plano, nunca se ejecute como fórmula.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Carpeta privada (no compartida con nadie) donde se guardan los CSV de
// analítica. Se crea DENTRO de la carpeta de logos (CARPETA_LOGOS_ID) — no
// al lado de la planilla — a propósito: esa es la única carpeta de Drive
// cuyo acceso ya está autorizado en el proyecto (la usa guardarLogoEnDrive_
// desde el principio), así que reutilizarla evita tener que volver a
// autorizar un permiso nuevo de Drive. Aunque viva dentro de la carpeta de
// logos, esta subcarpeta NO hereda el "cualquiera con el link" que tienen
// los archivos de logos — en Drive el sharing se define archivo por archivo
// o carpeta por carpeta, nunca se hereda de la carpeta contenedora — así
// que queda tan privada como cualquier carpeta nueva. Se crea sola la
// primera vez que se exporta.
function carpetaAnaliticaExports_() {
  const carpetaLogos = DriveApp.getFolderById(CARPETA_LOGOS_ID);
  const nombreCarpeta = 'Analítica (privado — no compartir)';
  const existentes = carpetaLogos.getFoldersByName(nombreCarpeta);
  if (existentes.hasNext()) return existentes.next();
  return carpetaLogos.createFolder(nombreCarpeta);
}

function exportarAnaliticaCSV_() {
  const eventos = sheetRows_(getSheet_(SHEET_ANALYTICS, HEAD_ANALYTICS));
  const encabezados = HEAD_ANALYTICS;
  const filas = [encabezados].concat(eventos.map(function (ev) {
    return encabezados.map(function (h) { return ev[h]; });
  }));
  const csv = filas.map(function (fila) {
    return fila.map(csvEscape_).join(',');
  }).join('\r\n');

  const carpeta = carpetaAnaliticaExports_();
  const fechaStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  const blob = Utilities.newBlob(csv, 'text/csv', 'analitica_' + fechaStr + '.csv');
  const file = carpeta.createFile(blob);
  return { url: file.getUrl(), nombre: file.getName(), filas: eventos.length };
}

// Botón "Exportar analítica a Drive" de admin.html — genera el CSV al toque,
// bajo pedido. Para que se genere solo, sin tener que entrar a pedirlo cada
// vez, ver instalarExportSemanalAnalitica() más abajo (se corre una única
// vez, a mano, desde el editor de Apps Script).
function adminExportarAnalitica_(body) {
  if (String(body.adminPassword) !== String(ADMIN_PASSWORD)) return json_({ ok: false, error: 'Clave de administrador incorrecta.' });
  try {
    const resultado = exportarAnaliticaCSV_();
    return json_({ ok: true, url: resultado.url, nombre: resultado.nombre, filas: resultado.filas });
  } catch (err) {
    return json_({ ok: false, error: 'No pudimos generar el CSV (' + err.message + ').' });
  }
}

// Instala un disparador automático que corre exportarAnaliticaCSV_() todos
// los lunes a la mañana, sin que haga falta entrar a admin.html a pedirlo.
// ESTA FUNCIÓN NO SE LLAMA DESDE EL SITIO — hay que ejecutarla una única vez
// a mano desde el editor de Apps Script: arriba, elegí
// "instalarExportSemanalAnalitica" en el desplegable de funciones, tocá
// "Ejecutar" y aceptá los permisos si te los vuelve a pedir. Es seguro
// volver a ejecutarla más de una vez: primero borra cualquier disparador
// viejo de la misma función, así nunca queda corriendo dos veces por semana.
function instalarExportSemanalAnalitica() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'exportarAnaliticaCSV_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('exportarAnaliticaCSV_')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(6)
    .create();
}

/* ================================================================
 * CALZADA DIGITAL — capa nueva agregada en 2026: historias/banners,
 * seguir comercios, likes, cupones y la analítica propia de cada
 * comercio (seguidores, likes, clicks a WhatsApp, consultas más
 * populares). Todo esto se agrega ACÁ ABAJO, sin tocar ni una línea
 * de lo que ya existía arriba — mismo criterio que en el frontend
 * (assets/categorias.js y assets/calzada-digital.js son archivos
 * nuevos, aparte de site.js). Si algo de acá rompe, lo de arriba
 * sigue funcionando exactamente igual.
 *
 * Identidad de cada comercio: en vez de inventar un ID numérico
 * nuevo, cada comercio se identifica con un "slug" calculado a
 * partir de su nombre (slugify_, más abajo) — por ejemplo
 * "Panadería Sol" → "panaderia-sol". Es el MISMO cálculo que hace
 * slugify() en assets/site.js del lado del navegador, así que un
 * comercio siempre tiene el mismo id en el front y en el back, sin
 * tener que guardar ni exponer su email públicamente (el email de
 * un comercio nunca se muestra en la vidriera, ver listarComercios_
 * más arriba).
 * ================================================================ */

const SHEET_SEGUIDORES = 'CD_Seguidores';
const SHEET_LIKES = 'CD_Likes';
const SHEET_HISTORIAS = 'CD_Historias';
const SHEET_CUPONES = 'CD_Cupones';
const SHEET_CUPONES_CANJES = 'CD_Cupones_Canjes';

const HEAD_SEGUIDORES = ['id', 'fecha', 'vecinoEmail', 'comercioId'];
const HEAD_LIKES = ['id', 'fecha', 'vecinoEmail', 'comercioId', 'historiaId'];
const HEAD_HISTORIAS = ['id', 'fecha', 'comercioEmail', 'comercioId', 'comercioNombre', 'rubro', 'tipo', 'texto', 'imagenUrl', 'comprobanteUrl', 'diasBanner', 'publicadoAt', 'expiraAt', 'estado'];
// "costoPuntos" (no "puntosNecesarios") a propósito: es el mismo nombre de
// campo que ya espera el frontend en cdRenderCuenta() / CDcanjearCupon()
// (assets/calzada-digital.js) y el que ya usa la demo local en
// assets/data/cupones.json — se mantiene igual acá para no tener que
// traducir nombres de campo entre el frontend y este backend.
const HEAD_CUPONES = ['id', 'fecha', 'comercioEmail', 'comercioId', 'comercioNombre', 'titulo', 'costoPuntos', 'estado'];
const HEAD_CUPONES_CANJES = ['id', 'fecha', 'vecinoEmail', 'cuponId', 'comercioId', 'puntos', 'estado'];

// Estados posibles de una historia/banner: arranca 'pendiente' (recién
// cargada, esperando que la Cámara la revise en admin.html), y pasa a
// 'aprobado' o 'rechazado' — mismo patrón que ESTADO_PENDIENTE/APROBADO de
// los comercios, un ratito más arriba en este archivo.
const CD_ESTADO_PENDIENTE = 'pendiente';
const CD_ESTADO_APROBADO = 'aprobado';
const CD_ESTADO_RECHAZADO = 'rechazado';

// Mismo cálculo que slugify() en assets/site.js: pasa el nombre a minúsculas,
// saca tildes, cambia cualquier cosa que no sea letra/número por un guion, y
// recorta los guiones de las puntas. Tiene que dar EXACTAMENTE el mismo
// resultado de los dos lados (front y back) para que un comercio tenga
// siempre el mismo id — si alguna vez se cambia uno de los dos, hay que
// cambiar el otro igual.
function slugify_(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca tildes/diéresis
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'comercio';
}

// Devuelve la fila de Usuarios del comercio dueño de ese comercioId (o null
// si no existe / no está aprobado) — recalcula el slug de cada comercio
// aprobado y lo compara, en vez de guardar el id en la planilla, así no hace
// falta ninguna migración de datos viejos.
function comercioPorId_(comercioId) {
  const usuarios = sheetRows_(getSheet_(SHEET_USUARIOS, HEAD_USUARIOS));
  return usuarios.find(function (u) {
    return String(u.tipo) === 'comerciante' && String(u.estado) === ESTADO_APROBADO && slugify_(u.nombre) === comercioId;
  }) || null;
}

// Mismo mecanismo antifraude que verificarComercio_(), pero para cuentas de
// vecino: cualquier acción de "seguir", "likear" o "canjear cupón" vuelve a
// confirmar el email + hash de contraseña contra la planilla, así nadie
// puede actuar a nombre de otro vecino aunque le adivine el email.
function verificarVecino_(email, passwordHash) {
  const sh = getSheet_(SHEET_USUARIOS, HEAD_USUARIOS);
  const em = normEmail_(email);
  const user = sheetRows_(sh).find(function (u) { return normEmail_(u.email) === em; });
  if (!user) return { ok: false, error: 'No encontramos tu cuenta — volvé a iniciar sesión.' };
  if (String(user.passwordHash) !== String(passwordHash)) {
    return { ok: false, error: 'Tu sesión venció o no es válida — volvé a iniciar sesión.' };
  }
  if (String(user.tipo) !== 'vecino') {
    return { ok: false, error: 'Esta acción es solo para cuentas de vecino.' };
  }
  return { ok: true, user: user };
}

/* ---------------- Seguir comercios ---------------- */

// "Seguir" es un simple toggle: si ya lo seguía, deja de seguirlo (se anula
// la fila en vez de borrarla, mismo criterio de auditoría que el resto del
// sistema de puntos). Un vecino puede seguir todos los comercios que quiera.
function seguirComercio_(body) {
  // El frontend (CDseguir, en assets/calzada-digital.js) manda estos datos
  // como vecinoEmail/vecinoPasswordHash (para distinguirlos claramente de
  // los de un comercio en el mismo archivo) — acá se los pasamos igual a
  // verificarVecino_(), que no le presta atención al nombre del parámetro.
  const auth = verificarVecino_(body.vecinoEmail, body.vecinoPasswordHash);
  if (!auth.ok) return json_(auth);
  const comercioId = String(body.comercioId || '').slice(0, 120);
  if (!comercioId) return json_({ ok: false, error: 'Falta el comercio a seguir.' });

  const sh = getSheet_(SHEET_SEGUIDORES, HEAD_SEGUIDORES);
  const filas = sheetRows_(sh);
  const email = normEmail_(auth.user.email);
  const yaSeguia = filas.find(function (f) { return normEmail_(f.vecinoEmail) === email && String(f.comercioId) === comercioId && String(f.estado || 'activo') !== 'anulado'; });

  if (yaSeguia) {
    // Dejar de seguir: se busca la fila real en la hoja para marcarla
    // 'anulado' (mismo patrón manual que "anular" un movimiento de puntos,
    // ver comentario al principio del archivo) — acá se hace automático
    // porque no es una operación sensible a fraude, solo un toggle de UI.
    const lastRow = sh.getLastRow();
    const headerRow = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const idCol = headerRow.indexOf('id');
    const estadoCol = headerRow.indexOf('estado');
    const ids = sh.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(yaSeguia.id)) { sh.getRange(i + 2, estadoCol + 1).setValue('anulado'); break; }
    }
    return json_({ ok: true, siguiendo: false });
  }

  sh.appendRow([Utilities.getUuid(), new Date().toISOString(), email, comercioId, 'activo']);
  return json_({ ok: true, siguiendo: true });
}

function listarSeguidos_(body) {
  const auth = verificarVecino_(body.email, body.passwordHash);
  if (!auth.ok) return json_(auth);
  const email = normEmail_(auth.user.email);
  const seguidos = sheetRows_(getSheet_(SHEET_SEGUIDORES, HEAD_SEGUIDORES))
    .filter(function (f) { return normEmail_(f.vecinoEmail) === email && String(f.estado || 'activo') !== 'anulado'; })
    .map(function (f) { return String(f.comercioId); });
  return json_({ ok: true, comercioIds: seguidos });
}

/* ---------------- Likes (a historias/publicaciones) ---------------- */

function likear_(body) {
  const auth = verificarVecino_(body.vecinoEmail, body.vecinoPasswordHash);
  if (!auth.ok) return json_(auth);
  const comercioId = String(body.comercioId || '').slice(0, 120);
  // El frontend (CDlike) manda "tipo" ('historia' u 'oferta') + "targetId" —
  // los combinamos en un único id de fila, igual que hace el propio
  // frontend en modo demo local (cdToggleLikeLocal_, clave "tipo:targetId"),
  // así un like a la oferta general del comercio y un like a una historia
  // puntual de ese mismo comercio no se pisan entre sí.
  const tipo = String(body.tipo || 'oferta').slice(0, 20);
  const targetId = String(body.targetId || comercioId).slice(0, 60);
  const historiaId = tipo + ':' + targetId;
  if (!comercioId) return json_({ ok: false, error: 'Falta el comercio.' });

  const sh = getSheet_(SHEET_LIKES, HEAD_LIKES);
  const filas = sheetRows_(sh);
  const email = normEmail_(auth.user.email);
  const yaLikeo = filas.find(function (f) {
    return normEmail_(f.vecinoEmail) === email && String(f.comercioId) === comercioId && String(f.historiaId || '') === historiaId;
  });

  if (yaLikeo) {
    return json_({ ok: true, liked: true }); // ya estaba likeado — no duplicamos ni sacamos el like desde acá (sin botón de "quitar like" en la UI)
  }
  sh.appendRow([Utilities.getUuid(), new Date().toISOString(), email, comercioId, historiaId]);
  return json_({ ok: true, liked: true });
}

/* ---------------- Historias y banners ---------------- */

// Tope generoso para las dos imágenes (oferta + comprobante) ya comprimidas
// por el navegador — mismo criterio que MAX_LOGO_BASE64_CHARS más arriba.
const MAX_HISTORIA_BASE64_CHARS = 3000000;

function cargarHistoriaBanner_(body) {
  const auth = verificarComercio_(body.email, body.passwordHash);
  if (!auth.ok) return json_(auth);

  const tipo = body.tipo === 'banner' ? 'banner' : 'historia';
  const diasBanner = tipo === 'banner' ? Math.max(1, Math.min(30, Number(body.diasBanner) || 3)) : 0;
  const texto = String(body.texto || '').slice(0, 200);

  if (String(body.imagenBase64 || '').length > MAX_HISTORIA_BASE64_CHARS) return json_({ ok: false, error: 'La imagen es demasiado pesada.' });
  if (String(body.comprobanteBase64 || '').length > MAX_HISTORIA_BASE64_CHARS) return json_({ ok: false, error: 'El comprobante es demasiado pesado.' });

  let imagenUrl = '', comprobanteUrl = '';
  try {
    imagenUrl = guardarLogoEnDrive_(body.imagenBase64, 'historia - ' + auth.user.nombre);
    comprobanteUrl = guardarLogoEnDrive_(body.comprobanteBase64, 'comprobante - ' + auth.user.nombre);
  } catch (err) {
    return json_({ ok: false, error: 'No pudimos guardar la imagen o el comprobante (' + err.message + '). Probá con archivos más livianos.' });
  }

  const ahora = new Date();
  const comercioId = slugify_(auth.user.nombre);
  const sh = getSheet_(SHEET_HISTORIAS, HEAD_HISTORIAS);
  sh.appendRow([
    Utilities.getUuid(), ahora.toISOString(), normEmail_(auth.user.email), comercioId, auth.user.nombre,
    auth.user.rubro || '', tipo, texto, imagenUrl, comprobanteUrl, diasBanner,
    '', '', // publicadoAt y expiraAt se completan recién cuando la Cámara lo aprueba (ver adminSetEstadoHistoria_)
    CD_ESTADO_PENDIENTE
  ]);
  return json_({ ok: true });
}

// Público (sin clave): todas las historias/banners YA APROBADOS y todavía
// vigentes (no vencidos) — es lo que arma el carrusel de círculos en la
// vidriera. No hace falta cachear esto como listarComercios_ (se espera
// mucho menos volumen de filas que comercios), pero se podría agregar más
// adelante con el mismo patrón si hiciera falta.
function listarHistoriasVigentes_(body) {
  const ahora = Date.now();
  const historias = sheetRows_(getSheet_(SHEET_HISTORIAS, HEAD_HISTORIAS))
    .filter(function (h) {
      if (String(h.estado) !== CD_ESTADO_APROBADO) return false;
      const exp = new Date(h.expiraAt).getTime();
      return !isNaN(exp) && exp > ahora;
    })
    .map(function (h) {
      return {
        id: String(h.id), comercioId: String(h.comercioId), comercioNombre: String(h.comercioNombre),
        rubro: String(h.rubro || ''), tipo: String(h.tipo), texto: String(h.texto || ''),
        imagenUrl: String(h.imagenUrl || ''), publicadoAt: String(h.publicadoAt || ''), expiraAt: String(h.expiraAt || '')
      };
    });
  return json_({ ok: true, historias: historias });
}

// Para "Cuenta" del vecino: las historias/banners vigentes de los comercios
// que sigue, para mostrarle su propio feed (ver cdRenderCuenta en
// assets/calzada-digital.js).
function listarFeedSeguidos_(body) {
  const auth = verificarVecino_(body.email, body.passwordHash);
  if (!auth.ok) return json_(auth);
  const email = normEmail_(auth.user.email);
  const seguidos = {};
  sheetRows_(getSheet_(SHEET_SEGUIDORES, HEAD_SEGUIDORES))
    .filter(function (f) { return normEmail_(f.vecinoEmail) === email && String(f.estado || 'activo') !== 'anulado'; })
    .forEach(function (f) { seguidos[String(f.comercioId)] = true; });

  const ahora = Date.now();
  const feed = sheetRows_(getSheet_(SHEET_HISTORIAS, HEAD_HISTORIAS))
    .filter(function (h) {
      if (String(h.estado) !== CD_ESTADO_APROBADO) return false;
      if (!seguidos[String(h.comercioId)]) return false;
      const exp = new Date(h.expiraAt).getTime();
      return !isNaN(exp) && exp > ahora;
    })
    .map(function (h) {
      return {
        id: String(h.id), comercioId: String(h.comercioId), comercioNombre: String(h.comercioNombre),
        tipo: String(h.tipo), texto: String(h.texto || ''), imagenUrl: String(h.imagenUrl || ''),
        publicadoAt: String(h.publicadoAt || ''), expiraAt: String(h.expiraAt || '')
      };
    });
  return json_({ ok: true, feed: feed, comercioIds: Object.keys(seguidos) });
}

/* ---------------- Aprobación de historias/banners (admin.html) ---------------- */

function adminListHistorias_(body) {
  if (String(body.adminPassword) !== String(ADMIN_PASSWORD)) return json_({ ok: false, error: 'Clave de administrador incorrecta.' });
  const historias = sheetRows_(getSheet_(SHEET_HISTORIAS, HEAD_HISTORIAS))
    // Las más nuevas primero, así lo pendiente de revisar queda arriba de todo.
    .sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); })
    .map(function (h) {
      return {
        id: String(h.id), comercioNombre: String(h.comercioNombre), tipo: String(h.tipo),
        imagenUrl: String(h.imagenUrl || ''), comprobanteUrl: String(h.comprobanteUrl || ''),
        fecha: String(h.fecha || ''), estado: String(h.estado || '')
      };
    });
  return json_({ ok: true, historias: historias });
}

// Al aprobar es cuando recién se calculan publicadoAt/expiraAt (no al
// cargarla) — así el reloj de las 24 horas (o de los días de banner)
// arranca desde el momento real en que empieza a mostrarse, no desde que se
// mandó a revisión (que puede tardar hasta 24 hs en la cola de aprobación).
function adminSetEstadoHistoria_(body) {
  if (String(body.adminPassword) !== String(ADMIN_PASSWORD)) return json_({ ok: false, error: 'Clave de administrador incorrecta.' });
  const estado = body.estado === CD_ESTADO_APROBADO ? CD_ESTADO_APROBADO : (body.estado === CD_ESTADO_RECHAZADO ? CD_ESTADO_RECHAZADO : CD_ESTADO_PENDIENTE);

  const sh = getSheet_(SHEET_HISTORIAS, HEAD_HISTORIAS);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return json_({ ok: false, error: 'No encontramos esa publicación.' });
  const headerRow = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idCol = headerRow.indexOf('id');
  const ids = sh.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === String(body.id)) { rowIndex = i + 2; break; } }
  if (rowIndex === -1) return json_({ ok: false, error: 'No encontramos esa publicación.' });

  const cambios = {};
  cambios[headerRow[headerRow.indexOf('estado')]] = estado;
  if (estado === CD_ESTADO_APROBADO) {
    const fila = sh.getRange(rowIndex, 1, 1, headerRow.length).getValues()[0];
    const tipo = fila[headerRow.indexOf('tipo')];
    const diasBanner = Number(fila[headerRow.indexOf('diasBanner')]) || 3;
    const ahora = new Date();
    const expira = new Date(ahora.getTime() + (tipo === 'banner' ? diasBanner * 24 : 24) * 60 * 60 * 1000);
    cambios[headerRow[headerRow.indexOf('publicadoAt')]] = ahora.toISOString();
    cambios[headerRow[headerRow.indexOf('expiraAt')]] = expira.toISOString();
  }
  Object.keys(cambios).forEach(function (campo) {
    const col = headerRow.indexOf(campo);
    if (col !== -1) sh.getRange(rowIndex, col + 1).setValue(cambios[campo]);
  });
  return json_({ ok: true, estado: estado });
}

/* ---------------- Cupones ---------------- */

// Público: cupones activos de un comercio (para mostrarlos en su ficha o en
// "Cuenta" del vecino). El comercio los carga/edita directamente en la hoja
// CD_Cupones por ahora (no hay todavía un formulario propio en el sitio para
// esto — se puede agregar más adelante con el mismo patrón que "Mi comercio").
function listarCupones_(body) {
  const comercioId = String((body && body.comercioId) || '');
  const cupones = sheetRows_(getSheet_(SHEET_CUPONES, HEAD_CUPONES))
    .filter(function (c) { return String(c.estado || 'activo') === 'activo' && (!comercioId || String(c.comercioId) === comercioId); })
    .map(function (c) {
      return { id: String(c.id), comercioId: String(c.comercioId), comercioNombre: String(c.comercioNombre), titulo: String(c.titulo || ''), costoPuntos: Number(c.costoPuntos || 0) };
    });
  return json_({ ok: true, cupones: cupones });
}

// El vecino canjea un cupón por su cuenta (a diferencia de sumar/canjear
// puntos, que hace el comercio con el teléfono del vecino) — se descuentan
// los puntos usando el MISMO saldo/ledger que ya existe (SHEET_CANJES), así
// el saldo de puntos del vecino sigue siendo uno solo, se use donde se use.
function canjearCupon_(body) {
  const auth = verificarVecino_(body.vecinoEmail, body.vecinoPasswordHash);
  if (!auth.ok) return json_(auth);

  const cupon = sheetRows_(getSheet_(SHEET_CUPONES, HEAD_CUPONES)).find(function (c) { return String(c.id) === String(body.cuponId); });
  if (!cupon || String(cupon.estado || 'activo') !== 'activo') return json_({ ok: false, error: 'Ese cupón ya no está disponible.' });

  const telefono = normPhone_(auth.user.telefono);
  const costoPuntos = Number(cupon.costoPuntos || 0);
  const saldo = calcularSaldo_(telefono);
  if (costoPuntos > saldo) return json_({ ok: false, error: 'Te faltan puntos para este cupón — tenés ' + saldo + ' y hacen falta ' + costoPuntos + '.' });

  // Se registra en el ledger general de puntos (mismo que usa un comercio
  // cuando canjea puntos a mano) para que el saldo quede correcto...
  const shCanjes = getSheet_(SHEET_CANJES, HEAD_CANJES);
  shCanjes.appendRow([Utilities.getUuid(), new Date().toISOString(), normEmail_(cupon.comercioEmail), cupon.comercioNombre, telefono, costoPuntos, 'Cupón: ' + cupon.titulo, 'confirmado', 'Autocanje del vecino desde Cuenta']);
  // ...y además queda una fila propia acá, para poder mostrarle al comercio
  // "cuántos canjearon este cupón" sin tener que buscarlo entre todos los
  // canjes de puntos de CD_Canjes.
  const shCuponesCanjes = getSheet_(SHEET_CUPONES_CANJES, HEAD_CUPONES_CANJES);
  shCuponesCanjes.appendRow([Utilities.getUuid(), new Date().toISOString(), normEmail_(auth.user.email), String(cupon.id), String(cupon.comercioId), costoPuntos, 'confirmado']);

  return json_({ ok: true, titulo: String(cupon.titulo || ''), saldoActual: calcularSaldo_(telefono) });
}

/* ---------------- Analítica propia de cada comercio ----------------
   "Tenés X seguidores", "X personas dieron like", "X clicks a WhatsApp" y
   "consultas más populares" — privado, cada comercio ve solo lo suyo (nunca
   un ranking entre comercios, para evitar quejas, tal como se charló). Los
   clicks a WhatsApp y las consultas de búsqueda NO tienen una hoja propia:
   viajan disimulados adentro de la columna "detalle" que YA existía en
   Analitica (ver trackEvent_ más arriba), con un prefijo que dice de qué
   comercio se trata — "whatsapp:<id> | Nombre" para un click a WhatsApp, y
   "consulta:<id>|texto buscado" cuando ese comercio apareció entre los
   primeros resultados de una búsqueda (ver runSearch envuelto en
   assets/calzada-digital.js). Así no hace falta ni una hoja nueva ni tocar
   el motor de búsqueda para tener esto. */

function obtenerAnaliticaComercio_(body) {
  const auth = verificarComercio_(body.email, body.passwordHash);
  if (!auth.ok) return json_(auth);
  const comercioId = slugify_(auth.user.nombre);

  const rangoDias = { '24h': 1, '7d': 7, '30d': 30 }[String(body.rango)] || 7;
  const desde = Date.now() - rangoDias * 24 * 60 * 60 * 1000;

  const seguidores = sheetRows_(getSheet_(SHEET_SEGUIDORES, HEAD_SEGUIDORES))
    .filter(function (f) { return String(f.comercioId) === comercioId && String(f.estado || 'activo') !== 'anulado'; }).length;

  const likes = sheetRows_(getSheet_(SHEET_LIKES, HEAD_LIKES))
    .filter(function (f) { return String(f.comercioId) === comercioId; }).length;

  let clicksWhatsapp = 0;
  const consultasPorTexto = {};
  sheetRows_(getSheet_(SHEET_ANALYTICS, HEAD_ANALYTICS)).forEach(function (ev) {
    const t = new Date(ev.fecha).getTime();
    if (isNaN(t) || t < desde) return;
    const detalle = String(ev.detalle || '');
    if (String(ev.tipo) === 'click' && detalle.indexOf('whatsapp:' + comercioId + ' ') === 0) {
      clicksWhatsapp++;
    } else if (String(ev.tipo) === 'consulta' && detalle.indexOf('consulta:' + comercioId + '|') === 0) {
      const q = detalle.split('|')[1] || '';
      if (q) consultasPorTexto[q] = (consultasPorTexto[q] || 0) + 1;
    }
  });

  // Nombres de campo elegidos para calzar exactos con lo que ya lee
  // cdRenderAnalitica() en assets/calzada-digital.js: "consultas" como
  // array de {termino, n} (no "consultasMasPopulares"/{consulta,veces}) y
  // "likes7d"/"clicksWa7d" — quedó ese nombre porque el rango por defecto
  // de la pantalla es 7 días, aunque en los hechos siguen el rango elegido
  // (24h/7d/30d) con los botones de arriba.
  const consultas = Object.keys(consultasPorTexto)
    .map(function (q) { return { termino: q, n: consultasPorTexto[q] }; })
    .sort(function (a, b) { return b.n - a.n; })
    .slice(0, 10);

  return json_({
    ok: true,
    comercioId: comercioId,
    seguidores: seguidores,
    likes7d: likes,
    clicksWa7d: clicksWhatsapp,
    rangoDias: rangoDias,
    consultas: consultas
  });
}
