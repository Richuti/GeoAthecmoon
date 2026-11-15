# Sistema de diseño · GEOATHECMOON

**Dirección actual: exploración lunar sobre cristal líquido (decisión de Richard, 14 nov).** El planificador y el simulador usan superficies translúcidas, bordes suaves y reflejos neutros sobre un fondo lunar. Se conservan la rotulación de hardware espacial para la marca, los sitios y la viabilidad, y B612 para la lectura.

El material de cristal pertenece a toda la herramienta: paneles, navegación, menús y controles. No se usan brillos de color decorativos; el ámbar sigue significando Sol y el azul, Tierra. Las imágenes explican, los datos calculan. Las reglas anteriores que prohibían esquinas redondeadas quedan reemplazadas por esta decisión.

Los tokens están en `frontend/src/index.css` (`@theme`), el material en `frontend/src/flight-glass.css` y las fuentes en `frontend/src/fonts.css`.

## Entrada de marca de la portada

Richard reemplazó la referencia inicial de `tunegocioimporta.us` por la entrada de MXL Parts (`mxlparts.us`; escribió `mxlpart.us`, dominio que no resuelve). No pidió una nueva composición de la landing. `BrandIntro.tsx` y `brand-intro.css` presentan el logo GA original en gran formato, dividido en tres franjas que se desplazan y vuelven a unirse; GEOATHECMOON cruza el centro durante la unión. El fondo empieza en el azul exacto del logo (#0c0e42), cambia a un contraste claro/oscuro mediante CSS y se desvanece para mostrar la portada existente. Dura 2.4 segundos, permite saltar con botón, Escape o Tab, omite la animación con movimiento reducido y no se repite al regresar del planificador durante la misma carga de página. No aparece al entrar directamente a `#planificador`. El archivo original del logo, el relato y las transiciones recortadas con el horizonte de Shackleton se conservan.

---

## Elemento distintivo: la franja de horizonte

En el polo sur lunar **todo pasa en el horizonte**: el Sol nunca sube más de 1–2° y un cerro a kilómetros puede taparlo. La franja (`components/HorizonStrip.tsx`) muestra:
- el panorama de 360° visto desde el sitio;
- la silueta del relieve;
- el recorrido del Sol y la Tierra en todo el periodo, y su posición actual.

Reglas:
- El cielo es **negro puro**, porque la Luna no tiene atmósfera. Sin gradientes ni estrellas.
- La escala vertical es **ampliada cerca de 0°** (asinh), y así se indica en la leyenda.
- El Sol y la Tierra van **rellenos si se ven** y **huecos si el relieve los tapa**.

---

## Color

| Token | Hex | Uso |
|---|---|---|
| `void` | `#05070d` | Fondo y cielo lunar. Los paneles no tienen fondo propio. |
| `hull` / `hull-raised` | `#0b0e15` / `#131824` | Fondo de controles, hover y selección. |
| `seam` / `seam-strong` | `#222a38` / `#343e52` | Marcos de paneles y bordes de controles. |
| `ink` / `ink-muted` / `ink-faint` | `#e8ebf1` / `#a3abbd` / `#7a8398` | Texto. Los tres cumplen contraste AA sobre `void`. |
| `relief` / `relief-edge` | `#121826` / `#4a5468` | Relieve en la franja de horizonte. |
| `sun` | `#ffb547` | **Solo** luz solar y energía. |
| `earth` | `#5aa9ff` | **Solo** la Tierra y la comunicación. |
| `ok` / `caution` / `critical` | `#45d49b` / `#e9cf4a` / `#ff6b6b` | Estados del simulador. El amarillo es distinto del ámbar del Sol, para no confundirlos. |

La acción principal es **neutra** (fondo `ink`, texto `void`). El ámbar y el azul nunca se usan para decorar ni para botones.

---

## Tipografía

| Rol | Fuente | Por qué | Dónde |
|---|---|---|---|
| Rótulo (`font-display`) | **Big Shoulders Stencil** | Letra esténcil, como las marcas pintadas en el hardware de vuelo y las cajas de carga. | **Solo** en el nombre del sitio, el número de viabilidad y la marca. En mayúsculas. |
| Interfaz y datos (`font-sans`, `font-mono`) | **B612** | Diseñada por Airbus para pantallas de cabina: se lee bien de un vistazo. Sus dígitos tienen todos el mismo ancho, así que los números no saltan al cambiar. | Todo lo demás. |

- Las fuentes se sirven desde `public/fonts` (subconjunto latino, licencia OFL). La demo no depende de internet.
- B612 tiene pesos 400 y 700. No uses `font-medium` ni `font-semibold`: se ven igual que 400 o 700.
- **Rótulo de instrumento** (`instrument-label`): B612 en negrita, mayúsculas y 11 px. Sirve para nombrar paneles y grupos. No lo uses para texto de lectura.

---

## Componentes base (`src/components/ui/`)

| Componente | Uso |
|---|---|
| `Panel` | Marco de instrumento: línea fina, esquinas rectas y el nombre **incrustado en el borde superior**, como en un plano técnico. Admite un control chico en el borde derecho (por ejemplo un `InfoTip`). |
| `Button` | `primary` (neutro claro), `secondary` (con borde) y `ghost`. Esquinas de 3 px. |
| `Select` | Selector de sitio o módulo: control de al menos 56 px, menú en portal para evitar recortes, opciones con descripción y datos reales de configuración. Flechas, Inicio/Fin, búsqueda por letras, Enter, Escape y Tab; foco en el control y opción activa anunciada. |
| `Disclosure` | Detalle técnico plegable con título, explicación y chevrón. Cabecera de al menos 64 px; mismo tratamiento en ajustes, fuentes, balance y eventos. |
| `Segmented` | Elegir una opción entre pocas: modo, velocidad o preset. |
| `Slider` | Etiqueta, valor con unidad y pista que se llena con el color del dato (`sun` para energía, `earth` para datos). |
| `Stat` / `StatGrid` | Una métrica: rótulo, valor y detalle. |
| `Badge` | Etiqueta rectangular. Tonos neutros o de estado. |
| `InfoTip` | Botón "?" con una explicación en lenguaje simple. Funciona con mouse y con teclado. |
| `EmptyState` | Dice qué falta y qué hacer, sin disculparse. |

---

## Reglas de calidad

- **Cristal líquido pedido por Richard:** se aplica a los accesos de la landing y a todo el planificador/simulador. Transparencia, desenfoque y reflejos blancos, con texto de alto contraste. Con transparencia reducida o contraste alto se usa fondo opaco. Sin movimiento continuo. Los menús y ayudas se montan en un portal para escapar de los contenedores con desenfoque.

En **Explorar sitio**, la lectura sigue sitio → fecha y duración → terreno y viabilidad → explicación visual del Sol y la Tierra → calendario → recomendaciones. La página usa un único scroll; la lista de sitios permanece a mano en escritorio y se pliega en móvil. Los porcentajes corresponden al mismo plan. `SiteConditions` usa imágenes ilustrativas existentes y estados/próximos cambios calculados con los datos; no extrae cifras de las imágenes. `VisibilityCalendar` suma horas reales de luz y contacto por día UTC del mes elegido; pulsar un día actualiza la fecha. Las franjas anuales, DSN, horizonte y gráfico polar son detalles técnicos cerrados al inicio. «Simular este plan» conserva sitio, fecha y duración. La viabilidad es un índice de condiciones; el simulador comprueba la energía del módulo.

- **Accesibilidad:** foco visible (contorno claro de 2 px), contraste AA, controles con nombre accesible y tooltips que se abren con teclado.
- **Movimiento:** solo transiciones cortas (150–300 ms). Se respeta `prefers-reduced-motion`.
- **Responsive:** funciona desde 360 px de ancho. La franja de horizonte se desliza en horizontal en pantallas chicas.
- **Texto:** en español, en voz activa y nombrando lo que la persona controla. Los botones dicen qué hacen ("Simular misión", "Ver Connecting Ridge").
- **Antes de entregar** cualquier pantalla: capturas en escritorio y móvil, y revisar que no parezca una plantilla.
