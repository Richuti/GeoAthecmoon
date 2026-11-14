# Plan de la hackatón · GeoAthectum

**Entrega (H):** domingo 15 nov, **13:00** (meta interna: no hay hora oficial todavía; si la anuncian, se ajusta)
**Fechas clave:** plan B del relieve sáb 23:00 · pitch en borrador dom 05:00 · feature freeze dom 07:00 · deploy final dom 08:00 · ensayos dom 10:00–12:30
**Frase de valor:** *En 10 segundos sabes si un sitio y una fecha sirven en el polo sur lunar, y qué pasa si tu misión se retrasa.*
**Momento wow de la demo:** "la misión se retrasa". Se atrasa el alunizaje unos días: el **Sol** queda tras el relieve real, la batería cae a su mínimo del **20 %** (falla) y la app dice cuánto atraso tolera la misión y qué fecha o sitio la salva. (La Tierra tapada solo corta el envío de datos, no la energía.)

## Hitos

| Hito | Responsable | Estado | Meta |
|---|---|---|---|
| 3.2 Sol y Tierra reales (JPL Horizons) | Richard | ✅ | — |
| B1 DEM LOLA 80 m: lector y prueba de cordura | Rafael | ✅ (coincide con QuickMap ±80 m) | sáb 12:00 |
| Datos LOLA en la app (`python backend/export.py`) y terreno real para Blender (`npm run export-terrain`) | Rafael | ✅ (85/85 pruebas; % de luz TS = Python) | sáb 14:00 |
| ⚠ Richard: modelar en Blender sobre el relieve **real** (no el sintético) | Richard | ⏳ | sáb 16:00 |
| Richard: actualizar `frontend/scripts/sites.mjs` con las coordenadas de `backend/sites_verified.json` y correr `npm run horizons` (hoy hay un desfase de hasta 0.07°); luego Rafael corre `build.py` + `export.py` | Richard → Rafael | ⏳ | sáb 17:00 |
| Borrador del pitch (`docs/PITCH.md`) | Rafael | ✅ v1 | sáb 14:00 |
| B2 Horizonte, pendiente y terreno reales | Rafael | ✅ | sáb 13:00 |
| B3 JSON finales (LOLA + Horizons) en `backend/out/`, con 4 sitios movidos a la cresta | Rafael | ✅ | sáb 14:00 |
| B5 Caso de la demo (`docs/CASO_DEMO.md`, réplica del simulador S2/S3 en Python) | Rafael | ✅ | sáb 17:00 |
| Confirmar en QuickMap las 6 coordenadas (`backend/sites_verified.json`) con marcador visible | Dilan y Joshua | ⏳ | sáb 16:00 |
| Decidir con Richard si el repo será público para el jurado | Rafael y Richard | ⏳ | sáb 18:00 |
| Entregar el terreno real a Richard para Blender | Rafael → Richard | ⏳ | sáb 14:00 |
| C0, 4, 5, S1, S2 (diseño, datos, cálculos, simulador) | Richard | ⏳ | sáb noche |
| 3.3 Verificar coordenadas en Quickmap (`docs/VERIFICACION_SITIOS.md`) | Dilan y Joshua | ⏳ | sáb 15:00 |
| B4 Validación con Quickmap y Moon Trek (`docs/VALIDACION.md`; nuestros valores en `docs/validacion/`) | Rafael, Joshua y Dilan | ⏳ | sáb 18:00 |
| Fuentes publicadas de iluminación de los 6 sitios (artículos o páginas de NASA con su enlace) para la diapositiva de validación | Joshua | ⏳ | sáb 20:00 |
| Explicar en 30 s el panorama del horizonte (`docs/validacion/malapert-massif_horizonte.png`) y el caso de la demo (`docs/CASO_DEMO.md`) | Joshua | ⏳ | sáb 21:00 |
| Storyboard del video de respaldo de 60 s con los clics de `docs/CASO_DEMO.md` | Odelmy | ⏳ | sáb 20:00 |
| Esqueleto de las diapositivas (problema, demo, validación, limitaciones, equipo) | Odelmy | ⏳ | sáb 22:00 |
| Decidir el nombre público: "GeoAthectum" o "Simulador" (hoy no coinciden el doc de identidad y la app) | Odelmy y equipo | ⏳ | sáb 18:00 |
| Primer deploy en Vercel (aunque esté incompleto) | Richard y Rafael | ⏳ | sáb 22:00 |
| Guion del pitch en borrador | Odelmy y Joshua | ⏳ | dom 05:00 |
| Feature freeze | todos | ⏳ | dom 07:00 |
| Deploy final y video de respaldo | Richard y Odelmy | ⏳ | dom 08:00 |
| Ensayos del pitch (3 completos) | Joshua y todos | ⏳ | dom 10:00–12:30 |

## Turnos de sueño
Nadie debe pasar más de 20 h despierto. Rafael y Richard no duermen al mismo tiempo. (Por definir.)

## Si sobra tiempo (en orden inverso de recorte)
Comparador (10), textura LRO (9.5), globo de portada (M2), sliders de pesos, animación 3D, servidor en vivo con coordenadas libres.
