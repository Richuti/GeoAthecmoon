# Backend · Resumen para Richard

*Rafael · sáb 14 nov 2026, 14:30 · rama `backend` (PR #1)*

## En una línea
El backend es un **pipeline en Python que corre offline**. Combina el **relieve real de LOLA** (DEM de 80 m/px) con **tus posiciones de JPL Horizons**, genera los JSON del contrato y los copia a `frontend/public/data/`. No hay servidor, API ni base de datos: la app sigue leyendo archivos estáticos.

## Qué cambia para ti
- **Los datos de prueba se reemplazaron por los reales** con `python backend/export.py`. Cada `SiteData` trae ahora `sources: { ephemeris: 'jpl-horizons', terrain: 'lola' }`. No toqué `public/data/horizons/` (tu caché).
- **El contrato no cambia.** `docs/CONTRATO_DATOS.md` y `frontend/src/types.ts` siguen igual.
- **Archivos de `frontend/` que toca el PR #1** (no hay más):
  - `public/data/sites.json` y los 6 `public/data/sites/{id}.json`.
  - `tests/horizon.test.ts`: los % de luz esperados ahora son los reales. Python calcula los mismos números, así que esta prueba sirve de **validación cruzada TS ↔ Python**.

    | Sitio | Antes (mock) | Ahora (real) |
    |---|---|---|
    | Connecting Ridge | 82.5 | 97.5 |
    | Shackleton | 73.3 | 68.9 |
    | de Gerlache | 69.9 | 94.3 |
    | Malapert | 56.1 | 78 |
    | Mons Mouton | 46.8 | 46.9 |
    | Nobile | 38.3 | 24.8 |
- **El PR #1 no choca con tu rama `frontend`.** Lo probé con `git merge-tree` y no hay conflictos.

## El pipeline (`backend/`)
| Archivo | Qué hace | Comando |
|---|---|---|
| `dem.py` | Lee el DEM `LDEM_80S_80M` (7600×7600, estereográfica polar) y convierte lat/lon a píxel | — |
| `horizon.py` | Calcula el horizonte, la pendiente y el recorte del terreno de cada sitio | — |
| `build.py` | Combina el relieve LOLA con tu caché de Horizons y escribe en `backend/out/` | `python backend/build.py` |
| `export.py` | Copia `backend/out/` a `frontend/public/data/` | `python backend/export.py` |
| `validate.py` | Genera la tabla de valores y los panoramas del horizonte en `docs/validacion/` | `python backend/validate.py` |
| `sim_demo.py` | Réplica del simulador S1/S2/S3 en Python, para elegir el caso de la demo y comparar con el tuyo | `python backend/sim_demo.py [detalle SITIO PRESET FECHA]` |
| `sites_verified.json` | Coordenadas finales de los 6 sitios, con su fuente | — |

El DEM pesa 231 MB y está en `backend/data/`. **No se sube a git.**

## Método (para defenderlo ante el jurado)
- **Horizonte:** 360 rayos, uno por grado, desde el norte en sentido horario. Cada rayo recorre el relieve hasta **150 km** y resta la curvatura lunar `d²/(2R)` con R = 1737.4 km. El observador está a 2 m del suelo, a la altura de un panel o una antena.
- **Pendiente:** es regional. `atSiteDeg` es un promedio de unos 160 m, por el DEM de 80 m. `max100mDeg` es la máxima en 100 m.
- **Terreno:** recorte de **96×96** que cubre 20 km. Fila 0 = norte, columna 0 = oeste, alturas en metros.
- **Sitios:** Connecting Ridge, de Gerlache, Mons Mouton y Malapert se movieron a la **cresta más alta cercana** según LOLA. Shackleton y Nobile conservan la coordenada original.
- **Luz y comunicación:** las calcula el frontend con la regla del contrato: hay luz si `sun.el > horizonte(sun.az)`, y lo mismo con la Tierra.

## Sitios finales
| Sitio | Lat, lon E | Altura | Pendiente | Luz | Tierra visible | Horizonte máx. |
|---|---|---|---|---|---|---|
| Shackleton (borde) | -89.67, 197 | 1,670 m | 5.6° | 69 % | 19 % | 7.1° (az 176°) |
| Connecting Ridge | -89.44, 222.6 | 1,957 m | 0.6° | 98 % | 47 % | -0.6° (az 175°) |
| de Gerlache (borde) | -88.67, 291.6 | 1,812 m | 2.1° | 94 % | 48 % | 0.1° (az 6°) |
| Mons Mouton | -84.81, 29.2 | 5,354 m | 2.8° | 47 % | 75 % | 4.0° (az 116°) |
| Macizo Malapert | -85.99, 2.1 | 5,172 m | 1.4° | 78 % | 67 % | -0.1° (az 90°) |
| Nobile (borde) | -85.4, 37 | 6,036 m | 8.8° | 25 % | 16 % | 15.6° (az 355°) |

Periodo: del 1 ene 2027 al 2 mar 2027, de hora en hora (1440 muestras). Detalle en `docs/validacion/valores.md`.

## Validación hecha
- **QuickMap, marcadores:** Dilan confirmó los 6 sitios con un marcador sobre la cresta (`docs/validacion/quickmap_marcadores_dilan.pdf`).
- **QuickMap, alturas:** nuestro DEM de 80 m coincide con el de 5 m de QuickMap con diferencias de **4 a 77 m** en 4 puntos. La de 77 m está en una ladera empinada.
- **Panoramas del horizonte** con las trayectorias del Sol y la Tierra: `docs/validacion/{id}_horizonte.png`. Sirven para la diapositiva de validación.
- **Tu simulador S2 coincide con el de Python.** Corrí `simulate()` de tu rama `frontend` con los datos reales y salió esto:

  | Caso | Tu S2 | Python |
  |---|---|---|
  | Malapert, 15 ene | sobrevive, 85 % de datos enviados | igual |
  | Malapert, 20 ene | falla el 2 feb a las 06:00 | falla el 2 feb a las 07:00 |
  | Connecting Ridge, 20 ene | sobrevive, 28 % de datos enviados | igual |

  La hora de diferencia en la falla viene solo de cómo se indexa el evento. La física es la misma.

## El caso de la demo (`docs/CASO_DEMO.md`)
Sitio **Macizo Malapert**, preset **Explorador ligero**, misión de 14 días.
1. **15 ene 2027, 00:00 UTC:** sobrevive con viabilidad del 95 % y tolera 4.5 días de atraso.
2. **La misión se atrasa 5 días (20 ene):** el Sol se oculta tras el relieve el 1 feb y la batería falla el 2 feb.
3. **La app recomienda** cambiar a **Connecting Ridge** (sobrevive, pero solo envía el 28 % de los datos) o esperar a Malapert hasta el **12 feb**. No el 11: si aluniza el 11 a las 00:00, llega de noche y falla.

## Lo que necesito de ti, en orden
1. **Coordenadas de Horizons.** Actualiza `frontend/scripts/sites.mjs` con las de `backend/sites_verified.json` y corre `npm run horizons`. Hoy no coinciden:

   | Sitio | `sites.mjs` | `sites_verified.json` |
   |---|---|---|
   | Connecting Ridge | -89.45, 222.0 | -89.44, 222.6 |
   | de Gerlache | -88.67, 292.0 | -88.67, 291.6 |
   | Mons Mouton | -84.8, 29.2 | -84.81, 29.2 |
   | Malapert | -86.0, 2.9 | -85.99, 2.1 |

   Avísame cuando termines y corro `build.py` + `export.py`. El cambio es menor de 0.7° de longitud, así que los % casi no se mueven.
2. **Combinar** el PR #1 y tu rama `frontend` en `main`.
3. **Primer deploy en Vercel.** El checklist está en `docs/PLAN_HACKATON.md`: root `frontend`, Vite, sin `VITE_API_URL`.
4. **En 3D, la luz o la sombra del sitio sale de `isLit`, no del ray-casting.** El recorte de 20 km no ve el relieve lejano, hasta 150 km, que también tapa el Sol.
5. Pendiente pequeño: agregar `TIME_TYPE='UT'` en `fetch-horizons.mjs`.

## Limitaciones (decirlas en el pitch)
No modelamos la temperatura, el polvo, los satélites de relevo ni la degradación de la batería. La pendiente es regional (unos 160 m) y los presets son ilustrativos. Suponemos que siempre hay una antena de la DSN disponible cuando la Tierra es visible.

## Documentos de referencia
- `docs/CASO_DEMO.md`: el guion del momento wow, con los números.
- `docs/VALIDACION.md`: la comparación con QuickMap.
- `docs/PITCH.md`: el guion de 3 minutos.
- `docs/PLAN_HACKATON.md`: los hitos, los responsables y el deploy.
- `docs/GUIAS_EQUIPO.docx`: las guías para Joshua, Dilan y Odelmy.
