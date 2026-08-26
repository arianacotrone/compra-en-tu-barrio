# Compra en tu Barrio — Rafael Calzada

Sitio estático (HTML/CSS/JS puro, sin build ni dependencias) que lee los comercios desde un Google Sheets y los muestra en tarjetas o en un mapa. Pensado para publicarse en GitHub Pages con un dominio propio.

## 1. Completar y publicar la planilla

1. Abrí el archivo `Comercios_Rafael_Calzada.xlsx` que te pasé y subilo a tu Google Drive (arrastralo a Drive, o "Nuevo > Subir archivo"). Al abrirlo, Drive te va a ofrecer convertirlo a Google Sheets — aceptá.
2. Cargá un comercio por fila en la hoja **Comercios** (la hoja **Instrucciones** tiene el detalle de cada columna).
3. Cuando tengas los primeros datos cargados: **Archivo > Compartir > Publicar en la web**.
   - Elegí la hoja **Comercios** (no "todo el libro").
   - Formato: **Valores separados por comas (.csv)**.
   - Publicá y copiá el link que te da (termina en `output=csv`).
4. Pegá ese link en `js/config.js`, en `sheetCsvUrl`.

Cualquier cambio que hagas en la planilla después se ve reflejado en el sitio en un par de minutos (Google Sheets tarda un poco en actualizar la versión publicada), sin que yo tenga que tocar nada.

> Mientras `sheetCsvUrl` esté vacío, el sitio muestra 6 comercios de ejemplo para que puedas ver el diseño funcionando.

### Imágenes de portada

Para cada imagen: subila a Drive, click derecho > **Compartir** > cambiá a "Cualquier persona con el enlace", copiá el link y pegalo en la columna correspondiente. El sitio acepta cualquier variante de link de Drive (lo normaliza solo).

## 2. Armar el mapa (Google My Maps)

1. Andá a [mymaps.google.com](https://mymaps.google.com) y creá un mapa nuevo.
2. Agregá un pin por cada comercio con local físico (nombre + dirección).
3. **Compartir > Insertar en mi sitio web**, copiá la URL que te da (la del `<iframe src="...">`).
4. Pegala en `js/config.js`, en `myMapsEmbedUrl`.

Si lo dejás vacío, el sitio muestra mientras tanto un mapa simple de Google Maps centrado en el barrio (sin pines individuales).

## 3. Farmacias de turno

El botón ya apunta a FarmaciasDeTurnoYa filtrado en Rafael Calzada (no hay API pública gratuita para esto, ver más abajo). Si más adelante conseguís una fuente propia (por ejemplo el calendario del Colegio de Farmacéuticos de Almirante Brown), cambiá `farmaciasDeTurnoUrl` en `js/config.js`, o pedime que arme una hoja de turnos propia dentro del mismo Google Sheets.

## 4. Publicar en GitHub Pages + dominio propio

1. Creá un repositorio nuevo en tu cuenta de GitHub (público, para que Pages sea gratis) y subí el contenido de esta carpeta (`index.html`, `css/`, `js/`) a la raíz del repo.
2. En el repo: **Settings > Pages > Source**, elegí la rama `main` y carpeta `/root`. Guardá.
   - GitHub te va a dar una URL tipo `tuusuario.github.io/nombre-repo`. Ya con eso el sitio está online.
3. Comprá el dominio en [nic.ar](https://nic.ar) (para `.com.ar`) o en el registrador que prefieras.
4. Pasá el dominio a Cloudflare (gratis): en Cloudflare, **Add a site**, seguís el asistente, y cambiás los *nameservers* del dominio en nic.ar por los que te da Cloudflare.
5. En Cloudflare, agregá estos registros DNS:
   - Un registro **CNAME** con nombre `www` apuntando a `tuusuario.github.io`.
   - Cuatro registros **A** en el nombre raíz (`@`) apuntando a las IPs de GitHub Pages: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   - Modo del proxy de Cloudflare (nube naranja): podés dejarlo activado.
6. En el repo de GitHub, **Settings > Pages > Custom domain**, escribí tu dominio y guardá (esto crea un archivo `CNAME` en el repo). Esperá unos minutos y activá "Enforce HTTPS".

## 5. Replicar el sitio en otro barrio

Todo lo que cambia entre barrios está en un solo archivo: `js/config.js` (nombre del barrio, bajada, planilla, mapa, colores). Para un barrio nuevo:

1. Duplicá esta carpeta completa (o el repo de GitHub).
2. Armá una planilla nueva a partir de la misma plantilla (`Comercios_<Barrio>.xlsx`).
3. Editá `js/config.js` con los datos del nuevo barrio.
4. Subilo como un repo/sitio aparte (o a un subdominio, si preferís mantenerlos bajo un mismo dominio raíz).

## Estructura de archivos

```
index.html          → estructura de la página
css/style.css        → todos los estilos (funciona en modo claro y oscuro)
js/config.js          → lo único que hay que editar para personalizar/replicar
js/demo-data.js      → datos de ejemplo (fallback si no hay planilla conectada)
js/csv.js            → lector de CSV + mapeo de columnas de la planilla
js/phone.js          → normalizador de números de WhatsApp argentinos
js/app.js            → lógica de la página (carga de datos, tarjetas, selector lista/mapa)
```
