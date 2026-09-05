# Calzada Compra — archivos para subir al dominio

Este ZIP tiene todo lo necesario para publicar el prototipo en tu hosting. Es un sitio de una sola página, sin backend: no necesita Node, PHP ni base de datos.

## Qué hay acá

- **`index.html`** — el sitio completo. Todo el CSS y el JS están adentro del mismo archivo (incluido el logo, como imagen embebida), así que es el único archivo que realmente hace falta.
- **`favicon.ico`** — el ícono de pestaña del navegador, generado a partir del logo de la Cámara.
- **`README.md`** — este archivo.

## Cómo subirlo

1. Entrá al panel de tu hosting (cPanel, Plesk, FTP — lo que uses para esparco.com.ar/faryco.com.ar).
2. Andá a la carpeta raíz del dominio o subdominio donde quieras publicarlo (normalmente `public_html/` o la carpeta del subdominio si lo colgás de algo como `calzadacompra.esparco.com.ar` o un dominio propio de la Cámara).
3. Subí `index.html` y `favicon.ico` a esa carpeta.
4. Listo — al entrar al dominio ya debería cargar la home.

Si preferís GitHub Pages (como hiciste con `arianacotrone.github.io/EJEC`): creá el repo, subí estos dos archivos a la raíz, activá Pages apuntando a la rama principal, y si vas a usar un dominio propio agregá el archivo `CNAME` con ese dominio.

## Importante: esto todavía es un prototipo de demostración

Antes de mostrarlo como el sitio "real" de la Cámara, tené en cuenta que:

- **Los 10 comercios de la vidriera son ficticios** (nombres, direcciones y teléfonos inventados para cubrir los rubros pedidos). Hay que reemplazarlos por los comercios socios reales — lo más prolijo sería que me pases el Excel real y te genero el HTML actualizado, en vez de editarlo a mano.
- **El formulario de registro (vecino/comerciante) no guarda datos.** Es una maqueta del flujo: al enviarlo muestra una pantalla de confirmación, pero no hay backend ni base de datos detrás todavía.
- **La cuota societaria se menciona pero sin monto** — quedó como texto genérico hasta que definan el valor con la Cámara.
- El buscador en lenguaje natural funciona con un diccionario de palabras clave hecho a mano sobre estos 10 comercios de ejemplo — con más comercios reales conviene revisar que las palabras clave de cada uno sigan siendo representativas.

Cuando quieras avanzar a la siguiente etapa (comercios reales, registro con base de datos, tabla comparativa de productos), avisame y seguimos desde acá.
