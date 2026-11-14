# Plan de la hackatón · GeoAthectum

**Entrega (H):** domingo 15 nov, **13:00** (meta interna: no hay hora oficial todavía; si la anuncian, se ajusta)
**Fechas clave:** plan B del relieve sáb 23:00 · pitch en borrador dom 05:00 · feature freeze dom 07:00 · deploy final dom 08:00 · ensayos dom 10:00–12:30
**Frase de valor:** *En 10 segundos sabes si un sitio y una fecha sirven en el polo sur lunar, y qué pasa si tu misión se retrasa.*
**Momento wow de la demo:** "la misión se retrasa". Se mueve la fecha unos días, la Tierra queda tapada por el relieve real, el simulador muestra que la misión no sobrevive y la app recomienda otro sitio u otra fecha.

## Hitos

| Hito | Responsable | Estado | Meta |
|---|---|---|---|
| 3.2 Sol y Tierra reales (JPL Horizons) | Richard | ✅ | — |
| B1 DEM LOLA 80 m: lector y prueba de cordura | Rafael | 🔄 descargando | sáb 12:00 |
| ⚠ Richard: modelar en Blender sobre el relieve **real** (no el sintético) | Richard | ⏳ espera B3 | sáb 14:00 |
| B2 Horizonte, pendiente y terreno reales | Rafael | 🔄 código escrito | sáb 13:00 |
| B3 JSON finales (LOLA + Horizons) en `backend/out/` | Rafael | ⏳ | sáb 14:00 |
| Entregar el terreno real a Richard para Blender | Rafael → Richard | ⏳ | sáb 14:00 |
| C0, 4, 5, S1, S2 (diseño, datos, cálculos, simulador) | Richard | ⏳ | sáb noche |
| 3.3 Verificar coordenadas en Quickmap (`docs/VERIFICACION_SITIOS.md`) | Dilan y Joshua | ⏳ | sáb 15:00 |
| B4 Validación con Quickmap y Moon Trek (capturas) | Rafael, Joshua y Dilan | ⏳ | sáb 18:00 |
| Primer deploy en Vercel (aunque esté incompleto) | Richard y Rafael | ⏳ | sáb 22:00 |
| Guion del pitch en borrador | Odelmy y Joshua | ⏳ | dom 05:00 |
| Feature freeze | todos | ⏳ | dom 07:00 |
| Deploy final y video de respaldo | Richard y Odelmy | ⏳ | dom 08:00 |
| Ensayos del pitch (3 completos) | Joshua y todos | ⏳ | dom 10:00–12:30 |

## Turnos de sueño
Nadie debe pasar más de 20 h despierto. Rafael y Richard no duermen al mismo tiempo. (Por definir.)

## Si sobra tiempo (en orden inverso de recorte)
Comparador (10), textura LRO (9.5), globo de portada (M2), sliders de pesos, animación 3D, servidor en vivo con coordenadas libres.
