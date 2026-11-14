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

### 3.2 Sol y Tierra reales desde JPL Horizons · MVP · NASA
- **Archivos:** `scripts/fetch-horizons.mjs` y `public/data/horizons/{id}.json` (caché).
- **Qué hace:** pide a la **API de JPL Horizons** (`https://ssd.jpl.nasa.gov/api/horizons.api`) el azimut y la elevación del Sol (`COMMAND='10'`) y de la Tierra (`'399'`) vistos desde cada sitio. Parámetros: `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `SITE_COORD='lon,lat,0'`, `QUANTITIES='4'`, `ANG_FORMAT='DEG'`, `CSV_FORMAT='YES'`, cada 1 h y 60 días desde 2027-01-01.
- **Uso:** `generate-mock-data.mjs` usa la caché de Horizons si existe, y si no, el modelo simplificado. Así, aunque el terreno siga siendo sintético, **las posiciones del Sol y de la Tierra son reales**.
- **Por qué en Node:** el navegador podría bloquear la API por CORS. El script se corre una vez y el resultado queda guardado en el repo.
- **Coordinar con backend:** usar exactamente los mismos parámetros que el integrante de Python.
- **Listo cuando:** en Shackleton, la elevación del Sol se mantiene en ±2°. En Malapert, la Tierra casi siempre está sobre el horizonte. Los dos JSON tienen 1440 valores.
- **Commit:** `Tarea 3.2: posiciones reales de Sol y Tierra con JPL Horizons`

### 3.3 Verificar los sitios con Quickmap y NASA · MVP · NASA (manual, con el equipo)
- Revisar en **Quickmap (quickmap.lroc.asu.edu)** las coordenadas de los 6 sitios y corregirlas en el script.
- Ver cada sitio también en **Moon Trek (trek.nasa.gov/moon)**: relieve 3D y cómo el terreno vecino tapa el horizonte. Anotar si los resultados del script tienen sentido (por ejemplo, si un sitio rodeado de montañas debería tener menos luz).
- Ajustar los nombres, categorías y descripciones (regiones de Artemis III, IM-2 de CLPS) según lo que muestran Quickmap y Moon Trek.
- **Commit:** `Tarea 3.3: coordenadas de sitios verificadas con Quickmap`

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

### 9.1 Escena 3D base · MVP
- Instalar `three`, `@react-three/fiber` y `@react-three/drei`.
- **Archivo:** `src/components/Terrain3D.tsx`, con un Canvas, un plano y OrbitControls.

### 9.2 Malla del terreno · MVP
- Geometría desde `terrain.heightsM`, donde 1 unidad = 1 km. La fila 0 es el norte (-Z) y la columna 0 el oeste (-X).
- Colores por altura y un control de exageración vertical. Si no llega `terrain`, se dibuja un plano.

### 9.3 Luz del Sol y sombras · MVP
- Luz direccional en la dirección `(sin az·cos el, sin el, -cos az·cos el)`, con sombras.
- **Comprobar:** el sitio está en sombra en 3D exactamente cuando `isLit` es falso.

### 9.4 Marcadores · MVP
- Un pin en el sitio y marcadores del Sol y de la Tierra en el cielo.
- Si ya está `public/models/lander.glb` (ver "Lo que Richard crea en 3D"), se pone el módulo en el sitio. Su panel gira hacia el Sol y su antena hacia la Tierra.
- **Commit:** `Tarea 9: vista 3D del terreno con luz solar`

### 9.5 Imagen real de la NASA sobre el terreno · Extra · NASA
- Textura de un mosaico LRO (WAC o el relieve sombreado de LOLA) desde **Moon Trek (trek.nasa.gov/moon)**, si su servicio de mosaicos se puede usar desde el navegador. Si no, se exporta una imagen del recorte desde Moon Trek y se guarda en `public/`.

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

Se hacen en Blender (o la herramienta que prefieras) y se exportan a **glTF binario (`.glb`)** en `frontend/public/models/`. La escena 3D ya funciona sin estos modelos; cuando los subes, se cargan solos.

### M1. Módulo de alunizaje · MVP (para el paso 9.4)
- **Archivo:** `public/models/lander.glb`.
- **Diseño:** un módulo **genérico y propio**, que no copie ninguno real. Cuerpo, 3 o 4 patas, un panel solar y una antena parabólica. La silueta se tiene que reconocer de lejos, porque en la escena se ve chico.
- **Escala:** 1 unidad de Blender = 1 metro. Unos 4 m de alto. En la escena (1 unidad = 1 km) se agranda como un símbolo.
- **Ejes:** Y hacia arriba y el frente mirando a -Z (el norte). El origen va en el centro de la base, a la altura del suelo.
- **Partes con nombre exacto** (objetos separados, para que el código los mueva):
  - `SolarPanel`: con el pivote en la bisagra. El código lo gira en el eje Y (azimut) y en X (inclinación) hacia el Sol.
  - `Antenna`: con el pivote en la base del plato. El código la gira hacia la Tierra.
  - `Body`: todo lo demás.
- **Materiales:** PBR (Principled BSDF), máximo 3 materiales. Colores neutros (blanco, gris y dorado del aislante térmico), sin texturas grandes.
- **Límites:** menos de 15 000 triángulos y menos de 1 MB. Aplica las transformaciones antes de exportar (Ctrl+A → All Transforms).
- **Exportar:** File → Export → glTF 2.0, formato *glTF Binary*, con *+Y Up* activado.

### M2. Globo lunar para la portada · Extra · NASA
- **Archivo:** `public/textures/moon_color.jpg` (2048×1024) y `moon_height.jpg`.
- **Fuente:** el **CGI Moon Kit** de NASA SVS (buscar "CGI Moon Kit" en svs.gsfc.nasa.gov). Es un mapa de color del LRO (LROC) y de alturas (LOLA). Reducirlo a 2048 px y exportarlo en JPG de calidad 85.
- **Uso:** una esfera que gira en la portada, con el polo sur resaltado y los 6 sitios marcados, que da paso a la vista del sitio.

### M3. Tierra en el cielo · Extra · NASA
- **Archivo:** `public/textures/earth.jpg` (1024×512).
- **Fuente:** **Blue Marble** de NASA Visible Earth (visibleearth.nasa.gov).
- **Uso:** la textura del marcador de la Tierra en la vista 3D.

> El terreno, el Sol, el cielo y las sombras los genera el código. No hace falta modelarlos.

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
