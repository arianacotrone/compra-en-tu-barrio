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
  semantic.js            ← búsqueda semántica en el navegador (ver más abajo) — solo se usa en vidriera.html
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

## El buscador: motor por palabras clave + motor semántico, combinados

El buscador de la vidriera combina **dos motores** para que sea rápido, confiable y entienda cada vez más el significado de lo que escribís. Esto cambió en esta última vuelta, después de que probaras el sitio de verdad y me mostraras dos casos concretos que no andaban bien — quedan documentados abajo porque explican por qué el diseño es "motor por palabras clave siempre + motor semántico como refuerzo", y no "solo motor semántico" como era al principio.

### El motor por palabras clave (`assets/site.js`) — siempre activo, instantáneo

Este es el motor de base, el que corre siempre, para toda búsqueda, sin depender de que ningún modelo termine de cargar:

- **Normalización y stopwords**: saca acentos, mayúsculas y palabras vacías ("de", "para", "un", etc.).
- **Stemming en español**: un stemmer liviano de sufijos, para que "anteojos"/"anteojo", "electricista"/"electricidad" o "carnicería"/"carnicero" se traten como la misma raíz sin necesitar un diccionario enorme.
- **Expansión por sinónimos**: un mini-tesauro por concepto (por ejemplo "luz", "corte", "tablero", "cortocircuito" y "electricista" cuentan como lo mismo). Después de que me mostraste que "remera" sola no encontraba nada, amplié bastante este tesauro: ahora "remera", "buzo", "pantalón", "campera", "zapatillas", "pollera", "jean" y varias palabras más de ropa están cargadas directamente, además de vocabulario nuevo para carnicería (bife, chorizo, matambre...), óptica (lentes de sol, gafas), abogados (demanda, denuncia), carpintería, ferretería y almacén. Esto solo, sin ningún modelo de por medio, ya resuelve los casos puntuales que me mostraste.
- **TF-IDF + similitud de coseno**: la técnica clásica de los motores de búsqueda de toda la vida — le da más peso a las palabras distintivas de cada comercio y rankea los resultados por qué tan parecidos son a la consulta.

Es instantáneo y 100% predecible, pero depende de que la palabra (o un sinónimo suyo) ya esté cargada a mano en algún tag o en el tesauro.

### El motor semántico (`assets/semantic.js`) — refuerzo, no reemplazo

Además, la vidriera carga en segundo plano un modelo de embeddings (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`) que entiende el significado de lo que escribís aunque la palabra exacta no esté cargada en ningún lado, corriendo **100% en el navegador de quien busca, sin backend, sin cuenta en la nube ni API key**:

- El modelo se descarga una sola vez desde la CDN pública de Hugging Face (unos cuantos MB) la primera vez que alguien entra a la vidriera, y el propio navegador lo guarda en caché para las próximas visitas — no ocupa espacio en tu hosting.
- Mientras se descarga aparece un aviso chiquito abajo del buscador ("🧠 Preparando el buscador inteligente…"); cuando ya está listo, cambia a "🧠 Búsqueda inteligente activa".
- **Arreglé el problema de que quedaba trabado**: antes, si alguien buscaba justo mientras el modelo todavía se estaba descargando (la descarga real puede tardar bastante más de lo que yo había calculado, según la conexión), la búsqueda esperaba sin límite y parecía colgada. Ahora cada búsqueda espera como máximo 8 segundos al modelo: si no llegó a tiempo, esa búsqueda puntual se resuelve con el motor por palabras clave y la descarga sigue en segundo plano para las próximas.
- **Ya no puede "tapar" al motor por palabras clave con un resultado raro**: antes, si el modelo semántico daba un puntaje alto para un resultado sin sentido, ese resultado se mostraba igual (así apareció "Carnicería El Novillo Calzadense" al buscar "buzo"). Ahora el motor por palabras clave se calcula siempre primero, como base confiable, y el motor semántico solo se suma cuando su puntaje de similitud supera un umbral bastante más estricto que antes (`SEMANTIC_SCORE_THRESHOLD`, subido de `0.42` a `0.6`). Un resultado nunca depende solo de un puntaje semántico dudoso.
- Para seguir afinando ese umbral con casos reales, cada búsqueda deja en la consola del navegador (F12 → pestaña "Console") los 5 puntajes semánticos más altos para esa consulta — si algún día querés que ajustemos el número con vos mirando esos valores, es la forma más rápida de hacerlo.
- **Si el modelo no llega a cargar nunca** (sin conexión la primera vez, algún bloqueo de red), el sitio no se rompe: sigue funcionando solo con el motor por palabras clave, sin avisos de error.

**Sobre cómo se probó esto**: el entorno donde armo estos archivos no tiene salida a redes externas, así que no puedo descargar el modelo real de Hugging Face ni probarlo con búsquedas de verdad — todo lo que valido acá es la lógica de conexión (con un modelo de prueba simulado), no la calidad real del modelo. Vos sí probaste con el modelo real en tu navegador, y así encontramos los dos problemas de arriba (se quedaba esperando sin límite, y un puntaje semántico raro tapaba al buscador por palabras clave) — quedaron arreglados con lo que describí arriba. El umbral (`0.6`) sigue siendo una estimación: si en el uso real seguís viendo resultados raros o de menos, los puntajes en la consola del navegador nos dan los números concretos para afinarlo juntos.

## El catálogo tiene 30 comercios de ejemplo (3 por rubro)

`assets/data/comercios.json` tiene 3 comercios ficticios por cada uno de los 10 rubros (minorista, mayorista, retacería, carnicería, ropa, carpintería, óptica/oftalmología, abogados, electricista, ferretería/bazar). Cada comercio tiene también un `logo` chiquito (ver sección de abajo). Para reemplazarlos por los comercios reales de la Cámara, lo más prolijo es que me pases el Excel real y te regenero este archivo — mantiene la misma estructura (nombre, rubro, descripción, dirección, teléfono, sitio web, logo y tags de búsqueda) así el buscador y el mapa siguen funcionando igual de bien.

## Un logo chiquito por comercio en las tarjetas

Además del cartel de rubro (el que dice "Ropa", "Carnicería", etc.), cada tarjeta de la vidriera ahora muestra una imagen chiquita a modo de logo del comercio. Por ahora son **placeholders de ejemplo**: un cuadrado de color con las iniciales del nombre del comercio (mismo color que usa el resto del sitio para ese comercio), generados automáticamente — no son logos reales de ningún comercio de Rafael Calzada. Están en `assets/img/comercios/` (un archivo `.png` por comercio) y el campo `logo` en `comercios.json` apunta a cada uno.

Cuando tengas los logos reales de los comercios (los que ya tengan uno, aunque sea informal — el isologo de WhatsApp Business, por ejemplo), solo hay que reemplazar el archivo de imagen correspondiente o cambiar la ruta en `logo`. Si un comercio no tiene logo (`logo: null`), la tarjeta muestra el cartel de rubro de siempre, como antes — no queda ningún hueco vacío.

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
- Los logos de los comercios son placeholders generados automáticamente (iniciales sobre un color), no los logos reales de ningún comercio.
- La lectura desde Google Sheets (`SHEETS_CONFIG`) está lista y probada de forma estructural, pero no contra una planilla real ya publicada — ver la sección de arriba.
- La cuota societaria se menciona sin monto.
- El mapa usa OpenStreetMap en lugar de Google Maps (falta la API key de Google) y las ubicaciones de los comercios son ilustrativas, no geocodificación real.
- Las farmacias de turno son 7 farmacias ficticias con una rotación semanal de ejemplo, no el cronograma real del Colegio de Farmacéuticos.
- La tabla comparativa de productos (sección "Fase 2") tiene datos de ejemplo.

Cuando quieras avanzar con datos reales, la base de datos de cuentas, la API key de Google Maps o el cronograma real de farmacias, seguimos desde acá.
