# Créditos de modelos, texturas y datos

Proyecto del equipo para el NASA Space Apps Challenge 2026. El material de NASA se usa según las NASA Images and Media Usage Guidelines: se reconoce a NASA como fuente y no se usan sus insignias.

## Identidad del proyecto

`frontend/public/brand/logo.png`: archivo facilitado por Richard desde su escritorio, copiado sin modificar (SHA-256 idéntico al original). Monograma GA con Luna. Se encuadra mediante SVG en la entrada animada, sin redibujar el logo ni alterar el archivo.

## Modelos 3D (`frontend/public/models/`)

| Archivo | Origen | Licencia | Cambios del equipo |
|---|---|---|---|
| `lander.glb` | Apollo Lunar Module — NASA 3D Resources | Dominio público (NASA) | **Sin usar desde el 14 nov** (lo reemplaza `launch_vehicle.glb`). Escala real (~7 m), escotilla al norte, + panel solar y antena orientables (adaptación: el Apolo real no tenía panel solar). Scripts en `assets-src/models/apollo/` |
| `rover.glb` | Space Exploration Vehicle — NASA 3D Resources | Dominio público (NASA) | Escala real (3 m de alto), geometría simplificada, texturas a 1024 px |
| `astronaut.glb` | Astronaut — NASA 3D Resources | Dominio público (NASA) | Escala real (1.85 m) |
| `lro.glb` | Lunar Reconnaissance Orbiter (A) — NASA 3D Resources | Dominio público (NASA) | Escala aproximada (3.9 m) |
| `gateway.glb` | Gateway Core — NASA 3D Resources | Dominio público (NASA) | Texturas reducidas a 512 px |
| `dsn_34m.glb` | Deep Space Network 34-meter — NASA 3D Resources | Dominio público (NASA) | Texturas a JPEG |
| `earth.glb` | Esfera con **Blue Marble Next Generation** (NASA Visible Earth / Goddard), vía el repositorio geovista-data | Dominio público (NASA) | Generado con `assets-src/models/tools/build_bodies.py` |
| `moon.glb` | Esfera con textura de la Luna de **Solar System Scope** (basada en datos de NASA LRO), vía pyvista/vtk-data | **CC BY 4.0** — dar crédito a Solar System Scope | Incluye marcadores `site-{id}` |
| `sun.glb` | Esfera con textura del Sol de **Solar System Scope** | **CC BY 4.0** — dar crédito a Solar System Scope | Textura emisiva |
| `launch_vehicle.glb` | [Saturn V — repositorio oficial NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Saturn%20V) | Dominio público (NASA) | GLB original renombrado; centrado y escala visual al cargar. Por decisión de Richard (14 nov), es la nave de todo el recorrido: despegue, viaje, alunizaje y vista 3D del sitio. Ilustrativa, no un vehículo CLPS real. |

## Texturas (`frontend/public/textures/`)

| Archivo | Origen | Licencia |
|---|---|---|
| `stars.jpg` | Tycho Star Map — NASA 3D Resources | Dominio público (NASA) |
| `earth_night.jpg` | Black Marble — NASA Earth Observatory, vía geovista-data | Dominio público (NASA) |
| `moon_surface.jpg` | Textura de superficie extraída sin modificar de `moon.glb`, Solar System Scope (basada en datos LRO); relleno de la marca en el footer | **CC BY 4.0** — crédito y enlace a la licencia visibles en el footer |

## Fotografías de los sitios (`frontend/public/media/sites/`)

Crédito visible en el selector y en Fuentes: **NASA/GSFC/ASU**. Cada imagen es contexto de la región, no una fotografía del punto de alunizaje elegido ni de su iluminación en 2027. Se conservó la imagen completa en WebP, reduciendo el ancho a un máximo de 640 px; el recorte visual se hace con CSS. Las seis imágenes suman unos 467 KiB y se sirven localmente. Originales y encuadres en `src/content/siteImagery.ts`.

| Archivo | Fuente original y producto | Condiciones |
|---|---|---|
| `shackleton-rim.webp` | [Where is the South Pole?](https://lroc.im-ldi.com/images/1276), fotografía oblicua M1407524099LR, versión sin flecha (`pictures/1229`) | Imagen editorial LROC; uso educativo con atribución |
| `connecting-ridge.webp` | [Traversing the Shackleton de Gerlache Ridge](https://lroc.im-ldi.com/images/1247), fotografía oblicua M1348682369 (`pictures/1130`) | Imagen editorial LROC; uso educativo con atribución |
| `de-gerlache-rim.webp` | [Mosaico NAC_ROI_DEGERRIMLO1](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_DEGERRIMLO1), vista de consulta del mosaico P885S2933 | Producto PDS; dominio público |
| `mons-mouton.webp` | [IM-2 Landing Region](https://lroc.im-ldi.com/images/1401), imagen NAC de la región de IM-2 a 90 cm/px (`pictures/1485`) | Imagen editorial LROC; uso educativo con atribución |
| `malapert-massif.webp` | [Malapert Massif](https://lroc.im-ldi.com/images/1294), fotografía oblicua M1432398306LR (`pictures/1273`) | Imagen editorial LROC; uso educativo con atribución |
| `nobile-rim.webp` | [Mosaico de Nobile Rim 1 y Mons Mouton](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_MTMOUTONLO1), vista de consulta del mosaico P854S0353; incluye la región de -85.4°, 37° E | Producto PDS; dominio público |

Condiciones consultadas: [LROC Terms of Use & Citation Policy](https://lroc.im-ldi.com/about/terms). Las imágenes editoriales no se etiquetan como dominio público: LROC permite su uso educativo con atribución. Para los dos mosaicos controlados: Henriksen et al. (2023), *Optimized Illuminated Terrain Coverage of the Candidate Artemis III Landing Sites with LROC NAC Controlled Mosaics*, European Lunar Symposium; referencia indicada en sus páginas de producto.

## Datos científicos
- **Posiciones y distancias del Sol y la Tierra, y la Luna vista desde la DSN:** JPL Horizons (NASA/JPL).
- **Relieve:** LOLA / LRO (NASA), DEM `LDEM_80S_80M` del PDS Geosciences Node (dominio público), vía Moon Trek.
- **Validación de la luz y de la Tierra visible:** mapas de iluminación `AVGVISIB_75S_120M_201608` y `_EARTH` del equipo LOLA (NASA/GSFC; Mazarico et al. 2011, *Icarus* 211, 1066–1081), dominio público.
- **Estaciones de la DSN:** coordenadas de DSS-14, DSS-63 y DSS-43 del documento [DSN 810-005, módulo 301](https://deepspace.jpl.nasa.gov/dsndocs/810-005/301/301K.pdf) (NASA/JPL).
- **Radios del Sol y la Tierra:** IAU 2015 (resolución B3) y WGS84.
- **Transferencia Tierra–Luna idealizada:** constante gravitatoria terrestre de [JPL DE440](https://ssd.jpl.nasa.gov/astro_par.html); radios, distancia media y periodo lunar de [NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html). Modelo y límites en `docs/TRANSFERENCIA.md`.

> Pendiente: reemplazar la textura de la Luna por el **CGI Moon Kit** de NASA SVS (LROC color), que es dominio público, cuando se pueda descargar.


## Plataforma de lanzamiento terrestre

- `frontend/public/models/launch_platform.glb`: **NASA / Samuel H. Neblett**, [Mobile Launcher](https://science.nasa.gov/3d-resources/mobile-launcher/), archivo original `Mobile Launcher (assembled).glb`. Modelo sin modificar; posición, escala y materiales se ajustan al mostrarlo. Fuente NASA, sujeto a sus condiciones de uso de medios; no implica respaldo de NASA ni reconstruye un lanzamiento histórico con el Saturn V.
