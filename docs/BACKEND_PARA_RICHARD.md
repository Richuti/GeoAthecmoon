# Backend · Resumen para Richard

*Rafael · actualizado dom 15 nov 2026, 00:45 · rama `backend` (PR #1)*

## En una línea
El backend es un **pipeline en Python que corre offline**. Combina el **relieve real de LOLA** (DEM de 80 m/px) con **tus posiciones de JPL Horizons**, sirve para validar los JSON del contrato. Además hay una **API mínima en Render** (`backend/api/main.py`) que devuelve exactamente los mismos JSON de `frontend/public/data`. Sin base de datos. Si la API tarda más de 6 s, la app usa los archivos estáticos.

## ⚠️ Desde el sáb 18:11, `public/data` es de la rama `frontend`
Richard regeneró los datos con un año de efemérides, las coordenadas verificadas y campos opcionales nuevos (`dsn`, `reference`, `distKm` y el detalle del horizonte). **No hay que volver a correr `python backend/export.py`**: pisaría esos datos con una versión sin los campos nuevos. Ahora `export.py` se niega a correr salvo que se use `--force`. El pipeline de Python queda como **validación cruzada** del año completo: en 5 de los 6 sitios, sus % de luz y de contacto coinciden con los de la app con diferencias menores de 0.5 puntos. De Gerlache difiere en 1.0 punto, por un efecto del pixel vecino, por debajo de la resolución del DEM (`docs/validacion/valores.md`).

## Rutas de la API
Las rutas del contrato existen de dos formas, con **el mismo contenido byte a byte**: archivos estáticos en Vercel y la API de Render (`backend/api/main.py`, con FastAPI). La API agrega `GET /health`.

| Ruta (contrato) | Lo que sirve Vercel hoy | Devuelve |
|---|---|---|
| `GET /sites` | `/data/sites.json` | `{ sites: Site[] }`: los 6 sitios (`id`, `name`, `lat`, `lon`, `category`, `description`, `coordSource`) |
| `GET /sites/{id}` | `/data/sites/{id}.json` | `SiteData`: `site`, `start`, `stepHours`, `horizon[360]` (más `distanceKm` y `obstacleHeightM`), `slope`, `sun` y `earth` (`az[]` y `el[]`, **8760 muestras horarias: todo 2027**), `sources` y los opcionales `sun.distKm` y `earth.distKm` (con ellos la app calcula los eclipses), `dsn`, `reference` y `mock`. **Sin `terrain`:** la vista 3D carga `public/models/terrain/{id}.glb` |

- **`id` válidos:** `shackleton-rim`, `connecting-ridge`, `de-gerlache-rim`, `mons-mouton`, `malapert-massif` y `nobile-rim`.
- **Cómo se consumen:** deja `VITE_API_URL` **vacía**. Tu `src/api.ts` ya resuelve estas rutas solo, así que no hay que cambiar código ni poner `vercel.json`, CORS o rewrites.
- **Ejemplo ya desplegado:** `https://<tu-deploy>.vercel.app/data/sites.json` y `https://<tu-deploy>.vercel.app/data/sites/malapert-massif.json`.
- **De dónde salen:** los genera la rama `frontend` (`npm run horizons`, `npm run horizon` y `npm run mock`). `backend/out/` es la versión de Python para la validación cruzada y **no se exporta**.
- **No hay más rutas** (ninguna de escritura). La API lee los JSON al arrancar y los devuelve tal cual, sin calcular nada.
- **API, en detalle:** CORS solo para `https://geoathectum.vercel.app` y `http://localhost:5173` (se puede cambiar con la variable `ALLOWED_ORIGINS`), con gzip y `Cache-Control: public, max-age=3600`. Un id desconocido devuelve 404. Probado en local: los 6 sitios salen idénticos byte a byte a `public/data`.
- **✅ En línea (dom 00:40):** **`https://geoathecmoon-api.onrender.com`**, servicio `geoathecmoon-api` (plan gratis, Oregon, rama `backend`, auto-deploy en cada commit). Comprobado: `/health` responde, los 6 sitios salen idénticos byte a byte a los de Vercel, gzip, CORS solo para Vercel y localhost, y un id desconocido da 404. **Richard: pon esa URL en `VITE_API_URL` en Vercel.** Cuando el PR #1 esté en `main`, cambiamos la rama del servicio a `main`.
- **Configuración en Render** (por si hay que rehacerlo):
  - Repo `Richuti/GeoAthectum`, rama `main` (o `backend` antes del merge). Root Directory vacío.
  - Runtime Python. Build: `pip install -r backend/api/requirements.txt`. Start: `uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT`.
  - Health check: `/health`.
  - Cuando esté arriba, la URL va en `VITE_API_URL` en Vercel. Si los datos de `public/data` cambian, Render los toma en su siguiente deploy.

## Qué cambia para ti
- **El PR #1 ya no toca `frontend/`** (desde el sáb 18:40). Devolví esos archivos a su versión de `main`, así que tu rama `frontend` entra sin conflictos y su `public/data` es la que queda.
- **El contrato:** tus campos opcionales nuevos (`dsn`, `reference`, `distKm`, `distanceKm`, `obstacleHeightM`) no rompen nada. `build.py` no los genera, y por eso ya no se exporta desde el backend.

## El pipeline (`backend/`)
| Archivo | Qué hace | Comando |
|---|---|---|
| `dem.py` | Lee el DEM `LDEM_80S_80M` (7600×7600, estereográfica polar) y convierte lat/lon a píxel | — |
| `horizon.py` | Calcula el horizonte, la pendiente y el recorte del terreno de cada sitio | — |
| `build.py` | Combina el relieve LOLA con tu caché de Horizons (todo 2027) y escribe en `backend/out/` (sin `terrain`) | `python backend/build.py` |
| `export.py` | Copia `backend/out/` a `frontend/public/data/`. **Ya no se usa:** exige `--force` | — |
| `validate.py` | Tabla de valores del año, validación cruzada con la app y panoramas del horizonte en `docs/validacion/` | `python backend/validate.py` |
| `api/main.py` | API en vivo: `/health`, `/sites` y `/sites/{id}`, con los mismos JSON de `public/data` | `uvicorn backend.api.main:app --port 8000` |
| `sim_demo.py` | Réplica del simulador S1/S2/S3 en Python, para elegir el caso de la demo y comparar con el tuyo | `python backend/sim_demo.py [detalle SITIO PRESET FECHA]` |
| `sites_verified.json` | Coordenadas finales de los 6 sitios, con su fuente | — |

El DEM pesa 231 MB y está en `backend/data/`. **No se sube a git.**

## Método (para defenderlo ante el jurado)
- **Horizonte:** 360 rayos, uno por grado, desde el norte en sentido horario. Cada rayo recorre el relieve hasta **150 km** y resta la curvatura lunar `d²/(2R)` con R = 1737.4 km. El observador está a 2 m del suelo, a la altura de un panel o una antena.
- **Pendiente:** es regional. `atSiteDeg` es un promedio de unos 160 m, por el DEM de 80 m. `max100mDeg` es la máxima en 100 m.
- **Terreno 3D:** lo modela Richard a partir del relieve LOLA (`npm run export-terrain`) y se carga como `.glb`. Ya no viaja en el JSON.
- **Sitios:** Connecting Ridge, de Gerlache, Mons Mouton y Malapert se movieron a la **cresta más alta cercana** según LOLA. Shackleton y Nobile conservan la coordenada original.
- **Luz y comunicación:** las calcula el frontend con la regla del contrato: hay luz si `sun.el > horizonte(sun.az)`, y lo mismo con la Tierra.

## Sitios finales
| Sitio | Lat, lon E | Altura | Pendiente | Luz | Tierra visible | Horizonte máx. |
|---|---|---|---|---|---|---|
| Shackleton (borde) | -89.67, 197 | 1,663 m | 5.6° | 64.0 % | 19.4 % | 7.1° (az 176°) |
| Connecting Ridge | -89.44, 222.6 | 1,954 m | 0.6° | 89.5 % | 51.1 % | -0.6° (az 175°) |
| de Gerlache (borde) | -88.67, 291.6 | 1,808 m | 2.1° | 79.5 % | 53.1 % | 0.1° (az 6°) |
| Mons Mouton | -84.81, 29.2 | 5,356 m | 2.8° | 45.8 % | 81.7 % | 4.0° (az 116°) |
| Macizo Malapert | -85.99, 2.1 | 5,163 m | 1.4° | 70.5 % | 75.2 % | -0.1° (az 90°) |
| Nobile (borde) | -85.4, 37 | 6,014 m | 8.8° | 24.7 % | 16.3 % | 15.6° (az 355°) |

Luz y Tierra: valores de la app para **todo 2027**, cada hora (8760 muestras). Connecting Ridge da 89.5 % y Mazarico (2011) publica 89 % en el mismo punto (`docs/VALIDACION.md`). Detalle en `docs/validacion/valores.md`.

## Validación hecha
- **QuickMap, marcadores:** Dilan confirmó los 6 sitios con un marcador sobre la cresta (`docs/validacion/quickmap_marcadores_dilan.pdf`).
- **QuickMap, alturas:** nuestro DEM de 80 m coincide con el de 5 m de QuickMap con diferencias de **4 a 77 m** en 4 puntos. La de 77 m está en una ladera empinada.
- **Panoramas del horizonte** con las trayectorias del Sol y la Tierra: `docs/validacion/{id}_horizonte.png`. Sirven para la diapositiva de validación.
- **Tu simulador S2 coincide con el de Python.** Corrí `simulate()` de tu rama `frontend` con los datos reales y salió esto:

  | Caso | Tu S2 (app, un año) | Python |
  |---|---|---|
  | Malapert, 15 ene | sobrevive, 85 % de datos enviados, tolera 4 días y 6 horas | sobrevive, 85 %, tolera 4.5 días |
  | Malapert, 20 ene | falla el 2 feb a las 10:00 | falla el 2 feb a las 10:00 |
  | Connecting Ridge, 20 ene | sobrevive, 28 % de datos enviados | igual |

  La diferencia de 6 horas en la tolerancia viene de cómo cada uno recorre los inicios (la app busca más fino). La física es la misma.

## El caso de la demo (`docs/CASO_DEMO.md`)
Sitio **Macizo Malapert**, preset **Explorador ligero**, misión de 14 días. Números comprobados con tus funciones sobre los datos publicados.
1. **15 ene 2027, 00:00 UTC:** sobrevive con viabilidad del 95 % y *"tolera atrasos de hasta 4 días y 6 horas"*.
2. **«¿Y si la misión se atrasa?»** +3 días: todavía funciona. **+1 semana:** *"No. Con 7 días de atraso, la batería se agota"* (la luz baja del 100 % al 73 %).
3. **Respaldo:** "Simular el imprevisto" (+4 días y 12 horas), con 3 salidas simuladas, o la fecha a mano el 20 ene (falla el 2 feb a las 10:00, 40 %).

## Lo que necesito de ti, en orden
1. **Bug pequeño de coherencia:** en «¿Y si la misión se atrasa?», la viabilidad del plan atrasado no aplica el tope del 40 % cuando la misión falla. Con +1 semana dice 70, y al aplicar la fecha el resultado dice 40. Es `planOutcome()` en `src/sim/delay.ts`: pasarle `{ missionSurvives: s.survived }` a `siteViability()`.
2. **"La siguiente opción"** puede proponer una fecha anterior a la del alunizaje (el 8 ene) aunque la misión ya se atrasó.
3. **Feature freeze dom 07:00:** a partir de ahí, solo bugs. La portada ya está muy bien; mejor no tocarla más.
4. **API en vivo:** `VITE_API_URL=https://geoathecmoon-api.onrender.com` en Vercel (sin `/` al final). Devuelve exactamente los mismos JSON de `public/data`. Si duerme, tarda unos 50 s en despertar y tu respaldo de 6 s usa los archivos estáticos.

## Limitaciones (decirlas en el pitch)
No modelamos la temperatura, el polvo, los satélites de relevo ni la degradación de la batería. La pendiente es regional (unos 160 m) y los presets son ilustrativos. Suponemos que siempre hay una antena de la DSN disponible cuando la Tierra es visible.

## Documentos de referencia
- `docs/CASO_DEMO.md`: el guion del momento wow, con los números.
- `docs/VALIDACION.md`: la comparación con QuickMap.
- `docs/PITCH.md`: el guion de 3 minutos.
- `docs/PLAN_HACKATON.md`: los hitos, los responsables y el deploy.
- `docs/GUIAS_EQUIPO.docx`: las guías para Joshua, Dilan y Odelmy.
