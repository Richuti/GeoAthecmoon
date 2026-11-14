# Terrenos para Blender

Estos archivos los genera `npm run export-terrain` (dentro de `frontend/`) a partir de `public/data/sites/{id}.json`. No se suben al repo: si cambian los datos, se vuelven a generar.

| Archivo | Qué es |
|---|---|
| `{id}.obj` | Malla de 96×96 puntos, lista para importar. 1 unidad = 1 km. El sitio está en (0, 0, 0). El objeto se llama `Ground`. |
| `{id}.png` | Mapa de alturas en escala de grises de 16 bits, 1024×1024 y con el norte arriba. |
| `{id}.json` | Alturas reales (mínima, máxima, del sitio) y los valores exactos para el modificador *Displace*. |

> **Regla de oro:** no cambies la **forma grande** (montañas, cráteres y crestas). De ella salen el horizonte y los % de luz que muestra la app. Si cambia, las sombras del 3D dejan de coincidir con los números.
>
> Lo que sí puedes hacer: agregar detalle fino (rocas, regolito, cráteres de menos de 200 m y bordes más nítidos de no más de 10–20 m), materiales, color y textura.

---

## Opción A: importar el OBJ (recomendada)

1. **File → Import → Wavefront (.obj)** y elegir `{id}.obj`.
   - Deja los ejes por defecto: *Forward Axis* **-Z** y *Up Axis* **Y**.
   - Queda el norte hacia **+Y** de Blender y el este hacia **+X**.
2. Revisa que el objeto se llame `Ground` y mida 20 × 20 unidades. El sitio está en el origen.
3. **Detalle fino** (opcional):
   - Modificador *Subdivision Surface* en modo **Simple**, nivel 2 o 3.
   - Modificador *Displace* con una textura de ruido. Usa una fuerza baja: 0.002 a 0.01 (son 2 a 10 m, porque 1 unidad = 1 km).
4. **Material:** Principled BSDF, gris regolito (más o menos `#8a8a86`), con rugosidad alta (0.9 o más). Se pueden sumar texturas de detalle.
5. **Exportar** (ver abajo).

## Opción B: plano con Displace usando el PNG

1. **Add → Mesh → Plane.** Escálalo a 10 (queda en 20 × 20) y aplica la escala con **Ctrl+A → Scale**.
2. Subdivídelo: *Subdivision Surface* en modo **Simple**, nivel 7 a 8 en *Viewport* y *Render*. También sirve **Edit Mode → Subdivide** con muchos cortes.
3. Agrega un modificador **Displace**:
   - *Texture:* New → tipo **Image or Movie** → abrir `{id}.png`.
   - En la textura, el espacio de color va en **Non-Color**.
   - *Coordinates:* **UV**. *Direction:* **Z**.
   - *Strength* y *Midlevel*: copia `blenderDisplace.strengthKm` y `blenderDisplace.midlevel` del `{id}.json`. Con esos valores, el sitio queda a altura 0 en el centro.
4. El norte de la imagen (arriba) queda hacia **+Y** de Blender, que es lo correcto.
5. Renombra el objeto a `Ground`.

---

## Exportar a la app

1. Borra las cámaras y luces que agregaste para previsualizar. La app pone su propia luz del Sol.
2. **No hornees** la luz del Sol ni las sombras en las texturas, porque el Sol se mueve con el slider. La oclusión ambiental (AO) sí se puede hornear.
3. Selecciona `Ground` y lo que quieras incluir.
4. **File → Export → glTF 2.0** con estas opciones:
   - *Format:* **glTF Binary (.glb)**
   - *Include:* **Selected Objects**
   - *Transform:* **+Y Up** activado
   - *Data → Mesh:* **Apply Modifiers** activado
   - *Data → Compression:* **Draco** activado, si pesa más de 5 MB
5. Guarda en `frontend/public/models/terrain/{id}.glb`, por ejemplo `shackleton-rim.glb`.
6. **Límites:** menos de 200 000 triángulos y menos de 8 MB por terreno.

## Tips de escala

- 1 unidad = 1 km. El módulo de alunizaje (unos 4 m) mediría 0.004 unidades, por eso la app lo muestra agrandado como símbolo.
- Si al acercarte en Blender la vista recorta el terreno, baja *Clip Start* en View → *Clip Start/End*.
