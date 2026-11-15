# GeoAthectum · Contexto para Claude Code

## Qué es
Proyecto del equipo para el **NASA Space Apps Challenge 2026** (14 y 15 de noviembre de 2026, tema "The Next Frontier"). Reto: **Lunar Landing Site Navigator** (antes "CLPS Lunar Mission Browser").

**Nuestro proyecto:** un **planificador y simulador de misión** sobre un mapa topográfico 3D del polo sur de la Luna. Se elige un **sitio** y una **fecha**, y el sistema calcula qué tan viable es la misión según:
- **horas de sol** (energía solar),
- **contacto con la Tierra** (comunicación directa),
- **pendiente del terreno**.

Con eso da un **porcentaje de viabilidad** y, si no conviene, **recomienda un sitio o una fecha mejor**. Nos enfocamos en **5 a 8 sitios conocidos** del polo sur, no en todo el polo.

**Simulador de misión:** el usuario elige sitio, fecha y duración, y configura el módulo (batería, panel, consumo y datos). Después **simula la misión hora por hora** con los datos reales de luz y comunicación. Al final ve si la misión sobrevive, cuántos datos envió y qué fecha o sitio funcionaría mejor.
- La pregunta central del reto es: *"Si la misión se atrasa, ¿todavía funciona?"*. Se mueve la fecha, se vuelve a simular y se ve.
- **Regla: el simulador no inventa números.** Todo sale de `isLit`, `hasContact` y la elevación del Sol (tarea 5), más los parámetros que elige el usuario. Los valores de los presets son ilustrativos, y así lo dice la interfaz.
- **Física:**
  - Potencia del panel = `1361 W/m² × área × eficiencia (0.30 por defecto) × fracción del disco solar visible`.
  - Batería con eficiencia de carga y de descarga de 0.90, y profundidad de descarga máxima de 0.80: nunca baja del 20 %, y llegar a ese mínimo es la falla.
  - Supuesto escrito en la interfaz: siempre hay una estación de la DSN disponible cuando la Tierra es visible.
- **Tolerancia a atrasos:** `delayTolerance` dice cuántos días se puede atrasar el alunizaje y la misión sigue sobreviviendo. El resultado lo muestra como "Tolera atrasos de hasta X días".
- Detalle en las fases B2 y C2 de `docs/TAREAS.md`.

**El reto premia la facilidad de uso:** las herramientas de NASA que ya existen (Quickmap, Moon Trek, Horizons) son complicadas. La app tiene que ser clara para ingenieros, estudiantes y público general.

## Reglas de trabajo (importante)
- **Richard hace todos los commits y push.** No hagas `git commit`, `git push` ni cambies ramas. Solo escribe los archivos.
- **Se trabaja por tareas, una a la vez.** Termina una tarea, verifica que compile (`npm run build` en `frontend/`) y para. Richard la revisa y la sube antes de pasar a la siguiente.
- Al terminar cada tarea, resume qué archivos cambiaron y sugiere un mensaje de commit.
- Responde en **español**.
- Entorno: **Windows** (PowerShell). Node 22 o superior.

## Pruebas
- `npm test` corre `tests/**/*.test.ts` con el ejecutor de Node (`node --test`), sin dependencias. `npm run build` también revisa sus tipos (`tsconfig.test.json`).
- Cada función de `src/lib/` y `src/sim/` lleva sus pruebas.
- **Ojo:** dentro de `src/lib/` y `src/sim/`, los imports de *valores* entre módulos deben llevar la extensión `.ts` (`import { horizonAt } from './horizon.ts'`), porque Node los ejecuta sin compilar. Los `import type` no la necesitan.
- Para probar en el navegador: Edge headless manejado por CDP desde Node (con el `WebSocket` nativo y sin dependencias). Edge headless no baja de unos 500 px de ancho; para ver el móvil hay que usar `Emulation.setDeviceMetricsOverride`.

## Reparto del equipo
- **Richard: frontend** (este repo, carpeta `frontend/`). React.
- **Backend: otro integrante** (Python, carpeta `backend/`). No es tarea de Richard; no lo construyas salvo que lo pida.
- Producto y pitch: resto del equipo.

## Stack del frontend
- React 19 + Vite + TypeScript + Tailwind CSS v4 (plugin `@tailwindcss/vite`; `@import "tailwindcss"` en `src/index.css`).
- 3D: **React Three Fiber** + drei + three (instalar en la tarea 9), solo para **cargar** los `.glb` de Richard.
- Sin librerías de gráficos: el gráfico polar y la barra de ventanas se hacen en **SVG**.
- Estética **"hardware de vuelo"** (ver `docs/DISENO.md`). Fondo `#05070d`; el ámbar es solo el Sol y el azul solo la Tierra.
  - Big Shoulders Stencil solo en rótulos grandes. B612 (de cabina) para la interfaz y los números.
  - Paneles como marcos finos con el nombre en el borde.
  - Fuentes locales en `public/fonts`.
- **Nada de diseño con cara de IA:** sin tarjetas redondeadas genéricas, etiquetas en mono espaciada, píldoras con punto ni gradientes. Antes de entregar una pantalla, capturas en escritorio y móvil.
- **Imágenes y videos:** los genera Richard con los prompts de `docs/MEDIOS_VISUALES.md`. Son ilustraciones; ningún dato sale de ellas. **Decisión de Richard (14 nov): la app no menciona la IA en ningún lugar**, ni en leyendas ni en el panel de fuentes. Si hace falta aclarar, se dice «Ilustración · los datos no salen de la imagen».

## Estructura
```
GeoAthectum/
├── CLAUDE.md
├── README.md
├── docs/CONTRATO_DATOS.md   ← formato JSON backend → frontend
├── frontend/
│   ├── src/types.ts         ← tipos del contrato
│   ├── src/App.tsx          ← layout base con bloques "placeholder"
│   └── public/data/         ← (tarea 3) datos de prueba
└── backend/                 ← (otro integrante)
```

## Contrato de datos (resumen; detalle en `docs/CONTRATO_DATOS.md`)
- **Horizonte:** se calcula con un DEM LOLA de unos 150 km (alrededor de 240 m/px), restando la curvatura lunar `d²/(2R)` con R = 1737.4 km. El recorte de 20 km es solo para `terrain` y `slope`, y la pendiente es "regional" (a la resolución del DEM).
- **En la vista 3D los datos mandan:** si `isLit` es falso, la luz del Sol se apaga o se atenúa aunque el modelo no proyecte sombra, porque el horizonte puede venir de montañas fuera del recorte.
- `GET /sites` devuelve `{ sites: Site[] }` y `GET /sites/{id}` devuelve `SiteData`.
- En modo prueba son archivos estáticos: `public/data/sites.json` y `public/data/sites/{id}.json`. Si `VITE_API_URL` está vacío, se usan esos archivos.
- `SiteData` = `site`, `start` (ISO UTC), `stepHours`, `horizon` (360 elevaciones, desde el N en sentido horario), `slope` (`atSiteDeg`, `max100mDeg`), `sun` y `earth` (`az[]` y `el[]` por muestra), y `terrain` opcional (`size`, `extentKm`, `heightsM`, fila 0 = norte, columna 0 = oeste).
- Azimut desde el norte, en sentido horario. Longitud este de 0 a 360. Grados y metros.
- **El backend da datos crudos y el frontend calcula** la luz, la comunicación, los porcentajes, la viabilidad y las recomendaciones.
  - Hay luz si `sun.el[i] > horizonte(sun.az[i])`.
  - Hay comunicación si `earth.el[i] > horizonte(earth.az[i])`.

## Tareas del frontend
La lista detallada, paso a paso, está en **`docs/TAREAS.md`**. Se hace **un paso a la vez**, en el orden de ese archivo, y se marca con `[x]` cuando Richard lo sube.

- **Hecho:** 1 (base), 2 (contrato), 3.1 (datos de prueba: `npm run mock`), 3.2 (Sol y Tierra reales: `npm run horizons`, luego `npm run mock`) y 3.4 (relieve para Blender: `npm run export-terrain`).
- **Hecho también:** C0 (sistema de diseño y layout final; `src/design/preview.ts` es temporal).
- **Hecho:** 4.1 (cliente de datos `src/api.ts`, con caché y validación del contrato) y 4.2 (estado global en `src/state`, hook `useAppState()`).
- **Hecho:** 4.3 (`SiteSelector`, con teclado, versión móvil plegable y enlace directo `?sitio=`).
- **Hecho:** tarea 5 completa: 5.1 (`horizon.ts`), 5.2 (`visibility.ts`), 5.3 (`time.ts`, todo en UTC), 5.4 (`viability.ts`) y 5.5 (`recommend.ts`).
  - La viabilidad es de **la misión** (`missionDays` en el estado, 14 por defecto) desde la fecha de la línea de tiempo, no del periodo completo.
- **Hecho:** S1 (`src/sim/lander.ts`). `src/design/preview.ts` ya no existe.
- **Hecho:** S2 (`src/sim/simulate.ts`, motor puro con eventos y resumen).
- **Hecho:** C3.1 (portada con scroll: `src/components/Story.tsx`, medios en `public/media/`). La app abre en la portada; `#planificador` o `?sitio=` abren el planificador.
- **Datos reales:** `npm run mock` usa Horizons (Sol y Tierra) + LOLA (horizonte y pendiente de `assets-src/terrain/lola/{id}.json`). Los JSON ya no traen `terrain` y tienen `mock: false`. Terrenos 3D LOLA en `public/models/terrain/{id}.glb` (1 unidad = 1 km, objeto `Ground`, el sitio en (0, 0, 0)).
- **Hecho:** 9 (visor 3D: `Viewer3D.tsx`, que se carga aparte, y `ViewerPanel.tsx`). Usa `three` 0.187, `@react-three/fiber` 9.8 y `@react-three/drei` 10.7.
- **Implementado, pendiente de revisión y subida de Richard:** SU1–SU3 (interfaz del simulador) y búsquedas adelantadas de S3. Configuración compacta con fecha propia, reproducción limitada a la misión, batería y datos por hora, eventos, resultados y tolerancia a atrasos. Detalle en `docs/TAREAS.md`. No iniciar otra tarea hasta que Richard revise esta entrega.
- **Ramas:** se trabaja en la rama `frontend` (Richard la creó desde `main`).
- **Medios:** ya están todos en el escritorio de Richard (fuera del repo). Su revisión está en `docs/MEDIOS_VISUALES.md`. Se procesan en la tarea C3.
- **Orden:** 3 → 4 → 5 → S1 → S2 → 6 → 8 → SU1 → SU2 → SU3 → 7 → 9 → S3 → 11. El C0 se cierra antes del 4. El 3.3 es manual y lo hace el equipo.
- **Pendiente pequeño:** agregar `TIME_TYPE='UT'` a `fetch-horizons.mjs` y volver a descargar.
- **Diseño:** el paso C0 (sistema de diseño) va antes de la primera pantalla. La calidad visual tiene que ser de primer nivel.
- **3D: lo prepara todo Richard** (`.glb` en `frontend/public/models/` y texturas en `frontend/public/textures/`, lista en "Lo que Richard crea en 3D" de `docs/TAREAS.md`). Ya están `lander` (Apolo adaptado, con `SolarPanel` y `Antenna`), `rover`, `astronaut`, `lro`, `gateway`, `dsn_34m`, `earth`, `moon` (con *empties* `site-{id}`), `sun`, `stars.jpg` y `earth_night.jpg`. Sin límite de triángulos: se cargan de forma diferida. **Créditos en `docs/CREDITOS.md`; Solar System Scope (Luna y Sol) es CC BY 4.0 y su crédito es obligatorio en el panel "Fuentes" (11.2).** **No generes geometría 3D en código**: nada de mallas procedurales, esferas ni marcadores hechos con primitivas. El código solo carga los modelos, controla la cámara, mueve la luz del Sol según los datos y anima las piezas con nombre (`SolarPanel`, `Antenna`). Si falta un modelo, se muestra un estado vacío bien diseñado.

## Recursos de NASA del reto (usarlos siempre que se pueda)
**Regla:** cuando un dato pueda salir de un recurso de NASA, se usa ese recurso y se cita en la app (panel "Fuentes"). Lo sintético es solo de respaldo y se marca con `mock: true`.
Recursos oficiales del reto (detalle y uso en `docs/TAREAS.md`):
- **JPL Horizons:** posiciones del Sol (`10`) y la Tierra (`399`) desde un punto en la Luna. API: `https://ssd.jpl.nasa.gov/api/horizons.api`.
- **Moon Trek (NASA):** visualización 3D, topografía (DEM LOLA del polo sur, unos 20 m/px) e imágenes LRO.
- **Quickmap (ASU, datos del LRO):** explorar sitios, topografía e imágenes. No es del gobierno de EE. UU.: respetar sus condiciones de uso.
- **CSA Moon Exploration:** contexto de misiones y del papel de Canadá en Artemis, para el pitch.

## Limitaciones (decirlas en el pitch)
No modelamos temperatura, polvo ni satélites de relevo. Los datos de prueba no son reales: en la tarea 11 se reemplazan por los del backend.

**Del simulador:** no modelamos la temperatura real (el consumo de supervivencia es fijo), la degradación de la batería, el polvo sobre el panel ni los satélites de relevo. Los presets son ilustrativos.
