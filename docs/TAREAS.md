# Tareas del frontend · GeoAthectum

Lista detallada de la parte de Richard (carpeta `frontend/`). El backend (Python) lo hace otro integrante.

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

**Ampliación futura:** IA1 (planificador de misión con IA integrada), después de estabilizar SU1–SU3 y S3. Pendiente; no forma parte de la entrega actual.

El **C0** (sistema de diseño) ya está en curso y se cierra antes del 4.

---

## Hecho

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

### D1. Datos completos: un año, coordenadas verificadas, eclipses, crestas, DSN y validación con NASA · [ ] · Implementado, pendiente de revisión de Richard
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
- **Aviso para el backend:** `backend/build.py` no escribe los campos nuevos (`distKm`, `distanceKm`, `dsn`, `reference`); si se regenera con él, se pierden.
- **Commit sugerido:** `Tarea D1: un año de datos con coordenadas verificadas, eclipses, crestas, DSN y validación con NASA`

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
  - **Pendiente:** 100 hasta 5°, baja hasta 0 a los 10°.
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

### S3. Búsqueda de fechas y sitios que funcionan · MVP
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

### 6.1 Slider de fecha y hora · MVP
- **Archivo:** `src/components/Timeline.tsx`. Slider sobre las 1440 muestras, con la fecha en UTC bien visible.

### 6.2 Play, pausa y velocidad · MVP
- Botón de play y pausa, con velocidades de 1 h/s, 6 h/s y 1 d/s.

### 6.3 Barra de ventanas en SVG · MVP
- Dos franjas: luz en ámbar y comunicación en azul, con un cursor en el instante actual. Al hacer clic se salta a esa fecha.
- **Commit:** `Tarea 6: línea de tiempo con ventanas de luz y comunicación`

### 7.1 Gráfico polar: base · MVP
- **Archivo:** `src/components/SkyPlot.tsx`. Círculos de elevación y puntos cardinales, con el norte arriba.
- La escala radial está ampliada cerca de 0°, porque las elevaciones van de -5° a 15°.

### 7.2 Máscara del horizonte · MVP
- El relieve aparece como una zona rellena desde el borde.

### 7.3 Trayectorias y posición actual · MVP
- Trayectorias del Sol (ámbar) y de la Tierra (azul) en el periodo, con el punto actual de cada uno. El punto se ve hueco cuando está tapado por el relieve.
- **Commit:** `Tarea 7: gráfico polar del cielo`

### 8.1 Tarjetas de métricas · MVP
- **Archivo:** `src/components/Metrics.tsx`.
- Elevación del Sol y de la Tierra, y estado (luz/sombra, con/sin contacto).
- % del periodo, cuenta regresiva hasta el próximo cambio y pendiente.

### 8.2 Viabilidad y recomendación · MVP
- Viabilidad en % en grande, con su explicación y la recomendación ("Mejor empezar el 18 ene" o "Prueba Connecting Ridge: 91 %").
- Sliders para ajustar los pesos.
- **Commit:** `Tarea 8: panel de métricas y viabilidad`

### 8.3 Ayuda en lenguaje simple · MVP
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

### 10. Comparador · Extra (MVP si hay tiempo)
- Dos sitios lado a lado, con las mismas fechas, las mismas métricas y la viabilidad de cada uno.
- **Commit:** `Tarea 10: comparador de sitios`

---

## Fase C2 · Interfaz del simulador

### SU1. Panel "Configurar misión" · MVP
- **Implementado; pendiente de revisión y subida de Richard:** `src/components/sim/MissionSetup.tsx` y `SimulatorWorkspace.tsx`. Formulario principal reducido a sitio, fecha UTC y duración; módulo y parámetros técnicos desplegables. Navegación entre viaje Tierra–Luna y sitio de alunizaje. Terreno amplio y lectura de viabilidad a su lado. La fecha de alunizaje es independiente del cursor de reproducción.
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
- **Implementado; pendiente de revisión y subida de Richard:** `src/components/sim/MissionTrace.tsx`, línea de tiempo y estado global. La reproducción se limita a la misión y se detiene al terminar o fallar; al repetir comienza en el alunizaje. Incluye batería, modo, datos enviados y pendientes, eventos navegables y estado del módulo en el visor. Gráfica accesible con flechas, Inicio y Fin.
- Usa la misma línea de tiempo (tarea 6) en "modo misión", desde el alunizaje hasta el final.
- En el panel de métricas: batería en % (verde, ámbar o rojo), modo actual, y datos en cola y enviados.
- **Gráfico SVG de la batería** a lo largo de la misión, con las franjas de luz y comunicación debajo.
- **Registro de eventos** que aparecen a medida que avanza. Al hacer clic se salta a ese momento.
- **En 3D:** el panel sigue al Sol y la antena a la Tierra, como en la tarea 9.4. El módulo muestra su estado con una etiqueta HTML sobre el modelo, o encendiendo la pieza opcional `StatusLight` del `lander.glb`. Sin geometría generada por código.
- **Commit:** `Tarea SU2: reproducción de la misión`

### SU3. Resultado de la misión · MVP
- **Implementado; pendiente de revisión y subida de Richard:** `src/components/sim/MissionResult.tsx` y búsquedas adelantadas de S3 (`src/sim/search.ts`). La viabilidad muestra luz y contacto en porcentaje y horas, más pendiente regional. Compara los seis sitios para la misma fecha y módulo. La mejor fecha prioriza la viabilidad entre las que sobreviven; a igual puntaje elige margen y luego fecha más temprana. La batería comprueba el plan sin sustituir los tres criterios del reto. La viabilidad usa el alunizaje fijo y queda en 40 % como máximo si la misión falla. Mantiene tolerancia a atrasos, eventos y controles por teclado.
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

### SU5. Animación de descenso · Extra
- Al empezar la simulación, el módulo baja hasta el sitio en unos 3 segundos, antes de que empiece el tiempo de la misión. Respeta `prefers-reduced-motion`.

### SU6. Viaje Tierra–Luna y accesibilidad · [ ] · Implementado, pendiente de revisión de Richard
- `src/sim/transfer.ts`, `tests/transfer.test.ts`, `src/components/sim/EarthMoonJourney.tsx` y `TransferViewer.tsx`.
- Ascenso ilustrativo con un GLB Saturn V de NASA y transferencia orbital educativa calculada desde una órbita terrestre de 200 km. Muestra duración, distancia y velocidad; la Luna se mueve hacia el encuentro previsto.
- Reproducción sin autoplay, pausa, avance manual y controles por teclado. Movimiento reducido detiene la reproducción y usa una cámara general fija. «Evaluar este alunizaje» conecta con el motor de superficie.
- Supuestos y límites explícitos: dos cuerpos, Luna circular y fase orientada para un encuentro ideal. No calcula ascenso físico, ventanas reales de lanzamiento, captura, descenso ni consumo del cohete. Detalle y fuentes en `docs/TRANSFERENCIA.md`; modelo registrado en `docs/CREDITOS.md`.
- Simplificación: tres campos principales; ajustes del módulo y gráfica detallada de batería, datos y eventos desplegables. Las cifras y unidades de los sliders se anuncian a lectores de pantalla.
- **Probado:** conservación de energía y momento angular, condiciones de salida y encuentro; recorrido completo en navegador con escritorio, móvil, teclado y movimiento reducido. La simulación y comparación de sitios siguen funcionando.
- **Commit sugerido:** `Tarea SU6: viaje Tierra-Luna calculado y simplificación accesible del simulador`.

### IA1. Diseñar y aplicar un plan de misión con IA · Futura · [ ]
- **Objetivo:** integrar la IA en el trabajo del simulador para proponer planes que se puedan comprobar y aplicar. No se plantea como un chat de preguntas generales.
- **Ejemplo:** el usuario indica «Quiero una misión de 14 días, priorizando comunicación y usando este módulo». La IA interpreta el objetivo; el motor compara sitios y fechas y presenta las mejores opciones con sus resultados reales.
- **Regla:** la IA no inventa horas de Sol, ventanas de comunicación, pendientes, viabilidad ni resultados de batería. Usa los datos y funciones del proyecto. Los parámetros de los módulos siguen marcados como ilustrativos.
- **Dependencias:** SU1–SU3 y S3 estables; integrar el endpoint de IA con el integrante del backend. Richard todavía no tiene configurada una clave de la API de OpenAI.

#### IA1.1 Conexión segura con OpenAI · [ ]
- Endpoint propio en el servidor y clave `OPENAI_API_KEY` en su entorno. Nunca incluir la clave en React, variables `VITE_`, archivos públicos ni el repositorio.
- Definir límites de uso y tratar errores, esperas y falta de configuración. El simulador debe seguir funcionando si la IA no está disponible.

#### IA1.2 Traducir objetivos a criterios verificables · [ ]
- Recoger duración, prioridades y restricciones: luz solar, comunicación, pendiente, módulo y fechas o sitios permitidos.
- La IA devuelve una propuesta estructurada y validada contra los sitios, periodos y parámetros disponibles. Si falta información esencial, pedir únicamente ese dato; si el objetivo no es viable, explicarlo.

#### IA1.3 Evaluar y ordenar los planes con el motor · [ ]
- Ejecutar las búsquedas y simulaciones del proyecto para los criterios solicitados. Comparar opciones con el mismo objetivo y mostrar qué restricciones cumple cada una.
- Devolver sitio, fecha, duración y configuración, junto con viabilidad, horas de luz y contacto, pendiente, batería mínima, datos enviados y tolerancia a atrasos.
- Comprobar con pruebas objetivos imposibles, restricciones incompatibles y que todos los números correspondan a simulaciones reales.

#### IA1.4 Aplicar el plan al simulador · [ ]
- Acción **«Diseñar mi misión»**, integrada en la pantalla y con pocos controles. Presentar una propuesta principal y alternativas cuando existan, con razones breves basadas en los resultados.
- Botón **«Aplicar este plan»**: actualiza sitio, fecha, duración y módulo; vuelve a simular y permite reproducir la batería y los eventos. El usuario revisa el plan antes de aplicarlo.
- **Listo cuando:** un objetivo produce un plan comprobado que se puede aplicar y reproducir; los valores mostrados coinciden con los del motor; se entiende en móvil y con teclado; los fallos de la API no bloquean el planificador.
- **Commit sugerido al completar la integración:** `Tarea IA1: planificador de misión con IA y aplicación de planes verificados`.

---

## Fase C3 · Portada narrativa con scroll

> Medios generados por Richard con los prompts de `docs/MEDIOS_VISUALES.md`. Son **ilustraciones**: cada una lleva la leyenda "Ilustración generada con IA", y ningún dato sale de ellas.

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
  - "Ilustración generada con IA" en cada escena.
- **Probado:** 21 pruebas en el navegador real (scroll, texto, contador, índice, botones, movimiento reducido y móvil sin desborde), más las 25 del planificador.
- **Archivo:** `src/components/Story.tsx`. Cuatro o cinco escenas con V1–V5. El scroll mueve el `currentTime` del video. Se pausa con `prefers-reduced-motion` y entonces muestra el póster.
- Cada escena tiene una frase corta con un dato real de la app. Por ejemplo: *"En Shackleton el Sol nunca sube más de 1.3°"* (calculado de los datos de Horizons, no escrito a mano).
- Termina con el botón **"Abrir el planificador"**.
- Si falta un video, usa su póster o `i2-borde-crater.jpg`.
- **Commit:** `Tarea C3.1: portada narrativa con scroll`
- **Ajuste de secuencia pendiente de revisión y subida de Richard:** `src/lib/storyTiming.ts` y `tests/storyTiming.test.ts`. Apariciones por tiempo de video y fundidos dentro de un solo escenario; póster como respaldo y relato estático completo con movimiento reducido. Verificado en Edge con escritorio y móvil.

### C3.2 Imagen para compartir · Extra
- `public/og.jpg` (1200×630): el fondo I1 con el título en la tipografía de la app, compuesto en HTML y capturado.
- Más las etiquetas Open Graph en `index.html`.

---

## Fase D · Cierre

### 11.1 Conectar con el backend real · MVP
- Configurar `VITE_API_URL`, revisar el checklist de `docs/CONTRATO_DATOS.md` con los datos reales y mostrar un aviso cuando se usan datos de prueba.

### 11.2 Fuentes de datos y créditos · MVP · NASA
- Panel "Fuentes" que acredita a JPL Horizons, Moon Trek, Quickmap (datos del LRO) y CSA Moon Exploration.
- Cada sitio tiene enlaces "Ver en Quickmap" y "Ver en Moon Trek".
- **Créditos de modelos y texturas,** tomados de `docs/CREDITOS.md` (la fuente única: si cambia, se actualiza el panel):
  - **NASA 3D Resources** (dominio público): `lander.glb` (Apollo Lunar Module, adaptado con panel solar y antena), `rover.glb` (Space Exploration Vehicle), `astronaut.glb`, `lro.glb`, `gateway.glb`, `dsn_34m.glb` y `stars.jpg` (Tycho Star Map).
  - **NASA Visible Earth / Goddard** (dominio público): Blue Marble Next Generation, en `earth.glb`.
  - **NASA Earth Observatory** (dominio público): Black Marble, en `earth_night.jpg`.
  - **Solar System Scope, CC BY 4.0: dar crédito es obligatorio.** Son las texturas de la Luna (`moon.glb`, basada en datos de NASA LRO) y del Sol (`sun.glb`). Texto: *"Texturas de la Luna y el Sol: Solar System Scope (solarsystemscope.com), CC BY 4.0"*, con enlace a la licencia.
- **Aviso:** "NASA no avala este proyecto". El material de NASA se usa según las NASA Images and Media Usage Guidelines, sin insignias que den a entender un aval.
- **Términos de uso:** Quickmap es de Arizona State University, no del gobierno de EE. UU. Hay que respetar sus condiciones de uso y no presentarlo como aval de la NASA.
- **Commit:** `Tarea 11.2: panel de fuentes y créditos`

### 11.3 Deploy en Vercel · MVP
- Build estático de `frontend/` con las variables de entorno configuradas.
- **Commit:** `Tarea 11: backend real, fuentes y deploy`

### 12. Validación para el pitch · Extra · NASA
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
