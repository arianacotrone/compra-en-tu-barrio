# Calzada Digital — sitio completo para subir al dominio

Versión con archivos separados (HTML/CSS/JS/datos/imágenes), lista para editar y para subir a hosting.

## Estructura

```
index.html              ← portada: hero corto + ofertas de la semana + eventos próximos + actividades de la Cámara + registro/login
conoce-el-barrio.html   ← subpágina: identidad de Rafael Calzada + rol de la Cámara y el Plan Integral 2026-2028
vidriera.html           ← subpágina: vidriera digital — categorías, historias/banners, buscador, tarjetas y mapa + Fase 2 (comparar productos)
farmacias.html          ← subpágina: farmacia de turno hoy + próximos turnos
cuenta.html             ← "Cuenta" del comprador/comercio: puntos, cupones, comercios seguidos, accesos a analítica/publicar — ver "Calzada Digital" más abajo
analitica.html          ← analítica privada de cada comercio (seguidores, likes, clicks a WhatsApp, consultas más populares) — ver "Calzada Digital" más abajo
publicar.html           ← formulario del comercio para comprar una historia (24 hs) o un banner (días fijos) — ver "Calzada Digital" más abajo
admin.html              ← panel de administración (usuarios, puntos de fidelidad, aprobación de historias/banners) — ver más abajo, no está enlazado en el menú
favicon.ico
manifest.json           ← metadata de la PWA (nombre, ícono, colores) — lo que hace que el sitio sea "instalable" (ver más abajo)
sw.js                   ← service worker: cachea el sitio para que abra al toque y funcione algo offline (ver más abajo)
assets/
  style.css              ← todo el diseño de base (colores, tipografías, componentes originales)
  site.js                ← toda la lógica compartida (buscador, cuentas, farmacias, puntos de fidelidad) — se reutiliza en todas las páginas
  categorias.js          ← Calzada Digital: agrupa los rubros en categorías/subcategorías para la vidriera — ver más abajo
  calzada-digital.js      ← Calzada Digital: categorías, historias/banners, seguir, likes, cupones, analítica y "Cuenta" — ver más abajo
  calzada-digital.css     ← Calzada Digital: estilos de todo lo anterior, reutilizando los mismos colores/tipografías de style.css
  map.js                 ← la capa de mapa de la vidriera digital (ver más abajo)
  img/logo.png           ← logo real de la Cámara
  img/icons/*.png        ← íconos de la app (varios tamaños, incluye versiones "maskable" para Android)
  img/comercios/*.png    ← logo (placeholder) de cada comercio, usado en las tarjetas
  data/comercios.json    ← el catálogo de comercios (acá se reemplaza por datos reales)
  data/farmacias.json    ← farmacias y su día de turno (acá se reemplaza por el cronograma real)
  data/eventos.json      ← eventos próximos que se muestran en la portada (acá se reemplaza por los reales)
  data/actividades.json  ← actividades que ofrece la Cámara, en la portada (acá se reemplaza por las reales)
  data/historias.json    ← Calzada Digital: historias/banners de ejemplo (solo se usa sin backend real, modo demo)
  data/cupones.json      ← Calzada Digital: cupones de ejemplo (solo se usa sin backend real, modo demo)
backend/
  Code.gs                ← backend real opcional (Google Apps Script) para cuentas, puntos de fidelidad, y ahora también historias/banners, seguir, likes, cupones y analítica por comercio (Calzada Digital) — ver más abajo. No se sube al hosting: se pega en Google Sheets.
```

Aparte, junto con este sitio te dejé cuatro archivos `comercios.csv`, `farmacias.csv`, `eventos.csv` y `actividades.csv` — no van dentro de la carpeta que subís al hosting, son la plantilla para cargar esos datos en Google Sheets si preferís ese camino (ver la sección "Cargar los datos desde Google Sheets" más abajo).

## Cómo subirlo

1. Subí **toda la carpeta** (`index.html`, `vidriera.html`, `farmacias.html`, `favicon.ico` y la carpeta `assets/` completa, con su estructura interna) a la raíz de tu dominio o subdominio — por FTP o por el administrador de archivos de tu hosting (cPanel, Plesk, GitHub Pages, etc.), igual que hiciste con esparco.com.ar o faryco.com.ar.
2. No hace falta Node, PHP ni base de datos — es un sitio 100% estático.

## Ahora se puede "instalar" en el celular como una app (PWA)

El sitio quedó convertido en una **Progressive Web App**: sin escribir una app nativa ni pasar por Google Play o la App Store, cualquiera que entre desde el celular puede agregarlo a su pantalla de inicio y va a abrir como una app — con su propio ícono, sin la barra del navegador arriba.

**Cómo se instala (una vez subido a tu dominio o a GitHub Pages, con HTTPS):**
- **Android (Chrome)**: al entrar al sitio aparece solo un cartel de "Agregar a pantalla de inicio", o se puede hacer desde el menú ⋮ → "Instalar app" / "Agregar a pantalla de inicio".
- **iPhone (Safari)**: tocar el botón de compartir (el cuadradito con la flecha) → "Agregar a la pantalla de inicio". iOS no muestra un cartel automático como Android — siempre es este paso manual, así funciona Safari para cualquier PWA.
- **Computadora (Chrome/Edge)**: aparece un ícono de instalar (⊕) al final de la barra de direcciones.

**Qué se agregó para lograr esto** (los tres archivos nuevos en la raíz del sitio):
- **`manifest.json`**: le dice al sistema operativo el nombre de la app, sus íconos y sus colores. Los íconos (`assets/img/icons/`) los generé recortando el arco de tu logo actual — el logo completo con todo el texto no se lee bien en un ícono tan chico, así que uso solo el símbolo. El día que tengas un ícono de app diseñado a propósito, solo hay que reemplazar esos archivos.
- **`sw.js`** (el *service worker*): un script que corre en segundo plano y cachea el sitio, para que abra al toque incluso con mala señal, y funcione un poco aunque se corte la conexión (el catálogo de comercios y las farmacias siempre se piden primero a internet para no mostrar datos viejos — el modo offline es un respaldo, no reemplaza tener conexión).
- Un puñado de `<meta>`/`<link>` nuevos en el `<head>` de las tres páginas, para que iOS y Android reconozcan el sitio como instalable.

No cambié nada de cómo se sube el sitio: sigue siendo subir la carpeta entera tal cual a tu hosting o a GitHub Pages — estos archivos nuevos van con el resto.

**Sobre publicarla en Google Play o la App Store**: eso es un paso aparte y más grande (envolver el sitio con una herramienta como Capacitor, tener cuenta de desarrollador en cada tienda, y para iOS específicamente necesitás una Mac con Xcode) — la instalación de arriba no pasa por ninguna tienda, es directo desde el navegador. Si en algún momento querés ir por ese camino igual, este mismo código es la base — avisame y lo charlamos.

### Un cartel que invita a instalar (para no depender de que alguien lo busque solo)

Además de lo de arriba, el sitio ahora muestra un cartel propio, abajo de la pantalla, invitando a instalar:

- **En Android/Chrome y en la computadora**: el cartel tiene un botón real de **"Instalar"** que dispara el instalador nativo del navegador (el mismo que aparecería solo en un menú, pero visible siempre, no escondido). Esto es posible porque esos navegadores le avisan al sitio, por código, que la instalación está disponible.
- **En iPhone (Safari/iOS)**: Apple no le da a ningún sitio una forma de disparar la instalación por código — ni Calzada Digital ni ninguna otra web puede saltarse eso. Ahí el cartel muestra en texto los pasos exactos (tocar compartir → "Agregar a la pantalla de inicio"), para que no dependa de que la persona sepa buscarlo por su cuenta.
- El cartel tiene una "✕" para cerrarlo — si alguien lo cierra, no vuelve a aparecer hasta dentro de 14 días (se guarda en el navegador de esa persona, con `localStorage`). Y si el sitio ya se está usando instalado (como app, sin la barra del navegador), el cartel directamente no aparece — no tiene sentido invitar a instalar algo que ya se instaló.

## Importante: para probarlo en tu computadora, corré un servidor local

Las páginas cargan datos con `fetch()` (el catálogo de comercios y las farmacias de turno). Eso funciona perfecto una vez subido al hosting (o en GitHub Pages), pero **si abrís los archivos con doble clic desde tu computadora, el navegador va a bloquear esa carga por seguridad (CORS)** y vas a ver un aviso de "no pudimos cargar" en pantalla.

Para probarlo local, desde la carpeta del proyecto corré:

```bash
python3 -m http.server 8000
```

y abrí `http://localhost:8000` en el navegador. Ahí sí va a cargar todo.

## La portada ahora es corta, con lo más accionable arriba de todo

El hero de `index.html` se achicó: el título, un párrafo breve y tres botones — **Ver la vidriera digital**, **Ver farmacias de turno** y **Asociá tu comercio** — sin las estadísticas ni el contenido largo que tenía antes. Todo el contenido sobre la identidad de Rafael Calzada y el Plan Integral de Desarrollo Comercial de la Cámara se movió a su propia subpágina: `conoce-el-barrio.html` (nuevo link "Conocé el barrio" en el menú).

Debajo del hero, la portada muestra ahora tres secciones nuevas, en este orden:

- **Ofertas de la semana**: descuentos o promociones puntuales que cada comercio socio carga por su cuenta desde el panel "🏪 Mi comercio" (ver la sección de "Registro de comercio" más abajo) — dos campos opcionales: el texto de la oferta y, si quiere, hasta qué fecha vale. Una oferta sin fecha de vencimiento queda visible hasta que el propio comercio la borre; con fecha, desaparece sola apenas pasa ese día, sin que nadie tenga que acordarse de sacarla a mano. La misma oferta se ve también como una cinta 🏷️ en la tarjeta de ese comercio en la vidriera digital. El catálogo estático (`comercios.json`/`comercios.csv`) también admite estos dos campos (`oferta` y `oferta_vence`) por si preferís cargar alguna vos misma a mano — hoy hay tres comercios de ejemplo con oferta cargada, para que la sección no se vea vacía en la demo.
- **Eventos próximos**: ferias, actividades culturales y encuentros del barrio, en `assets/data/eventos.json` (o desde una Google Sheets publicada, igual que el resto — ver más abajo). Se muestran ordenados por fecha, del más próximo al más lejano, y un evento con la fecha ya pasada deja de listarse solo.
- **Actividades que da la Cámara**: capacitaciones, asesorías y beneficios para los comercios socios, en `assets/data/actividades.json` (o Google Sheets, mismo mecanismo).

## El menú del header ahora tiene un desplegable + ícono de Instagram

En escritorio, el header ya no muestra los cinco links sueltos de antes. Ahora quedan siempre visibles solo dos botones — **Comercios** (antes "Vidriera Digital", va a `vidriera.html`) y **Farmacias** (antes "Farmacias de turno", va a `farmacias.html`) — y un botón **Menú ▾** que despliega los otros tres links (Conocé el barrio, Comparar Productos, Sumá tu comercio) en un pequeño panel flotante. El desplegable se cierra solo al elegir un link, al tocar afuera o con Escape. En celular sigue funcionando todo con el mismo botón de hamburguesa de siempre: ahí el "Menú ▾" no aparece como botón aparte, directamente se listan todos los links uno debajo del otro (no tiene sentido un desplegable-dentro-de-otro-desplegable en una pantalla chica).

También se agregó un **ícono chico de Instagram** al final del menú, pensado para linkear al Instagram de la Cámara. **Todavía no tiene el link real** — quedó con una URL de ejemplo bien marcada (`https://instagram.com/COMPLETAR-INSTAGRAM-CAMARA`) para que sea fácil de encontrar y reemplazar. Está en los cuatro archivos HTML (`index.html`, `vidriera.html`, `farmacias.html`, `conoce-el-barrio.html`), buscá el comentario `<!-- Instagram de la Cámara: FALTA EL LINK REAL... -->` justo arriba del ícono en cada uno y cambiá el `href` por la cuenta real cuando la tengan.

## Ahora la vidriera digital y "Comparar productos" son una subpágina

Desde el botón dorado del hero ("Explorar la vidriera digital") o desde el menú, se entra a `vidriera.html`: ahí está el buscador, el catálogo en tarjetas o en mapa (con un botón para alternar entre las dos vistas) y, más abajo, la sección de "Comparar productos" de Fase 2.

## El mapa de la vidriera (assets/map.js)

Al tocar "🗺️ Mapa" en la vidriera digital aparece un mapa navegable con un marcador por cada comercio (con su nombre, rubro, dirección y un link a Google Maps para llegar). Ese mapa hoy corre sobre **OpenStreetMap con la librería Leaflet**, no sobre Google Maps directamente:

- Google Maps (la API de mapas interactivos, "Maps JavaScript API") exige una **API key** asociada a una cuenta de Google Cloud con facturación habilitada. Como este sitio es estático y no tiene backend, no hay dónde esconder esa key de forma segura ni facturación configurada todavía.
- OpenStreetMap con Leaflet es gratis, no pide API key y se ve y funciona de forma muy parecida (mapa navegable, zoom, marcadores con info).

El día que la Cámara tenga su propia API key de Google Maps, `assets/map.js` es el único archivo que hay que tocar: se cambia la capa de base por la de Google Maps y el resto (marcadores, popups, botón de alternar vista) sigue funcionando igual. Avisame cuando la tengan y lo hacemos.

Las ubicaciones de los comercios en el mapa son **ilustrativas**: como el catálogo tiene comercios ficticios, no hay una dirección real para geocodificar — cada uno cae en un punto fijo alrededor del centro de Calzada, siempre el mismo, solo para que el mapa se vea poblado. Con el Excel real de la Cámara, se geocodifican las direcciones de verdad.

## Farmacias de turno (farmacias.html)

Se accede con el botón "Ver farmacias de turno" del hero. Muestra la farmacia que le toca hoy (calculado según el día de la semana) y la rotación completa de la semana.

**Importante — esto es una maqueta con datos de ejemplo**, no el turno real de Rafael Calzada: usa 7 farmacias ficticias, una por día. El turno real de la zona lo publica el Colegio de Farmacéuticos de la Provincia de Buenos Aires y rota día a día (a veces más de una vez por día), no en un ciclo fijo semanal. Para reemplazar esto por datos reales hay dos caminos:
- **Manual**: la Cámara actualiza `assets/data/farmacias.json` cada vez que cambia el cronograma (mismo mecanismo que `comercios.json`).
- **Automático**: si se define una fuente pública estable para consultar el turno de Rafael Calzada, se puede armar un proceso que actualice ese archivo solo. Avisame si quieren ir por ese lado y vemos qué fuente usar.

## Registro e inicio de sesión

El botón "Ingresar / Registrarme" del menú (visible en todas las páginas) abre un modal con dos pestañas: **Iniciar sesión** y **Soy vecino**. El registro de comercio ya no vive en este modal — tiene su propio lugar, ver la sección siguiente.

- **Contraseña con reglas reales**: mínimo 8 caracteres, al menos una letra mayúscula y al menos un número. Mientras se escribe, un checklist debajo del campo va marcando en verde cada regla que se cumple, y hay un campo de "Confirmar contraseña" que valida que coincidan. La contraseña real nunca se guarda ni se envía: solo un *hash* (SHA-256) que no se puede revertir.
- **Dos modos, sin tocar código para elegir cuál usás**: si en `assets/site.js` el campo `SHEETS_CONFIG.backendUrl` está vacío (como viene por defecto), las cuentas quedan guardadas solo en el `localStorage` del navegador donde probás el sitio — sirve para mostrar el flujo completo, pero cada cuenta queda solo en ese navegador, nadie más la ve (ni siquiera vos como administradora). Si pegás ahí la URL de un backend real (ver la sección siguiente), las cuentas quedan guardadas de verdad en una Google Sheet compartida — ahí sí las podés ver todas, desde cualquier lado, incluyendo desde `admin.html`.
- Al iniciar sesión, el botón de "Ingresar/Registrarme" del menú cambia por un saludo con tu nombre, un botón de puntos y uno para salir.
- **Año de nacimiento y género (solo en el registro de vecino, ambos opcionales)**: sirven únicamente para segmentar la analítica del sitio por franja etaria y género (ver la sección de Analítica, más abajo) — nunca son obligatorios para poder registrarse, y los dos tienen la opción "Prefiero no decirlo" (marcando esa casilla en el año, o dejando el género en esa opción por defecto). No se piden en el registro de comercio, porque ahí no representan a una persona en particular. En el panel de administración se ven como dos columnas más en la tabla de usuarios, y agrupados (nunca el dato individual de una persona) en la sección de Analítica.

## Registro de comercio, con aprobación de la Cámara

El botón "Sumar mi comercio" (en la sección "Sumate a la Cámara" de `index.html`) ya no abre un modal: revela ahí mismo, abajo, el formulario de registro de comercio. Al enviarlo, la cuenta se crea automáticamente pero queda **pendiente de aprobación**, con un aviso en pantalla: *"Tu comercio quedó pendiente de aprobación de la Cámara (hasta 10 días hábiles)... Una vez aprobado, iniciá sesión y vas a ver el botón '🏪 Mi comercio'"*.

Mientras está pendiente:

- En el menú, en vez de los botones de puntos, el comercio ve un cartel "⏳ Pendiente de aprobación" (no puede sumar ni canjear puntos a nadie, ni editar los datos de su tarjeta).
- Su tarjeta **no aparece todavía** en la vidriera digital — ni para buscarla ni para verla en el mapa.
- Si de todas formas se intenta sumar o canjear puntos con esa cuenta (por ejemplo llamando directamente al backend), el sistema lo bloquea también del lado del servidor, con el mismo mensaje de "pendiente de aprobación".

**Aprobar un comercio, desde `admin.html`:** en la tabla de "Comercios registrados" cada uno tiene una columna "Aprobación" (⏳ Pendiente / ✅ Aprobado) y un botón de acción para pasar de uno a otro ("✅ Aprobar" / "Marcar pendiente") — un solo click, sin tocar la planilla a mano. Apenas se aprueba:

- El comercio, la próxima vez que inicie sesión, ve los botones "➕ Puntos" y "🏪 Mi comercio" en el menú.
- Su tarjeta empieza a aparecer en la vidriera digital, junto con el resto del catálogo.
- Ya puede sumar y canjear puntos a sus clientes con normalidad.

**Panel "🏪 Mi comercio" (solo visible una vez aprobado):** le permite al comercio cargar y actualizar, cuando quiera, los datos de su propia tarjeta — rubro, descripción, dirección, teléfono, si tiene sitio web (y cuál), las tags de búsqueda, el logo y, opcionalmente, una **oferta de esta semana** (con fecha de vencimiento opcional) — sin depender de la Cámara para hacer ese cambio. Los cambios se reflejan al toque en la vidriera digital; la oferta, además, aparece en la sección "Ofertas de la semana" de la portada mientras esté vigente (ver esa sección más arriba).

## El teléfono se carga con el "11" fijo — y por qué

Todos los campos de teléfono del sitio (registro de vecino, registro de comercio, "Mi comercio", consultar saldo, sumar/canjear puntos) muestran ahora el **"11" fijo, no editable**, a la izquierda, y un casillero al lado que solo acepta **8 dígitos** — nada de espacios, guiones ni letras; si escribís algo que no sea un número, el sitio lo descarta solo, tecla por tecla. Al guardar, el teléfono que llega al backend es siempre "11" + esos 8 dígitos, como texto.

Esto no es solo estético: fue lo que rompió la vidriera una vez (ver el arreglo de "la vidriera digital ya ni tiene comercios visibles" más arriba en el historial de cambios) — un comercio había cargado su teléfono como puros números sin ningún separador, y Google Sheets lo guardó como **valor numérico** en vez de texto, lo que rompía el link de WhatsApp de todas las tarjetas a la vez. Además del arreglo defensivo que ya tenía el sitio (forzar el dato a texto en todos lados donde se usa), ahora el propio backend deja la columna `telefono` de la planilla **fijada en formato "Texto sin formato"** la primera vez que corre después de este cambio — así Google Sheets ya no puede volver a auto-detectarla como número, pase lo que pase de acá en adelante. No hace falta que hagas nada para esto: se arregla solo la primera vez que alguien use el sitio después de que vuelvas a implementar `backend/Code.gs`.

De paso, se agregaron límites razonables (`maxlength`, rangos numéricos, etc.) a todos los demás campos que carga un vecino o un comercio — nombre, dirección, descripción, sitio web, tags, monto de una compra — tanto en el formulario (para que el navegator avise antes de mandar algo raro) como en el propio backend (por si alguien intenta mandar un pedido armado a mano, sin pasar por el formulario).

## Logo del comercio: se sube solo a Google Drive al registrarse

Al completar el formulario de "Sumá tu comercio" ahora hay que subir también una foto del logo — es un campo obligatorio, igual que el nombre o la dirección. Desde "🏪 Mi comercio" se puede reemplazar el logo más adelante cuando quieran (ahí sí es opcional: si no elegís un archivo nuevo, se mantiene el que ya tenían cargado).

Cómo funciona, de punta a punta:

1. El navegador redimensiona la imagen a un máximo de 500px de lado y la comprime (calidad JPEG ~85%) **antes** de mandarla a ningún lado — así el archivo que viaja es siempre chico (normalmente unos pocos cientos de KB), sin importar si la foto original venía pesadísima directo del celular.
2. Esa imagen ya comprimida se manda al backend, que la guarda como un archivo nuevo en esta carpeta de Google Drive: <https://drive.google.com/drive/folders/1LXO8AGUSQ4VxljUTTY6NY91sDu85ftNV>
3. El backend comparte ese archivo como "cualquiera con el link puede ver" (si no, la imagen no se podría mostrar públicamente en la vidriera) y guarda el link en una columna nueva de la planilla de Usuarios (`logoUrl`).
4. La vidriera muestra ese logo en la tarjeta del comercio — es el mismo mecanismo que ya existía para cargar logos a mano en el catálogo estático (ver la sección "Un logo chiquito por comercio en las tarjetas" más abajo), así que si alguna vez el link no carga, la tarjeta simplemente vuelve a mostrar el cartel de rubro de siempre, nunca queda rota.

**Un aclaración importante sobre "PowerApps"**: para esto no hace falta Microsoft PowerApps ni ninguna herramienta nueva — todo el sitio ya corre sobre Google Apps Script y Google Sheets, y Apps Script puede escribir directo a Google Drive con el mismo código que ya escribe en la planilla. Sumar PowerApps hubiera significado además migrar a otro ecosistema (Microsoft) que no tiene nada que ver con Google Sheets/Drive que ya estás usando — más complicado y no hacía falta.

**Un paso único que tenés que hacer vos:** la próxima vez que hagas "Implementar → Gestionar implementaciones → Nueva versión → Implementar" en Apps Script, Google te va a pedir **autorizar de nuevo el script** — esta vez porque el código ahora también toca Google Drive (antes solo tocaba la planilla). Es el mismo mecanismo de siempre (tu propia cuenta pidiéndote permiso para tocar tus propios archivos): aceptá los permisos y listo, no hace falta hacer nada más.

Antes de esto, la carpeta de Drive del link de arriba debería estar vacía o con lo que ya tuvieras ahí — cada logo que se suba desde el sitio va a aparecer ahí con el nombre `logo - <nombre del comercio>.jpg`, para que sea fácil identificarlos si alguna vez necesitás revisarlos a mano.

## Seis mejoras más de experiencia de usuario

Además de las limitaciones de arriba, se sumaron estas seis mejoras (pensadas para que cargar los datos sea más fácil y más difícil de arruinar sin querer):

1. **Contadores de caracteres.** Los campos más largos de "Mi comercio" (descripción, dirección, sitio web, etiquetas y oferta) ahora muestran, mientras escribís, cuánto llevás cargado sobre el máximo permitido (ej. "128/500") — el número se pone dorado cerca del límite y rojo al llegar al tope, así nunca te encontrás con que "se cortó" el texto recién al guardar.
2. **Validación de correo más estricta.** Todos los campos de correo electrónico del sitio (registro, login, "Mi comercio") ahora exigen el formato completo de un email (`algo@dominio.algo`) tanto en el propio formulario (el navegador avisa antes de mandarlo) como en el backend — antes alcanzaba con que hubiera un `@` en cualquier lado.
3. **Contraseña: barra de fuerza + mostrar/ocultar.** Además del check de "mínimo 8 caracteres, una mayúscula y un número" que ya existía, ahora hay una barra de color (rojo/amarillo/verde → Débil/Media/Fuerte) que responde a la variedad de la contraseña que vas escribiendo, y un ícono de ojo 👁️ al lado de cada campo de contraseña para mostrarla u ocultarla mientras la tipeás.
4. **Aviso si el navegador bloquea el almacenamiento local.** Si alguien entra con un navegador o una configuración que bloquea `localStorage` (por ejemplo, incógnito con "bloquear cookies y datos de sitios" activado), antes el sitio fallaba en silencio: la cuenta parecía crearse pero se perdía la sesión sin explicación. Ahora aparece un cartel arriba de todo explicando qué pasa y cómo solucionarlo.
5. **Historial de los últimos 3 logos.** Cada vez que un comercio reemplaza su logo desde "Mi comercio", el logo anterior no se pierde: queda guardado en una pequeña galería ("O volvé a uno de tus logos anteriores") con un botón "Usar este" al lado de cada uno, para volver a él con un click, sin tener que volver a subir el archivo. Se guardan como máximo los 3 últimos logos (el más nuevo primero); uno más viejo que eso se descarta solo. Esto no pide ninguna autorización nueva de Google — es una columna más (`logoHistorial`) que aparece sola en la planilla de Usuarios la primera vez que la use alguien, igual que pasó con `logoUrl`.
6. **Placeholder de "cerca tuyo" en la vidriera.** Cuando un vecino con sesión iniciada navega la vidriera sin buscar nada ni elegir un rubro puntual, los comercios cuya dirección comparte alguna palabra de calle con la suya (por ejemplo, los dos en "Av. Espora") aparecen primero dentro de su fila de rubro, con una etiqueta "🏠 Cerca tuyo". Es **a propósito muy simple** — compara texto, no calcula distancias reales ni usa ningún mapa — pensado como un primer paso liviano y sin costo mientras se diseña, más adelante, una API de recomendación más completa que combine cercanía real + historial de clicks + género + rango etario, y se vaya puliendo con el tiempo.

## Panel de administración (`admin.html`)

Nueva página, **a propósito sin ningún link en el menú del sitio** (para que no la vea cualquier visitante) — para entrar hay que escribir la dirección directamente: `tudominio.com/admin.html`. Pide una clave de administrador y muestra, en este orden:

1. **Visitantes únicos de las últimas 4 semanas** — un único número, no el detalle de navegación (ver "Analítica del sitio" más abajo: el detalle completo se exporta aparte, como CSV, para no acumular datos de cada visita individual en pantalla).
2. **Comercios registrados** — nombre, logo, contacto, rubro, fecha de alta, estado de aprobación (⏳ Pendiente / ✅ Aprobado) y estado de la cuota societaria (✅ Al día / 🚫 Vencida), con un botón para cada uno (ver "Registro de comercio" y "Activar/desactivar un comercio por la cuota societaria" más abajo).
3. **Vecinos registrados** — nombre, contacto, dirección, año de nacimiento y género (si los cargaron), y sus **puntos actuales, ordenados de mayor a menor** — así de un vistazo se ve quién tiene más puntos acumulados.
4. **Movimientos y canjes de puntos** — el historial completo de sumas y canjes, con fecha, comercio, teléfono y estado (igual que antes).

Ninguna de estas tablas muestra nunca la contraseña de nadie, ni su hash.

## Activar/desactivar un comercio por la cuota societaria

Independiente de la aprobación inicial (que decide si el comercio *puede* usar el sistema) está la cuota societaria (que decide si *puede seguir* usándolo). Un comercio ya aprobado tiene, en la tabla de "Comercios registrados" de `admin.html`, un botón "🚫 Desactivar" — usalo cuando detectes que un comercio dejó de pagar la cuota. Un comercio desactivado así:

- Deja de aparecer en la vidriera digital (ni en la búsqueda ni en el mapa) hasta que se lo reactive.
- No puede sumar ni canjear puntos a sus clientes, ni editar los datos de su tarjeta desde "🏪 Mi comercio" — ve un cartel "🚫 Desactivado (cuota pendiente)" en el menú en vez de esos botones.
- **No vuelve a "pendiente"** — no hace falta que lo vuelvas a aprobar cuando se regularice: el mismo botón, ahora "✅ Activar", lo reactiva al toque, sin perder nada de su historial de puntos ni de su tarjeta.

Esto es completamente independiente del botón de aprobación ("✅ Aprobar" / "Marcar pendiente") — un comercio puede estar aprobado y con la cuota vencida al mismo tiempo, y en ese caso queda oculto igual que uno pendiente.

## Backend real en Google Sheets (cuentas y puntos compartidos)

Por defecto el sitio es 100% estático (sin esto, las cuentas y los puntos de fidelidad son una maqueta local por navegador). Para que sean de verdad compartidos entre todos los comercios y vecinos — y para que vos, como administradora, puedas ver todos los usuarios registrados — hay un backend opcional y gratuito hecho con Google Apps Script, en `backend/Code.gs`.

**Instalación (una sola vez, unos 5 minutos):**

1. Andá a [sheets.new](https://sheets.new) para crear una planilla de Google Sheets nueva y vacía.
2. En esa planilla: **Extensiones → Apps Script**. Te abre un editor de código con un archivo de ejemplo — borrá todo lo que tenga y pegá el contenido completo de `backend/Code.gs`.
3. Dentro de ese código, cambiá la línea `const ADMIN_PASSWORD = 'CAMBIAR-ESTA-CLAVE';` por una clave tuya (la vas a usar para entrar a `admin.html`).
4. Arriba a la derecha: **Implementar → Nueva implementación**. Tipo: "Aplicación web". Ejecutar como: "Yo". Quién tiene acceso: "Cualquier usuario". Después, **Implementar**.
5. La primera vez, Google te va a pedir autorizar el script — es tu propia cuenta pidiéndote permiso para que el script pueda tocar tu propia planilla, es seguro, podés aceptar.
6. Te da una URL que termina en `/exec` ("URL de la aplicación web") — copiala.
7. Pegá esa URL en `assets/site.js`, en `SHEETS_CONFIG.backendUrl`.

Listo — a partir de ahí, todos los registros, logins, movimientos de puntos y la analítica del sitio quedan guardados de verdad en esa planilla (se crean solas 4 hojas la primera vez que se usan: `Usuarios`, `Puntos_Movimientos`, `Puntos_Canjes`, `Analitica`). Podés abrir esa planilla en cualquier momento y mirar todo directamente ahí, fila por fila, además de verlo con mejor formato en `admin.html`.

Si en algún momento volvés a tocar el código en Apps Script, hace falta repetir el paso 4 (**Implementar → Gestionar implementaciones → editar → Nueva versión → Implementar**) para que el sitio vea los cambios — la URL no cambia.

- Con el backend real configurado, la clave es la que definiste en `ADMIN_PASSWORD` dentro de `backend/Code.gs`, y los datos son los reales de la planilla.
- Sin backend (modo demo), funciona igual pero mostrando solo lo guardado en el navegador donde lo abrís, con la clave de prueba `calzada-admin`.

Para anular a mano un movimiento de puntos sospechoso: abrí la planilla de Google Sheets, buscá esa fila en `Puntos_Movimientos` o `Puntos_Canjes`, y escribí `anulado` en su columna `estado` (podés dejar el motivo en `notaAdmin`). Ese movimiento deja de contar para el saldo del vecino, pero nunca se borra — queda todo el historial para auditar.

## Sistema de puntos de fidelidad

Cada comercio logueado puede sumarle puntos a un vecino por una compra, o canjearle puntos por una recompensa (un café, un voucher, lo que la Cámara defina) — todo identificando al vecino solo por su número de teléfono, sin que necesite tener una cuenta creada.

- **1 punto cada $1.000 de compra**, redondeando siempre para abajo.
- El botón para sumar/canjear puntos ("➕ Puntos" en el menú) **solo aparece si iniciaste sesión como comercio** — es la primera barrera contra el mal uso.
- Cualquier persona (con cuenta o sin ella) puede tocar "🏆 Puntos" en el menú y consultar cuántos puntos tiene un teléfono, para saber cuánto le queda antes de canjear.
- **Restricciones antifraude** (en `backend/Code.gs`, se pueden ajustar cambiando un número):
  - Tope de $100.000 por carga de puntos (una compra más grande hay que cargarla en varias veces).
  - Tope de 50 cargas de puntos por día por comercio.
  - Cada suma o canje vuelve a confirmar la contraseña del comercio contra la planilla — para que nadie pueda sumarse puntos a sí mismo (o a nombre de otro comercio) sin conocer también esa contraseña.
  - Un canje nunca puede dejar el saldo de un vecino en negativo.
  - Todo queda registrado con fecha, comercio y teléfono — nunca se borra, solo se puede marcar "anulado" a mano desde la planilla (ver sección del panel de administración).
- Lo que **no** incluye todavía, por ser una primera versión: verificación del teléfono del vecino por SMS (para confirmar que es suyo de verdad — requeriría contratar un servicio de SMS pago, hoy fuera del alcance de esta demo) y un catálogo de recompensas propio por comercio (hoy cada comercio escribe a mano la descripción del canje, por ejemplo "1 café", en vez de elegir de una lista predefinida — se puede sumar más adelante si hace falta).

## Analítica del sitio (qué busca la gente, dónde hace click, cuánto tiempo se queda)

Para poder ir haciendo ajustes con datos reales, el sitio registra automáticamente, de forma **anónima** (nunca nombre, ni IP, ni ningún dato personal — solo un ID al azar por navegador, para poder contar "visitantes distintos"):

- **Páginas visitadas**: cada vez que alguien entra a `index.html`, `vidriera.html` o `farmacias.html`.
- **Clicks**: en cualquier botón o link del sitio (usa el texto visible del botón, por ejemplo "Ver en mapa" o "Sumar mi comercio").
- **Búsquedas**: lo que la gente escribe en el buscador de la vidriera, cada vez que toca "Buscar" o aprieta Enter.
- **Tiempo en la página**: cuánto se queda cada visita antes de irse o cambiar de página.
- Cuando quien generó el evento es un vecino logueado que además cargó su año de nacimiento o género (ambos opcionales), el evento queda etiquetado con la franja etaria y el género agrupados — nunca el dato individual ni el nombre de nadie.

Con el backend real configurado (ver sección de arriba), todo esto se guarda en la hoja `Analitica` de la misma planilla de Google Sheets — sin necesitar nada más. Sin backend, funciona igual pero guardado solo en el navegador de cada visitante, a modo de demo.

**En `admin.html` ya no se ve el detalle** (páginas más visitadas, ranking de clicks, búsquedas, tiempos, edades/género) — solo el número de **visitantes únicos de las últimas 4 semanas**, para no acumular en pantalla datos fila por fila de cada visita. El detalle completo se exporta aparte:

**Exportar el detalle a un CSV en Drive:** en `admin.html` hay un botón "📄 Exportar analítica a Drive (CSV)" que genera, al toque, un archivo CSV nuevo con **todas** las filas de la hoja `Analitica` (fecha, tipo de evento, página, detalle, id de visitante, franja etaria, género) y lo guarda en una carpeta llamada **"Analítica (privado — no compartir)"**, creada dentro de la misma carpeta de Drive donde se guardan los logos de los comercios — pero **no** es la carpeta pública de logos en sí: es una subcarpeta nueva y separada, y en Drive el "compartir" nunca se hereda de la carpeta contenedora a sus subcarpetas, así que esta queda privada (solo la ve quien tenga acceso a tu Drive) aunque conviva ahí adentro. Se eligió esa ubicación a propósito porque es la única carpeta de Drive para la que Apps Script ya tiene permiso concedido, evitando así pedirte una reautorización manual extra. Cada exportación crea un archivo nuevo con la fecha en el nombre (por ejemplo `analitica_2026-09-06_1430.csv`) — nada se pisa ni se borra, así queda el historial de cada corte para vender el análisis semanal o mensual a la Cámara.

> Si ya habías implementado una versión anterior de este proyecto y el botón de exportar te tira un error de permisos ("No tienes permiso para llamar a DriveApp..."), es porque esa versión vieja intentaba crear la carpeta al lado de la planilla, lo que requiere un permiso de Drive que tu implementación todavía no tiene autorizado. La solución es volver a implementar: en el editor de Apps Script, **Implementar → Gestionar implementaciones → (ícono de lápiz) → Nueva versión → Implementar**, con el código actualizado de este paquete.

**Para que se exporte solo, todas las semanas, sin tener que entrar a pedirlo:** en el editor de Apps Script (el mismo donde pegaste `backend/Code.gs`), elegí la función `instalarExportSemanalAnalitica` en el desplegable de funciones de arriba, tocá "Ejecutar" y aceptá los permisos si te los vuelve a pedir. Es un paso único — a partir de ahí corre solo todos los lunes a la mañana. Es seguro volver a ejecutarlo más de una vez: primero borra cualquier disparador viejo de la misma función, así nunca queda corriendo dos veces por semana.

**Google Analytics (opcional, para un detalle mucho más completo):** si además de esto querés saber de dónde viene la gente (redes, Google, WhatsApp), qué dispositivo usa o ubicación aproximada, podés sumar Google Analytics (GA4, gratis):

1. Creá una propiedad en [analytics.google.com](https://analytics.google.com) para tu sitio.
2. Copiá el "ID de medición" (tiene el formato `G-XXXXXXXXXX`).
3. Pegalo en `assets/site.js`, en `SHEETS_CONFIG.gaMeasurementId`.

El sitio va a mandar los mismos eventos (visitas, clicks, búsquedas) también a Google Analytics, sin que haga falta tocar nada más. Si dejás ese campo vacío, el sitio simplemente no manda nada ahí — la analítica propia en la planilla sigue funcionando igual.

## El buscador: simple, predecible, basado en las tags

Después de varias vueltas con un motor más elaborado (sinónimos + TF-IDF, y en un momento hasta un modelo semántico) que terminaba dando resultados difíciles de explicar, el buscador quedó simplificado a propósito: **sin sinónimos ni modelos de por medio, matchea directamente contra lo que carga la Cámara para cada comercio**, sobre todo la columna `tags` de `comercios.csv` — pensada justo para esto.

Cómo puntúa cada comercio para una búsqueda:

1. **Coincidencia literal en una tag** (por ejemplo buscar "kiosco" y que el comercio tenga la tag "kiosco"): el matcheo más fuerte.
2. **Alguna palabra de la búsqueda aparece en las tags** del comercio: pesa bastante.
3. **Alguna palabra de la búsqueda aparece en el nombre, la descripción o el rubro**: pesa menos, pero también cuenta.

Los resultados se ordenan por ese puntaje, de mayor a menor. Sigue habiendo normalización de acentos/mayúsculas y un stemmer liviano (para que "remera" y "remeras", o "carnicería" y "carnicero", cuenten como lo mismo), pero nada de tesauros de sinónimos ni de modelos de lenguaje: si un comercio tiene que aparecer para cierta búsqueda, la forma confiable de lograrlo es que esa palabra (o una bien parecida) esté en sus `tags` — por eso las tags son el campo más importante para completar bien al cargar cada comercio.

**Importante**: si buscás algo y da 0 resultados, puede ser genuinamente porque ningún comercio cargado ofrece eso todavía (por ejemplo, hoy el catálogo real no tiene ningún comercio de indumentaria) — no significa que el buscador esté fallando. Ahí la oportunidad es invitar a ese rubro a sumarse a la Cámara, tal como dice el mensaje que aparece en pantalla.

**Enter para buscar**: además del botón "Buscar", ahora tocar Enter con el cursor en el campo de búsqueda dispara la misma búsqueda.

## El catálogo tiene 30 comercios de ejemplo (3 por rubro)

`assets/data/comercios.json` tiene 3 comercios ficticios por cada uno de los 10 rubros (minorista, mayorista, retacería, carnicería, ropa, carpintería, óptica/oftalmología, abogados, electricista, ferretería/bazar). Cada comercio tiene también un `logo` chiquito (ver sección de abajo). Para reemplazarlos por los comercios reales de la Cámara, lo más prolijo es que me pases el Excel real y te regenero este archivo — mantiene la misma estructura (nombre, rubro, descripción, dirección, teléfono, sitio web, logo y tags de búsqueda) así el buscador y el mapa siguen funcionando igual de bien.

## Un logo chiquito por comercio en las tarjetas

Además del cartel de rubro (el que dice "Ropa", "Carnicería", etc.), cada tarjeta de la vidriera ahora muestra una imagen chiquita a modo de logo del comercio. Por ahora son **placeholders de ejemplo**: un cuadrado de color con las iniciales del nombre del comercio (mismo color que usa el resto del sitio para ese comercio), generados automáticamente — no son logos reales de ningún comercio de Rafael Calzada. Están en `assets/img/comercios/` (un archivo `.png` por comercio) y el campo `logo` en `comercios.json` apunta a cada uno.

Cuando tengas los logos reales de los comercios (los que ya tengan uno, aunque sea informal — el isologo de WhatsApp Business, por ejemplo), solo hay que reemplazar el archivo de imagen correspondiente o cambiar la ruta en `logo`. Si un comercio no tiene logo (`logo: null` o vacío), la tarjeta muestra el cartel de rubro de siempre, como antes — no queda ningún hueco vacío.

### Cargar los logos reales desde una carpeta de Google Drive (sin tocar código)

Si preferís no mandarme cada logo para que yo lo suba al sitio, podés manejarlos vos misma desde Drive:

1. Subí los logos de los comercios a Drive (podés organizarlos todos en una misma carpeta, para tenerlos ordenados — el sitio no necesita que estén en un lugar específico, cada uno se referencia por su propio link).
2. Para cada archivo: click derecho → **Compartir** → asegurate de que diga "Cualquier persona con el enlace" puede ver → **Copiar enlace**. Te da un link como `https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp.../view?usp=sharing`.
3. Pegá ese link **tal cual, sin modificarlo**, en la columna `logo` de la fila de ese comercio en tu planilla de Sheets (la misma que ya armamos para `comercios.csv` — ver la sección de arriba). El sitio reconoce automáticamente que es un link de Drive y lo convierte solo en una imagen visible.

No hace falta ninguna cuenta nueva, API key ni script — es la misma planilla que ya vas a estar editando para el resto del catálogo. Si en algún momento un logo no carga (por ejemplo, si el archivo se compartió como privado en vez de "cualquiera con el link"), la tarjeta de ese comercio simplemente vuelve a mostrar el cartel de rubro de siempre — nunca queda una tarjeta rota.

**Aclaración honesta**: para convertir el link de Drive en una imagen, el sitio usa un endpoint de Google (`drive.google.com/thumbnail?id=...`) que es el que mejor funciona hoy para este uso, pero Google no lo garantiza oficialmente como una API estable — en la práctica es ampliamente usado y confiable para este fin, pero si en algún momento Google cambia su comportamiento y algún logo deja de verse, avisame y lo migramos a otra forma de alojar las imágenes (por ejemplo, subiéndolas directamente a la carpeta `assets/img/comercios/` del sitio, como los placeholders actuales).

## Cargar los datos desde Google Sheets en vez de editar los JSON a mano (opcional)

Si preferís que la Cámara actualice el catálogo de comercios, el cronograma de farmacias, los eventos próximos o las actividades sin tocar código, el sitio puede leer esos datos desde una planilla de Google Sheets en lugar de los archivos JSON locales. Te dejé cuatro archivos CSV de ejemplo con la estructura exacta que hace falta — podés abrirlos con Google Sheets o Excel y son el punto de partida para cargar los datos reales:

- **`comercios.csv`**: columnas `nombre, rubro, descripcion, direccion, telefono, sitio_web, logo, tags, oferta, oferta_vence` (en `tags`, separar varias etiquetas con `;`; `oferta` y `oferta_vence` son opcionales — ver la sección de "Ofertas de la semana" más arriba).
- **`farmacias.csv`**: columnas `nombre, direccion, telefono, dia_de_turno` (el día de turno se escribe como texto: domingo, lunes, martes, miércoles, jueves, viernes o sábado).
- **`eventos.csv`**: columnas `titulo, fecha, hora, lugar, descripcion` (`fecha` en formato AAAA-MM-DD; `hora` y `lugar` son opcionales).
- **`actividades.csv`**: columnas `titulo, descripcion, frecuencia, modalidad` (`frecuencia` y `modalidad` son opcionales — por ejemplo "Todos los martes" y "Presencial en la sede").

Para que la página los lea en vivo desde Google Sheets:

1. Subí cada CSV a Google Drive y abrilo con Google Sheets (o pegá los datos directo en una planilla nueva).
2. En Sheets: **Archivo → Compartir → Publicar en la web**. Elegí la hoja correspondiente y el formato **"Valores separados por comas (.csv)"**, y publicá.
3. Copiá el link que te da (termina en `output=csv`) — **ese** es el que funciona, no el link normal de "Compartir".
4. Pegá ese link en `assets/site.js`, en las primeras líneas del archivo, en el objeto `SHEETS_CONFIG` (solo hace falta completar los que uses; los demás quedan vacíos):
   ```js
   const SHEETS_CONFIG = {
     comerciosCsvUrl: 'https://docs.google.com/.../pub?output=csv',    // el link de comercios
     farmaciasCsvUrl: 'https://docs.google.com/.../pub?output=csv',   // el link de farmacias
     eventosCsvUrl: 'https://docs.google.com/.../pub?output=csv',     // el link de eventos
     actividadesCsvUrl: 'https://docs.google.com/.../pub?output=csv'  // el link de actividades
   };
   ```
5. Listo: la próxima vez que alguien entre al sitio, va a leer los datos directo de tu planilla. Cada vez que edites la planilla y esperes un minuto (Google tarda un poco en actualizar la versión publicada), el sitio va a mostrar los cambios — sin volver a subir ningún archivo al hosting.

**Por qué tiene que ser una planilla "publicada en la web" y no un archivo suelto en Drive**: un archivo cualquiera guardado en Google Drive no se puede leer desde una página web por una restricción de seguridad de los navegadores (CORS) — Drive no lo permite. Una planilla de Google Sheets publicada de esta forma sí lo permite, y sigue siendo edición simple para quien la actualiza (se edita como cualquier planilla).

Si dejás alguno de estos campos de `SHEETS_CONFIG` vacío (como vienen por defecto, salvo comercios y farmacias que ya te dejé configurados) o si la planilla no carga por algún motivo, el sitio no se rompe: usa automáticamente los archivos `comercios.json` / `farmacias.json` / `eventos.json` / `actividades.json` locales, como hasta ahora.

**Aclaración de cómo se probó esto**: esta parte la probé de forma estructural (con un CSV de prueba en el mismo servidor), no contra una planilla real de Google Sheets publicada — no tengo salida a internet desde donde armo esto. El mecanismo de "publicar en la web como CSV" es una función estándar y muy usada de Google Sheets, así que debería funcionar tal cual está descripto arriba, pero avisame si al probarlo con tu planilla real ves algún problema y lo ajustamos.

## Privacidad de los datos en Google Sheets/Drive

La planilla (`Usuarios`, `Puntos_Movimientos`, `Puntos_Canjes`, `Analitica`) guarda datos sensibles de verdad — nombre, dirección, teléfono, año de nacimiento y género de cada persona registrada. Ninguno de esos datos se expone públicamente por el sitio (el endpoint público `listarComercios` solo devuelve nombre de fantasía, rubro, descripción, dirección, teléfono y logo de los COMERCIOS aprobados — nunca de vecinos, ni el email ni la contraseña de nadie; `admin.html` sí muestra todo eso, pero está detrás de la clave de `ADMIN_PASSWORD`), pero la protección real de esos datos depende de la configuración de tu cuenta de Google, no del código del sitio. Un repaso de qué revisar:

- **La planilla en sí nunca debería estar "publicada en la web".** Esa opción (Archivo → Compartir → Publicar en la web) es la que se usa, a propósito, para el catálogo de comercios/farmacias estático (ver "Cargar los datos desde Google Sheets" más abajo) — **nunca la actives en la planilla del backend** (`Usuarios`, `Puntos_Movimientos`, `Puntos_Canjes`, `Analitica`): eso la volvería legible por cualquiera con el link, sin ninguna clave de por medio.
- **Compartí la planilla y su carpeta de Drive solo con quien realmente necesite verla** (por ejemplo, otra persona de la Cámara que te ayude con la administración) — como colaborador con su propia cuenta de Google, nunca con el link "cualquiera puede ver/editar". Cuantas menos personas con acceso directo, mejor.
- **La carpeta de logos** (la que compartiste al principio) es pública a propósito, pero **solo a nivel de cada archivo de imagen individual** (`setSharing(ANYONE_WITH_LINK, VIEW)`) — no de la carpeta entera. La carpeta nueva de exports de analítica ("Analítica (privado — no compartir)", ver más arriba), aunque se crea dentro de esa misma carpeta de logos, se crea **sin compartir con nadie**: no la compartas vos tampoco, ya que aunque los eventos son anónimos (sin nombre de nadie), no hace falta que sea pública.
- **Activá la verificación en dos pasos** en la cuenta de Google donde vive esta planilla — es la cuenta que, de comprometerse, daría acceso a los datos de todos los vecinos y comercios registrados.
- **La clave `ADMIN_PASSWORD`** en `backend/Code.gs` es la única barrera que protege `admin.html` (todos los datos personales, sin filtrar) — elegí una larga y única, y compartila solo con quien administre el panel. El archivo que se entrega siempre trae el valor de ejemplo `'CAMBIAR-ESTA-CLAVE'`, nunca tu clave real, así que es seguro tenerlo en un repositorio, incluso público, mientras no reemplaces esa línea ahí.
- **El repositorio en GitHub**: la URL del backend (`SHEETS_CONFIG.backendUrl` en `assets/site.js`) y el ID de la carpeta de Drive de los logos no son secretos por sí mismos — la URL del backend solo permite hacer las acciones puntuales que define `Code.gs` (nunca "leer toda la planilla"), y el ID de una carpeta de Drive no sirve de nada si esa carpeta no está compartida públicamente. Lo único que **nunca** debería quedar en el repositorio (público o privado) es tu `ADMIN_PASSWORD` real — bastante fácil de cuidar, ya que ese archivo vive en Apps Script, no en el repositorio: el `Code.gs` del repositorio es una plantilla para copiar y pegar en Apps Script, no el código que corre de verdad.

## Cuánto aguanta esto: 20.000 usuarios y miles de comercios

Este backend (Google Sheets + Apps Script) es gratis, no requiere servidor propio, y para el volumen de un barrio (cientos de comercios, algunos miles de vecinos activos) funciona sin problema. A la escala de 20.000 usuarios y miles de comercios hay dos límites distintos a tener en cuenta — ninguno es motivo para migrar YA, pero conviene conocerlos:

- **Tamaño de la planilla**: Google Sheets admite hasta 10 millones de celdas por planilla (entre todas sus hojas). Con 20.000 vecinos y unos pocos miles de comercios, la hoja `Usuarios` (20 columnas) usa unas 500.000 celdas — lejos del límite. Lo que sí puede crecer sin techo con los años es `Puntos_Movimientos`/`Puntos_Canjes` (una fila por cada compra o canje) y `Analitica` (una fila por cada visita/click/búsqueda) — esta última ya tiene un tope de seguridad (`MAX_FILAS_ANALYTICS`, 200.000 filas) para que nunca crezca sin control.
- **Cuotas de Apps Script**: cada pedido al backend (login, sumar puntos, ver la vidriera, etc.) es una ejecución de script con un tiempo máximo (unos 6 minutos) y, en una cuenta de Gmail común (no Google Workspace), un tope de ejecuciones simultáneas y de tiempo total de cómputo por día. El endpoint que más se llama, con diferencia, es `listarComercios` (se pide cada vez que cualquiera abre la vidriera, tenga cuenta o no) — por eso ahora tiene un cache corto (2 minutos, ver `CACHE_COMERCIOS_KEY` en `backend/Code.gs`) que evita releer toda la hoja de Usuarios en cada visita simultánea; es la mejora de mayor impacto para aguantar tráfico alto sin cambiar de arquitectura.
- **Qué mirar si el tráfico crece mucho más** (miles de personas navegando la vidriera al mismo tiempo, no solo 20.000 cuentas registradas en total): si empezás a ver errores intermitentes o lentitud en horas pico, los próximos pasos, de menor a mayor esfuerzo, serían: (1) pasar la cuenta de Google a un plan de Google Workspace (cuotas de Apps Script bastante más altas que una cuenta gratuita), (2) cachear también otras lecturas frecuentes del mismo modo que `listarComercios`, y (3), si hiciera falta mucho más que eso, migrar el backend de Google Sheets a una base de datos de verdad (por ejemplo Firestore) detrás de una API liviana — un cambio más grande, que no hace falta planear todavía.
- **Lo que este backend no incluye** (y que a esa escala se vuelve más importante): un límite de intentos de login fallidos por cuenta (para dificultar que alguien pruebe contraseñas al voleo) y una alerta automática si algún día se acerca a los topes de arriba. Ninguno de los dos es difícil de sumar más adelante si hace falta.

## Arquitectura y hosting: dónde vive cada cosa

- **El sitio** (los archivos `.html`, `assets/`, este repositorio) es 100% estático — no necesita un servidor propio corriendo. Podés alojarlo en GitHub Pages (gratis) apuntando tu dominio ahí, o servido a través de Cloudflare (como proxy/CDN delante de GitHub Pages, o con Cloudflare Pages directamente) — cualquiera de las dos formas funciona igual de bien; el dominio y el certificado HTTPS los maneja Cloudflare.
- **El repositorio en GitHub**: mientras no tengas el dominio, es razonable tenerlo público (así se puede ver y clonar fácil); una vez que el dominio esté funcionando, pasarlo a privado no rompe nada — GitHub Pages sirve igual desde un repositorio privado (en los planes que lo permiten) y el sitio ya no depende de que el código sea visible para funcionar.
- **Las cuentas, los puntos y la analítica** viven en Google Sheets, con Google Apps Script como backend (ver "Backend real en Google Sheets" más arriba) — completamente separado de dónde esté alojado el sitio. Cambiar de GitHub a Cloudflare Pages, o de un dominio a otro, no afecta en nada a esta parte: el sitio le sigue hablando a la misma URL de Apps Script (`SHEETS_CONFIG.backendUrl`) sin importar desde dónde se sirvan los archivos estáticos.
- **Los logos de los comercios** viven en Google Drive (la carpeta que compartiste), igual de independiente del hosting del sitio.

En resumen: los tres componentes (sitio estático, backend de Sheets/Apps Script, archivos en Drive) son independientes entre sí — podés cambiar cualquiera de ellos (dominio, proveedor de hosting, repositorio público/privado) sin tocar los otros dos.

## Calzada Digital: categorías, historias, seguir/likes, cupones y analítica por comercio

Esta es la ampliación grande que convierte la vidriera en "Calzada Digital": ya no piensa solo en indumentaria, sino en **cualquier tipo de comercio, oficio o profesional** de Rafael Calzada (bazares, colchonerías, pinturerías, corralones, talleres, gastronomía, servicios profesionales, salud, dietéticas, emprendedores...).

**Decisión de arquitectura, para quien vaya a tocar el código**: todo esto se armó como una **capa aparte**, encima del sitio que ya funcionaba — tres archivos nuevos (`assets/categorias.js`, `assets/calzada-digital.js`, `assets/calzada-digital.css`) que se cargan DESPUÉS de `assets/site.js` en cada página, más tres páginas nuevas (`cuenta.html`, `analitica.html`, `publicar.html`) y una sección nueva, bien delimitada, al final de `backend/Code.gs`. Se tocó lo menos posible de lo que ya existía: en `site.js` solo se sumaron rubros nuevos a `RUBROS`/`ICONS`, una función `slugify()`, y a `cardHtml()` se le agregó un `id` estable por comercio y un huequito vacío (`.card-social`) donde `calzada-digital.js` mete después los botones de Seguir/♥. Si algo de la parte nueva llegara a fallar, la vidriera, el buscador, las cuentas y los puntos de fidelidad de siempre siguen funcionando exactamente igual.

### 1) Categorías (en vez de "rubro" suelto)

En vez de mostrar los ~24 rubros sueltos, la vidriera ahora agrupa todo en 8 categorías grandes con ícono (Indumentaria, Hogar y Bazar, Construcción, Gastronomía, Servicios y Oficios, Profesionales, Salud y Belleza, Otros) — `assets/categorias.js` define `CATEGORIAS` con, para cada una, sus `rubros` (para el filtro) y sus `subcats` (las pastillas que aparecen al entrar: por ejemplo, dentro de "Gastronomía" aparecen Bar, Cafetería, Panadería, Rotisería...). Tocar `vidriera.html`:

- **Pantalla raíz** (`#cdCategoriaRoot`): el toggle "Busco un producto / Busco un servicio", el carrusel de historias por rubro (círculos) y la grilla de categorías (cuadrados grandes, con placeholder de color — reemplazalos por fotos reales cuando quieras, editando `icon`/`accent` en `categorias.js` o directamente el CSS de `.cd-tile`).
- **Pantalla de categoría abierta** (`#cdCategoriaAbierta`): se abre con `vidriera.html?cat=<key>` (los tiles de arriba ya arman ese link solos). Ahí aparecen las subcategorías como pastillas y, debajo, el buscador/grilla de SIEMPRE (sin tocar una línea de esa parte) filtrado a esa categoría.
- Se puede seguir buscando directo desde el buscador de siempre sin pasar por ninguna categoría — eso no cambió.

Para agregar un rubro nuevo: sumalo a `RUBROS`/`ICONS` en `site.js` (al final, nunca en el medio) y a la categoría que corresponda en `categorias.js` (`rubros: [...]`, y si hace falta una subcategoría/pastilla propia, a `subcats: [...]`).

### 2) Historias y banners ("comprar historias")

Un comercio puede publicar una **historia** (imagen o video que dura 24 horas, estilo Instagram) o dejar un **banner** activo por los días que pague. Se cargan desde `publicar.html` (con imagen + comprobante de transferencia) y quedan **pendientes de aprobación** — la Cámara las revisa en `admin.html`, en la tabla nueva "Historias y banners pendientes" (usa `adminListHistorias`/`adminSetEstadoHistoria` en el backend). Recién al aprobarla arranca el reloj de las 24 horas (o de los días de banner elegidos) — no desde que se cargó, para no descontarle tiempo al comercio mientras espera la revisión.

Las historias vigentes se muestran como círculos (igual que Instagram) en dos lugares: arriba de todo por rubro (`#cdStoriesRubro`, en la vidriera raíz) y dentro de cada categoría por comercio (`#cdStoriesComercio`). El orden es siempre: primero los comercios que el vecino sigue, después los que están por vencer antes, y por último los recién publicados (`cdOrdenarHistorias_` en `calzada-digital.js`). Tocar un círculo abre un visor de pantalla completa con botón de "me gusta" y un link directo a WhatsApp.

### 3) Seguir y "me gusta" (solo para cuentas de vecino)

Cada tarjeta de comercio en la vidriera tiene ahora un botón "+ Seguir" y un ♥ — solo funcionan con una cuenta de vecino con sesión iniciada (si no hay sesión, se abre el modal de login/registro). El botón "+ Seguir" hace que las historias y publicaciones de ese comercio aparezcan con prioridad (ver el orden de arriba) y que sus novedades salgan en la pestaña "Cuenta" del vecino.

### 4) La nueva pestaña "Cuenta" (navegación inferior)

La navegación de abajo del celular quedó en 4 pestañas: **Home** (lo que antes era toda la portada: agenda de la Cámara + accesos a vidriera/farmacias), **Vidriera**, **Farmacias** y **Cuenta** (`cuenta.html`, nueva). "Cuenta" muestra algo distinto según quién inició sesión:

- **Vecino**: sus puntos de fidelidad (con acceso al detalle de siempre), los cupones disponibles para canjear con esos puntos, y el feed de historias/publicaciones de los comercios que sigue.
- **Comercio**: accesos directos a "Mi comercio" (editar su tarjeta, como siempre), "Tu analítica" (`analitica.html`) y "Publicar historia o banner" (`publicar.html`).
- **Sin sesión**: invitación a iniciar sesión o registrarse.

### 5) Cupones

Un vecino puede canjear puntos por cupones que carga cada comercio (por ahora se cargan directamente en la hoja `CD_Cupones` de la planilla — no hay todavía un formulario en el sitio para esto, se puede agregar más adelante con el mismo patrón que "Mi comercio" si hace falta). El canje descuenta del MISMO saldo de puntos de siempre (reutiliza `Puntos_Canjes`), así el vecino tiene un solo saldo sin importar si el canje lo hizo el comercio a mano o el propio vecino desde "Cuenta".

### 6) Analítica privada de cada comercio (`analitica.html`)

Cada comercio ve, **solo para sí mismo** (nunca un ranking comparado con otros, para evitar quejas entre comercios — así se charló con Ari):

- Cuántos seguidores tiene.
- Cuántos "me gusta" juntaron sus historias y su oferta (7/24h/30 días, según el filtro elegido arriba).
- Cuántos clicks a WhatsApp recibió.
- Sus "consultas más populares": qué buscaron los vecinos que terminaron viendo su comercio entre los resultados — no es "todo lo que se buscó en el sitio", es específicamente lo que le trajo visibilidad a ESE comercio.
- Una tarjeta de "Analítica Premium" con lo que se ofrecería en un plan pago (comparación con el rubro, evolución en el tiempo, quién empezó a seguirlo, exportar a Excel) — todavía no funcional, es la propuesta comercial.

Truco técnico para que esto no necesitara ni una hoja nueva de analítica ni tocar el motor de búsqueda: los clicks a WhatsApp y las búsquedas que "tocan" a un comercio se anotan disimulados adentro de la misma columna `detalle` que ya usaba `Analitica` para todo (`whatsapp:<id-del-comercio> | Nombre` y `consulta:<id-del-comercio>|lo que buscó`) — `obtenerAnaliticaComercio_`, en `backend/Code.gs`, los cuenta filtrando por ese prefijo.

### Identidad de cada comercio sin exponer su email

Para poder "engancharle" seguidores, likes, historias, cupones y analítica a un comercio sin publicar nunca su email (el sitio nunca mostró el email de un comercio en la vidriera, y esto no cambia eso), cada comercio tiene un **id calculado a partir de su nombre** — por ejemplo "Panadería Sol" → `panaderia-sol`. Este cálculo (`slugify()` en `site.js`, `slugify_()` en `Code.gs`) es idéntico de los dos lados, así el id de un comercio es siempre el mismo lo calcule el navegador o el backend.

### Endpoints nuevos del backend (`backend/Code.gs`)

Todos viven en la sección "CALZADA DIGITAL", bien separada al final del archivo: `seguirComercio`, `listarSeguidos`, `likear`, `cargarHistoriaBanner`, `listarHistoriasVigentes`, `listarFeedSeguidos`, `adminListHistorias`, `adminSetEstadoHistoria`, `listarCupones`, `canjearCupon`, `obtenerAnaliticaComercio` — y usan 5 hojas nuevas que se crean solas la primera vez que se llaman (mismo patrón que las hojas de siempre): `CD_Seguidores`, `CD_Likes`, `CD_Historias`, `CD_Cupones`, `CD_Cupones_Canjes`.

### Modo demo (sin backend conectado)

Igual que el resto del sitio: si todavía no configuraste `SHEETS_CONFIG.backendUrl`, todo esto funciona igual pero guardado en `localStorage` de ese navegador (seguidos, likes, historias/cupones de ejemplo desde `assets/data/historias.json`/`cupones.json`) — perfecto para mostrar la maqueta, pero no comparte datos entre distintas personas ni dispositivos hasta que conectes el backend real.

## Lo que sigue siendo maqueta (no real todavía)

- Si no configuraste el backend de `backend/Code.gs`, las cuentas de vecino/comerciante y los puntos de fidelidad se guardan en el navegador (localStorage), no en una base de datos compartida real — ver las secciones de arriba.
- Los logos de los comercios son placeholders generados automáticamente (iniciales sobre un color), no los logos reales de ningún comercio — están listos para reemplazarse por links de Drive (ver la sección de arriba).
- La lectura desde Google Sheets (`SHEETS_CONFIG`) está lista y probada de forma estructural, pero no contra una planilla real ya publicada — ver la sección de arriba.
- El sistema de puntos no verifica por SMS que el teléfono cargado sea realmente del vecino, ni tiene todavía un catálogo de recompensas propio por comercio — ver la sección de puntos de fidelidad, arriba.
- La cuota societaria se menciona sin monto.
- El mapa usa OpenStreetMap en lugar de Google Maps (falta la API key de Google) y las ubicaciones de los comercios son ilustrativas, no geocodificación real.
- Las farmacias de turno son 7 farmacias ficticias con una rotación semanal de ejemplo, no el cronograma real del Colegio de Farmacéuticos.
- La tabla comparativa de productos (sección "Fase 2") tiene datos de ejemplo.
- Los eventos próximos y las actividades de la Cámara de `eventos.json`/`actividades.json` son de ejemplo — reemplazalos por los reales cuando quieras (o pasame la agenda real y te los cargo).
- Calzada Digital: las historias/banners y los cupones de ejemplo (`assets/data/historias.json`/`cupones.json`) solo se usan sin backend conectado; los cupones todavía se cargan a mano en la hoja `CD_Cupones` (no hay un formulario propio en el sitio para que el comercio los cargue solo); y la tarjeta de "Analítica Premium" en `analitica.html` es la propuesta comercial, no un plan pago funcionando.

Cuando quieras avanzar con datos reales, el backend de cuentas y puntos, la API key de Google Maps o el cronograma real de farmacias, seguimos desde acá.
