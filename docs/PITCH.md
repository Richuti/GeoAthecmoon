# Pitch de 3 minutos · v3 (15 nov)

**Presenta:** Joshua. **Maneja la demo:** Richard. **Preguntas:** Richard responde sobre efemérides (Horizons) y Rafael sobre relieve y horizonte (LOLA).
**Presentación:** Canva `GeoAthecmoon_SpaceApps2026_ES`. La v2 tenía 6 diapositivas; esta versión propone 8 (entregable A).
**Fuentes de las cifras:** `README.md`, `docs/VALIDACION_NASA.md`, `docs/CASO_DEMO.md` y `npm test` en `main`. **Si la app muestra otro número, se dice el de la app.**

---

## 1. Diagnóstico de la v2

### Redundancias (Joshua leía la pantalla)
| Diapositiva v2 | En pantalla | Lo que decía Joshua | Arreglo en v3 |
|---|---|---|---|
| 3 · Solución | 6 · 8 760 · 150 km | «seis sitios… ocho mil setecientas sesenta horas… ciento cincuenta kilómetros» | La pantalla muestra las cifras y Joshua cuenta **qué significan** (hora por hora, el simulador no inventa números). |
| 4 · Demo | Lista de 4 pasos | Narraba los mismos 4 pasos | La diapositiva 5 solo muestra el antes y el después. La lista sale de la pantalla. |
| 5 · Validación | 6/6 · 89.5 % · 359 | Repetía 6/6 y 89.5 % | Joshua dice la comparación una vez y agrega lo que no está en pantalla: el eclipse y los límites. |

### Vacíos técnicos (estaban en el repositorio y no en el pitch)
- **El cómo:** ninguna diapositiva explicaba de dónde sale cada dato. La v3 suma un diagrama: Horizons y LOLA → horizonte → luz, contacto y batería.
- **La IA como diferenciador:** estaba escondida en la demo. La v3 le da su propia diapositiva con la idea clave: *la IA propone, el simulador decide*.
- **Tolerancia a atrasos:** la app calcula cuántos días aguanta el plan (4 días y 6 horas en la demo). Es la respuesta directa a la pregunta del reto y aparecía en un segundo plano.
- **Un eclipse real:** el cálculo detecta el eclipse del 17 ago 2027 visto desde Malapert (hasta 43 % del disco). Muestra que el modelo es físico, no una plantilla.
- **Relevancia:** faltaba nombrar a quién le importa: Artemis y CLPS apuntan al polo sur.

### Datos desactualizados (hay que corregirlos en Canva)
- **Dirección de la app:** las diapositivas 3 y 6 en español y el guion v2 dicen `geoathectum.vercel.app`, que hoy da **404**. La dirección correcta es **`geoathecmoon.vercel.app`**. En la versión en inglés ya se corrigió.
- **Pruebas:** la diapositiva dice 359. En `main` pasan **375** (`npm test`, 15 nov).

### Ritmo
- La v2 tenía 420 palabras, justo en el límite: con las pausas de la demo se pasaba de 3:00.
- La demo (1:10 a 2:15) cargaba con la demo, la IA y el mapa a la vez. La v3 los reparte en dos diapositivas y baja a unas 400 palabras.

---

## 2. Entregable A · Diapositivas (8)

Regla: **la diapositiva muestra el dato; Joshua cuenta el contexto.** Entre 5 y 20 palabras por diapositiva. Estética actual: fondo lunar oscuro, cristal neutro, ámbar solo para el Sol y azul solo para la Tierra.

| # | Título | Texto exacto en pantalla | Visual / layout en Canva | Criterio |
|---|---|---|---|---|
| 1 | Gancho | **¿Y si tu misión a la Luna se atrasa una semana?** · pequeño: «GEOATHECMOON · NASA Space Apps 2026» | La de ahora: Luna a sangre en la mitad inferior, pregunta centrada. | Presentación |
| 2 | Problema | **Un atraso de días puede apagar la misión** · «Sol a 2° del horizonte» | Video del horizonte (Sol ámbar, Tierra azul, crestas). Una flecha fina marca la cresta que tapa el Sol. | Relevancia |
| 3 | Solución | **Sitio + fecha + nave → ¿sobrevive?** · «6 sitios · 8 760 horas · 2027» | Captura del planificador con el resultado «95 %». Las tres cifras en grande debajo. | Impacto |
| 4 | Cómo funciona | **Datos NASA, hora por hora** · «JPL Horizons → Sol y Tierra» · «LRO LOLA → horizonte 150 km» · «→ luz · contacto · batería» | Diagrama de tres columnas con flechas: dos fuentes que se juntan en un horizonte polar (el gráfico de 360° de la app) y salen a tres íconos. | Validez científica |
| 5 | Demo | **15 ene: 95 % · +7 días: batería agotada** · «Tolera 4 d 6 h» | Dos franjas Sol/Tierra de «¿Y si la misión se atrasa?», una sobre otra, con la marca roja donde se agota la batería. Durante la demo, la pantalla pasa a la app. | Creatividad |
| 6 | Copiloto IA | **La IA propone. El simulador decide.** · «Esperar · cambiar de sitio · apagar instrumentos» | Captura del copiloto con las tarjetas de intentos simulados, a la izquierda, y del mapa de supervivencia (6 × 365), a la derecha. | Creatividad |
| 7 | Validación | **Validado contra la NASA** · **6/6** sitios a < 5 puntos · **89.5 %** vs 89 % publicado · **375** pruebas | Las tres cifras grandes de ahora. En pequeño, debajo: «Sin modelar todavía: temperatura, polvo, satélites de relevo». | Validez científica |
| 8 | Cierre | **Si el alunizaje se atrasa, ¿la misión todavía funciona?** · **geoathecmoon.vercel.app** · «EN / ES · Datos: JPL Horizons · LRO LOLA» | La Luna de la portada (cierra el círculo). Código QR a la app en una esquina. | Presentación |

---

## 3. Entregable B · Guion de Joshua (≈ 400 palabras, 2:50–3:00)

Ritmo: unas 135 palabras por minuto. Lo que va entre corchetes o en cursiva **no se dice**. Las **negritas** se enfatizan con la voz.

### [0:00 – 0:20] Gancho
`[SLIDE 1]` *(De pie, sin mirar la pantalla. Voz calmada.)*

> En el polo sur de la Luna hay hielo de agua, y crestas donde el Sol casi nunca se pone. Por eso Artemis y las misiones comerciales de la NASA quieren alunizar ahí.
>
> `[PAUSA 1s]`
>
> Pero hay un problema que casi nadie ve hasta que es demasiado tarde.

### [0:20 – 0:45] Problema
`[SLIDE 2]`

> Allí el Sol se arrastra por el horizonte, a un par de grados de altura. `[SEÑALAR LA CRESTA EN PANTALLA]` Una cresta a varios kilómetros basta para apagar los paneles o cortar la señal con la Tierra.
>
> Y los lanzamientos se atrasan. `[PAUSA 1s]` Entonces la pregunta es: **si mi misión se atrasa una semana, ¿todavía funciona?** Hoy, responderla exige cruzar a mano varias herramientas de expertos.

### [0:45 – 1:05] Solución
`[SLIDE 3]` *(Subir la energía. La primera frase, firme.)*

> GEOATHECMOON la responde **en segundos**. Eliges sitio, fecha y nave, y la app simula la misión completa, **hora por hora**, con datos oficiales de la NASA.
>
> `[PAUSA 1s]` *(Despacio, marcando cada palabra.)*
>
> Y tiene una regla: **el simulador no inventa números.**

### [1:05 – 1:25] Cómo funciona
`[SLIDE 4]` `[SEÑALAR LAS DOS FUENTES]`

> Las posiciones del Sol y de la Tierra vienen de JPL Horizons. El relieve, del altímetro LOLA del orbitador LRO: trazamos el horizonte en trescientas sesenta direcciones, con la curvatura de la Luna. Así sabemos, cada hora, si hay luz, si hay contacto y cuánta energía entra en la batería.

### [1:25 – 2:05] Demo en vivo
`[SLIDE 5]` `[DEMO EN VIVO]` *(Richard ya tiene abierto Malapert, 15 ene 2027, 14 días. Joshua narra lo que se ve; no se adelanta a la pantalla.)*

> Veámoslo. Macizo Malapert, quince de enero, catorce días en la superficie: **noventa y cinco por ciento** de viabilidad. La misión se completa.

*(Richard baja a «¿Y si la misión se atrasa?» y elige +1 semana.)*

> Ahora, una semana tarde. Mismo sitio, misma nave.
>
> `[PAUSA 2s]` *(Dejar que el jurado lea el resultado en rojo.)*
>
> **La batería se agota.** El Sol se esconde detrás del relieve. Y la app ya nos había avisado: este plan solo tolera **cuatro días y seis horas** de atraso.

### [2:05 – 2:25] Copiloto con IA
`[SLIDE 6]` *(Richard abre el copiloto de rescate. Tono de pregunta genuina.)*

> ¿Cómo la rescatamos? Un copiloto con inteligencia artificial combina opciones: esperar en órbita, cambiar de sitio, apagar instrumentos. Pero no le creemos a ciegas: **cada idea pasa por el simulador**, y solo queda el plan que sobrevive y envía más datos.

*(Richard baja al mapa de supervivencia.)*

> Y el mapa de supervivencia muestra los seis sitios, todo el año, de un vistazo.

*Si el copiloto tarda o falla: saltar al mapa. El plan que elige la IA cambia entre corridas: no se anuncia un sitio de memoria.*

### [2:25 – 2:45] Validación
`[SLIDE 7]` *(Tono serio, de quien rinde cuentas.)*

> ¿Se puede confiar en esto? Lo comparamos con el mapa oficial de iluminación de la NASA: `[SEÑALAR 6/6]` los seis sitios quedan **a menos de cinco puntos**. Incluso detecta el eclipse del diecisiete de agosto de dos mil veintisiete, visto desde Malapert.
>
> Todavía no modelamos temperatura ni polvo: es nuestro siguiente paso.

### [2:45 – 3:00] Cierre
`[SLIDE 8]` *(Volver al tono del inicio.)*

> Sirve a quien planifica una misión y a quien la estudia en un aula.
>
> `[PAUSA 1s]` *(La pregunta, lenta.)*
>
> Si el alunizaje se atrasa, ¿la misión todavía funciona? **Ahora cualquiera lo sabe en segundos.** Pruébenla hoy: geoathecmoon punto vercel punto app. Somos GeoAthectum. Gracias.

### Cobertura de la rúbrica
| Criterio | Dónde |
|---|---|
| Impacto | 2 (misión perdida por días) · 3 (respuesta en segundos) · 8 (planificadores y aulas) |
| Creatividad | 5 (tolerancia a atrasos) · 6 (IA verificada por el simulador) |
| Validez científica | 4 (Horizons + LOLA, curvatura) · 7 (6/6 contra NASA, eclipse, límites dichos) |
| Relevancia | 1 (Artemis y CLPS en el polo sur) · 2 (pregunta central del reto) |
| Presentación | Gancho y cierre con la misma pregunta; una idea por diapositiva |

## Si se pasa de 3:00
Se recorta en este orden, nunca la demo: la frase del eclipse (2:25), «con la curvatura de la Luna» (1:05) y «Sirve a quien planifica…» (2:45).

## Plan B
Video de 60 s con el mismo recorrido, por si falla el wifi. Build local con `npm run preview`.

## Datos de Joshua: qué se usa y qué no
- **Se usa:** hielo de agua en sombra permanente y crestas con luz casi todo el año (nuestro cálculo da 89.5 % en Connecting Ridge; está en la diapositiva 7).
- **No decir, porque la app muestra otra cosa:** «Nobile tiene pendientes suaves» (la app da 8.8° y 25 % de luz) y «Malapert ve la Tierra casi siempre» (la app da 75 %).
- **Solo para preguntas:** el conteo de misiones lunares, la gravedad, la cuenca Aitken, la réplica independiente en Python (coincide a menos de 0.5 puntos en 5 de 6 sitios) y la comparación de alturas con QuickMap.

## Pendientes
- [ ] Pasar las 8 diapositivas a Canva (ES) y corregir `geoathectum` → `geoathecmoon` y 359 → 375.
- [ ] Copiar el guion v3 a las notas del orador.
- [ ] Dilan: confirmar en producción el caso de Malapert (95 % y 4 días y 6 horas).
- [ ] Cronometrar y ensayar 3 veces completas.
