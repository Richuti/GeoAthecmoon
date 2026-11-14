# GeoAthectum · Lunar Landing Site Navigator

Proyecto para el **NASA Space Apps Challenge 2026** (reto *Lunar Landing Site Navigator*).

Un mapa topográfico 3D del polo sur de la Luna donde eliges un **sitio** y una **fecha**. El sistema calcula qué tan viable es la misión según las **horas de sol**, el **contacto con la Tierra** y la **pendiente del terreno**, da un **porcentaje de viabilidad** y recomienda un sitio o una fecha mejor cuando no conviene.

## Estructura

```
GeoAthectum/
├── frontend/   React + Vite + TypeScript + Tailwind (+ React Three Fiber para el 3D)
└── backend/    Python: JPL Horizons + DEM LOLA → JSON (lo hace otro integrante)
```

## Correr el frontend

Requisitos: Node 22 o superior.

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

## Datos y recursos de NASA

- **JPL Horizons:** posición del Sol y de la Tierra vista desde cada sitio.
- **Moon Trek / LOLA:** modelo de elevación (DEM) del polo sur, para el horizonte y la pendiente.
- **Quickmap (ASU):** exploración de sitios e imágenes LRO.
