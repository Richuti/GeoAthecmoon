# Viaje Tierra–Luna

La vista conecta el recorrido desde la Tierra con la evaluación del sitio lunar. Ofrece reproducción, pausa y avance manual; no reproduce nada automáticamente. «Evaluar misión en la Luna» aplica el plan elegido y abre la simulación de superficie.

El botón de inicio espera a que carguen los modelos. `journeyAt` proporciona el mismo instante a las cifras, la nave y la Luna, también al retroceder o repetir. Durante la aproximación la cámara encuadra ambos cuerpos; no se adelanta a la Luna dejando la nave fuera de pantalla.

## Qué se calcula

`frontend/src/sim/transfer.ts` calcula una transferencia elíptica de dos cuerpos mediante la ecuación de Kepler. La gravedad terrestre determina la posición, velocidad, duración y el impulso desde la órbita circular inicial. La nave conserva energía y momento angular en este modelo.

- Órbita terrestre inicial: 200 km sobre el radio ecuatorial. Es una hipótesis de referencia, no un dato de un lanzamiento particular.
- Encuentro: cara lunar próxima a la Tierra, a 100 km de altura, antes de captura y descenso.
- Luna: órbita circular a 384 400 km del centro terrestre y periodo de 27.3217 días. Se orienta su fase para obtener un encuentro ideal; no se usa su posición astronómica real de la fecha elegida.
- El tiempo desde la salida orbital se obtiene de la anomalía media y la ecuación de Kepler. La velocidad geocéntrica sale de la misma órbita; no es la velocidad relativa a la Luna.
- El encuentro de referencia se ancla a la fecha seleccionada. La salida orbital de referencia es esa fecha menos la duración calculada. No es una predicción de ventana real de lanzamiento ni de hora real de despegue.

## Límites que aparecen en la interfaz

El ascenso desde la superficie es ilustrativo. El cálculo físico comienza en órbita; no incluye empuje, etapas, atmósfera, combustible, masa del cohete, gravedad solar o lunar, inclinación real del plano, captura lunar o descenso al polo sur. La forma y orientación de la trayectoria son conceptuales. La batería y las comunicaciones del módulo se evalúan a partir del alunizaje con el motor existente; el recorrido orbital no modifica esos datos ni el porcentaje de viabilidad.

El lanzador Saturn V y el módulo Apolo adaptado son referencias visuales de NASA; no representan un vehículo CLPS concreto. Los tamaños de nave y planetas se realzan en la vista general y se indica en pantalla. Se cargan GLB existentes; no se genera geometría 3D por código. La trayectoria se proyecta como SVG a partir de los puntos calculados.

## Fuentes

- [JPL Astrodynamic Parameters, DE440](https://ssd.jpl.nasa.gov/astro_par.html): GM terrestre = 398600.435507 km³/s².
- [NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html): radio ecuatorial terrestre 6378.1 km, radio medio lunar 1737.4 km, distancia y periodo medios.
- [NASA Basics of Space Flight — Trajectories](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/): fundamento de transferencias elípticas y encuentro con un objetivo que se mueve.
- [NASA 3D Resources — Saturn V](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Saturn%20V): GLB original. Créditos completos en `docs/CREDITOS.md` y en «Cómo se calcula y fuentes» de la vista.

## Verificación

`frontend/tests/transfer.test.ts` comprueba condiciones iniciales, duración e impulso, encuentro a 100 km, movimiento lunar, conservación de energía y momento angular, velocidad y distancia, límites temporales y parámetros inválidos. La transferencia es educativa; para estudiar lanzamientos reales harían falta efemérides y un modelo dinámico y de vehículo más completo.


## Escena local de lanzamiento

El despegue usa `LaunchViewer.tsx` y GLB existentes en una escena local en metros, con plataforma NASA. La cámara sigue al cohete y se eleva gradualmente para mostrar la superficie detrás. En el último 20 % del tramo de ascenso se mezcla con la vista orbital; cada escena deja de renderizar cuadros cuando está oculta. `journeyAt` aplica una curva de presentación de quinta potencia al ascenso para observar la salida de la plataforma; no integra empuje ni calcula una velocidad real de ascenso. El tramo dura unos 10 segundos de reproducción y la transferencia unos 24. Se conservan la continuidad de posición al iniciar la transferencia y su modelo de Kepler.

Los modelos y efectos que faltan para el acabado fotorealista están especificados en [ESCENA_DESPEGUE.md](ESCENA_DESPEGUE.md).
