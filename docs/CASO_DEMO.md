# Caso de la demo · "La misión se retrasa"

> **Fuente de verdad: la app publicada** (`main`, todo 2027 cada hora, 8760 muestras, coordenadas verificadas). Números comprobados el **dom a las 00:30** corriendo las funciones de la app (`compareDelay()`, `delayTolerance()` y `simulate()`) sobre `frontend/public/data/sites/*.json`. La réplica en Python (`python backend/sim_demo.py`) da lo mismo, salvo detalles de una a seis horas en la hora exacta de la falla y en la tolerancia.
>
> **Dilan:** confirma estos clics en `https://geoathectum.vercel.app`, en el celular y en la laptop de la presentación. Si algún texto cambió, se usa el de la app.

## Guion A (recomendado): «¿Y si la misión se atrasa?» en el planificador
Sitio **Macizo Malapert**, módulo **Explorador ligero** (el que viene por defecto), misión de **14 días**.
1. Abrir `https://geoathectum.vercel.app/?sitio=malapert-massif#planificador`. La primera vez aparece la **guía rápida de 30 segundos** ("Planifica un alunizaje en tres pasos"): se puede usar como introducción, o cerrar con **Empezar →**.
2. Fecha **15 ene 2027, 00:00 UTC** y **14 d**. El resultado: viabilidad del **95 %**, con 100 % de luz y 85 % de Tierra visible. El módulo sobrevive.
3. Bajar a **«¿Y si la misión se atrasa?»**. Por defecto está en **+3 días**: *"Sí. Con 3 días de atraso, la misión todavía funciona."* (viabilidad de 95 a 87 y la Tierra baja de 85 % a 64 %). Debajo dice: *"Tu plan tolera atrasos de hasta **4 días y 6 horas**."*
4. **Momento wow:** elegir **+1 semana**. *"No. Con 7 días de atraso, la batería se agota."* La luz baja del 100 % al **73 %** y la batería pasa de "Aguanta" a **"Se agota"** (llega al 20 %).
5. (Opcional) **Usar la fecha atrasada** aplica el 22 ene, y en las alternativas se ve qué fecha o qué sitio la salva.

> **Dom 00:55:** Richard rehízo este bloque "sin tablas" (commit `1d52a97`). La tabla de abajo ya no aparece tal cual en la app: es la referencia de los números. En la demo se lee **la frase** ("Sí…" / "No…") y **la tolerancia** (4 días y 6 horas). El tope del 40 % sigue sin aplicarse ahí. Dilan: confirma los textos nuevos.

| Atraso | ¿Funciona? | Viabilidad | Luz | Tierra visible | Batería mínima |
|---|---|---|---|---|---|
| Plan (15 ene) | ✅ | 95 | 100 % | 85 % | 100 % |
| +1 día | ✅ | 92 | 100 % | 78 % | 100 % |
| +3 días | ✅ | 87 | 100 % | 64 % | 100 % |
| +1 semana | ❌ | 70* | 73 % | 49 % | 20 % (falla) |
| +2 semanas | ❌ | 55* | 28 % | 64 % | 20 % (falla) |

\* **⚠ Para Richard:** en esta tabla la viabilidad **no** aplica el tope del 40 % cuando la misión falla (`planOutcome()` en `src/sim/delay.ts` llama a `siteViability()` sin `missionSurvives`). Al aplicar la fecha atrasada, el resultado principal sí muestra 40 %. Si alguien del jurado compara los dos números, se ve incoherente. Se arregla pasando `{ missionSurvives: s.survived }`. Mientras tanto, en la demo hay que leer **la frase y la batería**, no el número.

## Guion B: «Simular el imprevisto» en el simulador
1. En el simulador: Malapert, **15 ene 2027, 00:00 UTC**, 14 días y **Explorador ligero** → **Continuar al viaje →** → **Evaluar misión en la Luna →**.
   - Se ve **95 %, "Buena"**, con 100 % de luz y 85 % de contacto. Sobrevive los 14 días y tolera hasta 4 días y 6 horas de atraso.
2. Clic en **"Simular el imprevisto"**: una corrección de trayectoria atrasa la llegada **+4 días y 12 horas** (19 ene, 12:00).
   - "La batería se agota el día 14". El 1 feb a las 05:00 el Sol se pone por el suroeste y siguen 8 días y 6 horas de sombra.
3. La app ofrece **3 salidas, todas simuladas** con los mismos datos:
   - **Esperar en órbita** y alunizar el 11 feb a las 12:00 → sobrevive y envía el 84 % de los datos.
   - **Cambiar a de Gerlache** → sobrevive, pero envía solo el 34 % de los datos.
   - **Ahorrar energía**: el mismo sitio con el 75 % de los instrumentos.

(Richard dijo que Codex está rehaciendo el simulador visual: si cambia, se confirma este guion con Dilan.)

**⚠ "La siguiente opción"** puede recomendar una fecha *anterior* a la del alunizaje (el 8 ene), incluso cuando la misión ya se atrasó. Durante la demo, no hacer clic ahí.

## Guion C (respaldo manual: cambiar la fecha a mano)
Sitio **Macizo Malapert**, preset **Explorador ligero** (306 W pico, 3 kWh y 60 + 90 W), misión de 14 días.

| Paso | Fecha de alunizaje | Resultado |
|---|---|---|
| 1. Plan original | **15 ene 2027, 00:00 UTC** | ✅ Sobrevive. Viabilidad del **95 %**, luz del 100 %, Tierra visible el 85 % del tiempo y 85 % de los datos enviados. La batería nunca baja del 100 %. Tolera **4.25 días** de retraso. |
| 2. "Se atrasa el lanzamiento 5 días" | **20 ene 2027, 00:00 UTC** | ❌ Falla. Viabilidad del **40 %** en el resultado principal (tope por falla). Eventos: día 7, Earthset (26 ene 22:00); día 13, **el Sol se oculta tras el relieve** (1 feb 05:00); día 14, modo supervivencia (2 feb 02:00); día 14, **falla la batería** (2 feb 10:00), a 14 horas del final de la misión. |
| 3. La app recomienda | Mismo 20 ene en **Connecting Ridge** | ✅ Sobrevive (luz del 100 % y tolera 43.75 días de atraso), **pero** la Tierra solo se ve el 28 % del tiempo y solo se envía el 28 % de los datos. Otra opción: Malapert **a partir del 12 feb** (el 11 a las 00:00 todavía falla: aluniza de noche). |

**Mensaje del momento wow:** *"Cuatro días y medio de retraso convierten una misión perfecta en una falla. La app te lo dice antes de lanzar y te da tres salidas simuladas: esperar en órbita hasta el 11 de febrero, cambiar de sitio (sobrevives, pero envías la tercera parte de los datos) o apagar instrumentos."* Es justo el compromiso real entre energía y comunicación que plantea el reto.

## Mapa general (Explorador ligero, inicios cada 6 h del 1 ene al 16 feb de 2027)
Luz y Tierra: **todo 2027** (la app). Los inicios que sobreviven son de la réplica en Python sobre los datos anteriores (ene–feb); el patrón no cambia.

| Sitio | Luz | Tierra | Pendiente | Inicios que sobreviven |
|---|---|---|---|---|
| Connecting Ridge | 89.5 % | 51 % | 0.6° | 185/185 |
| Borde de Gerlache | 79.5 % | 53 % | 2.1° | 126/185 (hasta el 27 ene) |
| Macizo Malapert | 70.5 % | 75 % | 1.4° | 93/185 (hasta el 19 ene y desde el 11 feb a las 12:00) |
| Borde de Shackleton | 64 % | 19 % | 5.6° | 30/185 |
| Mons Mouton | 46 % | 82 % | 2.8° | 15/185 |
| Borde de Nobile | 25 % | 16 % | 8.8° | 0/185 |

Los otros dos presets dan el mismo patrón, con diferencias de unas horas.

## Supuestos (para responder al jurado)
- El panel sigue al Sol. La generación es 1361 W/m² × área × eficiencia × fracción visible del disco solar (radio de 0.27°).
- Eficiencias de carga y descarga del 90 %. La falla ocurre al 20 % de batería; el modo supervivencia empieza por debajo del 40 % y termina por encima del 60 %.
- Siempre hay una antena de la DSN disponible cuando la Tierra es visible.
- Los presets son ilustrativos. No se modelan la temperatura, el polvo, los relevos ni la degradación de la batería.
- La pendiente es un promedio de unos 160 m (DEM de 80 m/px).
