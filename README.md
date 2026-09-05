# Calzada Compra — sitio completo para subir al dominio

Versión con archivos separados (HTML/CSS/JS/datos/imágenes), lista para editar y para subir a hosting.

## Estructura

```
index.html              ← página principal (romantiza Calzada + rol de la Cámara + registro/login)
vidriera.html           ← subpágina: vidriera digital (buscador, tarjetas y mapa) + Fase 2 (comparar productos)
farmacias.html          ← subpágina: farmacia de turno hoy + rotación semanal
favicon.ico
assets/
  style.css              ← todo el diseño
  site.js                ← toda la lógica compartida (buscador, cuentas, farmacias) — se reutiliza en las 3 páginas
  map.js                 ← la capa de mapa de la vidriera digital (ver más abajo)
  img/logo.png           ← logo real de la Cámara
  img/comercios/*.png    ← logo (placeholder) de cada comercio, usado en las tarjetas
  data/comercios.json    ← el catálogo de comercios (acá se reemplaza por datos reales)
  data/farmacias.json    ← farmacias y su día de turno (acá se reemplaza por el cronograma real)
```

Aparte, junto con este sitio te dejé dos archivos `comercios.csv` y `farmacias.csv` — no van dentro de la carpeta que subís al hosting, son la plantilla para cargar los datos en Google Sheets si preferís ese camino (ver la sección "Cargar los datos desde Google Sheets" más abajo).

## Cómo subirlo

1. Subí **toda la carpeta** (`index.html`, `vidriera.html`, `farmacias.html`, `favicon.ico` y la carpeta `assets/` completa, con su estructura interna) a la raíz de tu dominio o subdominio — por FTP o por el administrador de archivos de tu hosting (cPanel, Plesk, GitHub Pages, etc.), igual que hiciste con esparco.com.ar o faryco.com.ar.
2. No hace falta Node, PHP ni base de datos — es un sitio 100% estático.

## Importante: para probarlo en tu computadora, corré un servidor local

Las páginas cargan datos con `fetch()` (el catálogo de comercios y las farmacias de turno). Eso funciona perfecto una vez subido al hosting (o en GitHub Pages), pero **si abrís los archivos con doble clic desde tu computadora, el navegador va a bloquear esa carga por seguridad (CORS)** y vas a ver un aviso de "no pudimos cargar" en pantalla.

Para probarlo local, desde la carpeta del proyecto corré:

```bash
python3 -m http.server 8000
```

y abrí `http://localhost:8000` en el navegador. Ahí sí va a cargar todo.

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

## Registro e inicio de sesión (ya funcionan, con contraseña)

El botón "Ingresar / Registrarme" del menú (visible en las tres páginas) abre un modal con tres pestañas: **Iniciar sesión**, **Soy vecino** y **Soy comerciante**. A diferencia de la versión anterior, esto ya no es solo una simulación visual:

- **Contraseña con reglas reales**: mínimo 8 caracteres, al menos una letra mayúscula y al menos un número. Mientras se escribe, un checklist debajo del campo va marcando en verde cada regla que se cumple, y hay un campo de "Confirmar contraseña" que valida que coincidan.
- **Las cuentas se guardan de verdad — pero solo en tu navegador**: al registrarte, tu cuenta (nombre, contacto, y la contraseña ya *hasheada*, nunca en texto plano) se guarda en el `localStorage` del navegador donde estás probando el sitio. Eso significa que podés cerrar la página, volver a abrirla y hacer login con esa cuenta — pero es una base de datos local a ese navegador y esa computadora, **no una base de datos compartida en un servidor**: si entrás desde otro navegador o borrás los datos del sitio, esa cuenta no va a estar. Para una base de datos real y compartida (con recuperación de contraseña, etc.) hace falta un backend — avisame cuando quieran dar ese paso.
- Al iniciar sesión, el botón de "Ingresar/Registrarme" del menú cambia por un saludo con tu nombre y un botón para salir.

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

Si preferís que la Cámara actualice el catálogo de comercios o el cronograma de farmacias sin tocar código, el sitio puede leer esos datos desde una planilla de Google Sheets en lugar de los archivos `comercios.json` / `farmacias.json` locales. Te dejé dos archivos CSV de ejemplo con la estructura exacta que hace falta — podés abrirlos con Google Sheets o Excel y son el punto de partida para cargar los datos reales:

- **`comercios.csv`**: columnas `nombre, rubro, descripcion, direccion, telefono, sitio_web, logo, tags` (en `tags`, separar varias etiquetas con `;`).
- **`farmacias.csv`**: columnas `nombre, direccion, telefono, dia_de_turno` (el día de turno se escribe como texto: domingo, lunes, martes, miércoles, jueves, viernes o sábado).

Para que la página los lea en vivo desde Google Sheets:

1. Subí cada CSV a Google Drive y abrilo con Google Sheets (o pegá los datos directo en una planilla nueva).
2. En Sheets: **Archivo → Compartir → Publicar en la web**. Elegí la hoja correspondiente y el formato **"Valores separados por comas (.csv)"**, y publicá.
3. Copiá el link que te da (termina en `output=csv`) — **ese** es el que funciona, no el link normal de "Compartir".
4. Pegá ese link en `assets/site.js`, en las primeras líneas del archivo, en el objeto `SHEETS_CONFIG`:
   ```js
   const SHEETS_CONFIG = {
     comerciosCsvUrl: 'https://docs.google.com/.../pub?output=csv',   // el link de comercios
     farmaciasCsvUrl: 'https://docs.google.com/.../pub?output=csv'   // el link de farmacias
   };
   ```
5. Listo: la próxima vez que alguien entre al sitio, va a leer los datos directo de tu planilla. Cada vez que edites la planilla y esperes un minuto (Google tarda un poco en actualizar la versión publicada), el sitio va a mostrar los cambios — sin volver a subir ningún archivo al hosting.

**Por qué tiene que ser una planilla "publicada en la web" y no un archivo suelto en Drive**: un archivo cualquiera guardado en Google Drive no se puede leer desde una página web por una restricción de seguridad de los navegadores (CORS) — Drive no lo permite. Una planilla de Google Sheets publicada de esta forma sí lo permite, y sigue siendo edición simple para quien la actualiza (se edita como cualquier planilla).

Si dejás `SHEETS_CONFIG` vacío (como viene por defecto) o si la planilla no carga por algún motivo, el sitio no se rompe: usa automáticamente los archivos `comercios.json` / `farmacias.json` locales, como hasta ahora.

**Aclaración de cómo se probó esto**: esta parte la probé de forma estructural (con un CSV de prueba en el mismo servidor), no contra una planilla real de Google Sheets publicada — no tengo salida a internet desde donde armo esto. El mecanismo de "publicar en la web como CSV" es una función estándar y muy usada de Google Sheets, así que debería funcionar tal cual está descripto arriba, pero avisame si al probarlo con tu planilla real ves algún problema y lo ajustamos.

## Lo que sigue siendo maqueta (no real todavía)

- Las cuentas de vecino/comerciante se guardan en el navegador (localStorage), no en una base de datos compartida real — ver la sección de arriba.
- El umbral de la búsqueda semántica (`SEMANTIC_SCORE_THRESHOLD` en `assets/site.js`, hoy en `0.6`) se subió después de ver un resultado real sin sentido, pero sigue siendo una estimación — puede necesitar otro ajuste con más uso real (ver la sección del buscador, arriba).
- Los logos de los comercios son placeholders generados automáticamente (iniciales sobre un color), no los logos reales de ningún comercio — están listos para reemplazarse por links de Drive (ver la sección de arriba).
- La lectura desde Google Sheets (`SHEETS_CONFIG`) está lista y probada de forma estructural, pero no contra una planilla real ya publicada — ver la sección de arriba.
- La cuota societaria se menciona sin monto.
- El mapa usa OpenStreetMap en lugar de Google Maps (falta la API key de Google) y las ubicaciones de los comercios son ilustrativas, no geocodificación real.
- Las farmacias de turno son 7 farmacias ficticias con una rotación semanal de ejemplo, no el cronograma real del Colegio de Farmacéuticos.
- La tabla comparativa de productos (sección "Fase 2") tiene datos de ejemplo.

Cuando quieras avanzar con datos reales, la base de datos de cuentas, la API key de Google Maps o el cronograma real de farmacias, seguimos desde acá.
