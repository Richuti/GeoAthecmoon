# Tareas del frontend · GEOATHECMOON

**Claridad de propuestas e intentos:** `MissionGlyph` sustituido por `MissionSummary`: batería mínima, datos enviados y resultado expresados en texto. Se aplica al plan propuesto, al mejor intento durante la búsqueda y a la bitácora de ambas herramientas. Sin curvas diminutas ni franjas de colores; explica el mínimo del 20 % y qué porcentaje de mediciones llegó a la Tierra. Cálculos intactos, inglés actualizado.

Archivos de este ajuste: `src/components/AiPlanner.tsx`, `src/components/sim/AiParts.tsx`, `src/components/sim/RescueCopilot.tsx`, `src/components/sim/ai.css`, `src/i18n/en.ts`, `tests/i18n.test.ts` (todos bajo `frontend/`), `CLAUDE.md` y este documento. Verificado: 360 pruebas, build y capturas Edge CDP a 1440/390 px; propuesta calculada con dos intentos, uno fallido y uno viable, sin llamadas reales de pago. Etiquetas visibles, versión inglesa y ausencia de desbordamientos comprobadas.

**Relieve terrestre solicitado por Richard, terminado y pendiente de su commit conjunto:** autorizada la conversión offline del DEM USGS a `public/models/kennedy_terrain.glb`. Modelo de aproximadamente 1 MB con alturas reales sin exageración; plataforma, nave, cámara y humo anclados al terreno mediante rayos. Recorte y fundido sobre el globo, ortofoto georreferenciada y Gantry NASA. Exportador reproducible y pruebas del GLB; detalle en `docs/RELIEVE_DESPEGUE.md`. La aplicación sigue cargando GLB, sin generar mallas.

**Cielo del visor corregido, revisión final de Richard:** Tierra y Sol con radios físicos y distancias topocéntricas de Horizons en kilómetros, en la misma escala que el terreno. Si falta `distKm`, se usan las constantes medias de `lib/sky.ts` y se indica. No se agrandan ni se levantan artificialmente sobre el horizonte. Profundidad logarítmica para conservar detalle entre nave y Sol. Solo transforma los GLB existentes; no modifica el motor.

**Carga y cámara del viaje:** preparación anticipada del sitio elegido; terreno/nave, cielo y relieve lejano con cargas independientes. El inicio del viaje espera solo a la escena necesaria y no al descenso completo. Cámara orbital con ratón o gestos en despegue, transferencia y descenso; botón de restablecer. Las escenas transparentes están inertes para no interceptar los gestos de la visible. Textura cercana USGS de 1.2 km, relieve del DEM y estructura Gantry NASA en GLB, con créditos y exportación reproducible. No derivar elevaciones de las fotos.

**Ajuste del control temporal:** reproducción con botón de texto «Reproducir / Pausar», sin círculo ni icono diminuto. Fecha, hora y contador comparten tamaño, interlineado y alineación; en móvil pasan juntos a una fila propia.

**Revisión actual, pendiente del commit de Richard:** sustituir las franjas de luz y comunicación por una agenda diaria interactiva (`PlanStrips`, `plan-agenda.css`, `lib/missionDays.ts`). Cada día muestra horas reales de luz y enlace, fechas UTC y la falla de batería si corresponde. Se aplica a la comparación de sitios y de atrasos. Sin iconos ni colores saturados; datos posteriores a la falla identificados como condiciones del sitio. Pruebas de agregación diaria y traducciones incluidas.

Lista detallada de la parte de Richard (carpeta `frontend/`). El backend (Python) lo hace otro integrante.

## Estado contrastado con el repositorio · 15 nov

- **Ajuste visual solicitado por Richard:** retirados los esquemas con iconos de `MissionBasics` y los colores de la comparación de atrasos. Explicación con texto y paleta neutra; resultado, tabla y franjas opcionales conservan los mismos datos.

- **Planificador unificado, pendiente de subir:** fecha y duración antes de los sitios, en la misma pantalla de preparación. Dos pasos: Preparar → Resultado. La IA salta directamente al resultado y «Editar mi plan» conserva las elecciones. Verificación: 352 pruebas, build, escritorio/móvil y traspaso del plan al simulador.

- **Subida más reciente:** `33198b4`, traspaso del plan y primera simplificación de la comparación de atrasos. **Nueva entrega pendiente:** explicación de energía frente a comunicación con dos esquemas y textos por función de la nave, también en indicadores, franjas y condiciones. 351 pruebas; no se cambia el motor.

- **Subido hasta `f139356`:** funciones principales, imprevisto visual, copiloto de rescate, planificación asistida por sitio/mes/módulo/duración, mapa anual de supervivencia, inglés/español, respaldo sin IA y manejo global de errores.
- **Entrega actual, pendiente del commit de Richard:** el plan elegido conserva sitio, fecha, hora y duración al pasar al simulador; entra al viaje sin repetir el formulario y reemplaza cualquier fecha guardada de una misión anterior.
- **En la misma entrega pendiente:** comparación de atrasos replanteada como fechas, resultado de supervivencia y tiempos de luz/enlace. Puntajes y franjas se consultan voluntariamente. Verificada a 1440, 390 y 320 px: éxito, falla, recuperación del plan al cambiar de fecha, límite del año, aplicación del cambio, teclado e inglés.
- **Verificación de cierre:** 350 pruebas y build correctos; traspaso del plan comprobado a 1440 y 390 px, incluida una simulación anterior con otra fecha. App publicada y API de datos responden; petición real al copiloto en producción devuelve propuestas que ejecuta el simulador.
- **Extras pendientes:** capturas manuales de Moon Trek y sliders de pesos de 8.2. La versión actual de planificación y rescate con IA ya está implementada; el objetivo libre de la especificación original queda como ampliación. La canónica publicada todavía usa el dominio anterior: configurar `SITE_URL=https://geoathecmoon.vercel.app` en el próximo despliegue.
- Las notas fechadas de abajo conservan las verificaciones de cada entrega. «Subido» indica que ya están en el historial de `frontend`, sin implicar que se hayan publicado los cambios de esta entrega actual.

- **Corrección de la entrada (14 nov), implementada; subido:** sustituye las tres franjas y la inversión de contraste por un corte horizontal en dos mitades. Logo y fondo se abren hacia arriba y abajo para descubrir la landing desde el centro. Verificado: 278 pruebas, build, capturas de la apertura a 1440/390 px, ajuste a 320 px, salto con botón/Escape, movimiento reducido y regreso sin repetir la intro.

- **Entrada completa y color lunar (14 nov), implementada; subido:** se volvió a observar MXL Parts y se adaptó su secuencia completa: apertura corta con el nombre, cierre, cambio de contraste neutro y apertura final con acercamiento de la portada. Se elimina el azul de la presentación sin modificar el PNG original. Verificado: 278 pruebas, build, capturas por fase a 1440/390 px y ajuste a 320 px; finalización, salto, Escape, movimiento reducido y regreso al inicio sin repetición.

- **Navegación y recarga (14 nov), implementadas; subido:** al recargar se vuelve a `#inicio`, conservando `?sitio=` para el planificador. Los enlaces compartidos siguen abriendo directamente el sitio al visitarlos por primera vez. El scroll se reinicia después del montaje de cada pantalla y la restauración automática del navegador queda en modo manual. Verificado: 278 pruebas, build y capturas a 1440/390 px; abrir desde el pie de la landing, recargar desde abajo del planificador, Atrás/Adelante, volver por la marca y enlaces directos al sitio elegido.

- **Entrada siempre oscura (14 nov), implementada; subido:** se elimina el cambio a fondo blanco y la inversión del logo. Se conserva la secuencia de apertura corta, nombre central, cierre y apertura final. Fondo fijo #05070d y logo blanco/gris. Verificado: 278 pruebas, build y capturas por fase a 1440/390 px; revisión adicional a 320 px.

- **Salida rápida de la entrada (14 nov), implementada; subido:** se elimina la espera tras el segundo cierre. La apertura final arranca inmediatamente y dura 448 ms; la secuencia completa baja de 2.8 a 2.24 segundos conservando los tiempos de la apertura inicial y del nombre. El acercamiento de la portada acompaña la salida. Verificado: 278 pruebas, build y capturas por fase a 1440/390 px, además de 320 px.

- **Landing con recorrido más ágil (14 nov), implementada; subido:** por petición de Richard, cada imagen pasa de 220 a 180 svh de scroll efectivo (18 % menos). Se conservan la aparición temprana de los textos, su tramo de lectura, los capítulos y el recorte del horizonte. Verificado: 278 pruebas, build y capturas a 1440/390 px; lectura de las cinco escenas, recorrido hacia atrás, capítulos, transición y movimiento reducido.

- **Planificador guiado (14 nov), implementado; subido:** Richard eligió un recorrido de sitio → fecha → resultado. Nuevo `PlannerGuide.tsx`: destinos con fotografías reales, una decisión por pantalla, pasos accesibles y retorno conservando las elecciones. El modo inicial pasa a Planificador; el simulador sigue disponible. Calendario, entorno y gráficos quedan como detalles opcionales; en móvil el resultado aparece antes del 3D. La lista de comparación sigue fija en escritorio. Se conserva el plan y el paso al cambiar de modo. Verificado: 278 pruebas, build, capturas a 1440/390 px y revisión a 320 px, teclado y WebKit móvil, regreso entre pasos, navegación/recarga y transferencia al simulador; Malapert el 15 ene conserva supervivencia de 14 días y tolerancia de 4 días y 6 horas.

- **Adaptación responsive y fecha en Safari (14 nov), implementadas; subido:** se centra verticalmente la fecha en ambos formularios con altura y línea coherentes; se conservan el ancho contenido y el selector nativo. Nuevo `responsive.css` para espacios seguros del iPhone, composición de la landing en horizontal y zoom. Se elimina la superposición de la acción de selección sobre los destinos; controles táctiles de 44 px y menús/ayudas ajustados al `visualViewport`. Verificado: 278 pruebas y build; cinco escenas a 320, 390, 720, 768, 844, 1024, 1440 y 2560 px; flujo del planificador en siete tamaños; WebKit táctil en móvil, horizontal y tablet; menú a zoom 200 % y con poca altura; viaje, resultados y batería en móvil, tablet y escritorio. Las comprobaciones son emuladas, no sobre un iPhone físico.

- **Criterio confirmado del reto y próxima mejora del simulador (14 nov):** Richard compartió el texto completo de Lunar Landing Site Navigator. Priorizar la comparación rápida de sitios y fechas ante cambios del calendario o las restricciones. Pendiente: volver a evaluar libremente sin repetir el viaje, conservar un plan de referencia, probar un atraso elegido por el usuario y mostrar los cambios de luz, contacto y energía frente al original. Ofrecer otra fecha en el mismo sitio u otro sitio en la misma fecha, con resultados calculados y acciones para aplicarlos. El escenario de imprevisto existente es una base; no sustituye la elección libre de escenarios. El entorno se calcula a partir de fecha, coordenadas y relieve; no inventar cambios aleatorios ni afirmar que se modelan temperaturas. Esta nota define el criterio; la mejora de interfaz sigue pendiente.

- **Base del despegue cercano (14 nov), implementada; subido:** nueva escena `LaunchViewer.tsx`, en metros, con cohete Saturn V existente y plataforma/torre de NASA (`launch_platform.glb`). Anclaje sobre la cara próxima del GLB terrestre, cámara de seguimiento y transición a la vista orbital; el cohete gigante desaparece de la vista planetaria durante el ascenso. El tramo ilustrativo ocupa 10 s y la transferencia 24 s; pausa, búsqueda y regreso a cero conservan la sincronización. Se detiene el render de cada escena oculta. Verificado: 281 pruebas, build y capturas a 1440/390 px y horizontal, controles, movimiento reducido y conservación del resultado lunar de la demo. **Actualizado en los commits posteriores:** imagen aérea, capas terrestres NASA y humo/escape ya integrados. El vehículo por etapas sigue fuera del modelo; especificaciones para Richard en `docs/ESCENA_DESPEGUE.md`. No se ha añadido dinámica de empuje ni atmósfera al cálculo orbital.

- **Simulador visual (15 nov):** `MissionLive.tsx` conectado y subido en `8f260c2`. Batería, generación/consumo y datos sobre el terreno; avisos de sucesos reales y pausa al fallar.

- **Planificador e integración (14 nov, noche), implementados; subido:** recorrido en contexto (`Tour.tsx`, una explicación junto a cada elemento la primera vez que se llega a cada paso), comparación con atraso en el resultado (`DelayCheck`, `src/sim/delay.ts` con pruebas), textos repetidos eliminados, logo sin fondo en la entrada móvil y respaldo a `public/data` si `VITE_API_URL` no responde en 6 s. Verificado: 293 pruebas, build y capturas a 1440/390 px.

- **Transiciones entre pantallas (15 nov), implementadas; subido:** `transition()` con View Transitions: portada ↔ planificador, pasos sitio/fecha/resultado (adelante a la izquierda, atrás a la derecha) y Planificador ↔ Simulador, con la cabecera fija. Sin soporte, entrada suave por CSS; sin animación con «reducir movimiento». Verificado: 294 pruebas, build y siete navegaciones en el navegador con su dirección correcta y sin errores. Falta que Codex la use en los pasos internos del simulador.

## Cómo trabajamos

1. Se hace **un solo paso a la vez** (por ejemplo, 4.2).
2. Claude escribe los archivos y comprueba que `npm run build` funcione en `frontend/`. Luego **para**.
3. Claude resume qué archivos cambiaron y propone un mensaje de commit.
4. **Richard revisa, hace el commit y el push.** Claude no toca git.
5. Se marca el paso con `[x]` y se pasa al siguiente.

**Etiquetas:**
- **MVP:** imprescindible para la demo del 15 de noviembre.
- **Extra:** solo si sobra tiempo.
- **NASA:** usa uno de los recursos oficiales del reto: **Quickmap**, **Moon Trek**, **JPL Horizons** o **CSA Moon Exploration**. Son prioritarios.

**Orden recomendado (camino a la demo):** 3 → 4 → 5 → **S1 → S2** → 6 → 8 → **SU1 → SU2 → SU3** → 7 → 9 → **S3** → 11. El 10, S4, SU4, SU5 y los extras van al final.

**IA1 actual:** planificación por mes, módulo y duración y copiloto de rescate implementados. La interpretación de objetivos libres de la especificación original sigue siendo una ampliación.

El **C0** (sistema de diseño) ya está en curso y se cierra antes del 4.

---

## Hecho

- **Más tiempo para leer la landing (14 nov), implementado; subido:** escenas con unos 220 svh de scroll efectivo frente a los 101 anteriores, entradas de texto más tempranas, lectura completa hasta el 86 % y transición del horizonte desde el 88 %. Se corrigió el contenedor que ocultaba el texto justo cuando aparecía el dato. Los capítulos abren en un punto legible. La intro del logo no cambia. Verificado: 278 pruebas y build, las cinco escenas con título/explicación/dato visibles al 40 % y al 80 % en escritorio y móvil, capítulos, retroceso, transición del horizonte y lectura estática con movimiento reducido.

- **Nueva entrada inspirada en MXL Parts (14 nov), implementada; subido:** sustituye la entrada curva anterior. Monograma GA grande, separación en tres franjas, nombre cruzando el centro, unión e inversión de contraste antes de mostrar la landing. Referencia revisada: `mxlparts.us` (la dirección `mxlpart.us` no resuelve). Solo cambian `BrandIntro.tsx` y `brand-intro.css`; no cambia el logo original ni la landing posterior. Verificado: 277 pruebas y build, capturas de las fases y a 1440/390 px, revisión a 320 px, salto de intro, Escape, movimiento reducido, scroll restaurado, enlaces directos y regreso sin repetición.

- **Entrada animada con el logo de Richard (14 nov), implementada; subido:** por aclaración de Richard, se adapta solo la presentación inicial de `tunegocioimporta.us`; la landing posterior conserva su composición. Nuevo `BrandIntro.tsx`, `brand-intro.css` y `public/brand/logo.png` original. Logo y nombre se revelan sobre el fondo de marca y se retiran con borde curvo en unos dos segundos. Se puede saltar; no se repite al volver del planificador, se omite con movimiento reducido y no bloquea enlaces directos. Verificado: 277 pruebas y build; capturas a 1440/390 px y revisión a 320 px, finalización automática, scroll restaurado, botón para saltar, Escape, movimiento reducido y regreso desde el planificador sin repetición.

- **Fotografías regionales en los botones de sitios (14 nov), implementadas; subido:** seis imágenes reales LROC/NASA/GSFC/ASU, locales y optimizadas en WebP, detrás de nombres y cifras sobre cristal oscuro. `src/content/siteImagery.ts` registra fuente y encuadre; crédito visible, enlace al original del sitio elegido y listado en Fuentes. Las imágenes dan contexto regional; no alteran datos ni representan la iluminación de la fecha del plan. Créditos y condiciones en `docs/CREDITOS.md`.
  - **Verificado:** 277 pruebas, build y capturas a 1440/390 px; comprobación adicional a 320 px. Cargan los seis fondos locales (467 KiB en total); selección con teclado y móvil, enlace de fuente actualizado, créditos en Fuentes y modo de transparencia reducida. Sin errores de JavaScript ni desbordamientos en las vistas revisadas.

- **Cristal líquido y lectura visual del planificador (14 nov), implementado; subido:** nuevo material compartido en `src/flight-glass.css`, con fondo lunar, paneles/menús/controles translúcidos y alternativa opaca accesible. `SiteConditions` explica Sol y Tierra con imágenes existentes y estados reales. `VisibilityCalendar` muestra horas reales por día UTC, permite elegir día y recorrer los meses de 2027. Las franjas anuales, DSN y gráficos del cielo quedan como detalle técnico opcional; se retiraron las barras de la comparación principal. Las ayudas `InfoTip` usan portal para evitar recortes por el desenfoque. Los datos y el motor no cambian. Verificado con 277 pruebas, build, capturas a 1440/390 px, comprobaciones extra a 320/768 px, conteos del calendario contra los JSON, teclado y misión de Malapert de la demo.

- **Mejora del planificador y desplegables (14 nov), implementada; subido:** Explorar sitio reorganizado con lista comparativa etiquetada, fecha UTC y duración visibles, terreno amplio, viabilidad explicada y paso al simulador con el mismo plan. Scroll único; horizonte, gráfico polar y detalles de posición bajo apertura voluntaria. Nuevos `Select` y `Disclosure` compartidos: módulos con descripción/batería/panel, sitios con contexto, controles por teclado y menús que no se recortan. Ajustes de energía y comunicación en dos columnas legibles. No cambian los datos ni el motor de cálculo. Detalle del diseño en `docs/DISENO.md`.
  - **Verificado:** 277 pruebas y build; capturas a 1440 y 390 px, además de 320 y 768 px. Selección con flechas, Enter, Escape, búsqueda por letras y Tab; selección y scroll táctil. El plan se conserva al abrir el simulador, y Malapert el 15 ene 2027 con Explorador ligero sobrevive los 14 días con tolerancia de 4 días y 6 horas. Sin errores de JavaScript ni desbordamientos horizontales en las vistas revisadas.

- [x] **1. Base del proyecto:** Vite, React, TypeScript y Tailwind, con un layout de bloques placeholder.
- [x] **2. Contrato de datos:** `src/types.ts` y `docs/CONTRATO_DATOS.md`.

---

## Fase A · Datos

### 3.1 Script de datos de prueba · MVP · [x]
- **Archivos:** `scripts/generate-mock-data.mjs`, `package.json` (script `"mock"`) y `public/data/` (generado).
- **Qué hace:** genera `public/data/sites.json` y `public/data/sites/{id}.json` para 6 sitios. Usa un terreno sintético de 96×96 puntos en 20 km y un modelo simplificado del Sol y la Tierra, en 1440 muestras horarias desde `2027-01-01T00:00:00Z`. Todo lleva `mock: true`.
- **Coherencia:** el horizonte se calcula con rayos sobre **la misma malla** de la vista 3D (desde 2 m sobre el suelo), así las sombras coinciden con los porcentajes.
- **Listo cuando:**
  - `npm run mock` imprime una tabla por sitio con el % de luz, el % de comunicación, el horizonte máximo y la pendiente.
  - El horizonte máximo de cada sitio queda entre 1° y 6°.
  - Los % de luz son variados: algunos sitios entre 60 y 90 % y otros bajos.
  - `npm run build` funciona.
- **Resultado (luz / comunicación):** Connecting Ridge 87/45, Shackleton 82/39, de Gerlache 69/61, Malapert 62/75, Mons Mouton 55/61, Nobile 36/38. La luz cambia por quincena (noche lunar en los sitios más alejados del polo).
- **Commit:** `Tarea 3.1: script de datos de prueba`

### 3.2 Sol y Tierra reales desde JPL Horizons · MVP · NASA · [x]
- **Archivos:** `scripts/fetch-horizons.mjs` y `public/data/horizons/{id}.json` (caché).
- **Qué hace:** pide a la **API de JPL Horizons** (`https://ssd.jpl.nasa.gov/api/horizons.api`) el azimut y la elevación del Sol (`COMMAND='10'`) y de la Tierra (`'399'`) vistos desde cada sitio. Parámetros: `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `SITE_COORD='lon,lat,0'`, `QUANTITIES='4'`, `ANG_FORMAT='DEG'`, `CSV_FORMAT='YES'`, cada 1 h y 60 días desde 2027-01-01.
- **Uso:** `generate-mock-data.mjs` usa la caché de Horizons si existe, y si no, el modelo simplificado. Así, aunque el terreno siga siendo sintético, **las posiciones del Sol y de la Tierra son reales**.
- **Por qué en Node:** el navegador podría bloquear la API por CORS. El script se corre una vez y el resultado queda guardado en el repo.
- **Coordinar con backend:** usar exactamente los mismos parámetros que el integrante de Python.
- **Listo cuando:** en Shackleton, la elevación del Sol se mantiene en ±2°. En Malapert, la Tierra casi siempre está sobre el horizonte. Los dos JSON tienen 1440 valores.
- **Resultado:** `npm run horizons` descarga los 12 pedidos (6 sitios × Sol y Tierra) y `npm run mock` los usa. Cada archivo indica `sources.ephemeris = "jpl-horizons"`. Con el Sol real, el relieve se recalibró: la luz queda en Connecting Ridge 82 %, Shackleton 73 %, de Gerlache 70 %, Malapert 56 %, Mons Mouton 47 % y Nobile 38 %. Los sitios del polo tienen horizontes un poco bajo 0°, como los bordes altos reales.
- **Contrato:** se agregó el campo opcional `sources` (`src/types.ts` y `docs/CONTRATO_DATOS.md`).
- **Pendiente:** agregar `TIME_TYPE='UT'` a la consulta de `fetch-horizons.mjs` y volver a descargar con `npm run horizons -- --force`, como pide el contrato.
- **Commit:** `Tarea 3.2: posiciones reales de Sol y Tierra con JPL Horizons`

### 3.3 Verificar los sitios con Quickmap y NASA · MVP · NASA (manual, con el equipo)
- Revisar en **Quickmap (quickmap.lroc.asu.edu)** las coordenadas de los 6 sitios y corregirlas en el script.
- Ver cada sitio también en **Moon Trek (trek.nasa.gov/moon)**: relieve 3D y cómo el terreno vecino tapa el horizonte. Anotar si los resultados del script tienen sentido (por ejemplo, si un sitio rodeado de montañas debería tener menos luz).
- Ajustar los nombres, categorías y descripciones (regiones de Artemis III, IM-2 de CLPS) según lo que muestran Quickmap y Moon Trek.
- **Commit:** `Tarea 3.3: coordenadas de sitios verificadas con Quickmap`

### 3.4 Exportar el relieve para Blender · MVP · [x]
- **Archivos:** `scripts/export-terrain.mjs` y `assets-src/terrain/{id}.obj` + `{id}.png` + `{id}.json`.
- **Qué hace:** saca el relieve de cada sitio (el mismo `terrain.heightsM` con que se calculan la luz y el horizonte) en dos formatos:
  - **OBJ**, para importarlo directo en Blender.
  - **PNG de 16 bits**, como mapa de alturas para el modificador *Displace*.
  - El JSON lleva la altura mínima y máxima en metros y el tamaño en km, para poner la escala exacta.
- **Por qué:** Richard modela los terrenos encima de esta forma. Así las sombras del modelo coinciden con los % de luz que calcula la app.
- **Resultado:** `npm run export-terrain` genera los 6 sitios. El OBJ tiene 9216 vértices y 18 050 triángulos, todos con la cara hacia arriba, y el sitio en (0, 0, 0). El PNG es de 16 bits, 1024×1024, con el norte arriba.
  - Los pasos en Blender están en `assets-src/terrain/README.md`.
  - Los archivos generados no se suben al repo (`.gitignore`); se regeneran con el comando.
- **Commit:** `Tarea 3.4: exportar relieve de cada sitio para Blender`

### D1. Datos completos: un año, coordenadas verificadas, eclipses, crestas, DSN y validación con NASA · [x]
- **Periodo:** todo 2027 cada 1 h (8760 muestras, `scripts/sites.mjs`). Empieza el mismo 1 de enero, así que los primeros 60 días no cambian. Unos 600 KB por sitio (235 KB comprimidos).
- **Horizonte propio desde el DEM** (`npm run horizon`, `scripts/compute-horizon.mjs` → `assets-src/horizon/{id}.json`): mismo método que `build_terrains.py`, con las coordenadas verificadas. En Shackleton coincide con el de Python con diferencia 0.0000°. Guarda además la **distancia y la altura de la cresta** que limita cada azimut.
- **Horizons** (`npm run horizons`): agrega la **distancia** al Sol y a la Tierra (`QUANTITIES='4,20'`), `TIME_TYPE='UT'` (el pendiente pequeño) y la **Luna vista desde Goldstone, Madrid y Canberra** (`public/data/horizons/dsn.json`).
- **`src/lib/sky.ts`** con sus pruebas (`tests/sky.test.ts`): tamaño aparente real del Sol y la Tierra, **eclipses del Sol por la Tierra**, fracción visible del disco de la Tierra, cresta que tapa una dirección (`sunBlocker`, `compassPoint`), ventanas DSN y comparación con NASA.
- **Simulador:** la energía usa el radio real del Sol y descuenta los eclipses (`solarFraction`). Sin distancias en los datos da lo mismo que antes. La DSN **no** cambia el simulador: sigue el supuesto de que siempre hay una estación; queda lista para que Richard decida.
- **Verificación:**
  - Primeros 60 días contra `origin/backend:backend/out`: luz y contacto de los 6 sitios a menos de 0.5 puntos.
  - Caso de la demo: Malapert sobrevive el 15 ene (85.1 % de datos enviados) y falla el 20 ene (2 feb, 10:00 UTC; el documento del backend dice 07:00). Tolerancia de 4.25 días (el documento dice 4.5). Las dos diferencias no vienen de este cambio: salen igual sin las distancias.
  - Validación contra el mapa de iluminación de NASA (AVGVISIB, 2009–2013), con observador a ras de suelo como el mapa: luz a menos de 5 puntos en los 6 sitios (mediana 2.6). Con el panel a 2 m, en las crestas se ve más Sol (Connecting Ridge: 93 % frente a 72 % a ras de suelo).
  - Eclipse detectado: el 17 ago 2027, hacia las 06:00 UTC, la Tierra tapa hasta el 42.9 % del Sol en Malapert (eclipse penumbral de Luna de ese día).
  - Las 242 pruebas pasan y `npm run build` compila.
- **Terrenos 3D con las coordenadas verificadas** (después de D1): `connecting-ridge`, `de-gerlache-rim`, `mons-mouton` y `malapert-massif` se regeneraron con `build_terrains.py` (antes estaban en las coordenadas viejas y el módulo quedaba hasta 1.7 km fuera del sitio). Comprobado: sitio en (0, 0, 0), objeto `Ground`, 20 × 20 km, y horizonte y pendiente idénticos a los de `public/data` (diferencia 0°). Shackleton y Nobile no cambian de coordenadas.
- **Aviso para el backend:** `backend/build.py` no escribe los campos nuevos (`distKm`, `distanceKm`, `dsn`, `reference`); si se regenera con él, se pierden.
- **Commit sugerido:** `Tarea D1: un año de datos con coordenadas verificadas, eclipses, crestas, DSN y validación con NASA`

### D2. Datos de D1 en la interfaz · [x]
- **Registro de la misión** (`src/sim/simulate.ts`): cada puesta y salida del Sol dice por dónde ocurre. Si una cresta tapa el Sol: «el Sol se oculta tras el relieve, a 8.0 km hacia el suroeste». Si no: «el Sol se pone por el suroeste». Evento nuevo `eclipse`: «La Tierra tapa hasta el 43 % del Sol durante 3 h».
- **Línea de tiempo del modo explorar:** fila nueva **DSN**, con las horas de enlace real (la Tierra a la vista y alguna antena con la Luna sobre 10°). Los eclipses aparecen como cortes en la franja de luz, con una nota que explica las dos cosas. Con 365 días, las fechas bajo la barra van una por mes en lugar de una por semana (`timeTicks` en `src/lib/time.ts`), porque se amontonaban.
- **Panel «Ahora»:** «Relieve hacia el Sol» (altura del relieve en esa dirección y distancia a la cresta), «Antenas DSN» (cuáles ven la Luna en este momento) y, durante un eclipse, «Eclipse» con el % del Sol tapado.
- **El simulador sigue sin usar la DSN:** mantiene el supuesto de que siempre hay una estación disponible, hasta que Richard decida.
- **Probado:** 262 pruebas (las nuevas: rumbos, frase de la cresta, evento de eclipse, puesta tras una cresta y marcas por mes) y `npm run build`. En navegador: Malapert el 17 ago 2027 muestra el eclipse del 43 %, la fila DSN y las etiquetas por mes. En móvil no hay desborde ni textos cortados, y no hay errores de JavaScript. El flujo del imprevisto (SU7) sigue pasando.

---

## Fase B · Carga de datos y cálculos

### 4.1 Cliente de datos · MVP · [x]
- **Archivos:** `src/api.ts` y `src/env.d.ts` (tipo de `VITE_API_URL`).
- **Funciones:** `getSites()`, `getSiteData(id)`, `getAllSiteData(sites)` y `clearDataCache()`.
- **Origen de los datos:** si `VITE_API_URL` tiene valor, usa `${VITE_API_URL}/sites` y `/sites/{id}`. Si está vacío, usa `/data/sites.json` y `/data/sites/{id}.json`. `usingLocalData` dice cuál se está usando.
- **Caché:** en memoria, compartida entre pedidos iguales. Si un pedido falla, se olvida para poder reintentar.
- **Validación del contrato** (`validateSites` y `validateSiteData`): largos de `sun` y `earth`, 360 valores de horizonte, `size × size` del terreno, rangos de lat, lon y azimut, categoría, fecha, pendiente e id.
  - Los errores (`DataError`) dicen exactamente qué está mal, por ejemplo: "sun.az tiene 1440 valores y sun.el tiene 1439".
  - Con datos locales, el error sugiere correr `npm run mock`.
- **Probado:** los 7 archivos actuales pasan, y 12 casos rotos a propósito se detectan con su mensaje.
- `src/design/preview.ts` ya carga a través de `api.ts`.
- **Commit:** `Tarea 4.1: cliente de datos (API o archivos de prueba)`

### 4.2 Estado de la app · MVP · [x]
- **Archivos:**
  - `src/state/appState.ts`: reductor puro, sin React.
  - `src/state/AppStateProvider.tsx`: carga y reproducción.
  - `src/state/context.ts`: hook `useAppState()`.
  - `src/state/index.ts`.
- **Estado:** lista de sitios, datos cargados por id, errores por sitio, sitio elegido, instante (`index`), reproducción, velocidad (1, 6 o 24 h/s) y modo (explorar o simular).
- **Acciones:** `select`, `setIndex`, `setPlaying`, `togglePlay`, `setSpeed`, `setMode` y `reload` (para "Reintentar").
- **Reglas:**
  - Al cambiar de sitio se mantiene la fecha y se pausa la reproducción.
  - El índice siempre queda dentro del rango.
  - Al llegar al final se pausa, y play desde el final vuelve a empezar.
  - Abre en `shackleton-rim` si existe y, si no, en el primero de la lista.
- **Carga:** primero la lista, después el sitio elegido y luego el resto en paralelo. Los errores se muestran con "Reintentar"; en la lista, un sitio que falló dice "Error".
- **Probado:** 19 casos del reductor en Node. En el navegador: la carga normal y un backend caído (`VITE_API_URL` a un puerto vacío), que muestra el error con "Reintentar".
- `src/design/preview.ts` ya no carga ni guarda estado: solo calcula y da formato (lo reemplazan la tarea 5 y S1).
- **Commit:** `Tarea 4.2: estado de sitio y tiempo`

### 4.3 Selector de sitios · MVP · [x]
- **Archivos:**
  - `src/components/SiteSelector.tsx`.
  - `src/lib/format.ts`: coordenadas.
  - `src/lib/sites.ts`: categorías, su explicación y la agrupación.
- **Lista:** agrupada por categoría, con un "?" que explica qué es Artemis y qué es CLPS en lenguaje simple.
- **Cada sitio:** nombre, coordenadas (`89.67° S · 197.0° E`), viabilidad y barras de luz y contacto. También tiene texto para lectores de pantalla y los estados "cargando" y "Error".
- **Teclado:** ↑ ↓ Inicio Fin recorren la lista, cruzando categorías, y Enter elige.
- **Móvil:** la lista se pliega y muestra solo el sitio elegido, con el botón "Cambiar sitio (6)". Al elegir uno, se vuelve a plegar.
- **Enlace directo:** `?sitio=nobile-rim` abre ese sitio, y la URL sigue al sitio elegido (con `replaceState`, sin llenar el historial). Si el id no existe, abre Shackleton.
- **Mejoras generales hechas en este paso:**
  - `InfoTip` usa posición fija: no lo recortan los paneles con scroll y se abre hacia arriba si no hay lugar.
  - Las barras de scroll son finas.
  - En pantallas bajas, la columna central se puede desplazar.
- **Probado:**
  - 23 casos del reductor.
  - 21 pruebas en el navegador real (Edge por CDP): URL, teclado, móvil a 390 px sin desborde, y laptop de 1366×768 sin superposiciones y con las explicaciones enteras.
- **Commit:** `Tarea 4.3: selector de sitios por categoría`

### 5.1 Horizonte interpolado · MVP · [x]
- **Archivo:** `src/lib/horizon.ts`.
- **Funciones:**
  - `horizonAt(mask, az)`: interpola entre los grados vecinos y da la vuelta de 359° a 0°. Funciona con cualquier `azimuthStepDeg`.
  - `normalizeAz`, `clearanceDeg` (cuánto sobresale un cuerpo sobre el relieve) y `horizonExtremes`.
- **Pruebas en el repo:** `npm test` (`node --test`, sin dependencias) con `tests/horizon.test.ts`.
  - 21 casos: interpolación, vuelta 359° → 0°, azimuts negativos, paso de 2° y horizonte vacío.
  - Además, comprueba que el % de luz de los 6 sitios coincide con el del generador.
- `tsconfig.test.json`: `npm run build` también revisa los tipos de las pruebas.
- `src/design/preview.ts` ya usa el horizonte interpolado.
- **Commit:** `Tarea 5.1: horizonte interpolado y pruebas con node --test`

### 5.2 Visibilidad · MVP · [x]
- **Archivo:** `src/lib/visibility.ts`.
- **De un instante:** `isLit(data, i)` y `hasContact(data, i)`, con el horizonte interpolado.
- **Del periodo:** `litSeries`, `contactSeries` y `visibility(data)`, que calcula todo una vez.
- **Porcentajes:** `percent(flags, from, to)`, del periodo completo o de un rango.
- **Ventanas:** `windows(flags)` devuelve tramos `{ start, end, openStart, openEnd }`. `openStart` y `openEnd` dicen si el tramo ya venía antes del periodo o sigue después, para no decir "dura 3 h" cuando en realidad no se sabe.
- **Tramo y cambio:** `windowAt(flags, i)` da el tramo de luz o de sombra que contiene la muestra; `nextChange(flags, i)` da las muestras hasta el próximo cambio, o `null`.
- **Probado:** `tests/visibility.test.ts`, 28 casos. Incluye el borde exacto (elevación = horizonte no cuenta como luz) y comprueba con los 6 sitios que las ventanas suman lo mismo que el porcentaje.
- La app ya los usa: `preview.ts`, el panel "Ahora" y la barra de ventanas (`WindowsBar`).
- **Commit:** `Tarea 5.2: visibilidad, ventanas y próximo cambio`

### 5.3 Tiempo · MVP · [x]
- **Archivo:** `src/lib/time.ts`. Todo es UTC, y los meses están escritos a mano (`ene`, `feb`…) para que el texto salga igual en todos los navegadores.
- **Muestra ↔ fecha:** `sampleTime`, `indexAt` (la muestra más cercana, recortada al periodo), `hoursBetween`, `samplesFor`, `dayNumber` (día del periodo o de la misión) y `totalDays`.
- **Formato:**
  - `formatDate` ("11 ene 2027"), `formatShortDate` ("8 ene"), `formatTime` ("13:00") y `formatDateTime` ("11 ene 2027, 13:00 UTC").
  - `formatDuration` ("45 min", "3 d 4 h") y `formatDurationLong` ("3 días y 4 horas", para frases y lectores de pantalla).
  - `formatMissionClock` ("Día 4, 13:00 UTC", para los eventos del simulador).
- **Inputs de fecha:** `toInputValue` y `fromInputValue`, para `<input type="datetime-local">` interpretado como UTC (servirán en 6.1 y SU1).
- **Probado:** `tests/time.test.ts`, 36 casos (85 en total). Pasan igual en Ciudad de México y en Tokio, así que no dependen de la zona horaria.
- La app ya lo usa: la línea de tiempo, el panel "Ahora", la barra de ventanas y el alunizaje en el simulador. `preview.ts` ya no tiene formato.
- **Commit:** `Tarea 5.3: tiempo y formato de fechas y duraciones`

### 5.4 Viabilidad · MVP · [x]
- **Archivo:** `src/lib/viability.ts`.
- **`viability(input, weights, { missionSurvives })`:** combina el % de luz, el % de contacto y el puntaje de pendiente.
  - Los pesos son ajustables (por defecto 0.45 / 0.35 / 0.20) y `normalizeWeights` los lleva a sumar 1.
  - **Implementado:** 100 hasta 5°, baja hasta 0 a los 10° (`SLOPE_LIMITS` y `slopeScore`).
  - Devuelve el puntaje, el veredicto (Buena / Aceptable / Difícil) y el detalle de cada factor (puntaje, peso, puntos que aporta y puntos que pierde).
  - También devuelve el **factor que más resta**, un **resumen en lenguaje simple** y **avisos concretos**: pendiente peligrosa, más de la mitad del tiempo sin Sol, poco contacto o misión que no sobrevive.
  - Las frases usan el mismo número redondeado que se muestra en pantalla.
- **Tope para S3:** si `missionSurvives` es `false`, el puntaje queda en 40 como máximo y se avisa.
- **`siteViability(data, vis, weights, range)`:** la viabilidad del periodo completo o de un rango (los días de una misión).
- **Probado:** `tests/viability.test.ts`, 25 casos (110 en total). Con los datos reales, Connecting Ridge queda primero y Nobile último, y Nobile avisa por su pendiente.
- **En la app:** el panel de viabilidad ya usa la librería. Muestra el resumen, los avisos y la marca "Más resta" en el factor que más baja el puntaje.
- **Commit:** `Tarea 5.4: viabilidad con pesos, factor limitante y avisos`

### 5.5 Recomendación · MVP · [x]
- **Archivo:** `src/lib/recommend.ts`.
- **La viabilidad es de la misión, no del periodo.** Se calcula para una misión de N días (7, 14 o 28; 14 por defecto) que empieza en la fecha de la línea de tiempo. `missionWindow` adelanta el inicio si la misión no entra completa en los datos, y la interfaz lo avisa.
- **Funciones:**
  - `scanStartDates`: la viabilidad de cada fecha de inicio posible, cada 6 h. Le sirve también a la barra de "fechas que funcionan" (SU3).
  - `bestStartDate`: la mejor fecha; si hay empate, la más temprana.
  - `bestAlternativeSite`: el mejor de los otros sitios en las mismas fechas. Solo compara sitios con el mismo periodo.
  - `recommend`: junta todo y arma frases listas para mostrar. Solo recomienda si la mejora es de **3 puntos o más**.
- **Estado:** `missionDays` en el estado global (de 1 día a la duración del periodo) y la acción `setMissionDays`.
- **En la app:**
  - El panel "Viabilidad de la misión" muestra el rango de fechas, el selector 7 / 14 / 28 días y la recomendación, con los botones "Probar esa fecha" y "Ver {sitio}".
  - La lista de sitios usa la misma ventana, así que todos los números de la pantalla son de la misma misión.
  - Ejemplo real: en Mons Mouton, desde el 1 de enero la viabilidad es 44 % (noche lunar). Desde el 12 de enero a las 12:00 sube a 98 %.
- **Probado:**
  - `tests/recommend.test.ts` y `tests/appState.test.ts` (137 pruebas en total).
  - 25 pruebas en el navegador, entre ellas que "Probar esa fecha" mueve la línea de tiempo y sube la viabilidad.
- `src/design/preview.ts` ya solo tiene los presets del módulo, que se van a `src/sim/lander.ts` en S1.
- **Commit:** `Tarea 5.5: recomendación de fecha y sitio para una misión de N días`

### 5.6 Pruebas de los cálculos · Extra
- Con `node --test` (`npm test`), como en 5.1: ventanas al borde del periodo, pesos en cero y periodos sin cambios. Cada paso de la tarea 5 trae sus propias pruebas.

---

## Fase B2 · Simulador de misión

> **Regla:** el simulador **no inventa números**. Todo sale de `isLit`, `hasContact` y la elevación del Sol (tarea 5), más los parámetros que elige el usuario. Los valores de los presets son ilustrativos, y así lo dice la interfaz.

### S1. Modelo del módulo y presets · MVP · [x]
- **Hecho:** `src/sim/lander.ts` y `tests/lander.test.ts` (12 casos, 149 en total).
  - `missionDays` **no** va en `LanderConfig`: vive en el estado global (5.5) para que la viabilidad y el simulador usen la misma duración.
  - Además de lo pedido: `autonomyHours` (horas sin Sol, desde el 100 % hasta el 20 %), `minSunFraction` (qué % del tiempo tiene que haber luz para que la energía alcance), `validateConfig`, `clampConfig`, `PARAMETER_RANGES` y la constante `RECOVERY_SOC = 0.6`.
  - "Configurar misión" usa los sliders de área y eficiencia, muestra la potencia pico, la autonomía y el Sol necesario, y los tres avisos (presets ilustrativos, DSN y mínimo de 20 %).
  - Se borró `src/design/preview.ts`.
- **Archivo:** `src/sim/lander.ts`.
- **Constantes físicas** (exportadas, con su fuente en un comentario):
  - `SOLAR_CONSTANT_W_M2 = 1361`: irradiancia solar a 1 UA. En la Luna no hay atmósfera que la reduzca.
  - `CHARGE_EFFICIENCY = 0.90` y `DISCHARGE_EFFICIENCY = 0.90`.
  - `MAX_DEPTH_OF_DISCHARGE = 0.80`: la batería nunca baja del 20 %.
- Tipo `LanderConfig`:
  - `panelAreaM2`: área del panel.
  - `panelEfficiency`: eficiencia de las celdas (por defecto 0.30).
  - `batteryKWh`: capacidad de la batería.
  - `baseLoadW`: consumo de supervivencia (calefactores y computadora).
  - `instrumentLoadW`: consumo de los instrumentos.
  - `dataPerDayMb`: datos que generan los instrumentos.
  - `downlinkMbPerHour`: velocidad de envío cuando la Tierra es visible.
  - `survivalThreshold`: entra en modo supervivencia por debajo de este nivel (por defecto 0.40, porque el mínimo es 0.20).
  - `missionDays`: duración (por defecto 14).
- `panelPeakW(config) = 1361 × panelAreaM2 × panelEfficiency`. **No es un campo**: se calcula, y la interfaz lo muestra junto a los sliders.
- 3 presets ilustrativos y genéricos, sin copiar ningún módulo real (con eficiencia 0.30):

  | Preset | Panel | Potencia pico | Batería | Consumo base + instrumentos | Datos | Envío |
  |---|---|---|---|---|---|---|
  | **Explorador ligero** | 0.75 m² | ≈ 306 W | 3 kWh | 60 W + 90 W | 1500 Mb/día | 400 Mb/h |
  | **Estación científica** | 2.0 m² | ≈ 817 W | 10 kWh | 150 W + 250 W | 6000 Mb/día | 1200 Mb/h |
  | **Rover de corta duración** | 0.5 m² | ≈ 204 W | 1.5 kWh | 40 W + 120 W | 800 Mb/día | 300 Mb/h |

- **Commit:** `Tarea S1: modelo del módulo y presets`

### S2. Motor de simulación · MVP · [x]
- **Hecho:** `src/sim/simulate.ts` y `tests/simulate.test.ts` (15 casos, 164 en total).
  - Firma: `simulate(data, config, { startIndex, missionDays })`. El plan va aparte del módulo, porque la duración vive en el estado.
  - `sunFraction` usa un radio solar de 0.2665°.
  - Los eventos llevan el reloj de misión ("Día 1, 15:00 UTC: vuelve el Sol.").
  - Las ventanas de comunicación dicen cuánto duran; si siguen al terminar la misión, agregan "o más".
  - **Comprobado con datos reales:** Mons Mouton con el Explorador ligero falla desde el 1 de enero (noche lunar) y sobrevive desde la mejor fecha.
  - Todavía sin interfaz: el botón "Simular misión" se conecta en SU1–SU3.
- **Archivo:** `src/sim/simulate.ts`, con `simulate(data, config, startIndex)`. Es una función pura que avanza en pasos de `stepHours`.
- **Generación (W)** = `1361 × panelAreaM2 × panelEfficiency × fracciónDeSol`.
  - La fracción es la parte del disco solar visible sobre el relieve: 1 si está completo, 0 si está tapado, y lineal mientras el disco (radio ≈ 0.27°) cruza el borde.
  - El panel sigue al Sol, así que no hace falta otro factor de ángulo.
- **Consumo (W)** = `baseLoadW`, más `instrumentLoadW` si está en modo nominal.
- **Batería (Wh):** empieza al 100 % y tiene como tope `batteryKWh`.
  - Si sobra energía: `carga += (generación − consumo) × horas × 0.90` (eficiencia de carga).
  - Si falta: `carga −= (consumo − generación) × horas / 0.90` (eficiencia de descarga).
- **Modos:**
  - **Nominal.**
  - **Supervivencia:** por debajo de `survivalThreshold` (40 % por defecto) apaga los instrumentos, y vuelve a nominal por encima del 60 %.
  - **Falla:** la carga llega al **20 %**, el mínimo que permite la profundidad de descarga máxima de 0.80. La misión termina ahí.
- **Comunicación:** se asume que **siempre hay una estación de la DSN** (Deep Space Network) disponible cuando la Tierra es visible. Este supuesto se escribe en la interfaz (SU1 y SU3).
- **Datos:** en modo nominal se acumulan `dataPerDayMb / 24` por hora. Con contacto con la Tierra se envían hasta `downlinkMbPerHour`.
- **Devuelve:**
  - Series por paso: `soc`, `mode`, `generatedW`, `loadW`, `dataQueuedMb` y `dataSentMb`.
  - `events[]` con `{ index, type, message }` en español, por ejemplo:
    - *"Día 4, 13:00 UTC: el Sol se oculta tras el relieve"*
    - *"Batería al 38 %: modo supervivencia"*
    - *"Se abre la ventana de comunicación (6 h)"*
    - *"Falla: la batería llegó a su mínimo (20 %)"*
  - `summary`: `survived`, `failedAtIndex`, `minSocPct`, `hoursInSurvival`, `dataSentPct` y `energyMarginKWh` (energía por encima del mínimo del 20 % en el peor momento).
- **Listo cuando:** con el mismo sitio y el mismo preset, una fecha con noche larga falla y otra con mucha luz sobrevive.
- **Commit:** `Tarea S2: motor de simulación de energía y datos`

### S3. Búsqueda de fechas y sitios que funcionan · MVP · [x]
- **Hecho** (subido con SU1–SU3): `src/sim/search.ts` con `scanStarts`, `bestViableStart`, `bestStart`, `delayTolerance` y `compareSites`, con pruebas en `tests/search.test.ts`. Los nombres finales son esos, no los de la lista de abajo.
- **Archivo:** `src/sim/search.ts`.
- `scanStartDates(data, config)`: simula empezando cada 6 h dentro del periodo, siempre que quepa la misión completa, y devuelve qué fechas sobreviven y con qué margen.
- `bestAlternative(allSites, config, startIndex)`: el mismo inicio en los otros sitios, ordenado por resultado.
- `delayTolerance(data, config, startIndex)`: cuántos días se puede **atrasar** el alunizaje y la misión sigue sobreviviendo.
  - Prueba inicios cada 6 h desde `startIndex` hacia adelante y se detiene en el primero que falla, o cuando la misión ya no cabe en el periodo.
  - Devuelve `{ days, limitedByPeriod }`. `limitedByPeriod` es verdadero si no falló ninguno pero se acabaron los datos; en ese caso la interfaz dice "al menos X días".
  - Responde la pregunta central del reto: *"Si la misión se atrasa, ¿todavía funciona?"*.
- **Integrar con la viabilidad (5.4):** si la misión no sobrevive, la viabilidad queda en 40 % como máximo y la explicación lo dice. La recomendación (5.5) usa estos resultados: *"Aterrizando el 18 de enero sobrevives con 35 % de margen"*.
- **Commit:** `Tarea S3: búsqueda de fechas y sitios viables`

### S4. Pruebas del simulador · Extra
- Con `node --test` (`npm test`):
  - Siempre con luz → no falla.
  - Siempre en sombra → falla al llegar al 20 %, en `0.60 × B × 0.90 / (base + instrumentos) + 0.20 × B × 0.90 / base` horas, con `B` = `batteryKWh` en Wh (nominal del 100 al 40 %, supervivencia del 40 al 20 %).
  - Con Sol pleno, la generación es exactamente `1361 × área × eficiencia`.
  - Sin contacto → 0 % de datos enviados.

---

## Fase C · Interfaz

> El reto premia la **facilidad de uso**. Cada pantalla tiene que entenderla alguien que nunca usó Quickmap.

### C0. Dirección visual y sistema de diseño · MVP · [x]
- **Archivos:**
  - `src/index.css` (tokens) y `src/fonts.css` con `public/fonts/` (fuentes locales).
  - `src/components/ui/` (Panel, Button, Segmented, Slider, Stat, Badge, InfoTip y EmptyState).
  - `src/components/HorizonStrip.tsx` y `src/components/WindowsBar.tsx`.
  - `src/App.tsx` (layout final) y `docs/DISENO.md`.
- **Dirección "hardware de vuelo":**
  - Big Shoulders Stencil (rotulación esténcil del hardware espacial) solo en el nombre del sitio, la viabilidad y la marca.
  - B612 (la tipografía de cabina de Airbus) para todo lo demás.
  - Paneles como marcos de instrumento, con el nombre incrustado en el borde.
  - Detalle en `docs/DISENO.md`.
- **Elemento distintivo:** la **franja de horizonte de 360°**, con el relieve y el Sol y la Tierra rozándolo, y una escala ampliada cerca de 0°.
- **Temporal:** `src/design/preview.ts` carga los datos y hace cálculos mínimos para revisar el diseño con datos reales. Lo reemplazan 4.1, 4.2, la tarea 5 y S1.
- **Commit:** `Tarea C0: sistema de diseño "hardware de vuelo" y layout final`

### 6. Línea de tiempo · MVP · [x]
- **Hecho:** la función `Timeline` de `src/App.tsx` (no un archivo aparte) con `src/components/WindowsBar.tsx`. El slider recorre todo el periodo (8760 muestras desde D1) y la barra pone una fecha por mes cuando el periodo pasa de 70 días.

### 6.1 Slider de fecha y hora · MVP
- **Archivo:** `src/components/Timeline.tsx`. Slider sobre las 1440 muestras, con la fecha en UTC bien visible.

### 6.2 Play, pausa y velocidad · MVP
- Botón de play y pausa, con velocidades de 1 h/s, 6 h/s y 1 d/s.

### 6.3 Barra de ventanas en SVG · MVP
- Dos franjas: luz en ámbar y comunicación en azul, con un cursor en el instante actual. Al hacer clic se salta a esa fecha.
- **Commit:** `Tarea 6: línea de tiempo con ventanas de luz y comunicación`

### 7. Gráfico polar del cielo · MVP · [x]
- **Hecho y subido** (`de60a03`): `src/components/SkyPlot.tsx`, en el modo explorar.

### 7.1 Gráfico polar: base · MVP
- **Archivo:** `src/components/SkyPlot.tsx`. Círculos de elevación y puntos cardinales, con el norte arriba.
- La escala radial está ampliada cerca de 0°, porque las elevaciones van de -5° a 15°.

### 7.2 Máscara del horizonte · MVP
- El relieve aparece como una zona rellena desde el borde.

### 7.3 Trayectorias y posición actual · MVP
- Trayectorias del Sol (ámbar) y de la Tierra (azul) en el periodo, con el punto actual de cada uno. El punto se ve hueco cuando está tapado por el relieve.
- **Commit:** `Tarea 7: gráfico polar del cielo`

### 8. Métricas y viabilidad · MVP · [x]
- **Hecho:** las funciones `Now` (Sol, Tierra, cuenta regresiva y pendiente) y `Viability` (puntaje, factores, avisos y recomendación con «Probar esa fecha» y «Ver sitio») de `src/App.tsx`, no un `Metrics.tsx` aparte.
- **No se hizo:** los sliders para ajustar los pesos. Los pesos son fijos (`DEFAULT_WEIGHTS`) y se muestran junto a cada factor.

### 8.1 Tarjetas de métricas · MVP
- **Archivo:** `src/components/Metrics.tsx`.
- Elevación del Sol y de la Tierra, y estado (luz/sombra, con/sin contacto).
- % del periodo, cuenta regresiva hasta el próximo cambio y pendiente.

### 8.2 Viabilidad y recomendación · MVP
- Viabilidad en % en grande, con su explicación y la recomendación ("Mejor empezar el 18 ene" o "Prueba Connecting Ridge: 91 %").
- Sliders para ajustar los pesos.
- **Commit:** `Tarea 8: panel de métricas y viabilidad`

### 8.3 Ayuda en lenguaje simple · MVP · [x]
- **Hecho:** `src/components/Help.tsx`, botón «¿Cómo leer esto?» en el encabezado (en las dos vistas). Abre un glosario con horizonte, elevación, azimut, luz solar, ventana de comunicación, DSN, eclipse, pendiente, viabilidad y tolerancia a atrasos: qué es y por qué importa en el polo sur. Las métricas ya tenían su tooltip.
- Un botón "¿Cómo leer esto?" con un glosario corto: horizonte, elevación, pendiente y ventana de comunicación.
- Tooltips en cada métrica.
- **Commit:** `Tarea 8.3: ayuda y glosario`

### 9. Vista 3D con los modelos de Richard · [x] (9.1–9.4)
- **Hecho:** `src/components/Viewer3D.tsx`, que se carga aparte (unos 1 MB, solo cuando hace falta), y `src/components/ViewerPanel.tsx`.
  - Terreno LOLA del sitio. La altura del suelo bajo el módulo sale de un rayo vertical sobre el modelo.
  - La luz del Sol es la **fracción del disco solar visible** según el horizonte LOLA de 150 km, y cambia suave. Las sombras son rasantes (mapa de 4096).
  - De noche hay una penumbra azulada para que el relieve se lea; de día casi no hay, y las sombras quedan negras.
  - El Sol y la Tierra se ubican por azimut y elevación. Van agrandados y la interfaz lo dice. La Tierra se dibuja sin depender de la luz del sitio.
  - Módulo agrandado ×30. `SolarPanel` apunta al Sol y `Antenna` a la Tierra; los dos miran a -Z, así que el giro es Y = -az, X = el.
  - Estrellas de fondo muy tenues. Botón "Restablecer vista". Si el modelo falla, se muestra un mensaje en lugar de romper la app.
  - **Probado en navegador real (WebGL por software):** carga, Sol iluminado y en sombra (Sol a 1.17° pero tapado por el relieve → escena oscura), cambio de sitio y consola sin errores.

> **Regla:** el código **no genera geometría**. Todo lo que se ve en 3D (terrenos, módulo, Sol, Tierra, cielo y marcadores) lo modela Richard y llega como `.glb`. El código solo carga los modelos, pone la cámara, mueve la luz del Sol según los datos y anima las piezas con nombre.

### 9.1 Visor 3D · MVP
- Instalar `three`, `@react-three/fiber` y `@react-three/drei`.
- **Archivo:** `src/components/Viewer3D.tsx`. Un Canvas que carga `public/models/terrain/{id}.glb` según el sitio elegido, con OrbitControls limitados (sin meterse bajo el suelo) y carga progresiva.
- Mientras no exista el modelo, muestra un estado vacío bien diseñado ("Modelo 3D en preparación") en lugar de una figura generada.
- **Carga diferida:** cada `.glb` se pide solo cuando se va a ver, y mientras tanto se muestra el progreso. Hay modelos de varios MB (`gateway.glb` pesa unos 11 MB) y la primera pantalla no debe esperarlos.

### 9.2 Luz del Sol desde los datos · MVP
- Una luz direccional en la dirección `(sin az·cos el, sin el, -cos az·cos el)`, con el norte en -Z y el este en +X. Cambia con el slider de tiempo.
- Las sombras salen en tiempo real del propio modelo.
- **Los datos mandan sobre el modelo:** si `isLit` es falso, la luz del Sol se apaga o se atenúa **aunque el terreno 3D no proyecte sombra**. El horizonte real puede venir de montañas que están fuera del recorte de 20 km.
  - La intensidad sigue la fracción del disco solar visible (la misma de S2), así la transición es suave.
  - Queda la luz ambiente tenue y la luz de la Tierra.
- **Comprobar:** cuando `isLit` es falso, el sitio se ve en sombra en 3D, venga la sombra del modelo o no.

### 9.3 Sol y Tierra en el cielo · MVP
- Se cargan `sun.glb` y `earth.glb` y se colocan en el cielo según su azimut y elevación actuales, a una distancia fija de la cámara.

### 9.4 Módulo de alunizaje · MVP
- Se carga `lander.glb` en el centro del terreno (el sitio).
- El código gira `SolarPanel` hacia el Sol y `Antenna` hacia la Tierra en cada instante.
- **Commit de la tarea 9:** `Tarea 9: visor 3D con modelos, luz solar y módulo animado`

### 10. Comparador · Extra (MVP si hay tiempo) · [x]
- **Hecho (14 nov, noche):** `PlanCompare.tsx` en el resultado del planificador. Tu plan junto a «Otro sitio» (mismas fechas, propone el mejor) o junto a «Mi plan guardado» (plan de referencia que se conserva al cambiar sitio, fecha o duración). Cada columna: foto del sitio, puntaje, franjas hora por hora de Sol y Tierra (`PlanStrips.tsx`, `src/lib/strips.ts`), ▲ donde se agota la batería y «Cambiar a este plan». «¿Y si la misión se atrasa?» usa las mismas franjas en lugar de tabla. Verificado: 294 pruebas, build, capturas a 1440/390 px; Malapert 15 ene frente a 20 ene (falla el día 14) coincide con el caso de la demo.
- Dos sitios lado a lado, con las mismas fechas, las mismas métricas y la viabilidad de cada uno.
- **Commit:** `Tarea 10: comparador de sitios`

---

## Fase C2 · Interfaz del simulador

### SU1. Panel "Configurar misión" · MVP
- **Implementado; subido:** `src/components/sim/MissionSetup.tsx` y `SimulatorWorkspace.tsx`. Formulario principal reducido a sitio, fecha UTC y duración; módulo y parámetros técnicos desplegables. Navegación entre viaje Tierra–Luna y sitio de alunizaje. Terreno amplio y lectura de viabilidad a su lado. La fecha de alunizaje es independiente del cursor de reproducción.
- **Archivo:** `src/components/sim/MissionSetup.tsx`.
- Selector de preset, más sliders para cada parámetro con su unidad y un tooltip en lenguaje simple. También la fecha de alunizaje y la duración.
- El panel se configura con **área** y **eficiencia**. Al lado se muestra la potencia pico calculada (`1361 W/m² × área × eficiencia`).
- Avisos visibles:
  - Los presets son ilustrativos.
  - Se asume una estación de la DSN siempre disponible cuando la Tierra es visible.
  - La batería no baja del 20 % (profundidad de descarga del 80 %).
- Botón grande **"Simular misión"**.
- **Commit:** `Tarea SU1: panel de configuración de misión`

### SU2. Reproducción de la simulación · MVP
- **Implementado; subido:** `src/components/sim/MissionTrace.tsx`, línea de tiempo y estado global. La reproducción se limita a la misión y se detiene al terminar o fallar; al repetir comienza en el alunizaje. Incluye batería, modo, datos enviados y pendientes, eventos navegables y estado del módulo en el visor. Gráfica accesible con flechas, Inicio y Fin.
- Usa la misma línea de tiempo (tarea 6) en "modo misión", desde el alunizaje hasta el final.
- En el panel de métricas: batería en % (verde, ámbar o rojo), modo actual, y datos en cola y enviados.
- **Gráfico SVG de la batería** a lo largo de la misión, con las franjas de luz y comunicación debajo.
- **Registro de eventos** que aparecen a medida que avanza. Al hacer clic se salta a ese momento.
- **En 3D:** el panel sigue al Sol y la antena a la Tierra, como en la tarea 9.4. El módulo muestra su estado con una etiqueta HTML sobre el modelo, o encendiendo la pieza opcional `StatusLight` del `lander.glb`. Sin geometría generada por código.
- **Commit:** `Tarea SU2: reproducción de la misión`

### SU3. Resultado de la misión · MVP
- **Implementado; subido:** `src/components/sim/MissionResult.tsx` y búsquedas adelantadas de S3 (`src/sim/search.ts`). La viabilidad muestra luz y contacto en porcentaje y horas, más pendiente regional. Compara los seis sitios para la misma fecha y módulo. La mejor fecha prioriza la viabilidad entre las que sobreviven; a igual puntaje elige margen y luego fecha más temprana. La batería comprueba el plan sin sustituir los tres criterios del reto. La viabilidad usa el alunizaje fijo y queda en 40 % como máximo si la misión falla. Mantiene tolerancia a atrasos, eventos y controles por teclado.
- **Verificación de esta entrega:** pruebas de cálculo y estado, compilación y recorrido en Edge con escritorio y móvil de 390 px; sin desborde horizontal ni excepciones de JavaScript.
- Tarjeta final:
  - ✅ **Misión cumplida**, o ❌ **Falló el día X**, con la causa.
  - Datos enviados (%), batería mínima y horas en supervivencia.
  - **"Tolera atrasos de hasta X días"** (de `delayTolerance`), o "al menos X días" si el periodo de datos no alcanza para saber más. Si no tolera ningún atraso, se dice claramente.
  - Recomendación: la mejor fecha (de S3) y el mejor sitio alternativo, con un botón "Probar esta opción" que vuelve a simular.
- Barra de **"fechas que funcionan"**: el resultado de `scanStartDates` sobre el periodo, en verde o en rojo.
- **Commit:** `Tarea SU3: resultado de la misión y fechas viables`

### SU4. Modo reto · Extra
- Retos educativos, por ejemplo: *"Sobrevive 14 días en Nobile con la batería más pequeña posible"*. El puntaje depende del tamaño de la batería y de los datos enviados.

### SU5. Animación de descenso · Extra · [x]
- El viaje incluye aproximación al polo sur y descenso ilustrativo sobre el relieve LOLA del sitio elegido, con la misma nave y polvo rasante. El tramo final usa 10 segundos de presentación, separados del cálculo orbital; se puede pausar, recorrer y omitir. Implementado en `DescentViewer.tsx`, `Viewer3D.tsx` y `transferView.ts`, commits `c14ec78` y `a0fa401`.

### SU6. Viaje Tierra–Luna y accesibilidad · [x]
- `src/sim/transfer.ts`, `tests/transfer.test.ts`, `src/components/sim/EarthMoonJourney.tsx` y `TransferViewer.tsx`.
- Ascenso ilustrativo con un GLB Saturn V de NASA y transferencia orbital educativa calculada desde una órbita terrestre de 200 km. Muestra duración, distancia y velocidad; la Luna se mueve hacia el encuentro previsto.
- Reproducción sin autoplay, pausa, avance manual y controles por teclado. Movimiento reducido detiene la reproducción y usa una cámara general fija. «Evaluar este alunizaje» conecta con el motor de superficie.
- Supuestos y límites explícitos: dos cuerpos, Luna circular y fase orientada para un encuentro ideal. No calcula ascenso físico, ventanas reales de lanzamiento, captura, descenso ni consumo del cohete. Detalle y fuentes en `docs/TRANSFERENCIA.md`; modelo registrado en `docs/CREDITOS.md`.
- Simplificación: tres campos principales; ajustes del módulo y gráfica detallada de batería, datos y eventos desplegables. Las cifras y unidades de los sliders se anuncian a lectores de pantalla.
- **Probado:** conservación de energía y momento angular, condiciones de salida y encuentro; recorrido completo en navegador con escritorio, móvil, teclado y movimiento reducido. La simulación y comparación de sitios siguen funcionando.
- **Commit sugerido:** `Tarea SU6: viaje Tierra-Luna calculado y simplificación accesible del simulador`.
- **Corrección de sincronización, subido:** el inicio espera a los modelos; reloj, nave y Luna comparten `journeyAt`. La reproducción avanza por cuadros y la cámara conserva ambos cuerpos en la aproximación, también en móvil. `transferView.ts` calcula el encuadre sin generar geometría. Verificado con 277 pruebas, build y capturas a 1440 y 390 px; carga retrasada, pausa, retroceso, repetición, llegada y evaluación de superficie.

### SU7. Imprevisto en el alunizaje · [x]
- **Ampliación visual del 15 nov, pendiente del commit de Richard:** `IncidentReplay.tsx` reproduce la llegada atrasada con reloj local, saltos a alunizaje, puesta del Sol y falla, avisos de `MissionLive` y estado HTML anclado a la nave. La escena original se sustituye mientras se explora el caso, así solo se renderiza un terreno. «Volver al plan original» restaura el cursor conservado y las alternativas se aplican sin repetir el viaje. El modelo de `incident.ts` no cambia.
- **Idea:** después del viaje, en «Evaluar», el botón «Simular el imprevisto» plantea que una corrección de trayectoria atrasa la llegada. El usuario ve si su misión todavía funciona y elige cómo salvarla. Es la pregunta del reto llevada a una decisión.
- **Motor** (`src/sim/incident.ts`, pruebas en `tests/incident.test.ts`): el escenario es simulado, pero sus números salen de los datos.
  - El atraso es el **más corto que hace fallar la misión** (la tolerancia a atrasos más un paso de 6 h). Si ningún atraso la hace fallar, se muestran 5 días y se dice que la misión aguanta.
  - **Causa:** la última puesta de Sol antes de la falla, las horas de sombra que siguen y el relieve que lo tapa (dirección, distancia y altura, de los datos de D1). Distingue una cresta que tapa el Sol de un Sol que se pone bajo el horizonte.
  - **Tres salidas, todas simuladas:** esperar en órbita hasta la primera llegada que sobrevive; cambiar al sitio que sobrevive y envía más datos con la misma llegada; encender menos instrumentos (75, 50 o 25 %, con menos consumo y menos datos en la misma proporción).
- **Interfaz** (`src/components/sim/IncidentPanel.tsx`, montado en la vista «Evaluar» de `SimulatorWorkspace.tsx`): atraso, llegada prevista y nueva, día de la falla y su causa, y las salidas con batería mínima y datos enviados. «Aplicar» cambia el plan y vuelve a simular. Dice en pantalla que el atraso es un escenario y que el Sol, la Tierra y el relieve son datos reales.
- **Caso de la demo** (Malapert, 15 ene 2027, Explorador ligero): atraso de 4 días y 12 horas, falla el día 14 (el 1 feb el Sol se pone por el suroeste y siguen 8 días y 6 horas de sombra). Salidas: esperar al 11 feb (84 % de datos), ir a de Gerlache (34 %) o encender el 75 % de los instrumentos (54 %).
- **Probado:** 12 pruebas nuevas (254 en total) y `npm run build`. En navegador (Edge headless): flujo completo, «Aplicar» lleva al 11 feb y la misión sobrevive, móvil sin desborde y sin errores de JavaScript.
- **IA1 lo puede usar:** la IA explicaría el imprevisto y las salidas que el motor ya comprobó, sin inventar números.

### IA1. Diseñar y aplicar un plan de misión con IA · Versión actual implementada
- **Estado real (15 nov):** `AiPlanner.tsx`, `RescueCopilot.tsx`, `src/sim/aiPlanner.ts`, `src/sim/copilot.ts` y `api/copilot.ts` ya están subidos. El usuario elige mes, módulo y duración; el modelo propone y el motor calcula. El rescate combina palancas comprobadas. La especificación y casillas de abajo conservan la ampliación original por objetivo libre; no indican que falte la integración actual.
- **Objetivo:** un planificador que **actúa dentro del simulador**, no un chat genérico ni solo explicaciones. El usuario escribe un objetivo y recibe planes comprobados que puede aplicar.
- **Ejemplo:** «Quiero una misión de 14 días, priorizando comunicación y usando este módulo». El sistema:
  1. Interpreta el objetivo y extrae duración, prioridades y restricciones.
  2. Evalúa sitios, fechas y configuraciones permitidas con el motor existente.
  3. Presenta una propuesta principal y alternativas, cuando existan.
  4. Con «Aplicar este plan» actualiza sitio, fecha, duración y módulo, vuelve a simular y permite reproducir la misión.
- **Papel de la IA:** traduce el objetivo a criterios estructurados y explica las opciones calculadas. Puede pedir que se ejecuten funciones del proyecto mediante herramientas (*function calling*).
- **Regla:** los cálculos físicos y la selección verificable de opciones son del código del proyecto. La IA no inventa horas de Sol, contacto, pendientes, viabilidad, batería ni fechas favorables. Si ninguna opción cumple las restricciones, lo dice y señala qué condición habría que revisar; nunca presenta una misión fallida como viable. Los presets siguen siendo ilustrativos.
- **Arquitectura:** React → endpoint propio del backend → API de OpenAI.
  - Antes de elegir modelo y API, consultar la documentación oficial vigente de OpenAI.
  - Validar estrictamente las entradas, los argumentos de las herramientas y las respuestas estructuradas.
  - Usar únicamente los sitios, periodos y parámetros disponibles.
  - `OPENAI_API_KEY` solo en el servidor. Nunca en React, variables `VITE_`, archivos públicos ni el repositorio.
  - Clave configurada solo en el servidor; `.env.local` está ignorado por git. Nunca pedir ni pegar la clave en el chat.
  - Sin clave, la interfaz dice que la función está pendiente de configuración y el simulador sigue funcionando. No se simulan respuestas de IA como si fueran reales.
  - El backend principal es de otro integrante (Rafael): revisar qué existe y coordinar el contrato; no reconstruir su trabajo.
- **Fuera de alcance:** no modificar la portada ni el recorrido Tierra–Luna para esta función.
- **Forma de trabajar:** un paso a la vez. Al terminar cada paso: comprobaciones, resumen de archivos y mensaje de commit sugerido; después se detiene. Richard hace los commits y el push; no se cambia de rama.

#### IA1.1 Revisar lo existente y definir el contrato · [ ]
- Leer el simulador actual (`src/sim/`, `src/lib/`, `App.tsx`, `SimulatorWorkspace.tsx`) y lo que hay en `origin/backend`.
- Definir el contrato del endpoint: qué envía el frontend (objetivo en texto, sitio y módulo actuales, periodo disponible), qué devuelve (criterios estructurados, planes y explicación) y los errores (sin clave, límite de uso, tiempo agotado, objetivo inválido).
- Definir las herramientas que la IA puede pedir (por ejemplo: listar sitios y periodo, evaluar un plan, buscar fechas que sobreviven, comparar sitios) con sus esquemas de argumentos y su validación.
- Decidir con Rafael dónde corre el endpoint y quién ejecuta el motor. Si el motor sigue en TypeScript, el servidor puede reutilizar `src/sim` y `src/lib` sin duplicar cálculos.
- Documentarlo en `docs/CONTRATO_IA.md`.

#### IA1.2 Conexión segura con OpenAI · [ ]
- Endpoint propio en el servidor, con `OPENAI_API_KEY` en su entorno, y las instrucciones para configurarla localmente.
- Límites de uso y manejo de errores, esperas y falta de configuración. Sin clave, estado «pendiente de configuración» y el simulador intacto.

#### IA1.3 Traducir objetivos a criterios verificables · [ ]
- Recoger duración, prioridades y restricciones: luz solar, comunicación, pendiente, módulo y fechas o sitios permitidos.
- Respuesta estructurada y validada contra los sitios, periodos y parámetros disponibles. Si falta información esencial, pedir solo ese dato; si el objetivo no es viable, explicarlo.

#### IA1.4 Evaluar y ordenar los planes con el motor · [ ]
- Ejecutar las búsquedas y simulaciones del proyecto para los criterios pedidos. Comparar opciones con el mismo objetivo y mostrar qué restricciones cumple cada una.
- Cada plan lleva: sitio, fecha, duración y módulo; viabilidad; horas de luz y contacto; pendiente; supervivencia y batería mínima; datos enviados; tolerancia a atrasos; y una explicación breve de por qué cumple el objetivo.

#### IA1.5 «Diseñar mi misión» y «Aplicar este plan» · [ ]
- Acción **«Diseñar mi misión»** integrada en el simulador: pocos controles, lenguaje claro, navegación por teclado y buen funcionamiento en móvil.
- Identidad espacial del proyecto. Sin ventanas de chat flotantes, tarjetas repetidas, adornos de IA ni pantallas llenas de parámetros.
- Primero lo esencial; los detalles, desplegables. Propuesta principal y alternativas.
- **«Aplicar este plan»** actualiza sitio, fecha, duración y módulo, vuelve a simular y permite reproducir la batería y los eventos.

#### IA1.6 Verificación · [ ]
- Aplicar un plan reproduce **exactamente** sus resultados con el motor.
- Pruebas de restricciones incompatibles, objetivos imposibles, errores de la API y fechas fuera del periodo disponible.
- Capturas en escritorio y móvil. No afirmar que se verificó la conexión real con OpenAI sin credenciales.
- **Listo cuando:** un objetivo produce un plan comprobado que se puede aplicar y reproducir; los valores mostrados coinciden con los del motor; se entiende en móvil y con teclado; los fallos de la API no bloquean el planificador.
- **Commit sugerido al completar la integración:** `Tarea IA1: planificador de misión con IA y aplicación de planes verificados`.

---

## Fase C3 · Portada narrativa con scroll

> Medios generados por Richard con los prompts de `docs/MEDIOS_VISUALES.md`. Son **ilustraciones** y ningún dato sale de ellas. Por decisión de Richard (14 nov), la app no menciona la IA en ningún lugar.

### C3.1 Portada con video que avanza con el scroll · [x]
- **Hecho (adelantado a pedido de Richard):**
  - `src/components/Story.tsx` y `src/lib/storyFacts.ts`, con `tests/storyFacts.test.ts`.
  - Los medios convertidos están en `public/media/`: sin audio, con un fotograma clave cada 4, sin los marcos de película, el V4 invertido, con pósters, más `i2-borde-crater.jpg` e `i1-fondo-og.jpg`.
- **Una secuencia continua.** Un único escenario fijo encadena las cinco tomas con fundidos, sin separaciones de página, líneas ni zoom adicional. Los textos aparecen por momentos del video. El cierre permanece sobre la noche lunar. El prompt para generar una toma única está en `docs/PROMPT_VIDEO_CONTINUO.md`; mientras llega ese archivo se usan los medios existentes.
- **Cada escena trae un dato real calculado,** que aparece completo en su momento:
  - el Sol no pasa de 1.3° en Shackleton;
  - da una vuelta al horizonte cada 29.6 días;
  - la Tierra se ve el 40 % del tiempo;
  - Mons Mouton pasa de 44 % a 98 % cambiando la fecha;
  - la autonomía es de 19.8 h.
- **Navegación:**
  - Índice de capítulos 01–05, que se oculta en la escena final.
  - "Abrir el planificador" lleva a `#planificador`; la marca del planificador vuelve a la portada (`#inicio`); un enlace con `?sitio=` se salta la portada.
  - Enlace "Saltar al planificador" para teclado.
- **Calidad:**
  - Un solo bucle `requestAnimationFrame` que solo trabaja con las escenas visibles, sin volver a dibujar React en cada cuadro.
  - Cada video empieza a cargar cuando se acerca su escena.
  - Truco para que iOS permita mover el video.
  - Con "reducir movimiento" se ven pósters fijos.
  - ~~"Ilustración generada con IA" en cada escena~~: retirado por decisión de Richard (sin menciones de IA en la app).
- **Probado:** 21 pruebas en el navegador real (scroll, texto, contador, índice, botones, movimiento reducido y móvil sin desborde), más las 25 del planificador.
- **Archivo:** `src/components/Story.tsx`. Cuatro o cinco escenas con V1–V5. El scroll mueve el `currentTime` del video. Se pausa con `prefers-reduced-motion` y entonces muestra el póster.
- Cada escena tiene una frase corta con un dato real de la app. Por ejemplo: *"En Shackleton el Sol nunca sube más de 1.3°"* (calculado de los datos de Horizons, no escrito a mano).
- Termina con el botón **"Abrir el planificador"**.
- Si falta un video, usa su póster o `i2-borde-crater.jpg`.
- **Commit:** `Tarea C3.1: portada narrativa con scroll`
- **Ajuste de secuencia subido:** `src/lib/storyTiming.ts` y `tests/storyTiming.test.ts`. Apariciones por tiempo de video y fundidos dentro de un solo escenario; póster como respaldo y relato estático completo con movimiento reducido. Verificado en Edge con escritorio y móvil.

- **Portada rehecha, subido:** ya no usa videos (se borraron del repo, unos 28 MB). Usa 5 imágenes fijas (`public/media/escena-1..5-*.jpg`, prompts en `docs/MEDIOS_VISUALES.md`). El cambio de escena sube recortado con la silueta real del horizonte de Shackleton; la franja fija del horizonte y el Sol se retiró por decisión de Richard. El relato va en el cielo y el dato sobre el suelo. Pie de página con «GEOATHECMOON» relleno con la textura de la superficie lunar de Solar System Scope (CC BY 4.0). Sin menciones de IA.

### C3.2 Imagen para compartir · Extra · [x]
- **Hecho:** `frontend/public/og.jpg` (1200×630, fondo I1 con las fuentes de la app), etiquetas Open Graph y Twitter en `frontend/index.html`, y `frontend/vite.config.ts`, que pone `https://$VERCEL_PROJECT_PRODUCTION_URL` en `%SITE_URL%` (el build local también usa la URL pública compartida).
- `public/og.jpg` (1200×630): el fondo I1 con el título en la tipografía de la app, compuesto en HTML y capturado.
- Más las etiquetas Open Graph en `index.html`.

---

## Fase D · Cierre

### 11.1 Conectar con el backend real · MVP · [x]
- Configurar `VITE_API_URL`, revisar el checklist de `docs/CONTRATO_DATOS.md` con los datos reales y mostrar un aviso cuando se usan datos de prueba.
- **Hecho:** checklist revisado sobre `backend/out` y `public/data` (los dos pasan; detalle y diferencias en `docs/CONTRATO_DATOS.md`). `VITE_API_URL` queda vacía: la app lee los JSON estáticos de `public/data`, también en Vercel. `dataNotice` (`src/api.ts`, con pruebas en `tests/api.test.ts`) avisa en el encabezado si un sitio trae datos de prueba. Anotado qué tendría que agregar `backend/build.py` para no perder los campos opcionales de D1.
- **Commit sugerido:** `Tarea 11.1: datos reales verificados contra el contrato y aviso de datos de prueba`

### 11.2 Fuentes de datos y créditos · MVP · NASA · [x]
- **Hecho:** `src/components/Sources.tsx`. Los enlaces a QuickMap y Moon Trek llevan a cada visor con las coordenadas del sitio a la vista, no a un enlace directo al punto.
- Panel "Fuentes" que acredita a JPL Horizons, Moon Trek, Quickmap (datos del LRO) y CSA Moon Exploration.
- Cada sitio tiene enlaces "Ver en Quickmap" y "Ver en Moon Trek".
- **Créditos de modelos y texturas,** tomados de `docs/CREDITOS.md` (la fuente única: si cambia, se actualiza el panel):
  - **NASA 3D Resources** (dominio público): `lander.glb` (Apollo Lunar Module, adaptado con panel solar y antena), `rover.glb` (Space Exploration Vehicle), `astronaut.glb`, `lro.glb`, `gateway.glb`, `dsn_34m.glb` y `stars.jpg` (Tycho Star Map).
  - **NASA Visible Earth / Goddard** (dominio público): Blue Marble Next Generation, en `earth.glb`.
  - **NASA Earth Observatory** (dominio público): Black Marble, en `earth_night.jpg`.
  - **Solar System Scope, CC BY 4.0: dar crédito es obligatorio.** Son las texturas de la Luna (`moon.glb`, basada en datos de NASA LRO) y del Sol (`sun.glb`). Texto: *"Texturas de la Luna y el Sol: Solar System Scope (solarsystemscope.com), CC BY 4.0"*, con enlace a la licencia.
- **Sobre el proyecto:** "Proyecto creado por nuestro equipo para el NASA Space Apps Challenge 2026". El material de NASA se usa según las NASA Images and Media Usage Guidelines, sin sus insignias.
- **Términos de uso:** Quickmap es de Arizona State University, no del gobierno de EE. UU. Hay que respetar sus condiciones de uso y no presentarlo como aval de la NASA.
- **Commit:** `Tarea 11.2: panel de fuentes y créditos`

### 11.3 Deploy en Vercel · MVP · [x]
- **Hecho:** Root Directory `frontend`, Vite, sin `VITE_API_URL`; se publica desde `main` (`git push origin frontend:main`). El backend irá aparte a Render.
- Build estático de `frontend/` con las variables de entorno configuradas.
- **Commit:** `Tarea 11: backend real, fuentes y deploy`

### 12. Validación para el pitch · Extra · NASA · [ ] · Documento subido; faltan capturas manuales
- **Hecho:** `docs/VALIDACION_NASA.md`. Con la misma regla que el mapa oficial AVGVISIB del equipo LOLA (a ras de suelo), nuestra luz queda a menos de 5 puntos en los 6 sitios. Connecting Ridge con el panel a 2 m da 89.5 %, contra 88–89 % publicado. Incluye las comprobaciones de Rafael (alturas con QuickMap, marcadores de Dilan, fuentes de Joshua), respuestas para el jurado y límites. Faltan las capturas de Moon Trek, que son manuales.
- Comparar nuestro horizonte y nuestro % de luz con lo que muestran **Quickmap** (capas de iluminación o relieve del polo sur, si las tiene) y **Moon Trek** en los mismos sitios, y hacer capturas para el pitch.
- Usar **CSA Moon Exploration** para el contexto: el papel de Canadá en Artemis y por qué importa elegir bien el sitio.
- Escribir las limitaciones: no modelamos temperatura, polvo ni satélites de relevo, y el terreno de prueba no es real.

### Limitaciones del simulador (para el pitch)
- Supuestos: siempre hay una estación de la DSN disponible cuando la Tierra es visible. El panel sigue al Sol perfectamente. Las eficiencias de la batería (0.90) son fijas.
- No modelamos la temperatura real: el consumo de supervivencia es fijo.
- Tampoco modelamos la degradación de la batería, el polvo sobre el panel ni los satélites de relevo.
- Los presets son ilustrativos.


---

## Lo que Richard crea en 3D

Todo el 3D lo prepara Richard y lo exporta a **glTF binario (`.glb`)** en `frontend/public/models/`. Las texturas sueltas van en `frontend/public/textures/`. El código solo los carga. Los créditos de cada archivo están en `docs/CREDITOS.md`.

### Reglas para todos los modelos
- **Ejes:** en Blender, Z hacia arriba y el **norte hacia +Y** (el este hacia +X). Al exportar con *+Y Up*, queda como la escena espera: Y arriba, norte en -Z y este en +X.
- **Origen:** en el punto de apoyo (centro de la base o del terreno).
- **Sin luz horneada:** no hornear sombras ni luz del Sol en las texturas, porque el Sol se mueve con el slider y las sombras las calcula el código. La oclusión ambiental (AO) sí se puede hornear.
- **Sin límite de triángulos.** Para que la página cargue rápido, los modelos se cargan de forma diferida (ver 9.1).
- **Créditos:** todo archivo nuevo se anota en `docs/CREDITOS.md`, con su origen y su licencia.

### Lo que ya está

| Archivo | Qué es | Uso previsto |
|---|---|---|
| `lander.glb` | Apollo Lunar Module (NASA 3D Resources), adaptado con `SolarPanel` y `Antenna` orientables. Unos 102 000 triángulos y escala real de unos 7 m. | Paso 9.4 y SU2: el panel sigue al Sol y la antena a la Tierra. |
| `rover.glb` | Space Exploration Vehicle (NASA), 3 m de alto. | Por definir: otro tipo de misión o referencia de escala. |
| `astronaut.glb` | Astronauta (NASA), 1.85 m. | Por definir: referencia de escala junto al módulo. |
| `lro.glb` | Lunar Reconnaissance Orbiter (NASA). | Portada (C3) o panel de fuentes: la nave que midió el relieve (LOLA). |
| `gateway.glb` | Gateway Core (NASA), unos 11 MB. | Por definir: contexto de Artemis en la portada. |
| `dsn_34m.glb` | Antena de 34 m de la Deep Space Network (NASA). | Contacto con la Tierra en el simulador: el supuesto de la DSN siempre disponible. |
| `earth.glb` | Esfera con Blue Marble (NASA). | 9.3: la Tierra en el cielo. |
| `sun.glb` | Esfera con textura de Solar System Scope (CC BY 4.0). | 9.3: el Sol en el cielo. |
| `moon.glb` | Esfera con textura de Solar System Scope (CC BY 4.0), con *empties* `site-{id}`. | Portada: globo lunar con los 6 sitios. |
| `textures/stars.jpg` | Tycho Star Map (NASA), equirectangular. | Fondo del cielo en 3D. Desde el suelo iluminado, una cámara real casi no vería estrellas, así que conviene usarlo tenue. |
| `textures/earth_night.jpg` | Black Marble (NASA): luces nocturnas. | Lado oscuro de la Tierra en 9.3. |

### Lo que falta
- **M0. Terrenos de los 6 sitios** (`public/models/terrain/{id}.glb`, para el paso 9.1).
  - Se parte de `assets-src/terrain/{id}.obj` o del PNG del paso 3.4.
  - **No cambies la forma grande**, porque de ella salen las sombras que deben coincidir con los % de luz.
  - 1 unidad = 1 km, y el objeto del suelo se llama `Ground`.
- **`StatusLight`** (opcional) en `lander.glb`: una luz pequeña con material emisivo que el código pinta según el modo de la misión (SU2).
- **Luna con CGI Moon Kit** (pendiente en `docs/CREDITOS.md`): si se reemplaza la textura de Solar System Scope por la de NASA SVS, que es de dominio público, ya no hace falta el crédito CC BY de la Luna.

---

## Recursos del reto y dónde se usan

Estos son los recursos oficiales que da el reto. Todo lo demás es complementario.

| Recurso | Qué ofrece | Para qué lo usamos | Paso |
|---|---|---|---|
| **JPL Horizons** (NASA/JPL) | Posición del Sol y de la Tierra vista desde cualquier punto de la Luna | Azimut y elevación reales en cada hora, base de la luz y la comunicación | 3.2, backend |
| **Moon Trek** (NASA) | Visualización 3D, topografía (DEM LOLA) e imágenes LRO | Relieve del sitio para el horizonte y la malla 3D (backend), revisar los sitios, textura 3D | 3.3, 9.5, backend |
| **Quickmap** (ASU, datos del LRO) | Mapas de alta resolución, topografía y capas del LRO | Verificar coordenadas, enlazar cada sitio, validar resultados | 3.3, 11.2, 12 |
| **CSA Moon Exploration** | Misiones lunares y aportes de Canadá a Artemis | Contexto en la app y en el pitch | 12, pitch |

> NASA no avala entidades que no sean del gobierno de EE. UU. Para sitios que no son del gobierno (por ejemplo Quickmap, de ASU), hay que respetar sus condiciones de uso de datos.
