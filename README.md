# GEOATHECMOON · Lunar Landing Site Navigator

Proyecto para el **NASA Space Apps Challenge 2026**, reto *Lunar Landing Site Navigator*.

> **En 10 segundos sabes si un sitio y una fecha sirven en el polo sur lunar, y qué pasa si tu misión se atrasa.**
>
> *In 10 seconds you know whether a site and a date work at the lunar south pole, and what happens if your mission is delayed.*

En el polo sur de la Luna el Sol nunca sube más de un par de grados: una cresta a varios kilómetros basta para dejar un sitio a oscuras o cortar el contacto con la Tierra. GEOATHECMOON compara **6 sitios** del polo sur durante **todo 2027, hora por hora**, con posiciones reales del Sol y la Tierra (JPL Horizons) y el relieve real (LOLA). Después **simula tu módulo**: batería, paneles y envío de datos.

## Cómo se usa

**Planificador** (la entrada principal), en tres pasos: sitio, fecha y resultado. La primera vez, cada elemento se explica junto a donde se usa; se repite desde «Ayuda».

1. **Elige el sitio** entre 6 lugares reales del polo sur, con fotografías regionales de LROC.
2. **Elige la fecha** (UTC) y los días en la superficie.
3. **Mira el resultado:** puntaje de 0 a 100, qué lo limita y el terreno 3D con la luz de esa fecha. Desde ahí:
   - **¿Y si la misión se atrasa?** Eliges un atraso (+1 día a +2 semanas) y ves tu plan y el atrasado como franjas hora por hora de Sol y Tierra, con la marca donde se agotaría la batería y cuántos días de atraso tolera.
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

## Validación

- **Contra los mapas de iluminación oficiales del equipo LOLA** (`AVGVISIB_75S_120M_201608`, NASA/GSFC, Mazarico et al. 2011): con el observador a ras de suelo, como en el mapa, nuestro % de luz queda a menos de 5 puntos en los 6 sitios (mediana de 2.6). Ejemplos: Connecting Ridge 72.3 % frente a 72.6 %, Malapert 62.6 % frente a 61.3 %.
- **Contra el backend del equipo** (Python, independiente): en los primeros 60 días, la luz y el contacto coinciden a menos de 0.5 puntos en los 6 sitios.
- **Eclipse real:** el cálculo detecta el eclipse penumbral de Luna del 17 de agosto de 2027 como un eclipse parcial de Sol visto desde Malapert (hasta el 43 % del disco).
- **Pruebas automáticas:** `npm test` verifica los cálculos, el simulador, los datos y la configuración de la URL pública.

Tabla completa sitio por sitio en [`docs/VALIDACION_NASA.md`](docs/VALIDACION_NASA.md).

## Limitaciones

- No se modelan la temperatura real (el consumo de supervivencia es fijo), el polvo sobre los paneles, la degradación de la batería ni los satélites de relevo.
- El simulador supone que siempre hay una antena de la DSN disponible cuando la Tierra es visible. Los datos de las tres antenas ya están calculados.
- La pendiente es regional (DEM de 80 m): no ve rocas ni cráteres más pequeños que un píxel.
- El viaje Tierra–Luna es un modelo educativo de dos cuerpos: no incluye ascenso físico, captura lunar ni descenso.
- Los presets de los módulos y el imprevisto son escenarios ilustrativos; las posiciones del Sol, la Tierra y el relieve son reales.
- Las imágenes de la portada son ilustraciones: ningún dato sale de ellas.

## Datos y créditos

- **JPL Horizons (NASA/JPL):** posición y distancia del Sol y la Tierra desde cada sitio, y de la Luna desde las antenas DSN.
- **LOLA / LRO (NASA, PDS):** relieve del polo sur (DEM `LDEM_80S_80M`) y mapas de iluminación para la validación.
- **Quickmap (ASU) y Moon Trek (NASA):** verificación de las coordenadas de los sitios.
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

La URL de las etiquetas Open Graph, la canónica y el sitemap se resuelve en `frontend/scripts/site-url.mjs`: primero `SITE_URL`, después `VERCEL_PROJECT_PRODUCTION_URL` y, si no hay variables, `https://geoathectum.vercel.app`. Si cambia el dominio, configurar `SITE_URL` con la URL pública completa. No se necesita una variable para compilar en local.

**Datos:** sin `VITE_API_URL`, la app lee los archivos estáticos de `public/data`. Con `VITE_API_URL` usa el backend (`GET /sites` y `GET /sites/{id}`), y si no responde en 6 s o falla, vuelve sola a los archivos estáticos.

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
