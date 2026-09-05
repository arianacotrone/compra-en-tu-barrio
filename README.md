# Calzada Compra — sitio completo para subir al dominio

Versión con archivos separados (HTML/CSS/JS/datos/imágenes), lista para editar y para subir a hosting.

## Estructura

```
index.html
favicon.ico
assets/
  style.css              ← todo el diseño
  site.js                ← toda la lógica (render, modal y el buscador)
  img/logo.png           ← logo real de la Cámara
  data/comercios.json    ← el catálogo de comercios (acá se reemplaza por datos reales)
```

## Cómo subirlo

1. Subí **toda la carpeta** (`index.html`, `favicon.ico` y la carpeta `assets/` completa, con su estructura interna) a la raíz de tu dominio o subdominio — por FTP o por el administrador de archivos de tu hosting (cPanel, Plesk, GitHub Pages, etc.), igual que hiciste con esparco.com.ar o faryco.com.ar.
2. No hace falta Node, PHP ni base de datos — es un sitio 100% estático.

## Importante: para probarlo en tu computadora, corré un servidor local

`index.html` ahora carga el catálogo de comercios con `fetch()` desde `assets/data/comercios.json`. Eso funciona perfecto una vez subido al hosting (o en GitHub Pages), pero **si abrís `index.html` con doble clic desde tu computadora, el navegador va a bloquear esa carga por seguridad (CORS)** y vas a ver un aviso de "no pudimos cargar el catálogo".

Para probarlo local, desde la carpeta del proyecto corré:

```bash
python3 -m http.server 8000
```

y abrí `http://localhost:8000` en el navegador. Ahí sí va a cargar todo.

## El buscador ahora tiene procesamiento de lenguaje de verdad

Antes era un diccionario de palabras clave escrito a mano. Ahora `assets/site.js` implementa, todo en el navegador (sin backend, sin costo por búsqueda, sin API key de por medio):

- **Normalización y stopwords**: saca acentos, mayúsculas y palabras vacías ("de", "para", "un", etc.).
- **Stemming en español**: un stemmer liviano de sufijos, para que "anteojos"/"anteojo", "electricista"/"electricidad" o "carnicería"/"carnicero" se traten como la misma raíz sin necesitar un diccionario enorme.
- **Expansión por sinónimos**: un mini-tesauro por concepto (por ejemplo "luz", "corte", "tablero", "cortocircuito" y "electricista" cuentan como lo mismo), para que la intención de la búsqueda importe más que la palabra exacta.
- **TF-IDF + similitud de coseno**: la técnica clásica de los motores de búsqueda de toda la vida — le da más peso a las palabras distintivas de cada comercio y rankea los resultados por qué tan parecidos son a la consulta.

Es una técnica de procesamiento de lenguaje real (no inventa respuestas ni usa una IA generativa por detrás), pensada para funcionar bien en un catálogo de este tamaño sin depender de ningún servicio externo. Si en algún momento querés upgradearlo a búsqueda semántica con un modelo de lenguaje (tipo IA generativa), eso ya requiere un backend propio para no exponer una API key en el navegador — avisame cuando llegue ese momento y lo armamos.

## El catálogo ahora tiene 30 comercios de ejemplo (3 por rubro)

`assets/data/comercios.json` tiene 3 comercios ficticios por cada uno de los 10 rubros (minorista, mayorista, retacería, carnicería, ropa, carpintería, óptica/oftalmología, abogados, electricista, ferretería/bazar). Para reemplazarlos por los comercios reales de la Cámara, lo más prolijo es que me pases el Excel real y te regenero este archivo — mantiene la misma estructura (nombre, rubro, descripción, dirección, teléfono, sitio web y tags de búsqueda) así el buscador sigue funcionando igual de bien.

## Lo que sigue siendo maqueta (no real todavía)

- El formulario de registro (vecino/comerciante) no guarda datos — muestra una confirmación pero no hay base de datos detrás.
- La cuota societaria se menciona sin monto.
- La tabla comparativa de productos (sección "Fase 2") tiene datos de ejemplo.

Cuando quieras avanzar con datos reales, registro con base de datos o la tabla comparativa, seguimos desde acá.
