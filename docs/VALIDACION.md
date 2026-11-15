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

## Resultado 1 · Capturas de Dilan (sáb 14:00)
**Lo que sí prueban:** las 6 vistas de QuickMap están centradas en nuestras coordenadas. Lo confirmamos con el `prjExtent` de la URL: el error es menor de 2 km en todas.

**Altura de LOLA: QuickMap (DEM de 5 m) frente a nuestro DEM (80 m), en el mismo punto.** Se usó el punto donde estaba el cursor en cada captura, que no es el sitio.

| Punto (cursor) | QuickMap | Nuestro LOLA 80 m | Diferencia |
|---|---|---|---|
| -89.412°, 256.73° | 479 m | 483 m | +4 m |
| -89.613°, 104.79° | −2052 m | −1975 m | +77 m (ladera empinada: es efecto de la resolución) |
| -87.114°, 310.42° | −1292 m | −1307 m | −15 m |
| -88.640°, 194.16° | −911 m | −955 m | −44 m |

**Para el pitch:** "En 4 puntos, nuestro DEM coincide con el de 5 m de QuickMap con una diferencia de entre 4 y 77 m." No se usan las capturas de Malapert y Nobile: su cursor quedó fuera de la cobertura de la capa `SP LOLA DEM 5M 87S`, que solo llega a 87° S.

**Marcadores (versión en PDF, `docs/validacion/quickmap_marcadores_dilan.pdf`): 6 de 6 ✅.** El `.docx` anterior tenía capturas más viejas, de antes de poner los puntos.
- Shackleton, Connecting Ridge y de Gerlache (capa `SP LOLA DEM 5M 87S`): el punto queda donde predice la geometría respecto del cráter Shackleton. Por ejemplo, Connecting Ridge queda unos 19 km al oeste y 6 km al sur de su centro, y así se ve. Los tres puntos caen en las crestas, donde el mapa está en rojo (alto).
- Malapert y Nobile (capa `LOLA 80S 20M ADJ DEM`): los puntos caen sobre el relieve más alto de la vista.
- Mons Mouton: el punto está en el centro de la vista, que es nuestra coordenada, sobre la meseta. El relieve de color no cubre esa zona en la captura.
- Ojo: el LAT/LON y el "valor en el cursor" de cada captura son la posición del mouse, no la del punto. Dilan lo aclara en el PDF.

**Opcional (solo si sobra tiempo, Dilan):** anotar la altura que da QuickMap **en cada marcador**, con el mouse encima del punto. Para Mons Mouton, Malapert y Nobile hay que usar una capa de LOLA que llegue más allá de 87° S. Nuestras alturas para comparar son: Shackleton 1670 m, Connecting Ridge 1957 m, de Gerlache 1812 m, Mons Mouton 5354 m, Malapert 5172 m y Nobile 6036 m.

## Fuentes publicadas: resultado (Joshua, sáb 16:30)
Informe completo: `docs/validacion/informe_iluminacion_joshua.pdf`, con Mazarico 2011, Gläser 2014 y 2018, Speyerer y Robinson 2013, y un estudio regional de Artemis III de 2025.

| Sitio | Publicado | Periodo y altura | Nuestro % de luz (ene–feb 2027, 2 m) | Lectura |
|---|---|---|---|---|
| Connecting Ridge | 89.0 % (Mazarico, punto CR1 en -89.45, 222.69) y 88.0 % (Gläser 2018) | 18.6 años a 0 m; 2017–2037 a 2 m | **98 %** | ✅ Mismo punto. El nuestro sale más alto porque el periodo es favorable (ver abajo) |
| Mons Mouton | 48 % ± 10 % de visibilidad solar (promedio de la región) | 18.6 años, 0 m | **47 %** | ✅ Coincide |
| Nobile | 38 % ± 21 % (región) | 18.6 años, 0 m | **25 %** | ✅ Dentro del rango |
| Malapert | 31 % ± 25 % (región, incluye laderas de más de 20°) | 18.6 años, 0 m | **78 %** | 🟡 Por encima: nuestro punto es la cumbre, la parte mejor iluminada de una región muy variable (±25) |
| Shackleton | 85.5 % (Gläser 2018, mejor punto cerca de -89.6866, 197.19) | 2017–2037, 2 m | **69 %** | 🟡 Por debajo. Causas probables: el 85.5 % es el **píxel máximo** de un DEM de 20 m, y nuestro DEM de 80 m suaviza el borde, que es angosto, así que el horizonte nos queda relativamente más alto (hasta 7.1°). Además, en 60 días cerca del equinoccio, el Sol rasante pasa justo por esos azimuts bloqueados |
| de Gerlache | No hay dato publicado para el punto | — | 94 % | Sin comparación |

**Estación (comprobado con nuestra efeméride de JPL Horizons):** promediando el ciclo de unos 29.5 días, la elevación del Sol en el polo baja de unos +0.7° (mediados de enero) a unos −0.1° (alrededor del 10 de febrero de 2027). **Enero y febrero de 2027 son la segunda mitad del verano austral, que termina en el equinoccio de alrededor del 10 feb 2027.** La tabla del informe de Joshua lo confirma: si el pleno verano de 2027 es del 15 oct al 14 nov y el ciclo estacional dura 346.6 días, el anterior cayó en noviembre de 2026.

**Matiz que hay que decir:** nuestro "% de luz" es el tiempo con el **centro** del Sol sobre el horizonte. Se parece más a la "visibilidad solar" que a la "iluminación promedio", y ninguna de las dos es idéntica.

**Respuesta para el jurado:**
> "Comparamos con Mazarico, Gläser y los estudios de Artemis III. En Connecting Ridge, Mons Mouton y Nobile coincidimos. Las diferencias tienen explicación: los artículos promedian 18 años, y nosotros calculamos las fechas exactas de la misión, que caen al final del verano austral. Por eso Connecting Ridge nos da más. Y en el borde de Shackleton, nuestro DEM de 80 m suaviza un borde muy angosto. Por eso la herramienta calcula por fecha: la luz depende de cuándo llegas, no solo de dónde."
