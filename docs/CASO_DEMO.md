# Caso de la demo · "La misión se retrasa"

Sale de `python backend/sim_demo.py`, una réplica en Python del simulador S1/S2/S3 de `docs/TAREAS.md` que usa los datos reales de `backend/out/` (efemérides de JPL Horizons y horizonte LOLA de 80 m). Para ver el detalle de un caso: `python backend/sim_demo.py detalle SITIO PRESET FECHA`.

> **Para Richard:** cuando S2 y S3 estén listos, los números de la app deberían coincidir con estos (±1 %). Si no coinciden, uno de los dos tiene un bug: compáralos por evento.
>
> **Verificado (sáb 13:40):** el simulador S2 de la rama `frontend` corrido con estos datos da los mismos resultados en los 3 pasos (falla el 2 feb a las 06:00 frente a las 07:00 aquí: es 1 h de diferencia en la hora del evento, no en la física).

## Guion (3 clics)
Sitio **Macizo Malapert**, preset **Explorador ligero** (306 W pico, 3 kWh y 60 + 90 W), misión de 14 días.

| Paso | Fecha de alunizaje | Resultado |
|---|---|---|
| 1. Plan original | **15 ene 2027, 00:00 UTC** | ✅ Sobrevive. Viabilidad del **95 %**, luz del 100 %, Tierra visible el 85 % del tiempo y 85 % de los datos enviados. La batería nunca baja del 100 %. Tolera **4.5 días** de retraso. |
| 2. "Se atrasa el lanzamiento 5 días" | **20 ene 2027, 00:00 UTC** | ❌ Falla. Viabilidad del **40 %** (tope por falla). Eventos: día 7, Earthset (26 ene 22:00); día 13, **el Sol se oculta tras el relieve** (1 feb 06:00); día 13, modo supervivencia (1 feb 23:00); día 14, **falla la batería** (2 feb 07:00), a 17 horas del final de la misión. |
| 3. La app recomienda | Mismo 20 ene en **Connecting Ridge** | ✅ Sobrevive (luz del 100 % y tolerancia de al menos 27 días), **pero** la Tierra solo se ve el 28 % del tiempo y solo se envía el 28 % de los datos. Otra opción: Malapert **a partir del 12 feb** (el 11 a las 00:00 todavía falla: aluniza de noche). |

**Mensaje del momento wow:** *"Cinco días de retraso convierten una misión perfecta en una falla. La app te lo dice antes de lanzar y te da dos salidas: cambiar de sitio (sobrevives, pero envías menos datos) o esperar al 12 de febrero."* Es justo el compromiso real entre energía y comunicación que plantea el reto.

## Mapa general (Explorador ligero, inicios cada 6 h del 1 ene al 16 feb de 2027)
| Sitio | Luz | Tierra | Pendiente | Inicios que sobreviven |
|---|---|---|---|---|
| Connecting Ridge | 98 % | 47 % | 0.6° | 185/185 |
| Borde de Gerlache | 94 % | 48 % | 2.1° | 126/185 (hasta el 27 ene) |
| Macizo Malapert | 78 % | 67 % | 1.4° | 93/185 (hasta el 19 ene y desde el 11 feb a las 12:00) |
| Borde de Shackleton | 69 % | 19 % | 5.6° | 30/185 |
| Mons Mouton | 47 % | 75 % | 2.8° | 15/185 |
| Borde de Nobile | 25 % | 16 % | 8.8° | 0/185 |

Los otros dos presets dan el mismo patrón, con diferencias de unas horas.

## Supuestos (para responder al jurado)
- El panel sigue al Sol. La generación es 1361 W/m² × área × eficiencia × fracción visible del disco solar (radio de 0.27°).
- Eficiencias de carga y descarga del 90 %. La falla ocurre al 20 % de batería; el modo supervivencia empieza por debajo del 40 % y termina por encima del 60 %.
- Siempre hay una antena de la DSN disponible cuando la Tierra es visible.
- Los presets son ilustrativos. No se modelan la temperatura, el polvo, los relevos ni la degradación de la batería.
- La pendiente es un promedio de unos 160 m (DEM de 80 m/px).
