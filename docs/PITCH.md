# Pitch de 3 minutos · borrador v1

**Presenta:** Joshua. **Maneja la demo:** Richard. **Preguntas:** Richard responde sobre efemérides (Horizons) y Rafael sobre relieve y horizonte (LOLA).
Son unas 420 palabras habladas, con máximo 6 diapositivas, y la demo es el centro. **Si se pasa de 3:00, se recorta la sección 4, nunca la demo.**
Todos los números salen de `docs/CASO_DEMO.md`. Si la app muestra otros números, se usan los de la app.

---

### 0:00–0:25 · Gancho (diapositiva 1: foto del polo sur lunar)
> "Imaginen que su lanzamiento a la Luna se retrasa cinco días. ¿Su sitio de alunizaje en el polo sur todavía tendrá sol para los paneles? ¿Podrá hablar con la Tierra? Hoy, responder eso exige combinar tres herramientas de expertos de la NASA. Nosotros lo respondemos en diez segundos."

### 0:25–0:55 · Problema (diapositiva 2: el panorama del horizonte de Malapert)
> "En el polo sur, el Sol nunca sube alto: da vueltas rozando el horizonte, a menos de cinco grados. Una montaña a 50 kilómetros basta para dejarte días a oscuras. La Tierra también está baja, y si se esconde, no hay comunicación. Herramientas como JPL Horizons, Quickmap o Moon Trek tienen los datos, pero no te dicen si tu misión sobrevive, ni qué pasa si cambias la fecha."

### 0:55–2:05 · Demo en vivo (la app; con el video de 60 s como respaldo)
1. **Elegir el sitio:** "Elegimos el Macizo Malapert, una montaña de cara a la Tierra. Aquí está su relieve real en 3D."
2. **Plan original, 15 de enero, Explorador ligero:** "Viabilidad del 95 %. Sol el 100 % del tiempo, la Tierra visible el 85 %. Simulamos los 14 días hora por hora: la batería nunca baja."
3. **El retraso, en «¿Y si la misión se atrasa?»:** "La app ya nos dice que este plan tolera atrasos de hasta 4 días y 6 horas. ¿Y si el lanzamiento se atrasa una semana? … No: con 7 días de atraso, el Sol pasa más tiempo escondido detrás del relieve, la luz cae del 100 % al 73 % y la batería se agota." *(Respaldo: la fecha a mano el 20 de enero → falla el 2 de febrero y la viabilidad cae al 40 %.)*
4. **La recomendación:** "La app no solo dice que falla, también propone salidas: esperar en órbita y alunizar en Malapert el 11 de febrero, cambiar a de Gerlache, que tiene sol pero envía solo un tercio de los datos, o apagar instrumentos. Las tres están simuladas con los mismos datos. Es el compromiso real entre energía y comunicación."

### 2:05–2:30 · Ciencia y datos (diapositiva 3: logos de NASA y capturas de Quickmap)
> "Nada de esto es inventado. Las posiciones del Sol y la Tierra vienen de JPL Horizons, hora por hora. El relieve viene del altímetro LOLA del Lunar Reconnaissance Orbiter: calculamos el horizonte en 360 direcciones, hasta 150 kilómetros y con la curvatura de la Luna. Validamos alturas e iluminación contra Quickmap y los artículos publicados: en Connecting Ridge nos da 89.5 % de luz en un año, y Mazarico publica 89 %. ¿Qué no modelamos? La temperatura, el polvo y los satélites de relevo. Ese es nuestro siguiente paso."

### 2:30–2:50 · Impacto (diapositiva 4)
> "Esto sirve a quienes planifican misiones CLPS y Artemis, que necesitan replanificar rápido cuando hay retrasos. También sirve a docentes y al público, para entender por qué el polo sur es tan difícil. Los próximos pasos son coordenadas libres, más sitios y satélites de relevo."

### 2:50–3:00 · Cierre (diapositiva 5: nombre, lema y equipo)
> "En 10 segundos sabes si un sitio y una fecha sirven en el polo sur lunar, y qué pasa si tu misión se retrasa. Esto es GEOATHECMOON. Somos el equipo GeoAthectum. Gracias."

---

## Pendientes para pulir (Odelmi y Joshua)
- [x] Nombre: la app se llama **GEOATHECMOON** y el equipo, **GeoAthectum**.
- [ ] Agregar en la diapositiva 3 las capturas de Quickmap y Moon Trek (B4) y las fuentes publicadas que encuentre Joshua.
- [ ] Cronometrar y ajustar a 3:00 exactos. Ensayar 3 veces completas.
- [ ] Respuestas a preguntas del jurado: sección 4C de `docs/GUIAS_EQUIPO.docx`.
