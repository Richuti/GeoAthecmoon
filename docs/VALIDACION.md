# B4 · Validar nuestros datos con Quickmap y Moon Trek · Joshua y Dilan

**Objetivo:** poder decirle al jurado *"comparamos nuestros números con las herramientas de la NASA y coinciden"*, con capturas como prueba. Se hace en **la misma sesión de Quickmap** que la verificación de coordenadas (`docs/VERIFICACION_SITIOS.md`). Calculen unos 60 minutos.

Nuestros valores ya están calculados en **`docs/validacion/valores.md`**. Las columnas "Quickmap" están vacías: las llenan ustedes.

## Qué comparar en cada sitio

| Qué | Dónde en Quickmap | Cuándo coincide | Por qué |
|---|---|---|---|
| **Altura** | Pon el cursor sobre el sitio: la altura aparece en la barra de coordenadas, o activa la capa de elevación LOLA. | Diferencia de menos de **±50 m** | Usamos el mismo DEM LOLA. Una diferencia grande indica que la coordenada está mal. |
| **Pendiente** | Capa de pendiente LOLA (*slope*). Lee el color o valor en el punto. | Diferencia de menos de **±2°** | La resolución cambia el número. Lo importante es que no aparezca una pendiente de más de 10° donde nosotros decimos 1°. |
| **Iluminación** | Capa de iluminación promedio del polo (*illumination* / *average illumination*, de Mazarico et al.). | **El mismo orden** de sitio más a menos iluminado | Su mapa promedia años, y nosotros calculamos solo 60 días (ene y feb de 2027). Los porcentajes no van a ser iguales, pero el orden sí debería serlo. |

**Orden que esperamos (nuestro cálculo):** Connecting Ridge (98 %) > de Gerlache (94 %) > Malapert (78 %) > Shackleton (69 %) > Mons Mouton (47 %) > Nobile (25 %).

Si algo **no coincide**, no lo corrijan: anótenlo y avísenle a Rafael. Puede ser un error nuestro y es mejor encontrarlo hoy.

## Capturas (para el pitch)
1. `quickmap_{sitio}_iluminacion.png`: el sitio con la capa de iluminación y el punto visible.
2. `quickmap_{sitio}_pendiente.png`: lo mismo con la capa de pendiente (con 2 o 3 sitios alcanza).
3. `moontrek_{sitio}_3d.png`: **Moon Trek** (https://trek.nasa.gov/moon/), vista 3D del relieve alrededor de **Malapert** (el sitio de la demo) y de **Nobile** (el peor). Busquen un ángulo bajo, como si estuvieran parados en el sitio, para que se vea el relieve que tapa el horizonte.

Súbanlas a la carpeta compartida. Rafael las pasa a `docs/validacion/`.

## Nuestro lado de la comparación (ya está hecho)
- `docs/validacion/{sitio}_horizonte.png`: panorama de 360° con el relieve LOLA (gris), el Sol (ámbar) y la Tierra (azul) durante 60 días. Cuando un punto ámbar cae dentro del gris, ese sitio está en sombra. **Joshua: aprende a leer este gráfico, porque es la mejor explicación visual del proyecto.**
- Se regenera con `python backend/validate.py`.

## Qué entregar (copiar y llenar)
```
Sitio          | Altura QM (m) | Pendiente QM (°) | Iluminación QM | ¿Coincide? | Nota
Shackleton     |               |                  |                |            |
Connecting     |               |                  |                |            |
de Gerlache    |               |                  |                |            |
Mons Mouton    |               |                  |                |            |
Malapert       |               |                  |                |            |
Nobile         |               |                  |                |            |
```
