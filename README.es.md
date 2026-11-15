# GEOATHECMOON · Next-Generation Landing Site Planning for the Lunar South Pole
**[English](README.md)** · Español


Proyecto del equipo **GeoAthectum** para el **NASA Space Apps Challenge 2026**, reto *Lunar Landing Site Navigator*.

> **En 10 segundos sabes si un sitio y una fecha sirven en el polo sur lunar, y qué pasa si tu misión se atrasa.**
>
> *In 10 seconds you know whether a site and a date work at the lunar south pole, and what happens if your mission is delayed.*

**App en línea:** https://geoathecmoon.vercel.app (en inglés por defecto; el botón EN/ES, abajo a la izquierda, cambia a español).
**Código:** https://github.com/Richuti/GeoAthecmoon

## Resumen

En el polo sur de la Luna el Sol nunca sube más de un par de grados, así que una cresta lejana puede dejar un sitio de alunizaje a oscuras o cortar el contacto con la Tierra. GEOATHECMOON es un planificador y simulador de misiones que responde la pregunta central del reto: si la misión se atrasa, ¿todavía funciona?

El usuario elige una fecha, los días en la superficie y uno de 6 sitios reales del polo sur. Con las posiciones reales del Sol y la Tierra de JPL Horizons y el relieve LOLA, la app revisa la luz solar, el contacto con la Tierra y la pendiente hora por hora durante todo 2027. Da un puntaje de 0 a 100, muestra qué lo limita e ilumina el terreno 3D para esa fecha. Se pueden probar atrasos, comparar planes y simular la batería, los paneles solares y el envío de datos del módulo. Un mapa de supervivencia muestra dónde y cuándo sobrevive la misión. Si la misión falla, un copiloto con IA propone planes de rescate y el simulador comprueba cada uno.

Nuestros resultados de luz solar quedan a menos de 5 puntos de los mapas oficiales de iluminación LOLA de NASA. Las herramientas de NASA son potentes pero complejas. GEOATHECMOON da una respuesta clara a ingenieros, estudiantes y público general, en inglés y en español.

## Cómo se usa

**Planificador** (la entrada principal), en dos pasos: preparar y resultado. El sitio, la fecha y la duración se eligen en la misma pantalla. La guía se puede repetir desde «Ayuda».

1. **Prepara el plan:** elige la fecha (UTC), los días en la superficie y uno de los 6 sitios reales del polo sur, con fotografías regionales de LROC. También puedes dejar que la IA proponga un plan comprobado.
2. **Mira el resultado:** puntaje de 0 a 100, qué lo limita y el terreno 3D con la luz de esa fecha. «Editar mi plan» devuelve todos los campos juntos, conservando tus elecciones. Desde ahí:
   - **¿Y si la misión se atrasa?** Eliges un atraso (+1 día a +2 semanas), comparas las fechas y compruebas si alcanza la batería. Una agenda diaria muestra las horas de luz y de enlace para enviar mediciones, con explicaciones sencillas.
   - **Compara tu plan** con otro sitio en las mismas fechas o con un plan que guardaste, lado a lado, y cambia a la mejor opción con un clic.
   - **Simular este plan** abre el mismo plan en el simulador.

**Simulador:**

1. **Prepara la misión.** Elige el sitio, la fecha de alunizaje y la duración. El módulo trae una configuración inicial; los presets son ilustrativos.
2. **Viaja.** El recorrido Tierra–Luna usa una transferencia orbital calculada (modelo educativo de dos cuerpos).
3. **Evalúa.** Ves la viabilidad, las horas de luz y de contacto, la pendiente, si la batería aguanta y cuántos días de atraso tolera la misión.
   Puedes pulsar **Ver la misión** para recorrerla sobre el terreno: batería, potencia del panel, consumo y envío de datos siguen la misma serie calculada. Los avisos explican cuándo se oculta el Sol, se pierde el contacto o cambia el estado de energía; la reproducción se detiene al fallar.
4. **Simula un imprevisto.** Una corrección de trayectoria atrasa la llegada. Un escenario independiente muestra las nuevas fechas, la pérdida de luz, el estado junto a la nave y la batería hora por hora. Puedes saltar al momento crítico, reproducirlo, volver al plan original o aplicar una salida comprobada: esperar para alunizar, cambiar de sitio o encender menos instrumentos. Explorar el escenario conserva el plan original y su cursor.

La reproducción dice su escala de tiempo (por ejemplo, «1 segundo en pantalla = 1 hora», 3 600 veces más rápido) y cuánto tarda en verse la misión completa. Se puede cambiar sitio, fecha, duración o módulo y volver a evaluar cuantas veces se quiera, sin repetir el viaje. El calendario, las ventanas de luz/contacto/DSN y los gráficos del cielo quedan como detalles opcionales.

## Qué se calcula

| Cálculo | Cómo |
|---|---|
| Luz | El Sol está sobre el relieve: `sun.el > horizonte(sun.az)` |
| Contacto | La Tierra está sobre el relieve: `earth.el > horizonte(earth.az)` |
| Horizonte | Rayos de 150 km sobre el DEM LOLA de 80 m, con la curvatura lunar `d²/(2R)`, desde 2 m de altura |
| Energía | `1361 W/m² × área × eficiencia × fracción visible del disco solar`, con el tamaño real del Sol y menos lo que tapa la Tierra en un eclipse |
| Batería | Eficiencias de carga y descarga de 0.90; falla al llegar al 20 % |
| Viabilidad | Índice de 0 a 100 que combina luz, contacto y pendiente; tope de 40 si el módulo no sobrevive |
| Atrasos | Cuántos días se puede atrasar el alunizaje y la misión sigue sobreviviendo |
| Extras | Qué cresta tapa el Sol y a cuántos km está, eclipses del Sol por la Tierra y visibilidad de la Luna desde Goldstone, Madrid y Canberra (DSN) |

**Regla del proyecto:** el simulador no inventa números. Todo sale de los datos de NASA y de los parámetros que elige el usuario.

## Uso de IA

- **En la app:** el copiloto de rescate y «Planéalo por mí» usan un modelo de OpenAI a través de una función de servidor (`frontend/api/copilot.ts`; la clave nunca llega al navegador). La IA solo **decide qué probar y explica su elección**: cada cifra que se muestra sale del simulador de la app con datos de JPL Horizons y LOLA. Si la IA no está disponible, el resto de la app funciona igual.
- **En el desarrollo:** el equipo usó asistentes de IA para escribir y revisar código y documentación. Los datos, los métodos y la validación son responsabilidad del equipo y están documentados abajo.
- **Imágenes:** las ilustraciones de la portada se generaron con ChatGPT (OpenAI). Son solo ilustraciones: ningún dato sale de ellas. Las fotos de los sitios son imágenes reales de LROC (NASA/GSFC/ASU).

## Validación

- **Contra los mapas de iluminación oficiales del equipo LOLA** (`AVGVISIB_75S_120M_201608`, NASA/GSFC, Mazarico et al. 2011): con el observador a ras de suelo, como en el mapa, nuestro % de luz queda a menos de 5 puntos en los 6 sitios (mediana de 2.6). Ejemplos: Connecting Ridge 72.3 % frente a 72.6 %, Malapert 62.6 % frente a 61.3 %.
- **Contra valores publicados:** en todo 2027, Connecting Ridge recibe **89.5 %** de luz a 2 m; Mazarico et al. (2011) reportan **89 %** en el mismo punto.
- **Contra el backend independiente del equipo** (Python): en el año completo (8760 horas), la luz y el contacto coinciden a menos de 0.5 puntos en 5 de los 6 sitios; de Gerlache difiere en 1.0 punto por un solo obstáculo, más pequeño que un píxel, a 120 m del sitio ([`docs/validacion/valores.md`](docs/validacion/valores.md)).
- **Eclipse real:** el cálculo detecta el eclipse penumbral de Luna del 17 de agosto de 2027 como un eclipse parcial de Sol visto desde Malapert (hasta el 43 % del disco).
- **Coordenadas:** los 6 sitios se comprobaron en LRO QuickMap con un marcador visible.
- **Pruebas automáticas:** `npm test` verifica los cálculos, el simulador, los datos y la traducción.

Tabla completa sitio por sitio en [`docs/VALIDACION_NASA.md`](docs/VALIDACION_NASA.md).

## Limitaciones

- No se modelan la temperatura real (el consumo de supervivencia es fijo), el polvo sobre los paneles, la degradación de la batería ni los satélites de relevo.
- El simulador supone que siempre hay una antena de la DSN disponible cuando la Tierra es visible. Los datos de las tres antenas ya están calculados.
- La pendiente es regional (DEM de 80 m): no ve rocas ni cráteres más pequeños que un píxel.
- Viaje Tierra–Luna: transferencia de dos cuerpos hasta la distancia Tierra–Luna real del día de llegada (JPL Horizons), captura en órbita lunar con cónicas empalmadas y descenso propulsado integrado con la gravedad lunar, el empuje y el consumo (datos del módulo lunar del Apolo 11, NASA). Simplificaciones: Luna esférica sin mascones, sin la gravedad del Sol y frenados de captura y descenso instantáneos. El ascenso desde la Tierra es una animación.
- Los presets de los módulos y el imprevisto son escenarios ilustrativos; las posiciones del Sol, la Tierra y el relieve son reales.
- Las imágenes de la portada son ilustraciones generadas con IA (ChatGPT): ningún dato sale de ellas.

## Datos y créditos

- **JPL Horizons (NASA/JPL):** posición y distancia del Sol y la Tierra desde cada sitio, y de la Luna desde las antenas DSN.
- **LOLA / LRO (NASA, PDS):** relieve del polo sur (DEM `LDEM_80S_80M`) y mapas de iluminación para la validación.
- **Quickmap (ASU):** verificación de las coordenadas de los sitios (6 de 6 con marcador visible).
- **Moon Trek (NASA):** referencia 3D del relieve del polo sur.
- Modelos 3D de NASA 3D Resources y texturas de Solar System Scope (CC BY 4.0). Lista completa en [`docs/CREDITOS.md`](docs/CREDITOS.md) y en el panel «Fuentes» de la app.

Proyecto creado por nuestro equipo para el NASA Space Apps Challenge 2026. El material de NASA se usa según las NASA Images and Media Usage Guidelines, sin sus insignias.

## Correr el proyecto

Requisitos: Node 22 o superior.

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas
npm run build    # build de producción en frontend/dist
```

Los datos ya vienen en `frontend/public/data/`. Para regenerarlos:

```bash
npm run horizons   # descarga el Sol, la Tierra y la DSN de JPL Horizons
npm run horizon    # horizonte y pendiente desde el DEM LOLA (pide LDEM_80S_80M.IMG)
npm run mock       # arma public/data/sites/{id}.json
```

**Deploy (Vercel):** Root Directory `frontend`, framework Vite, build `npm run build`, salida `dist`. El build también genera una versión estática de la portada para buscadores, `robots.txt` y `sitemap.xml` (`scripts/prerender.mjs`).

La URL de las etiquetas Open Graph, la canónica y el sitemap se resuelve en `frontend/scripts/site-url.mjs`: primero `SITE_URL`, después `VERCEL_PROJECT_PRODUCTION_URL` y, si no hay variables, `https://geoathecmoon.vercel.app`. Si cambia el dominio, configurar `SITE_URL` con la URL pública completa. No se necesita una variable para compilar en local.

**Datos:** sin `VITE_API_URL`, la app lee los archivos estáticos de `public/data`. Con `VITE_API_URL` usa el backend (`GET /sites` y `GET /sites/{id}`), y si no responde en 6 s o falla, vuelve sola a los archivos estáticos. En producción, `VITE_API_URL=https://geoathecmoon-api.onrender.com` (API de `backend/api/main.py`); la app la despierta al abrir la portada.

## Estructura

```
GEOATHECMOON/
├── frontend/          React 19 + Vite + TypeScript + Tailwind, React Three Fiber para el 3D
│   ├── src/lib/       luz, contacto, viabilidad, recomendaciones, cielo (eclipses, DSN, crestas)
│   ├── src/sim/       módulo, simulación hora por hora, búsquedas, imprevisto, viaje Tierra–Luna
│   ├── scripts/       descarga y armado de los datos
│   └── public/data/   datos de los 6 sitios (JSON)
├── backend/           Python: JPL Horizons + DEM LOLA → JSON (rama backend)
├── assets-src/        relieve LOLA procesado y horizontes
└── docs/              contrato de datos, tareas, diseño, créditos
```

Más detalle: [`docs/CONTRATO_DATOS.md`](docs/CONTRATO_DATOS.md) (formato de los datos), [`docs/TAREAS.md`](docs/TAREAS.md) (plan y estado) y [`docs/DISENO.md`](docs/DISENO.md) (sistema de diseño).
