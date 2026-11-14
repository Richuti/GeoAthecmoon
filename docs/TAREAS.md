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

**Orden recomendado (camino corto a una demo):** 3 → 4 → 5 → 6 → 8 → 7 → 9 → 11. El 10 y los extras van al final.

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
- **Commit:** `Tarea 3.2: posiciones reales de Sol y Tierra con JPL Horizons`

### 3.3 Verificar los sitios con Quickmap y NASA · MVP · NASA (manual, con el equipo)
- Revisar en **Quickmap (quickmap.lroc.asu.edu)** las coordenadas de los 6 sitios y corregirlas en el script.
- Ver cada sitio también en **Moon Trek (trek.nasa.gov/moon)**: relieve 3D y cómo el terreno vecino tapa el horizonte. Anotar si los resultados del script tienen sentido (por ejemplo, si un sitio rodeado de montañas debería tener menos luz).
- Ajustar los nombres, categorías y descripciones (regiones de Artemis III, IM-2 de CLPS) según lo que muestran Quickmap y Moon Trek.
- **Commit:** `Tarea 3.3: coordenadas de sitios verificadas con Quickmap`

### 3.4 Exportar el relieve para Blender · MVP
- **Archivos:** `scripts/export-terrain.mjs` y `assets-src/terrain/{id}.obj` + `{id}.png` + `{id}.json`.
- **Qué hace:** saca el relieve de cada sitio (el mismo `terrain.heightsM` con que se calculan la luz y el horizonte) en dos formatos:
  - **OBJ**, para importarlo directo en Blender.
  - **PNG de 16 bits**, como mapa de alturas para el modificador *Displace*.
  - El JSON lleva la altura mínima y máxima en metros y el tamaño en km, para poner la escala exacta.
- **Por qué:** Richard modela los terrenos encima de esta forma. Así las sombras del modelo coinciden con los % de luz que calcula la app.
- **Commit:** `Tarea 3.4: exportar relieve de cada sitio para Blender`

---

## Fase B · Carga de datos y cálculos

### 4.1 Cliente de datos · MVP
- **Archivo:** `src/api.ts` con `getSites()` y `getSiteData(id)`.
- Si `VITE_API_URL` tiene valor, usa `${VITE_API_URL}/sites`; si está vacío, usa `/data/sites.json`.
- Guarda en memoria los sitios ya pedidos y lanza errores con un mensaje claro.
- **Commit:** `Tarea 4.1: cliente de datos (API o archivos de prueba)`

### 4.2 Estado de la app · MVP
- **Archivos:** `src/state/` (o un hook `useSiteData`), con el sitio elegido, los datos cargados, el índice de tiempo actual y los estados de carga y error.
- **Commit:** `Tarea 4.2: estado de sitio y tiempo`

### 4.3 Selector de sitios · MVP
- **Archivo:** `src/components/SiteSelector.tsx`.
- Lista agrupada por categoría (Artemis, CLPS…), con el nombre y las coordenadas legibles (`89.67° S, 197.0° E`).
- Muestra cuál sitio está elegido, y estados de "cargando" y de error.
- **Commit:** `Tarea 4.3: selector de sitios por categoría`

### 5.1 Horizonte interpolado · MVP
- **Archivo:** `src/lib/horizon.ts` con `horizonAt(mask, az)`. Interpola entre los grados vecinos y da la vuelta de 359° a 0°.

### 5.2 Visibilidad · MVP
- **Archivo:** `src/lib/visibility.ts`.
- `isLit(data, i)` y `hasContact(data, i)`.
- `percent(data, from, to)` para el Sol y para la Tierra.
- `windows()`, que devuelve rangos continuos `{ start, end }`.
- `nextChange(i)`, el tiempo hasta que el Sol o la Tierra se ocultan o vuelven a salir.

### 5.3 Tiempo · MVP
- **Archivo:** `src/lib/time.ts`. Convierte de índice a fecha y de fecha a índice, y formatea en español: fechas en UTC y duraciones como "3 d 4 h".

### 5.4 Viabilidad · MVP
- **Archivo:** `src/lib/viability.ts`.
- Combina el % de luz, el % de comunicación y la puntuación de pendiente con pesos ajustables (por defecto 0.45 / 0.35 / 0.20).
- **Pendiente:** 100 hasta 5°, baja hasta 0 a los 10°, que es el límite típico de un módulo de alunizaje.
- Devuelve el % y la explicación en lenguaje simple, por ejemplo: "Buena luz (82 %), pero la Tierra solo se ve el 40 % del tiempo".

### 5.5 Recomendación · MVP
- **Archivo:** `src/lib/recommend.ts`.
- **Mejor fecha de inicio** dentro del periodo, para una misión de N días (por defecto 14).
- **Mejor sitio alternativo:** el de mayor viabilidad entre los otros sitios.
- **Commit de la tarea 5 (puede ir en uno o dos):** `Tarea 5: cálculos de luz, comunicación, viabilidad y recomendación`

### 5.6 Pruebas de los cálculos · Extra
- Vitest con unos 10 casos: el cruce de 359° a 0°, ventanas al borde del periodo y pesos en cero.

---

## Fase C · Interfaz

> El reto premia la **facilidad de uso**. Cada pantalla tiene que entenderla alguien que nunca usó Quickmap.

### C0. Dirección visual y sistema de diseño · MVP (va antes de 4.3)
- **Archivos:** `src/index.css` (tokens en `@theme`: colores, tipografía, espacios, radios, sombras y animación), `src/components/ui/` (Panel, Button, Stat, Badge, Tooltip y Slider) y `docs/DISENO.md`.
- **Dirección:** "consola de misión": fondo `#05070d`, el Sol en ámbar y la Tierra en azul, como colores de dato que no se usan para decorar. Tipografía técnica pero legible, con números tabulares y jerarquía clara.
- **Criterios:** buen contraste (WCAG AA), foco visible con teclado, funciona desde 360 px de ancho y respeta `prefers-reduced-motion`.
- **Listo cuando:** `App.tsx` muestra el layout final con los componentes base y datos de prueba, sin lógica todavía.
- **Commit:** `Tarea C0: sistema de diseño y layout final`

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

### 9. Vista 3D con los modelos de Richard

> **Regla:** el código **no genera geometría**. Todo lo que se ve en 3D (terrenos, módulo, Sol, Tierra, cielo y marcadores) lo modela Richard y llega como `.glb`. El código solo carga los modelos, pone la cámara, mueve la luz del Sol según los datos y anima las piezas con nombre.

### 9.1 Visor 3D · MVP
- Instalar `three`, `@react-three/fiber` y `@react-three/drei`.
- **Archivo:** `src/components/Viewer3D.tsx`. Un Canvas que carga `public/models/terrain/{id}.glb` según el sitio elegido, con OrbitControls limitados (sin meterse bajo el suelo) y carga progresiva.
- Mientras no exista el modelo, muestra un estado vacío bien diseñado ("Modelo 3D en preparación") en lugar de una figura generada.

### 9.2 Luz del Sol desde los datos · MVP
- Una luz direccional en la dirección `(sin az·cos el, sin el, -cos az·cos el)`, con el norte en -Z y el este en +X. Cambia con el slider de tiempo.
- Las sombras salen en tiempo real del propio modelo.
- **Comprobar:** el sitio queda en sombra en 3D exactamente cuando `isLit` es falso.

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

## Fase D · Cierre

### 11.1 Conectar con el backend real · MVP
- Configurar `VITE_API_URL`, revisar el checklist de `docs/CONTRATO_DATOS.md` con los datos reales y mostrar un aviso cuando se usan datos de prueba.

### 11.2 Fuentes de datos · MVP · NASA
- Panel "Fuentes" que acredita a JPL Horizons, Moon Trek, Quickmap (datos del LRO) y CSA Moon Exploration.
- Cada sitio tiene enlaces "Ver en Quickmap" y "Ver en Moon Trek".
- **Términos de uso:** Quickmap es de Arizona State University, no del gobierno de EE. UU. Hay que respetar sus condiciones de uso y no presentarlo como aval de la NASA.

### 11.3 Deploy en Vercel · MVP
- Build estático de `frontend/` con las variables de entorno configuradas.
- **Commit:** `Tarea 11: backend real, fuentes y deploy`

### 12. Validación para el pitch · Extra · NASA
- Comparar nuestro horizonte y nuestro % de luz con lo que muestran **Quickmap** (capas de iluminación o relieve del polo sur, si las tiene) y **Moon Trek** en los mismos sitios, y hacer capturas para el pitch.
- Usar **CSA Moon Exploration** para el contexto: el papel de Canadá en Artemis y por qué importa elegir bien el sitio.
- Escribir las limitaciones: no modelamos temperatura, polvo ni satélites de relevo, y el terreno de prueba no es real.

---

## Lo que Richard crea en 3D

Todo el 3D lo modela Richard (en Blender o la herramienta que prefieras) y lo exporta a **glTF binario (`.glb`)** en `frontend/public/models/`. El código solo los carga.

### Reglas para todos los modelos
- **Ejes:** en Blender, Z hacia arriba y el **norte hacia +Y** (el este hacia +X). Al exportar con *+Y Up*, queda como la escena espera: Y arriba, norte en -Z y este en +X.
- **Origen:** en el punto de apoyo (centro de la base o del terreno).
- **Materiales:** PBR (Principled BSDF). Las texturas en potencias de 2 (1024 o 2048) y en JPG, salvo las que tienen transparencia.
- **Sin luz horneada:** no hornear sombras ni luz del Sol en las texturas, porque el Sol se mueve con el slider y las sombras las calcula el código. La oclusión ambiental (AO) sí se puede hornear.
- **Antes de exportar:** aplicar transformaciones (Ctrl+A → All Transforms) y borrar cámaras y luces de la escena.
- **Exportar:** File → Export → glTF 2.0 → *glTF Binary (.glb)*, con *+Y Up*, *Apply Modifiers* y compresión *Draco* si pasa de 5 MB.

### M0. Terrenos de los 6 sitios · MVP (para el paso 9.1)
- **Archivos:** `public/models/terrain/{id}.glb`, uno por sitio: `shackleton-rim`, `connecting-ridge`, `de-gerlache-rim`, `mons-mouton`, `malapert-massif` y `nobile-rim`.
- **Base obligatoria:** empezar desde `assets-src/terrain/{id}.obj` o desde el PNG del paso 3.4. **No cambies la forma grande** (montañas, cráteres, crestas), porque de ella salen el horizonte y los % de luz. Sí puedes sumar detalle fino: rocas, regolito, cráteres chicos de menos de 200 m, materiales y color.
- **Escala:** 1 unidad = 1 km, tanto en lo ancho como en las alturas. El terreno mide 20 × 20 unidades, con el sitio en el centro exacto (0, 0). El OBJ del paso 3.4 ya viene así.
- **Límites:** menos de 200 000 triángulos y menos de 8 MB por terreno.
- **Nombres:** el objeto del suelo se llama `Ground`, porque recibe las sombras.

### M1. Módulo de alunizaje · MVP (para el paso 9.4)
- **Archivo:** `public/models/lander.glb`.
- **Diseño:** un módulo **genérico y propio**, que no copie ninguno real. Cuerpo, 3 o 4 patas, un panel solar y una antena parabólica. La silueta se tiene que reconocer de lejos.
- **Escala:** en metros (1 unidad = 1 m), unos 4 m de alto. El código lo agranda como símbolo en la escena de 1 unidad = 1 km.
- **Partes con nombre exacto** (objetos separados, para que el código los mueva):
  - `SolarPanel`: con el pivote en la bisagra. Se gira en Y (azimut) y en X (inclinación).
  - `Antenna`: con el pivote en la base del plato.
  - `Body`: todo lo demás.
- **Límites:** menos de 15 000 triángulos, menos de 1 MB y máximo 3 materiales.

### M2. Sol · MVP (para el paso 9.3)
- **Archivo:** `public/models/sun.glb`. Una esfera de 1 unidad de radio con material emisivo ámbar (`#ffb547` o parecido), sin textura obligatoria. El código le pone el brillo.

### M3. Tierra · MVP (para el paso 9.3) · NASA
- **Archivo:** `public/models/earth.glb`. Una esfera de 1 unidad de radio con textura **Blue Marble** de NASA Visible Earth (visibleearth.nasa.gov), en 2048×1024.

### M4. Globo lunar para la portada · Extra · NASA
- **Archivo:** `public/models/moon.glb`. Una esfera con el color y el relieve del **CGI Moon Kit** de NASA SVS (svs.gsfc.nasa.gov), en 2048 px.
- Va el polo sur hacia la cámara y un *empty* por sitio llamado `site-{id}` (por ejemplo `site-shackleton-rim`) en su posición, para que el código ponga ahí los marcadores interactivos.

### Orden sugerido
M0 (primero un solo terreno, por ejemplo Shackleton, para probar el flujo), luego M1, M2 y M3, y al final M4.

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
