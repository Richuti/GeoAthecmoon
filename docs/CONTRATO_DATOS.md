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

- **`start` y `stepHours`:** la muestra `i` corresponde a `start + i × stepHours`. Se sugiere 1 hora durante 60 días (1440 muestras).
- **`sun` y `earth`:** `az` y `el` deben tener **la misma cantidad de valores**, una por muestra de tiempo. Salen de **JPL Horizons** (`https://ssd.jpl.nasa.gov/api/horizons.api`) con estos parámetros, que son los mismos que usa `frontend/scripts/fetch-horizons.mjs`:

  | Parámetro | Valor |
  |---|---|
  | `COMMAND` | `'10'` (Sol) o `'399'` (Tierra) |
  | `EPHEM_TYPE` | `'OBSERVER'` |
  | `CENTER` | `'coord@301'` (un punto sobre la Luna) |
  | `COORD_TYPE` | `'GEODETIC'` |
  | `SITE_COORD` | `'lon,lat,0'` (longitud este, latitud, altura en km) |
  | `TIME_TYPE` | `'UT'` |
  | `START_TIME` / `STOP_TIME` | `'2027-01-01 00:00'` / `'2027-03-01 23:00'` (1440 muestras) |
  | `STEP_SIZE` | `'1 h'` |
  | `QUANTITIES` | `'4'` (azimut y elevación aparentes, sin atmósfera) |
  | `ANG_FORMAT` / `CSV_FORMAT` | `'DEG'` / `'YES'` |

  La tabla viene entre `$$SOE` y `$$EOE`. Las columnas 4 y 5 son el azimut (desde el norte, en sentido horario) y la elevación.
- **`horizon.elevationDeg`:** para cada azimut, el ángulo más alto que tapa el relieve visto desde el sitio. Con `azimuthStepDeg = 1` son 360 valores.
  - **DEM:** LOLA de unos **150 km de lado** centrado en el sitio. Puede ser de menor resolución (unos 240 m/px), porque las montañas que tapan el Sol en el polo pueden estar a decenas de km.
  - **Rayos:** desde el sitio, a unos 2 m sobre el suelo (la altura de un panel o una antena), recorriendo el DEM en cada azimut.
  - **Curvatura lunar:** a cada punto a distancia `d` se le resta `d² / (2R)`, con `R = 1737.4 km`. A 50 km son unos 720 m: sin esta corrección, el horizonte sale demasiado alto.
  - El recorte de 20 km (`terrain`) **no** alcanza para el horizonte: solo sirve para la vista 3D y la pendiente.
- **`slope`:** pendiente **regional**, a la resolución del DEM, en el punto (`atSiteDeg`) y la máxima en un radio de 100 m (`max100mDeg`). Sale del recorte de 20 km. No ve rocas ni cráteres más chicos que un píxel del DEM. Como referencia, los módulos de alunizaje suelen pedir menos de 8–10°.
- **`sources` (opcional):** de dónde sale cada dato. `ephemeris` es `"jpl-horizons"` o `"model"`, y `terrain` es `"lola"` o `"synthetic"`. El backend real debería mandar `{ "ephemeris": "jpl-horizons", "terrain": "lola" }`. La app lo usa en el panel de fuentes.
- **`terrain` (opcional):** recorte del DEM de **20 km** centrado en el sitio, solo para la vista 3D y la pendiente. Fila 0 es el borde **norte** y columna 0 el borde **oeste**. Unos 96×96 puntos es suficiente. Si no viene, la vista 3D muestra su estado vacío.
- **Datos de prueba:** `npm run mock` calcula el horizonte con el mismo recorte sintético de 20 km y sin curvatura. Es una simplificación solo de los datos de prueba; el backend real sigue las reglas de arriba.

## Cómo lo usa el frontend

- **Hay luz** en la muestra `i` si `sun.el[i] > horizon(sun.az[i])`.
- **Hay comunicación** si `earth.el[i] > horizon(earth.az[i])`.
- **Viabilidad (%)** = combinación ponderada de % de luz, % de comunicación y pendiente. Los pesos se ajustan en el frontend.

## Checklist para el backend

- [ ] `sun.az`, `sun.el`, `earth.az` y `earth.el` tienen el mismo largo.
- [ ] El azimut va desde el norte, en sentido horario, y la longitud es este (0–360).
- [ ] `horizon.elevationDeg` tiene `360 / azimuthStepDeg` valores.
- [ ] El horizonte se calculó con un DEM de unos 150 km y con la corrección de curvatura `d² / (2R)`.
- [ ] La consulta a Horizons usa `TIME_TYPE='UT'`.
- [ ] `terrain.heightsM` tiene `size × size` valores, si se incluye.
- [ ] Cada sitio de `/sites` tiene su `/sites/{id}`.
