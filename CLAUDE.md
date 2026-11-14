# GeoAthectum · Contexto para Claude Code

## Qué es
Proyecto del equipo para el **NASA Space Apps Challenge 2026** (14 y 15 de noviembre de 2026, tema "The Next Frontier"). Reto: **Lunar Landing Site Navigator** (antes "CLPS Lunar Mission Browser").

**Nuestro proyecto:** un mapa topográfico 3D del polo sur de la Luna donde se elige un **sitio** y una **fecha**. El sistema calcula qué tan viable es la misión según:
- **horas de sol** (energía solar),
- **contacto con la Tierra** (comunicación directa),
- **pendiente del terreno**.

Con eso da un **porcentaje de viabilidad** y, si no conviene, **recomienda un sitio o una fecha mejor**. Nos enfocamos en **5 a 8 sitios conocidos** del polo sur, no en todo el polo.

**El reto premia la facilidad de uso:** las herramientas de NASA que ya existen (Quickmap, Moon Trek, Horizons) son complicadas. La app tiene que ser clara para ingenieros, estudiantes y público general.

## Reglas de trabajo (importante)
- **Richard hace todos los commits y push.** No hagas `git commit`, `git push` ni cambies ramas. Solo escribe los archivos.
- **Se trabaja por tareas, una a la vez.** Termina una tarea, verifica que compile (`npm run build` en `frontend/`) y para. Richard la revisa y la sube antes de pasar a la siguiente.
- Al terminar cada tarea, resume qué archivos cambiaron y sugiere un mensaje de commit.
- Responde en **español**.
- Entorno: **Windows** (PowerShell). Node 22 o superior.

## Reparto del equipo
- **Richard: frontend** (este repo, carpeta `frontend/`). React.
- **Backend: otro integrante** (Python, carpeta `backend/`). No es tarea de Richard; no lo construyas salvo que lo pida.
- Producto y pitch: resto del equipo.

## Stack del frontend
- React 19 + Vite + TypeScript + Tailwind CSS v4 (plugin `@tailwindcss/vite`; `@import "tailwindcss"` en `src/index.css`).
- 3D: **React Three Fiber** + drei + three (instalar en la tarea 9), solo para **cargar** los `.glb` de Richard.
- Sin librerías de gráficos: el gráfico polar y la barra de ventanas se hacen en **SVG**.
- Estética: oscura (fondo `#05070d`), Sol en ámbar y Tierra en azul.

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
- `GET /sites` devuelve `{ sites: Site[] }` y `GET /sites/{id}` devuelve `SiteData`.
- En modo prueba son archivos estáticos: `public/data/sites.json` y `public/data/sites/{id}.json`. Si `VITE_API_URL` está vacío, se usan esos archivos.
- `SiteData` = `site`, `start` (ISO UTC), `stepHours`, `horizon` (360 elevaciones, desde el N en sentido horario), `slope` (`atSiteDeg`, `max100mDeg`), `sun` y `earth` (`az[]` y `el[]` por muestra), y `terrain` opcional (`size`, `extentKm`, `heightsM`, fila 0 = norte, columna 0 = oeste).
- Azimut desde el norte, en sentido horario. Longitud este de 0 a 360. Grados y metros.
- **El backend da datos crudos y el frontend calcula** la luz, la comunicación, los porcentajes, la viabilidad y las recomendaciones.
  - Hay luz si `sun.el[i] > horizonte(sun.az[i])`.
  - Hay comunicación si `earth.el[i] > horizonte(earth.az[i])`.

## Tareas del frontend
La lista detallada, paso a paso, está en **`docs/TAREAS.md`**. Se hace **un paso a la vez**, en el orden de ese archivo, y se marca con `[x]` cuando Richard lo sube.

- **Hecho:** 1 (base), 2 (contrato), 3.1 (datos de prueba: `npm run mock`) y 3.2 (Sol y Tierra reales: `npm run horizons`, luego `npm run mock`).
- **Siguiente:** 3.4 (exportar el relieve para que Richard modele los terrenos), luego 3.3 (manual) y 4.1 (cliente de datos).
- **Diseño:** el paso C0 (sistema de diseño) va antes de la primera pantalla. La calidad visual tiene que ser de primer nivel.
- **3D: lo modela todo Richard** (`.glb` en `frontend/public/models/`, especificaciones en "Lo que Richard crea en 3D" de `docs/TAREAS.md`). **No generes geometría 3D en código**: nada de mallas procedurales, esferas ni marcadores hechos con primitivas. El código solo carga los modelos, controla la cámara, mueve la luz del Sol según los datos y anima las piezas con nombre (`SolarPanel`, `Antenna`). Si falta un modelo, se muestra un estado vacío bien diseñado.

## Recursos de NASA del reto (usarlos siempre que se pueda)
**Regla:** cuando un dato pueda salir de un recurso de NASA, se usa ese recurso y se cita en la app (panel "Fuentes"). Lo sintético es solo de respaldo y se marca con `mock: true`.
Recursos oficiales del reto (detalle y uso en `docs/TAREAS.md`):
- **JPL Horizons:** posiciones del Sol (`10`) y la Tierra (`399`) desde un punto en la Luna. API: `https://ssd.jpl.nasa.gov/api/horizons.api`.
- **Moon Trek (NASA):** visualización 3D, topografía (DEM LOLA del polo sur, unos 20 m/px) e imágenes LRO.
- **Quickmap (ASU, datos del LRO):** explorar sitios, topografía e imágenes. No es del gobierno de EE. UU.: respetar sus condiciones de uso.
- **CSA Moon Exploration:** contexto de misiones y del papel de Canadá en Artemis, para el pitch.

## Limitaciones (decirlas en el pitch)
No modelamos temperatura, polvo ni satélites de relevo. Los datos de prueba no son reales: en la tarea 11 se reemplazan por los del backend.
