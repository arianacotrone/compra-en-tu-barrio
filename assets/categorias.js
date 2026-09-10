/* =========================================================
   Calzada Digital — categorías grandes de la vidriera
   ---------------------------------------------------------
   Esto es lo nuevo que agrupa TODOS los rubros de RUBROS (ver
   assets/site.js) en 8 categorías grandes, para la vidriera por
   categoría (pantalla "Vidriera" del sitio). No reemplaza a RUBROS
   ni al desplegable de rubro de siempre — es una capa de agrupación
   arriba: cada categoría junta uno o más "rubro" (los mismos valores
   que ya carga cada comercio) y, dentro, unas subcategorías que
   filtran más fino usando las TAGS de cada comercio (el mismo campo
   que ya se usaba para el buscador) — así no hizo falta inventar un
   campo de datos nuevo por cada subcategoría.

   Para sumar un rubro nuevo el día de mañana: agregalo primero a
   RUBROS en assets/site.js (con su ícono en ICONS), y después sumalo
   acá, dentro del array "rubros" de la categoría que le corresponda.
   Si no lo sumás acá, el comercio igual aparece en el buscador
   clásico de siempre — solo no va a tener una categoría grande propia
   en esta vidriera nueva (cae en "Otros" por descarte, ver
   CATEGORIA_OTROS_FALLBACK más abajo).
   ========================================================= */

const CATEGORIAS = [
  {
    key: 'indumentaria', label: 'Indumentaria', icon: '👕',
    rubros: ['ropa'],
    subcats: [
      { label: 'Mujer', tag: 'mujer' },
      { label: 'Hombre', tag: 'hombre' },
      { label: 'Niños', tag: 'niños' },
      { label: 'Calzado', tag: 'calzado' }
    ]
  },
  {
    key: 'hogar', label: 'Hogar y Bazar', icon: '🛋️',
    rubros: ['hogar_bazar', 'colchoneria'],
    subcats: [
      { label: 'Bazar', tag: 'bazar' },
      { label: 'Colchonería', rubro: 'colchoneria' },
      { label: 'Blanco y textil', tag: 'textil' },
      { label: 'Decoración', tag: 'decoracion' }
    ]
  },
  {
    key: 'construccion', label: 'Construcción', icon: '🧱',
    rubros: ['ferreteria', 'carpinteria', 'corralon', 'pintureria', 'electricista'],
    subcats: [
      { label: 'Ferretería', rubro: 'ferreteria' },
      { label: 'Corralón', rubro: 'corralon' },
      { label: 'Pinturería', rubro: 'pintureria' },
      { label: 'Electricidad', rubro: 'electricista' }
    ]
  },
  {
    key: 'gastronomia', label: 'Gastronomía', icon: '🍽️',
    rubros: ['bar', 'cafeteria', 'panaderia', 'rotiseria', 'carniceria'],
    subcats: [
      { label: 'Bar', rubro: 'bar' },
      { label: 'Cafetería', rubro: 'cafeteria' },
      { label: 'Panadería', rubro: 'panaderia' },
      { label: 'Rotisería', rubro: 'rotiseria' }
    ]
  },
  {
    key: 'servicios', label: 'Servicios y Oficios', icon: '🔧',
    rubros: ['automovil', 'servicios_oficios', 'electricista', 'veterinaria'],
    subcats: [
      { label: 'Taller mecánico', rubro: 'automovil' },
      { label: 'Plomero', tag: 'plomero' },
      { label: 'Gasista', tag: 'gasista' },
      { label: 'Electricista', rubro: 'electricista' },
      { label: 'Veterinaria', rubro: 'veterinaria' }
    ]
  },
  {
    key: 'profesionales', label: 'Profesionales', icon: '💼',
    rubros: ['Servicios Profesionales', 'abogados'],
    subcats: [
      { label: 'Contador', tag: 'contador' },
      { label: 'Abogado', rubro: 'abogados' },
      { label: 'Arquitecto', tag: 'arquitecto' },
      { label: 'Diseño', tag: 'diseño' }
    ]
  },
  {
    key: 'salud', label: 'Salud y Belleza', icon: '💇',
    rubros: ['optica', 'peluqueria', 'estetica', 'dietetica'],
    subcats: [
      { label: 'Peluquería', rubro: 'peluqueria' },
      { label: 'Estética', rubro: 'estetica' },
      { label: 'Óptica', rubro: 'optica' },
      { label: 'Dietética', rubro: 'dietetica' }
    ]
  },
  {
    key: 'otros', label: 'Otros', icon: '🏷️',
    rubros: ['minorista', 'mayorista', 'retaceria'],
    subcats: []
  }
];

// Rubro -> categoría (se arma solo a partir de CATEGORIAS de arriba).
// Un rubro que no aparezca en ningún "rubros" de arriba cae acá en
// "otros" por descarte, así ningún comercio queda sin categoría.
const CATEGORIA_OTROS_FALLBACK = 'otros';
const RUBRO_A_CATEGORIA = {};
CATEGORIAS.forEach(function (cat) {
  cat.rubros.forEach(function (r) { RUBRO_A_CATEGORIA[r] = cat.key; });
});
function categoriaDeRubro(rubro) {
  return RUBRO_A_CATEGORIA[rubro] || CATEGORIA_OTROS_FALLBACK;
}
function categoriaByKey(key) {
  return CATEGORIAS.find(function (c) { return c.key === key; }) || null;
}

window.CATEGORIAS = CATEGORIAS;
window.categoriaDeRubro = categoriaDeRubro;
window.categoriaByKey = categoriaByKey;
