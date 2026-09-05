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
  data/comercios.json    ← el catálogo de comercios (acá se reemplaza por datos reales)
  data/farmacias.json    ← farmacias y su día de turno (acá se reemplaza por el cronograma real)
```

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

## El buscador ahora entiende el significado, no solo palabras exactas (assets/semantic.js)

Esto es lo nuevo: además del motor por palabras clave que ya tenías, la vidriera digital ahora carga un modelo de embeddings (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`, una versión del modelo multilingüe MiniLM convertida para correr en el navegador) que entiende el significado de lo que escribís, no solo si la palabra exacta aparece cargada en algún comercio. Por eso ahora buscar "remera" debería encontrar los comercios de ropa aunque la palabra "remera" no esté escrita en ningún tag — cosa que antes no pasaba.

Cómo funciona, en criollo: el modelo convierte tu búsqueda y la descripción de cada comercio en un vector de números que representa su significado, y compara qué tan parecidos son esos vectores. Todo esto corre **en el navegador de quien busca, no en un servidor tuyo**:

- No hace falta backend ni cuenta en la nube ni API key — es la opción que charlamos, la que no te deja atada a mantener nada prendido.
- El modelo se descarga una sola vez desde la CDN pública de Hugging Face (unos cuantos MB) la primera vez que alguien entra a la vidriera, y el propio navegador lo guarda en caché para las próximas visitas — no ocupa espacio en tu hosting.
- Mientras se descarga (la primera vez, unos segundos), aparece un aviso chiquito abajo del buscador ("🧠 Preparando el buscador inteligente…"); cuando ya está listo, cambia a "🧠 Búsqueda inteligente activa".
- **Si el modelo no llega a cargar** (por ejemplo, sin conexión a internet la primera vez que alguien entra, o algún bloqueo de red), el sitio no se rompe: vuelve a usar el motor por palabras clave de siempre (TF-IDF + sinónimos + stemming, descripto abajo) como respaldo automático, sin avisos de error.

**Una aclaración importante sobre cómo se probó esto**: el entorno donde armé este archivo no tiene salida a redes externas, así que no pude descargar el modelo real de Hugging Face para probarlo con búsquedas de verdad. Lo que sí hice fue simular el modelo (con un modelo de prueba que "sabe" que remera es ropa, igual que sabría el modelo real) para confirmar que toda la conexión funciona: se activa, arma los vectores del catálogo, encuentra los comercios correctos y cae de vuelta al buscador por palabras clave si algo falla. Lo que no pude confirmar todavía es el umbral exacto de similitud (la constante `SEMANTIC_SCORE_THRESHOLD` al principio de `assets/site.js`, hoy en `0.42`) — ese número decide qué tan estricto es el corte entre "es un resultado" y "no lo es", y puede necesitar un ajuste fino una vez que lo pruebes con búsquedas reales en el sitio ya publicado. Si ves que trae de más (resultados poco relacionados) o de menos (búsquedas razonables sin resultados), avisame y lo afinamos juntos con ejemplos reales.

## El motor por palabras clave (el respaldo, y lo que corre si el modelo no cargó)

`assets/site.js` implementa, todo en el navegador (sin backend, sin costo por búsqueda, sin API key de por medio):

- **Normalización y stopwords**: saca acentos, mayúsculas y palabras vacías ("de", "para", "un", etc.).
- **Stemming en español**: un stemmer liviano de sufijos, para que "anteojos"/"anteojo", "electricista"/"electricidad" o "carnicería"/"carnicero" se traten como la misma raíz sin necesitar un diccionario enorme.
- **Expansión por sinónimos**: un mini-tesauro por concepto (por ejemplo "luz", "corte", "tablero", "cortocircuito" y "electricista" cuentan como lo mismo), para que la intención de la búsqueda importe más que la palabra exacta.
- **TF-IDF + similitud de coseno**: la técnica clásica de los motores de búsqueda de toda la vida — le da más peso a las palabras distintivas de cada comercio y rankea los resultados por qué tan parecidos son a la consulta.

Es una técnica de procesamiento de lenguaje real (no inventa respuestas), pero depende de que la palabra ya esté cargada en algún tag o en el mini-tesauro — por eso "remera" sola no encontraba nada antes de agregar la búsqueda semántica de arriba. Sigue siendo útil como respaldo, y es instantánea (no depende de que ningún modelo termine de cargar).

## El catálogo tiene 30 comercios de ejemplo (3 por rubro)

`assets/data/comercios.json` tiene 3 comercios ficticios por cada uno de los 10 rubros (minorista, mayorista, retacería, carnicería, ropa, carpintería, óptica/oftalmología, abogados, electricista, ferretería/bazar). Para reemplazarlos por los comercios reales de la Cámara, lo más prolijo es que me pases el Excel real y te regenero este archivo — mantiene la misma estructura (nombre, rubro, descripción, dirección, teléfono, sitio web y tags de búsqueda) así el buscador y el mapa siguen funcionando igual de bien.

## Lo que sigue siendo maqueta (no real todavía)

- Las cuentas de vecino/comerciante se guardan en el navegador (localStorage), no en una base de datos compartida real — ver la sección de arriba.
- El umbral de la búsqueda semántica (`SEMANTIC_SCORE_THRESHOLD` en `assets/site.js`) se probó de forma estructural, no con el modelo real (ver la sección de arriba) — puede necesitar un ajuste una vez que lo pruebes en el sitio publicado.
- La cuota societaria se menciona sin monto.
- El mapa usa OpenStreetMap en lugar de Google Maps (falta la API key de Google) y las ubicaciones de los comercios son ilustrativas, no geocodificación real.
- Las farmacias de turno son 7 farmacias ficticias con una rotación semanal de ejemplo, no el cronograma real del Colegio de Farmacéuticos.
- La tabla comparativa de productos (sección "Fase 2") tiene datos de ejemplo.

Cuando quieras avanzar con datos reales, la base de datos de cuentas, la API key de Google Maps o el cronograma real de farmacias, seguimos desde acá.
