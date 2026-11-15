# Sistema de diseño · GEOATHECMOON

**Dirección actual: exploración lunar sobre cristal líquido (decisión de Richard, 14 nov).** El planificador y el simulador usan superficies translúcidas, bordes suaves y reflejos neutros sobre un fondo lunar. Se conservan la rotulación de hardware espacial para la marca, los sitios y la viabilidad, y B612 para la lectura.

El material de cristal pertenece a toda la herramienta: paneles, navegación, menús y controles. No se usan brillos de color decorativos; el ámbar sigue significando Sol y el azul, Tierra. Las imágenes explican, los datos calculan. Las reglas anteriores que prohibían esquinas redondeadas quedan reemplazadas por esta decisión.

Los tokens están en `frontend/src/index.css` (`@theme`), el material en `frontend/src/flight-glass.css` y las fuentes en `frontend/src/fonts.css`.

## Entrada de marca de la portada

Richard pidió volver a revisar la entrada de MXL Parts (https://mxlparts.us/) y corregir el color. Se verificaron visualmente las fases y su secuencia: apertura corta para descubrir una banda central, cierre y apertura final con acercamiento del contenido. Por decisión posterior de Richard, se elimina el cambio a blanco: el fondo permanece oscuro durante toda la entrada. `BrandIntro.tsx` y `brand-intro.css` adaptan ese ritmo al logo original GA: empieza blanco y gris sobre #05070d, abre unos 38–62 px por mitad para mostrar GEOATHECMOON y «Planificador lunar», vuelve a cerrar y abre las dos mitades por completo, manteniendo el logo blanco y gris sobre #05070d. La primera escena pasa de escala 0.95 a 1 durante la salida, sin escalar el documento. Dura 2.24 segundos: tras el segundo cierre se abre inmediatamente en 448 ms, sin pausa. El PNG original no se modifica: filtros y mezcla CSS eliminan el fondo azul en la presentación.

Permite saltar con botón, Escape o Tab, se omite con movimiento reducido y no se repite al regresar del planificador durante la misma carga. No aparece al entrar directamente a `#planificador`. Al terminar o saltar se restaura el scroll y se retira la animación de acercamiento. El relato y las transiciones con el horizonte de Shackleton se conservan.

### Ritmo de lectura de la landing

Cada escena dispone de unos 180 svh de recorrido efectivo, un 18 % menos que los 220 svh anteriores por petición de Richard. Título, explicación y dato aparecen antes del 40 % y se mantienen completamente legibles hasta el 86 %. La salida usa `storyCues.visible` como única referencia (se eliminó el desvanecido temprano del contenedor); la transición por el horizonte comienza al 88 %. Los capítulos llevan a una posición donde todo el texto ya es visible. El ritmo depende del scroll del visitante; la entrada del logo conserva sus tiempos propios y el modo de movimiento reducido presenta todo estático.

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

El **Planificador** se abre por defecto como una misión guiada, elegida por Richard: **Sitio → Fecha → Resultado**. `PlannerGuide.tsx` muestra una decisión por pantalla y permite volver a los pasos completados. Primero, seis destinos con sus fotografías regionales y una única acción «Elegir fecha». Después, fecha UTC y duración con un resumen del destino y «Comprobar mi plan». Por último, condiciones reales, terreno 3D, alternativas y acceso al simulador. Sitio, fecha y duración se conservan al retroceder, y el paso activo se conserva al ir al simulador y volver.

La página mantiene un solo scroll. En el resultado, la lista comparativa sigue fija en escritorio; en móvil se prioriza la viabilidad antes del terreno y se cambia de sitio desde el primer paso. Luz, comunicación y calendario quedan bajo apertura voluntaria, al igual que los gráficos técnicos. Los porcentajes corresponden al mismo plan. `SiteConditions` y `VisibilityCalendar` conservan sus datos y controles. «Simular este plan» pasa sitio, fecha y duración al simulador, cuyo motor no cambia. La viabilidad sigue siendo un índice de condiciones; la supervivencia se comprueba con el módulo elegido.

- **Accesibilidad:** foco visible (contorno claro de 2 px), contraste AA, controles con nombre accesible y tooltips que se abren con teclado.
- **Movimiento:** solo transiciones cortas (150–300 ms). Se respeta `prefers-reduced-motion`.
- **Responsive:** funciona desde 360 px de ancho. La franja de horizonte se desliza en horizontal en pantallas chicas.
- **Texto:** en español, en voz activa y nombrando lo que la persona controla. Los botones dicen qué hacen ("Simular misión", "Ver Connecting Ridge").
- **Antes de entregar** cualquier pantalla: capturas en escritorio y móvil, y revisar que no parezca una plantilla.
