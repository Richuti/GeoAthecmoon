# Pitch de 3 minutos · v2 (15 nov)

**Presenta:** Joshua. **Maneja la demo:** Richard. **Preguntas:** Richard responde sobre efemérides (Horizons) y Rafael sobre relieve y horizonte (LOLA).
**Presentación:** Canva `GeoAthecmoon_SpaceApps2026_ES` (6 diapositivas).
Las cifras salen de `README.md`, `docs/VALIDACION_NASA.md` y `docs/CASO_DEMO.md`. **Si la app muestra otro número, se dice el de la app.**

## Texto de cada diapositiva

| # | Diapositiva | Texto | Criterio del jurado |
|---|---|---|---|
| 1 | Portada | Pregunta grande: **«¿Y si tu misión a la Luna se atrasa una semana?»**. Debajo, en pequeño: «GEOATHECMOON · NASA Space Apps Challenge 2026 · Lunar Landing Site Navigator». | Presentación |
| 2 | Problema | Título: **«Un atraso de días puede apagar la misión»**, sobre el panel del horizonte con el Sol y la Tierra. Una línea: «El Sol nunca sube más de un par de grados. Una cresta lejana basta para dejarte sin energía o sin la Tierra.» | Relevancia, Impacto |
| 3 | Solución | Título: «Planea un alunizaje con datos reales de la NASA» · «Sol y Tierra: JPL Horizons · Relieve: LRO LOLA». Tres cifras grandes: **6** sitios reales del polo sur · **8 760** horas de 2027 · **150 km** de relieve en cada horizonte. Captura pequeña de la app y la dirección. | Validez, Relevancia |
| 4 | Demo | «Demo en vivo»: 1. Malapert, 15 de enero: viabilidad 95 % · 2. Una semana de atraso: sin energía · 3. Copiloto con IA: cada idea se simula · 4. Mapa: 6 sitios × 365 días | Creatividad |
| 5 | Validación e impacto | Título: **«Validado contra la NASA»**. Tres cifras grandes: **6 / 6** sitios a menos de 5 puntos del mapa oficial de iluminación LOLA · **89.5 %** de luz en Connecting Ridge (publicado: 89 %) · **359** pruebas automáticas. Debajo: «Para planificadores de CLPS y Artemis, docentes y público general. Sin modelar todavía: temperatura, polvo ni satélites de relevo.» | Validez, Impacto |
| 6 | Cierre | Frase grande: **«Si el alunizaje se atrasa, ¿la misión todavía funciona? Ahora cualquiera lo sabe en segundos.»** Debajo: dirección de la app, EN / ES, y las fuentes. | Presentación |

## Guion de Joshua

Ritmo: unas 135 palabras por minuto. Lo que va entre corchetes o en cursiva no se dice.

### [0:00 – 0:30] Gancho · diapositiva 1, luego 2
*(De pie, sin mirar la pantalla. Voz calmada, casi de cuento.)*

> En el polo sur de la Luna hay hielo de agua, y crestas donde el Sol brilla casi todo el año. Por eso todos quieren alunizar ahí.

`[CAMBIO DE SLIDE → 2]`

> Pero el Sol nunca sube más de un par de grados sobre el horizonte: una montaña a kilómetros basta para dejarte a oscuras, o sin contacto con la Tierra.

*(Pausa de un segundo. Mirar al jurado.)*

> Ahora imaginen que su lanzamiento se atrasa una semana. ¿La misión todavía funciona? Hoy, responder eso exige combinar varias herramientas de expertos.

### [0:30 – 1:10] Solución y datos de NASA · diapositiva 3
`[CAMBIO DE SLIDE → 3]` *(Subir la energía. La primera frase, firme.)*

> Nosotros lo respondemos en diez segundos. Esto es GEOATHECMOON: un planificador y simulador de misiones para el polo sur lunar.
>
> Compara seis sitios reales durante todo dos mil veintisiete, hora por hora: ocho mil setecientas sesenta horas por sitio. Las posiciones del Sol y de la Tierra vienen de JPL Horizons. El relieve viene del altímetro LOLA, del orbitador LRO: calculamos el horizonte en trescientas sesenta direcciones, hasta ciento cincuenta kilómetros.
>
> Con eso simulamos su nave: batería, paneles y envío de datos.

*(Despacio, marcando cada palabra.)*

> Nuestra regla: el simulador no inventa números.

### [1:10 – 2:15] Demo en vivo e IA · diapositiva 4 y la app
`[CAMBIO DE SLIDE → 4]` `[MOSTRAR DEMO]` *(Richard ya tiene abierto Malapert, 15 ene 2027, 14 días. Joshua narra lo que se ve; no se adelanta a la pantalla.)*

> Veámoslo. Elegimos el Macizo Malapert y alunizamos el quince de enero, catorce días. Viabilidad: noventa y cinco por ciento. Hay sol todo el tiempo y la misión se completa.

*(Richard baja a «¿Qué pasa si llegas más tarde?» y elige +1 semana.)*

> Ahora, el atraso. Una semana después, mismo sitio, misma nave.

*(Pausa de dos segundos: dejar que el jurado lea el resultado en rojo.)*

> La misión se queda sin energía: el Sol se esconde detrás del relieve y la batería llega a su mínimo. La app nos dice además cuánto atraso admite el plan: cuatro días y seis horas.

*(Richard abre el copiloto de rescate. Tono de pregunta genuina.)*

> ¿Y cómo la rescatamos? Aquí entra la inteligencia artificial. El copiloto propone combinaciones: esperar, cambiar de sitio, apagar instrumentos. Pero no le creemos a ciegas: cada idea se comprueba con el simulador, y solo queda el plan que sobrevive y envía más datos.

*(Richard baja al mapa de supervivencia.)*

> Y con el mapa de supervivencia vemos los seis sitios, los trescientos sesenta y cinco días, de un vistazo: dónde y cuándo la misión sobrevive.

*Si el copiloto tarda o falla: saltar directo al mapa de supervivencia. El plan que elige la IA cambia entre corridas: no se anuncia un sitio de memoria.*

### [2:15 – 2:45] Validación, impacto y escalabilidad · diapositiva 5
`[CAMBIO DE SLIDE → 5]` *(Tono serio, de quien rinde cuentas.)*

> ¿Se puede confiar en esto? Lo comparamos con el mapa oficial de iluminación de la NASA: en los seis sitios quedamos a menos de cinco puntos. En Connecting Ridge calculamos ochenta y nueve y medio por ciento de luz; lo publicado es ochenta y nueve.
>
> No modelamos temperatura, polvo ni satélites de relevo: es el siguiente paso. Agregar más sitios es volver a correr el mismo proceso.
>
> Sirve a quien planifica una misión, y a quien quiere entenderla en un aula.

### [2:45 – 3:00] Cierre · diapositiva 6
`[CAMBIO DE SLIDE → 6]` *(Volver al tono del inicio. La pregunta, lenta.)*

> Si el alunizaje se atrasa, ¿la misión todavía funciona?

*(Pausa.)*

> Ahora cualquiera puede saberlo en segundos. Pruébenla hoy, en inglés o en español: geoathectum punto vercel punto app. Somos GeoAthectum. Gracias.

## Si se pasa de 3:00
Se recorta en este orden, nunca la demo: la frase del aula (2:15), «agregar más sitios…», y el detalle de las trescientas sesenta direcciones (0:30).

## Plan B
Video de 60 s con el mismo recorrido, por si falla el wifi. Build local con `npm run preview`.

## Datos de Joshua: qué se usa y qué no
- **Se usa en el gancho:** hielo de agua en sombra permanente y crestas con luz casi todo el año (nuestro cálculo da 89.5 % en Connecting Ridge).
- **No decir, porque la app muestra otra cosa:** «Nobile tiene pendientes suaves» (la app da 8.8° y 25 % de luz) y «Malapert ve la Tierra casi siempre» (la app da 75 %).
- **Solo para preguntas:** el conteo de misiones lunares, la gravedad y la cuenca Aitken.

## Pendientes
- [x] Textos y notas del orador pasados a Canva (ES).
- [ ] Dilan: confirmar en producción los textos de «¿Qué pasa si llegas más tarde?» (Richard los cambió en `33198b4`) y que el caso de Malapert sigue dando 95 % y 4 días y 6 horas.
- [ ] Cronometrar y ensayar 3 veces completas.
- [ ] Guion de 30 s en inglés para el portal de NASA (espera el visto bueno de este guion).
