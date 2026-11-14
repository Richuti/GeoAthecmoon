# Verificar los 6 sitios en Quickmap · Dilan y Joshua

**Para qué sirve:** el backend calcula la luz, la comunicación y el relieve **exactamente en las coordenadas de esta tabla**. Si una coordenada cae 2 km al lado, por ejemplo dentro del cráter en vez de en el borde, todos los números de ese sitio salen mal y el jurado lo puede notar.
**Tiempo:** 1 a 1.5 h.  **Entrega:** a Rafael, **antes de las 15:00 del sábado**.

## Los 6 sitios a revisar

| # | Sitio | Latitud | Longitud (este) | Qué debería haber ahí |
|---|---|---|---|---|
| 1 | Borde del cráter Shackleton | -89.67 | 197.0 | El **borde** del cráter (zona alta), no el fondo |
| 2 | Connecting Ridge | -89.45 | 222.0 | La **cresta** que une Shackleton con de Gerlache |
| 3 | Borde del cráter de Gerlache | -88.67 | 292.0 | El **borde** del cráter de Gerlache |
| 4 | Mons Mouton | -84.80 | 29.2 | Una **meseta alta y plana**, cerca de donde alunizó IM-2 (2025) |
| 5 | Macizo Malapert | -86.00 | 2.9 | Una **montaña** grande |
| 6 | Borde del cráter Nobile | -85.40 | 37.0 | El **borde** del cráter Nobile |

## Convenciones (importante)
- **Latitud:** negativa = sur. El polo sur es -90.
- **Longitud:** usamos **0 a 360 hacia el este**. Si Quickmap muestra una longitud **negativa**, súmale 360. Por ejemplo, -68.0 se convierte en 292.0.

## Pasos
1. Abre **https://quickmap.lroc.asu.edu** en la laptop. Es un mapa de la NASA y la ASU con imágenes reales del satélite LRO.
2. Cambia la proyección a **polo sur** (en el menú de proyección, opción *South Polar* o *South Pole*). Así el polo queda en el centro y no se deforma.
3. Ve a la coordenada del sitio. Puedes usar el buscador o la opción de ir a una coordenada. Si no la encuentras, mueve el cursor: la latitud y longitud del cursor aparecen en la barra del mapa.
4. Activa una capa de **relieve** (por ejemplo, el relieve sombreado LOLA o el mapa de alturas). Si existe una capa de **iluminación** del polo, actívala también.
5. Responde para cada sitio:
   - ¿El punto cae en lo que dice la tabla (borde, cresta, montaña o meseta)? **Sí / No**.
   - Si no: mueve el cursor al lugar correcto **más cercano** y anota la latitud y longitud nuevas, con 2 decimales.
   - ¿Se ve muy iluminado o muy oscuro? Anota una línea.
6. Toma una **captura** de cada sitio con el punto visible. Nómbrala `quickmap_{numero}_{sitio}.png`.
7. Bonus (si sobra tiempo): abre el mismo sitio en **Moon Trek (https://trek.nasa.gov/moon/)** en vista 3D y toma una captura del relieve alrededor. Sirve para el pitch.

## Qué entregar a Rafael (copiar y llenar)

```
Sitio 1 Shackleton:   OK / CORREGIR → lat ____ lon ____ | nota: ________
Sitio 2 Connecting:   OK / CORREGIR → lat ____ lon ____ | nota: ________
Sitio 3 de Gerlache:  OK / CORREGIR → lat ____ lon ____ | nota: ________
Sitio 4 Mons Mouton:  OK / CORREGIR → lat ____ lon ____ | nota: ________
Sitio 5 Malapert:     OK / CORREGIR → lat ____ lon ____ | nota: ________
Sitio 6 Nobile:       OK / CORREGIR → lat ____ lon ____ | nota: ________
Capturas: (subir a la carpeta compartida del equipo)
```

## Por qué importa para el pitch
El jurado evalúa la **validez científica**. Poder decir *"verificamos cada sitio en Quickmap con imágenes del LRO"* y mostrar las capturas es evidencia directa. Joshua, tú presentas: entender estos 6 lugares te va a dar seguridad en las preguntas.
