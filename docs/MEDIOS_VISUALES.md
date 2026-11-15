# Imágenes y videos · prompts para generar

Richard genera estos medios con su herramienta de IA y los guarda en `frontend/public/media/`. Se usan en la **portada narrativa con scroll** (tarea C3): el video avanza al ritmo del scroll y cuenta por qué el polo sur es difícil, antes de entrar al planificador.

Los prompts están en **inglés** porque los generadores rinden mejor así.

> **Cambio (14 nov, noche): la portada ya no usa videos.** Usa **5 imágenes fijas** (E1–E5, abajo). El movimiento lo pone el código: acercamiento y paneo lentos, el cambio de escena recortado con la silueta real del horizonte LOLA, y la imagen se oscurece cuando el relieve real tapa al Sol. Los videos V1–V5 quedan como referencia y ya no se cargan. Mientras no estén las imágenes nuevas, los archivos `escena-*.jpg` son copias de los pósters viejos.

## Portada con imágenes fijas (E1–E5) · lo que se usa ahora

**Formato de todas:** 16:9, **2560 × 1440** (o lo más grande que permita la herramienta). Guardar como JPG de calidad 82–85, de menos de 600 KB, en `frontend/public/media/` con el nombre exacto. Pegar al final de cada prompt el **bloque de estilo** y, si la herramienta lo acepta, el **negative prompt** de la sección «Reglas».

**Composición (importante para que el texto se lea):**
- El **tercio inferior izquierdo** queda oscuro y tranquilo, sin detalles: ahí va el título.
- La **línea del horizonte** va entre el 50 % y el 60 % de la altura.
- El código acerca la imagen hasta un 13 %, así que nada importante debe quedar pegado a los bordes.
- En el celular se recorta a lo alto. Por eso cada prompt dice dónde va el sujeto principal.

| Id | Archivo | Escena | Sujeto principal |
|---|---|---|---|
| E1 | `escena-1-amanecer.jpg` | El problema: la luz depende del relieve | Sol en el horizonte, a la derecha |
| E2 | `escena-2-sol.jpg` | La luz: el Sol gira y las sombras también | Sol a la izquierda, sombras largas cruzando |
| E3 | `escena-3-tierra.jpg` | La comunicación: la Tierra baja | Tierra asomando tras una cresta, un poco a la derecha |
| E4 | `escena-4-descenso.jpg` | La fecha: el módulo baja | Módulo en el centro, arriba |
| E5 | `escena-5-noche.jpg` | La noche: solo queda la batería | Módulo en el centro, casi a oscuras |

### E1 · Amanecer polar
```
Wide cinematic landscape at the lunar south pole. A jagged crater rim crosses the frame at mid-height;
only its upper crest is lit by the Sun, which sits right on the horizon on the right third of the frame,
half hidden by a distant mountain, a small intense white disc with a tight warm glow. The lit crest glows
amber, everything below the crest falls into deep black shadow. The bottom-left third of the frame is a
dark, calm, almost featureless slope in shadow. Horizon line at 55% of the height. Ultra sharp detail on
the lit rock, 16:9.
```

### E2 · El Sol que gira
```
Low-angle view across a wide, gently rolling lunar plain at the south pole. The Sun hugs the horizon on
the left third of the frame. Small rounded hills and boulders cast extremely long, razor-sharp black
shadows that stretch diagonally across the whole frame toward the lower right, like the hands of a
clock. Fine regolith texture catching the grazing light. The bottom-left corner stays dark and simple.
Horizon line at 55% of the height. 16:9.
```

### E3 · La Tierra baja
```
The Earth seen from the lunar south pole, very low on the horizon slightly right of center, about four
times wider than the full Moon looks from Earth, half of its disc hidden behind a dark mountain ridge in
silhouette. The Earth shows blue oceans and white clouds, lit from the side as a gibbous phase. The
ridge and the foreground are dark grey regolith with faint grazing amber light on a few rocks. Black sky.
The bottom-left third is dark and calm. Horizon line at 58% of the height. 16:9.
```

### E4 · Descenso
```
A small generic robotic lunar lander descending the last 50 meters toward a crater rim at the lunar
south pole, centered in the upper half of the frame. Four landing legs with round footpads, gold and
silver thermal foil, one flat solar panel and a small dish antenna, no logos, no markings. A faint,
almost invisible engine plume; regolith dust blown radially outward in straight lines close to the
ground (no air, no billowing smoke). Low grazing sunlight from the right, long shadow of the lander on
the ground below. The bottom-left third stays dark. 16:9.
```

### E5 · Noche lunar
```
The same generic lunar lander standing on the regolith at the lunar south pole just after the Sun has
set behind a mountain ridge. Only a thin amber rim of light remains on the very top of the ridge in the
background. The lander, centered, is almost in darkness, softly lit by faint cold bluish earthshine, with
two tiny green status lights and frost-like highlights on the foil. Long darkness across the
foreground. Black sky. The bottom-left third is very dark. Horizon line at 52% of the height. 16:9.
```

---

## Reglas (importante)

1. **Son ilustraciones, no datos.** La app no menciona la IA en ningún lugar (decisión de Richard, 14 nov); solo dice *"Ilustración · los datos no salen de la imagen"*. Los datos (luz, horizonte, Sol y Tierra) siempre salen de JPL Horizons y del terreno, nunca de estas imágenes.
2. **Sin marcas ni misiones reales:** sin logos de NASA, banderas, nombres, ni módulos reconocibles (Nova-C, Starship, Blue Ghost, etc.). El módulo es genérico y propio, como el `lander.glb` de Richard.
3. **Física correcta**, que el jurado lo nota:
   - Cielo **negro** (no hay atmósfera) y sin estrellas, porque la exposición del suelo iluminado las borra.
   - Sol **muy bajo** sobre el horizonte, con sombras larguísimas.
   - Sin aire: nada de bruma, nubes ni polvo flotando como humo.
4. **Sin texto en la imagen.** Los títulos los pone la app, en su tipografía.

### Bloque de estilo (pegar al final de **todos** los prompts, para que salgan coherentes)

```
Photorealistic, cinematic, lunar south pole. Pure black sky, no atmosphere, no haze, no stars.
The Sun sits just 1 to 2 degrees above the horizon: hard low-angle grazing sunlight, extremely long
sharp shadows, crater floors in deep permanent shadow. Grey regolith, rugged crater rims, high
contrast. Warm amber sunlight (#FFB547), cool neutral shadows. Shot on a 35mm cinema lens, subtle
film grain. No text, no logos, no flags, no people.
```

### Lo que hay que evitar (*negative prompt*, si la herramienta lo acepta)

```
blue sky, atmosphere, haze, clouds, fog, stars, galaxy, nebula, planets other than Earth, sun high in
the sky, soft shadows, text, letters, watermark, logo, NASA logo, flag, astronaut, recognizable
spacecraft, cartoon, illustration style, oversaturated colors, lens flare streaks
```

---

## Especificaciones técnicas

### Videos para scroll (V1–V5)
- **Formato:** 16:9 en 1920×1080. Si la herramienta lo permite, también una versión **9:16** (1080×1920) para el móvil, con el sufijo `-vertical`.
- **Duración:** 6 a 10 s, a 24–30 fps.
- **Una sola toma**, sin cortes, con un movimiento de cámara **lento y continuo**. Al hacer scroll el video avanza y retrocede, así que cualquier salto se nota.
- Sin audio.
- **Después de generarlo,** convertirlo para que el scroll vaya fluido (un fotograma clave cada 4) y liviano:

```bash
ffmpeg -i entrada.mp4 -vf "scale=1280:-2" -c:v libx264 -preset slow -crf 23 -g 4 -keyint_min 4 \
  -pix_fmt yuv420p -an -movflags +faststart v1-amanecer-polar.mp4
ffmpeg -i v1-amanecer-polar.mp4 -vframes 1 -q:v 3 v1-amanecer-polar.jpg   # póster (primer cuadro)
```

- **Peso objetivo:** menos de 6 MB por video. Si pesa más, subir `-crf` a 26.

### Imágenes (I1–I2)
- PNG o JPG de alta calidad, en el tamaño indicado.

---

## Lista de medios

| Id | Archivo | Para qué |
|---|---|---|
| V1 | `v1-amanecer-polar.mp4` | Portada: primera pantalla |
| V2 | `v2-sol-que-gira.mp4` | "La luz da vueltas": el Sol rodea el horizonte |
| V3 | `v3-tierra-baja.mp4` | "Hablar con la Tierra": la Tierra asoma tras una cresta |
| V4 | `v4-descenso.mp4` | "Elegir dónde bajar": el módulo descendiendo |
| V5 | `v5-noche-lunar.mp4` | "La noche": el módulo cuando el Sol se oculta |
| I1 | `i1-fondo-og.jpg` (1200×630) | Fondo de la imagen para compartir en redes. El texto se pone aparte. |
| I2 | `i2-borde-crater.jpg` (2400×1200) | Imagen de respaldo de la portada, si el video no carga. |

---

### V1 · Amanecer polar (portada)

> La primera imagen tiene que transmitir "aquí el Sol apenas roza el suelo".

```
Slow aerial dolly forward and slightly upward over a jagged crater rim at the lunar south pole.
The Sun is a small intense disc barely touching the far horizon on the right, its light skimming
across the tops of the peaks while the valleys below stay in total black shadow. The camera rises
until a vast dark crater opens below, its floor never touched by sunlight. Continuous single shot,
no cuts, 8 seconds.
```
*(+ bloque de estilo)*

### V2 · El Sol que gira

> La idea clave del polo: el Sol **no sube ni baja**, da la vuelta al horizonte en unos 29 días. Las sombras giran como las agujas de un reloj.

```
Time-lapse from a fixed tripod on a high crater rim at the lunar south pole, looking across a wide
cratered plain. The Sun stays just above the horizon and slowly travels sideways along it, from left
to right, never rising higher. Extremely long shadows of boulders and hills rotate across the ground
like clock hands. A distant ridge briefly blocks the Sun, plunging the foreground into shadow, then
the light returns. Single continuous shot, locked-off camera, 8 seconds.
```
*(+ bloque de estilo)*

### V3 · La Tierra baja

> Desde el polo, la Tierra está siempre cerca del horizonte y se mueve un poco por la libración: a veces una cresta la tapa y se pierde el contacto.

```
Slow pan from a dark jagged lunar ridge to reveal planet Earth, small and bright, hanging very low
above the horizon, half hidden behind the ridge line. Earth shows a crescent phase with blue oceans
and white clouds, apparent size about four times the Sun's. Grazing sunlight from the side lights
the ridge edges amber. Earth slowly sinks behind the ridge by the end of the shot. Single continuous
shot, 8 seconds.
```
*(+ bloque de estilo)*

### V4 · Descenso

> El módulo es **genérico**: cuerpo octogonal compacto, cuatro patas, un panel solar vertical y una antena parabólica. Debe parecerse al `lander.glb` que modela Richard.

```
A compact generic robotic lunar lander descends slowly toward a sunlit spot on a crater rim at the
lunar south pole. Octagonal body wrapped in gold and silver thermal foil, four landing legs, one
tall vertical solar panel on a mast, one small dish antenna. Its long shadow stretches far across
the regolith as it nears the ground. A faint plume of displaced dust spreads outward in straight
lines, with no billowing (vacuum). Camera follows from a low side angle. Single continuous shot,
8 seconds. No logos or markings.
```
*(+ bloque de estilo)*

### V5 · Noche lunar

> Cierra la historia: cuando el Sol se oculta, el módulo vive de su batería. Es el motivo del simulador.

```
A compact generic robotic lunar lander stands on a crater rim at the lunar south pole as the last
sliver of the Sun disappears behind a distant ridge. The amber light retreats across the ground and
the lander falls into deep shadow, lit only by faint blue earthshine from a small low Earth on the
horizon. One tiny green status light on the lander keeps blinking. Slow push-in, single continuous
shot, 8 seconds. No logos or markings.
```
*(+ bloque de estilo)*

### I1 · Fondo para compartir (1200×630)

```
Wide cinematic view of the lunar south pole at grazing sunlight: a long jagged crater rim lit amber
on its top edge, a huge crater in deep black shadow below, a tiny bright Earth low on the horizon at
the far right. Large empty black sky in the upper left two thirds for a title. 1200x630.
```
*(+ bloque de estilo)*

### I2 · Borde de cráter (respaldo de la portada, 2400×1200)

```
Panoramic view along the rim of a large crater at the lunar south pole, the Sun a small disc on the
horizon at the right, hard grazing light painting only the highest ridges amber while everything
below is pitch black. Composition with a calm, dark lower third. 2400x1200.
```
*(+ bloque de estilo)*

---

## Estado de los medios

**Procesados y en uso** en `frontend/public/media/` (portada C3.1). Para reemplazar uno regenerado, vuelve a convertirlo con el mismo nombre. El V3 y el V5 siguen con la Tierra grande, y el V4 con el polvo en nubes.

| Id | Estado | Revisión |
|---|---|---|
| V1 Amanecer polar | Recibido (1280×720, 24 fps, 7.9 s) | ✅ Muy bueno. Cielo negro, luz rasante, cráter en sombra. El Sol se ve grande, pero como licencia cinematográfica sirve. |
| V2 El Sol que gira | Recibido (1280×720, 24 fps, 7.9 s) | ⚠️ Sirve. Trae marcos de película con números arriba y abajo; se recortan al convertirlo. Tiene destellos de lente. |
| V3 Tierra baja | Recibido (1280×720, 24 fps, 7.9 s) | ❌ Conviene regenerarlo. La Tierra sale gigante (debería medir unos 2°, como un pulgar con el brazo estirado) y sube en vez de bajar. También trae marcos de película. |
| V4 Descenso | Recibido (1280×720, 24 fps, 7.9 s) | ⚠️ El módulo **despega** en vez de aterrizar (se puede invertir con `-vf reverse`). El polvo hace nubes como en la Tierra; en el vacío debería salir en líneas rectas y caer enseguida. Trae marcos de película. |
| V5 Noche lunar | Recibido (1280×720, 24 fps, 7.9 s) | ⚠️ La idea funciona: se va el Sol, queda la luz de la Tierra y titila la luz verde de estado. Pero la Tierra sale gigante, como en el V3. Trae marcos de película. |
| I1 Fondo para compartir | Recibido (1731×909) | ✅ Excelente. La Tierra tiene el tamaño correcto y hay espacio para el título. Se ajusta a 1200×630 casi sin recortar. |
| I2 Borde de cráter | Recibido (1774×887) | ✅ Excelente. El Sol es chico y rasante, y la parte de abajo queda oscura para poner texto. |

Para el polvo del V4, agregar: *"dust sprays outward in straight radial streaks and falls immediately, no billowing clouds (vacuum)"*.

Para regenerar el V3 y el V5, agregar al prompt: *"Earth appears small in the sky, only about 2 degrees wide (the size of a thumbnail at arm's length), roughly four times the Sun's disc. No film border, no frame numbers, no lens flare."*

Todos traen audio; se quita al convertirlos (`-an`).

## Cómo entregarlos

1. Guarda los archivos en `frontend/public/media/` con los nombres exactos de la tabla.
2. Para los videos, sube **el original** y la versión convertida con `ffmpeg` (o solo el original y la conversión la hago yo).
3. Dime cuáles subiste. La portada se arma con lo que haya, y lo que falte usa la imagen de respaldo.
