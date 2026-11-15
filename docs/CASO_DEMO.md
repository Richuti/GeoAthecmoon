# Caso de la demo · "La misión se retrasa"

Sale de `python backend/sim_demo.py`, una réplica en Python del simulador S1/S2/S3 de `docs/TAREAS.md` que usa los datos reales de `backend/out/` (efemérides de JPL Horizons y horizonte LOLA de 80 m). Para ver el detalle de un caso: `python backend/sim_demo.py detalle SITIO PRESET FECHA`.

> **Para Richard:** cuando S2 y S3 estén listos, los números de la app deberían coincidir con estos (±1 %). Si no coinciden, uno de los dos tiene un bug: compáralos por evento.
>
> **Fuente de verdad: la app (rama `frontend`, datos de un año con las coordenadas verificadas).** Números comprobados el sáb a las 18:40 con `simulate()` y `delayTolerance()` de Richard. La réplica en Python (60 días) daba lo mismo, salvo la hora exacta de la falla.

## Guion en la app publicada (probado sáb 20:15 en https://geoathectum.vercel.app)
1. Abrir `https://geoathectum.vercel.app/?sitio=malapert-massif#planificador`. Elegir la fecha **15 ene 2027, 00:00 UTC**, 14 días y **Explorador ligero** → **Continuar al viaje** → **Evaluar misión en la Luna**.
   - Se ve **95 %, "Buena"**, con 100 % de luz y 85 % de contacto. Sobrevive los 14 días. "Tolera hasta 4 días y 6 horas de atraso."
2. Clic en **"Simular el imprevisto"**: una corrección de trayectoria atrasa la llegada **+4 días y 12 horas** (19 ene, 12:00).
   - "La batería se agota el día 14." El 1 feb a las 05:00 el Sol se pone por el suroeste y siguen 8 días y 6 horas de sombra.
   - En la vista del escenario, pulsar **El Sol se oculta** y después **Batería al 20 %**: el terreno usa la luz de esa fecha y el estado aparece junto a la nave. Se puede reproducir y pausar el escenario o volver al plan original conservando su fecha y cursor.
3. La app ofrece **3 salidas, todas simuladas** con los mismos datos:
   - **Esperar en órbita** y alunizar el 11 feb a las 12:00 → sobrevive y envía el 84 % de los datos.
   - **Cambiar a de Gerlache** → sobrevive, pero envía solo el 34 % de los datos.
   - **Ahorrar energía**: el mismo sitio con el 75 % de los instrumentos.
   - Los botones son **Aplicar nueva fecha**, **Aplicar este sitio** y **Aplicar ahorro**. Actualizan el plan y su resultado sin repetir el viaje Tierra–Luna.

**Alternativa manual** (si falla el botón): en "Modificar mi plan", cambiar la fecha al **20 ene** → 40 %, "Sin energía el día 14". En "La misma fecha, en los otros sitios", Connecting Ridge sobrevive con un 28 % de contacto.

**⚠ Bug que hay que avisarle a Richard:** el bloque "La siguiente opción" recomienda el **8 ene**, una fecha *anterior* a la del alunizaje, también cuando la misión se atrasó. Si la misión ya está atrasada, no se puede volver atrás: debería proponer la siguiente fecha **posterior** que funcione, o no mostrarse. Durante la demo, no hacer clic ahí.

## Guion anterior (cambiar la fecha a mano)
Sitio **Macizo Malapert**, preset **Explorador ligero** (306 W pico, 3 kWh y 60 + 90 W), misión de 14 días.

| Paso | Fecha de alunizaje | Resultado |
|---|---|---|
| 1. Plan original | **15 ene 2027, 00:00 UTC** | ✅ Sobrevive. Viabilidad del **95 %**, luz del 100 %, Tierra visible el 85 % del tiempo y 85 % de los datos enviados. La batería nunca baja del 100 %. Tolera **4.25 días** de retraso. |
| 2. "Se atrasa el lanzamiento 5 días" | **20 ene 2027, 00:00 UTC** | ❌ Falla. Viabilidad del **40 %** (tope por falla). Eventos: día 7, Earthset (26 ene 22:00); día 13, **el Sol se oculta tras el relieve** (1 feb 05:00); día 14, modo supervivencia (2 feb 02:00); día 14, **falla la batería** (2 feb 10:00), a 14 horas del final de la misión. |
| 3. La app recomienda | Mismo 20 ene en **Connecting Ridge** | ✅ Sobrevive (luz del 100 % y tolera 43.75 días de atraso), **pero** la Tierra solo se ve el 28 % del tiempo y solo se envía el 28 % de los datos. Otra opción: Malapert **a partir del 12 feb** (el 11 a las 00:00 todavía falla: aluniza de noche). |

**Mensaje del momento wow:** *"Cuatro días y medio de retraso convierten una misión perfecta en una falla. La app te lo dice antes de lanzar y te da tres salidas simuladas: esperar en órbita hasta el 11 de febrero, cambiar de sitio (sobrevives, pero envías la tercera parte de los datos) o apagar instrumentos."* Es justo el compromiso real entre energía y comunicación que plantea el reto.

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
