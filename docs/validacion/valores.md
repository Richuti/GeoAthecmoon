# Valores por sitio · todo 2027

Periodo: desde el 2027-01-01, cada hora, 8760 muestras (un año completo: cubre las estaciones de la luz polar). Efemérides de JPL Horizons; horizonte con el DEM LOLA de 80 m/px (rayos de 150 km con curvatura). Generado con `python backend/build.py && python backend/validate.py`.

## Nuestros valores

| Sitio | Lat, lon E | Altura (m) | Pendiente (°) | Luz | Tierra visible | Horizonte máx. |
|---|---|---|---|---|---|---|
| Borde del cráter Shackleton | -89.67, 197 | 1,670 | 5.61 | 64.4 % | 19.5 % | 7.1° (az 176°) |
| Connecting Ridge | -89.44, 222.6 | 1,957 | 0.56 | 89.3 % | 51.1 % | -0.6° (az 175°) |
| Borde del cráter de Gerlache | -88.67, 291.6 | 1,812 | 2.12 | 80.5 % | 53.7 % | 0.1° (az 6°) |
| Mons Mouton | -84.81, 29.2 | 5,354 | 2.8 | 45.7 % | 81.7 % | 4.0° (az 116°) |
| Macizo Malapert | -85.99, 2.1 | 5,172 | 1.38 | 70.4 % | 75.0 % | -0.1° (az 90°) |
| Borde del cráter Nobile | -85.4, 37 | 6,036 | 8.82 | 24.7 % | 16.4 % | 15.6° (az 355°) |

## Validación cruzada con la app

Mismo Sol y misma Tierra (JPL Horizons). Solo cambia quién calculó el horizonte: el pipeline de Python (`backend/horizon.py`) o el de la app (`npm run horizon`). Meta: diferencia menor de 0.5 puntos.

| Sitio | Luz (Python) | Luz (app) | Dif. | Tierra (Python) | Tierra (app) | Dif. | |
|---|---|---|---|---|---|---|---|
| Borde del cráter Shackleton | 64.4 % | 64.0 % | +0.4 | 19.5 % | 19.4 % | +0.1 | ✅ |
| Connecting Ridge | 89.3 % | 89.5 % | -0.2 | 51.1 % | 51.1 % | +0.0 | ✅ |
| Borde del cráter de Gerlache | 80.5 % | 79.5 % | +1.0 | 53.7 % | 53.1 % | +0.6 | ⚠ |
| Mons Mouton | 45.7 % | 45.8 % | -0.1 | 81.7 % | 81.7 % | +0.0 | ✅ |
| Macizo Malapert | 70.4 % | 70.5 % | -0.1 | 75.0 % | 75.2 % | -0.3 | ✅ |
| Borde del cráter Nobile | 24.7 % | 24.7 % | -0.0 | 16.4 % | 16.3 % | +0.1 | ✅ |

**Diferencia máxima: 1.00 puntos.**

**Por qué de Gerlache pasa de 0.5 (1.0 punto de luz):** la diferencia sale de una sola franja del horizonte, al NNE (azimut 12–22°). Ahí el horizonte de la app lo marca un obstáculo a **120 m** del sitio y de **2 m** de alto, es decir, el pixel vecino del DEM de 80 m. El de Python empieza el rayo a 80 m y lee la altura del sitio con otra interpolación, y en esa franja da hasta 0.45° menos. Es un efecto por debajo de la resolución del DEM: el Sol pasa casi rasante por ahí (elevación de −0.3° a −0.2°), y en 88 de las 8760 horas uno de los dos cálculos lo da por visible y el otro no. En el resto del horizonte, la diferencia típica (RMS) es de 0.08°. Por eso no lo corregimos: los dos métodos son defendibles y la diferencia es menor que lo que el DEM puede resolver.
