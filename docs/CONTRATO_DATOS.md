# Contrato de datos: backend → frontend

Este documento explica qué JSON tiene que entregar el backend para que el frontend lo muestre. Los tipos exactos están en `frontend/src/types.ts`.

**Regla general:** el backend calcula las **posiciones** (Sol, Tierra), el **horizonte** y la **pendiente**. El frontend calcula, a partir de eso, si hay luz o comunicación, los porcentajes, la viabilidad y las recomendaciones. Así se pueden ajustar los pesos del puntaje sin tocar el backend.

## Convenciones

| Cosa | Convención |
|---|---|
| Ángulos | Grados |
| Azimut | Desde el **norte**, en sentido **horario** (0 = N, 90 = E, 180 = S, 270 = O) |
| Elevación | Respecto al horizonte matemático, sin relieve. Negativa = bajo el horizonte |
| Longitud | **Este**, de 0 a 360 |
| Fechas | UTC, ISO 8601 (`2027-01-01T00:00:00Z`) |
| Alturas | Metros |

## Endpoints

Pueden ser archivos JSON estáticos o una API. El frontend usa las mismas rutas en los dos casos.

| Ruta | Devuelve |
|---|---|
| `GET /sites` (o `sites.json`) | Lista de sitios |
| `GET /sites/{id}` (o `sites/{id}.json`) | Datos completos de un sitio |

## `GET /sites`

```json
{
  "sites": [
    {
      "id": "shackleton-rim",
      "name": "Borde del cráter Shackleton",
      "lat": -89.67,
      "lon": 197.0,
      "category": "artemis",
      "description": "Borde con iluminación casi continua."
    }
  ]
}
```

`category` puede ser `artemis`, `clps`, `apollo`, `international` o `custom`.

## `GET /sites/{id}`

```json
{
  "site": { "id": "shackleton-rim", "name": "...", "lat": -89.67, "lon": 197.0, "category": "artemis" },
  "start": "2027-01-01T00:00:00Z",
  "stepHours": 1,
  "horizon": {
    "azimuthStepDeg": 1,
    "elevationDeg": [1.2, 1.3, 1.1, "... 360 valores ..."]
  },
  "slope": { "atSiteDeg": 3.4, "max100mDeg": 7.9 },
  "sun":   { "az": [123.4, 124.0, "..."], "el": [0.8, 0.9, "..."] },
  "earth": { "az": [2.1, 2.1, "..."],     "el": [5.6, 5.5, "..."] },
  "terrain": {
    "size": 96,
    "extentKm": 20,
    "heightsM": [1520, 1518, "... size × size valores ..."]
  },
  "sources": { "ephemeris": "jpl-horizons", "terrain": "lola" }
}
```

### Campo por campo

- **`start` y `stepHours`:** la muestra `i` corresponde a `start + i × stepHours`. Los datos locales cubren todo 2027 cada 1 hora (8760 muestras). Se acepta cualquier largo; un año cubre el ciclo de estaciones de la luz polar.
- **`sun` y `earth`:** `az` y `el` deben tener **la misma cantidad de valores**, una por muestra de tiempo. Salen de **JPL Horizons** (`https://ssd.jpl.nasa.gov/api/horizons.api`) con estos parámetros, que son los mismos que usa `frontend/scripts/fetch-horizons.mjs`:

  | Parámetro | Valor |
  |---|---|
  | `COMMAND` | `'10'` (Sol) o `'399'` (Tierra) |
  | `EPHEM_TYPE` | `'OBSERVER'` |
  | `CENTER` | `'coord@301'` (un punto sobre la Luna) |
  | `COORD_TYPE` | `'GEODETIC'` |
  | `SITE_COORD` | `'lon,lat,0'` (longitud este, latitud, altura en km) |
  | `TIME_TYPE` | `'UT'` |
  | `START_TIME` / `STOP_TIME` | `'2027-01-01 00:00'` / `'2027-12-31 23:00'` (8760 muestras) |
  | `STEP_SIZE` | `'1 h'` |
  | `QUANTITIES` | `'4,20'` (azimut y elevación aparentes, sin atmósfera; distancia `delta` en UA) |
  | `ANG_FORMAT` / `CSV_FORMAT` | `'DEG'` / `'YES'` |

  La tabla viene entre `$$SOE` y `$$EOE`. Las columnas se ubican por el encabezado (`Azi_(a-app)`, `Elev_(a-app)`, `delta`), porque Horizons agrega columnas de presencia solar o lunar según el observador.
- **`horizon.elevationDeg`:** para cada azimut, el ángulo más alto que tapa el relieve visto desde el sitio. Con `azimuthStepDeg = 1` son 360 valores.
  - **DEM:** LOLA de unos **150 km de lado** centrado en el sitio. Puede ser de menor resolución (unos 240 m/px), porque las montañas que tapan el Sol en el polo pueden estar a decenas de km.
  - **Rayos:** desde el sitio, a unos 2 m sobre el suelo (la altura de un panel o una antena), recorriendo el DEM en cada azimut.
  - **Curvatura lunar:** a cada punto a distancia `d` se le resta `d² / (2R)`, con `R = 1737.4 km`. A 50 km son unos 720 m: sin esta corrección, el horizonte sale demasiado alto.
  - El recorte de 20 km (`terrain`) **no** alcanza para el horizonte: solo sirve para la vista 3D y la pendiente.
- **`slope`:** pendiente **regional**, a la resolución del DEM, en el punto (`atSiteDeg`) y la máxima en un radio de 100 m (`max100mDeg`). Sale del recorte de 20 km. No ve rocas ni cráteres más chicos que un píxel del DEM. Como referencia, los módulos de alunizaje suelen pedir menos de 8–10°.
- **`sources` (opcional):** de dónde sale cada dato. `ephemeris` es `"jpl-horizons"` o `"model"`, y `terrain` es `"lola"` o `"synthetic"`. El backend real debería mandar `{ "ephemeris": "jpl-horizons", "terrain": "lola" }`. La app lo usa en el panel de fuentes.
- **`terrain` (opcional):** recorte del DEM de **20 km** centrado en el sitio, solo para la vista 3D y la pendiente. Fila 0 es el borde **norte** y columna 0 el borde **oeste**. Unos 96×96 puntos es suficiente. Si no viene, la vista 3D muestra su estado vacío.
- **Datos locales (`npm run mock`):** usan el horizonte y la pendiente reales de LOLA de `assets-src/horizon/{id}.json` (`npm run horizon`: rayos de 150 km con curvatura sobre el DEM de 80 m, con las coordenadas verificadas; si falta, `assets-src/terrain/lola/{id}.json`) y el Sol y la Tierra de JPL Horizons. Ya no incluyen `terrain`: la vista 3D carga `public/models/terrain/{id}.glb`. Solo si falta el horizonte LOLA de un sitio se usa un terreno sintético de respaldo, marcado con `sources.terrain = "synthetic"` y `mock: true`.

### Campos opcionales (los agrega `npm run mock`; el frontend funciona sin ellos)

> **Para el backend:** `backend/build.py` hoy escribe solo `site`, `start`, `stepHours`, `horizon`, `slope`, `sun`, `earth`, `terrain` y `sources`. Si se regenera con él, estos campos se pierden y la app usa los valores medios (sin eclipses, sin crestas, sin DSN ni validación).

- **`sun.distKm` y `earth.distKm`:** distancia del sitio a cada cuerpo en km, una por muestra (`delta` de Horizons × 149 597 870.7). Dan el tamaño aparente real del disco: el Sol mide de 0.262° a 0.271° de radio y la Tierra de 0.90° a 1.02°. Con ellos el frontend calcula los **eclipses de Sol por la Tierra** (`src/lib/sky.ts`). Sin ellos usa 1 UA y 384 400 km.
- **`horizon.distanceKm` y `horizon.obstacleHeightM`:** para cada azimut, la distancia al punto del relieve que limita el horizonte y su altura sobre el suelo del sitio (ya sin la curvatura). Permiten decir qué cresta tapa el Sol y a cuántos km está.
- **`dsn`:** `{ minElevationDeg: 10, stations: [{ id, name, antenna, el[] }] }`. Elevación del centro de la Luna vista desde las antenas de 70 m de Goldstone (DSS-14), Madrid (DSS-63) y Canberra (DSS-43), una por muestra. Consulta a Horizons con `COMMAND='301'`, `CENTER='coord@399'` y `SITE_COORD` de la estación. Es la misma para todos los sitios: desde la Tierra, un sitio del polo sur está a menos de 0.3° del centro de la Luna. **Hoy el simulador no la usa** (sigue el supuesto de que siempre hay una estación); está lista para cuando se decida.
- **`reference`:** valor del mapa de iluminación oficial del equipo LOLA (`AVGVISIB_75S_120M_201608`, NASA/GSFC, Mazarico et al. 2011) en el sitio: `sunPct` y `earthPct` (alguna parte del disco a la vista, promedio 2009–2013), más `groundHorizonDeg`, el horizonte con el observador a ras de suelo, para comparar con la misma regla del mapa.

## Cómo lo usa el frontend

- **Hay luz** en la muestra `i` si `sun.el[i] > horizon(sun.az[i])`.
- **Hay comunicación** si `earth.el[i] > horizon(earth.az[i])`.
- **Viabilidad (%)** = combinación ponderada de % de luz, % de comunicación y pendiente. Los pesos se ajustan en el frontend.
- **Energía del simulador:** fracción del disco solar sobre el relieve (con su radio real si viene `sun.distKm`) menos la parte que tapa la Tierra durante un eclipse.

## Checklist para el backend

- [ ] `sun.az`, `sun.el`, `earth.az` y `earth.el` tienen el mismo largo.
- [ ] El azimut va desde el norte, en sentido horario, y la longitud es este (0–360).
- [ ] `horizon.elevationDeg` tiene `360 / azimuthStepDeg` valores.
- [ ] El horizonte se calculó con un DEM de unos 150 km y con la corrección de curvatura `d² / (2R)`.
- [ ] La consulta a Horizons usa `TIME_TYPE='UT'`.
- [ ] `terrain.heightsM` tiene `size × size` valores, si se incluye.
- [ ] Cada sitio de `/sites` tiene su `/sites/{id}`.
