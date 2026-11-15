# Validación con NASA · resumen para el pitch (tarea 12)

*14 nov 2026. Datos de `frontend/public/data` (todo 2027, hora por hora). Las cifras salen de `compareWithReference` y `visibility` (`frontend/src/lib/`); la app las muestra en el panel «Fuentes» de cada sitio.*

## La frase para el jurado
> «Comparamos nuestro cálculo con el mapa oficial de iluminación del equipo LOLA de NASA. En los 6 sitios, nuestro porcentaje de luz queda a menos de 5 puntos del de NASA. Y en Connecting Ridge, con el panel a 2 m, calculamos 89.5 %; los artículos publicados dan 88 y 89 % para ese mismo punto.»

## 1. Contra el mapa oficial de NASA (misma regla, a ras de suelo)
**Fuente:** mapas `AVGVISIB_75S_120M_201608` y `_EARTH` del equipo LOLA (NASA/GSFC; Mazarico et al. 2011, *Icarus* 211, 1066–1081). Dan el % del tiempo en que se ve **alguna parte** del disco del Sol o de la Tierra, con el observador **a ras de suelo**, promediado entre 2009 y 2013.

**Nuestro cálculo con la misma regla:** horizonte LOLA (rayos de 150 km con curvatura) y posiciones de JPL Horizons para 2027, observador a 0 m y cualquier parte del disco a la vista.

| Sitio | Luz · nuestra | Luz · NASA | Diferencia | Tierra · nuestra | Tierra · NASA | Diferencia |
|---|---|---|---|---|---|---|
| Connecting Ridge | 72.3 % | 72.6 % | −0.3 | 54.6 % | 53.1 % | +1.5 |
| Macizo Malapert | 62.6 % | 61.3 % | +1.3 | 75.3 % | 72.0 % | +3.3 |
| Mons Mouton | 44.5 % | 46.9 % | −2.4 | 95.4 % | 94.3 % | +1.1 |
| Borde de de Gerlache | 71.5 % | 74.3 % | −2.8 | 50.8 % | 55.0 % | −4.2 |
| Borde de Nobile | 25.0 % | 28.3 % | −3.3 | 17.9 % | 12.9 % | +5.0 |
| Borde de Shackleton | 66.9 % | 62.2 % | +4.7 | 23.8 % | 18.9 % | +4.9 |

- **Luz:** los 6 sitios a menos de 5 puntos. Dos de ellos, Connecting Ridge y Malapert, quedan a menos de 1.5.
- **Tierra visible:** los 6 a 5 puntos o menos.
- **No se espera igualdad.** NASA promedia 2009–2013 y nosotros calculamos 2027. Además, su mapa tiene 120 m por píxel y nuestro DEM 80 m, y los bordes angostos, como Shackleton y Nobile, son los más sensibles a esa diferencia.

## 2. Contra artículos publicados (con el panel a 2 m)
Así calcula la app la energía: el Sol cuenta como visible cuando su centro está sobre el horizonte, visto desde 2 m.

| Sitio | Nuestra luz (2027, 2 m) | Publicado | Lectura |
|---|---|---|---|
| Connecting Ridge | **89.5 %** | 89.0 % (Mazarico, punto CR1) · 88.0 % (Gläser 2018, 2 m) | ✅ Mismo punto, coincide |
| Mons Mouton | 45.8 % | 48 % ± 10 (promedio de la región) | ✅ Coincide |
| Borde de Nobile | 24.7 % | 38 % ± 21 (región) | ✅ Dentro del rango |
| Macizo Malapert | 70.5 % | 31 % ± 25 (región, incluye laderas empinadas) | 🟡 Más alto: nuestro punto es la cumbre, lo mejor iluminado de una región muy variable |
| Borde de Shackleton | 64.0 % | 85.5 % (Gläser 2018, mejor píxel, DEM de 20 m) | 🟡 Más bajo: el 85.5 % es el máximo de un DEM de 20 m; nuestro DEM de 80 m suaviza un borde muy angosto y el horizonte nos queda más alto |
| Borde de de Gerlache | 79.5 % | Sin dato publicado para el punto | — |

Fuentes reunidas por Joshua en `docs/validacion/informe_iluminacion_joshua.pdf` (rama `backend`): Mazarico 2011, Gläser 2014 y 2018, Speyerer y Robinson 2013, y un estudio regional de Artemis III (2025).

## 3. Otras comprobaciones (del backend, Rafael)
- **Altura:** en 4 puntos, nuestro DEM de 80 m coincide con el de 5 m de QuickMap con diferencias de entre 4 y 77 m. La de 77 m está en una ladera empinada (`docs/VALIDACION.md` de la rama `backend`).
- **Coordenadas:** los 6 sitios se confirmaron en LRO QuickMap con un marcador sobre la cresta (Dilan, `docs/validacion/quickmap_marcadores_dilan.pdf`).
- **Dos cálculos independientes, el mismo resultado:** el horizonte en Python (`backend/horizon.py`) y en Node (`frontend/scripts/compute-horizon.mjs`) dan la misma luz, a menos de 0.5 puntos, en los primeros 60 días.
- **Simulador:** el motor de la app y la réplica en Python de Rafael dan el mismo resultado en el caso de la demo (Malapert sobrevive desde el 15 de enero y falla si se atrasa al 20).

## Si el jurado pregunta
- **«¿Por qué no da exactamente lo mismo que NASA?»** Porque NASA promedia cuatro años (2009–2013) y nosotros calculamos el año exacto de la misión. La luz polar cambia con las estaciones: por eso la app trabaja por fecha. Con la misma regla, la diferencia queda por debajo de 5 puntos en los 6 sitios.
- **«¿Por qué Shackleton sale distinto en los artículos?»** El 85.5 % publicado es el mejor píxel de un mapa de 20 m. El borde de Shackleton mide pocos cientos de metros, y nuestro DEM de 80 m lo suaviza. Es una limitación conocida que decimos en el pitch.
- **«¿La pendiente es exacta?»** Es regional: no ve rocas más chicas que un píxel de 80 m. Sirve para descartar terrenos malos, no para elegir dónde poner cada pata.

## Límites (decirlos)
No modelamos temperatura, polvo, degradación de la batería ni satélites de relevo. La pendiente es regional y los módulos del simulador son configuraciones de referencia.
