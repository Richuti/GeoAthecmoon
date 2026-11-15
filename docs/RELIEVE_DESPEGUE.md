# Relieve terrestre del despegue

Estado: integrado y verificado. Richard autorizó el 15 nov 2026 la conversión offline de elevaciones reales a GLB. La aplicación solo carga el archivo; no genera terreno en el navegador.

## Archivos preparados

Archivos de la revisión de carga, escala y cámara (además de los recursos que siguen): `frontend/src/components/Viewer3D.tsx`, `ViewerPanel.tsx`, `PlannerGuide.tsx`, `sim/JourneyCamera.tsx`, `sim/LaunchViewer.tsx`, `sim/TransferViewer.tsx`, `sim/DescentViewer.tsx`, `sim/EarthMoonJourney.tsx`, `frontend/src/i18n/en.ts`, `frontend/scripts/fetch-launch-detail.mjs`, `CLAUDE.md`, `docs/TAREAS.md`, `docs/CREDITOS.md` y este documento. Las rutas abreviadas de componentes parten de `frontend/src/components/`.

- `assets-src/terrain/kennedy/elevation-usgs.tif`: DEM USGS 3DEP, flotante de 32 bits, 600 × 600 muestras. Cubre aproximadamente 1.2 × 1.2 km de terreno real alrededor de LC-39A. Alturas en metros; rango del recorte descargado: −0.91 a 14.24 m. Estas son alturas del terreno, no alturas de edificios.
- `assets-src/terrain/kennedy/source.json`: URL exacta, fecha, centro y límites EPSG:3857 de la exportación. La extensión de Mercator se ajustó por coseno de la latitud para cubrir aproximadamente 1.2 km en el suelo.
- `frontend/public/textures/flight/kennedy-pad-naip.jpg`: ortofoto USGS/USDA en color natural del mismo centro y extensión terrestre nominal, 2048 × 2048 px. No es un mapa de alturas. La textura ya está aplicada a la escena.
- `frontend/public/models/launch_gantry.glb`: estructura de servicio NASA; aporta volumen real a la plataforma, no sustituye el DEM.
- `frontend/public/models/kennedy_terrain.glb`: 22 801 vértices, 45 000 triángulos y 1 001 324 bytes. Elevaciones interpoladas del DEM entre −0.91 y 14.17 m, sin exageración vertical. Textura NAIP asignada al cargarlo, sin duplicar la imagen dentro del GLB.
- `frontend/scripts/build-kennedy-terrain.py`: conversión reproducible con Python y Pillow. Ejecutar desde la raíz: `python frontend/scripts/build-kennedy-terrain.py`. Incluye validaciones de alturas, normales y límites. El TIFF está excluido por la regla de DEM de `.gitignore`; si falta en una copia nueva del repositorio, el exportador lo descarga de la URL registrada en `source.json`. El GLB terminado sí se sube y la aplicación no necesita descargar el TIFF.
- `frontend/tests/kennedyTerrain.test.ts`: comprueba integridad, tamaño, escala, relieve, orientación de los triángulos y registro de la ortofoto.

## Integración del GLB

Ruta: `frontend/public/models/kennedy_terrain.glb`. `LaunchViewer.tsx` lo carga con `useGLTF`.

- Metros de escena, con +X al este, +Y arriba y −Z al norte; origen horizontal en 28.6084° N, 80.6043° O.
- Mantener las elevaciones reales y documentar el cero vertical utilizado. No exagerar las alturas ni derivarlas del brillo de la ortofoto.
- El exportador convierte Mercator a distancias locales mediante el coseno de la latitud central. La desviación de esta aproximación crece fuera del recorte; no usar este GLB como cartografía de precisión. Las UV salen de la latitud/longitud de cada vértice y del recuadro exacto de la ortofoto.
- Un rayo sobre el GLB mide 14.124 m bajo el cohete. Se elevan plataforma, nave, cámara y efectos con esa referencia; la base del cohete queda 4.85 m sobre el suelo, apoyada en la cubierta. Gantry se ancla a la elevación bajo su propia posición.
- El globo y su receptor de sombras se recortan bajo el interior del modelo. Los últimos 39 m del terreno se funden con el contexto terrestre para evitar bordes rectos y superficies superpuestas.
- El modelo pesa aproximadamente 1 MB; la textura cercana se comparte. Se conserva el inicio independiente de las escenas lunar y orbital. Verificado a 1440 y 390 px, con ratón, giro táctil y zoom de dos dedos.

El modelo conserva las alturas entregadas por el servicio. No se afirma una reconstrucción actual de las estructuras, y la geometría histórica de referencia NASA no corresponde a un lanzamiento específico.

USGS describe 3DEP como elevaciones del terreno sin edificios. Para torres, depósitos, edificios y conductos hacen falta modelos de esas estructuras, separados del terreno.

Fuentes: [servicio 3DEP](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer), [colección USGS de DEM de 1 metro](https://data.usgs.gov/datacatalog/data/USGS%3A77ae0551-c61e-4979-aedd-d797abdcde0e), [Gantry NASA](https://science.nasa.gov/3d-resources/gantry/).
