# Créditos de modelos, texturas y datos

Proyecto del equipo para el NASA Space Apps Challenge 2026. El material de NASA se usa según las NASA Images and Media Usage Guidelines: se reconoce a NASA como fuente y no se usan sus insignias.

## Modelos 3D (`frontend/public/models/`)

| Archivo | Origen | Licencia | Cambios del equipo |
|---|---|---|---|
| `lander.glb` | Apollo Lunar Module — NASA 3D Resources | Dominio público (NASA) | Escala real (~7 m), escotilla al norte, + panel solar y antena orientables (adaptación: el Apolo real no tenía panel solar). Scripts en `assets-src/models/apollo/` |
| `rover.glb` | Space Exploration Vehicle — NASA 3D Resources | Dominio público (NASA) | Escala real (3 m de alto), geometría simplificada, texturas a 1024 px |
| `astronaut.glb` | Astronaut — NASA 3D Resources | Dominio público (NASA) | Escala real (1.85 m) |
| `lro.glb` | Lunar Reconnaissance Orbiter (A) — NASA 3D Resources | Dominio público (NASA) | Escala aproximada (3.9 m) |
| `gateway.glb` | Gateway Core — NASA 3D Resources | Dominio público (NASA) | Texturas reducidas a 512 px |
| `dsn_34m.glb` | Deep Space Network 34-meter — NASA 3D Resources | Dominio público (NASA) | Texturas a JPEG |
| `earth.glb` | Esfera con **Blue Marble Next Generation** (NASA Visible Earth / Goddard), vía el repositorio geovista-data | Dominio público (NASA) | Generado con `assets-src/models/tools/build_bodies.py` |
| `moon.glb` | Esfera con textura de la Luna de **Solar System Scope** (basada en datos de NASA LRO), vía pyvista/vtk-data | **CC BY 4.0** — dar crédito a Solar System Scope | Incluye marcadores `site-{id}` |
| `sun.glb` | Esfera con textura del Sol de **Solar System Scope** | **CC BY 4.0** — dar crédito a Solar System Scope | Textura emisiva |
| `launch_vehicle.glb` | [Saturn V — repositorio oficial NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Saturn%20V) | Dominio público (NASA) | GLB original renombrado; centrado y escala visual al cargar. Se usa como referencia histórica en el ascenso ilustrativo, no como vehículo CLPS real. |

## Texturas (`frontend/public/textures/`)

| Archivo | Origen | Licencia |
|---|---|---|
| `stars.jpg` | Tycho Star Map — NASA 3D Resources | Dominio público (NASA) |
| `earth_night.jpg` | Black Marble — NASA Earth Observatory, vía geovista-data | Dominio público (NASA) |

## Datos
- **Posiciones y distancias del Sol y la Tierra, y la Luna vista desde la DSN:** JPL Horizons (NASA/JPL).
- **Relieve:** LOLA / LRO (NASA), DEM `LDEM_80S_80M` del PDS Geosciences Node (dominio público), vía Moon Trek.
- **Validación de la luz y de la Tierra visible:** mapas de iluminación `AVGVISIB_75S_120M_201608` y `_EARTH` del equipo LOLA (NASA/GSFC; Mazarico et al. 2011, *Icarus* 211, 1066–1081), dominio público.
- **Estaciones de la DSN:** coordenadas de DSS-14, DSS-63 y DSS-43 del documento [DSN 810-005, módulo 301](https://deepspace.jpl.nasa.gov/dsndocs/810-005/301/301K.pdf) (NASA/JPL).
- **Radios del Sol y la Tierra:** IAU 2015 (resolución B3) y WGS84.
- **Transferencia Tierra–Luna idealizada:** constante gravitatoria terrestre de [JPL DE440](https://ssd.jpl.nasa.gov/astro_par.html); radios, distancia media y periodo lunar de [NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html). Modelo y límites en `docs/TRANSFERENCIA.md`.

> Pendiente: reemplazar la textura de la Luna por el **CGI Moon Kit** de NASA SVS (LROC color), que es dominio público, cuando se pueda descargar.
