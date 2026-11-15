# Plan de la hackatón · GeoAthectum

**Entrega (H):** domingo 15 nov, **13:00** (meta interna: no hay hora oficial todavía; si la anuncian, se ajusta)
**Checkpoint sáb 23:35:** 🟢. La rama `frontend` ya está en `main` y desplegada en `https://geoathectum.vercel.app` (prueba de humo: 200 y datos con las coordenadas nuevas). El caso de la demo sigue igual con los datos nuevos (réplica en Python: falla el 2 feb a las 10:00 y viabilidad del 40 % el 20 ene). Falta: merge del PR #1 (sin conflictos con `main`), revisión de D2, SU7 y 12, y el congelamiento del pulido visual. IA1 queda fuera de esta entrega.
**Checkpoint sáb 18:40:** 🟡. Coordenadas corregidas y PR #1 sin conflictos.
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
| Coordenadas verificadas en la rama `frontend` + un año de datos (D1) | Richard | ✅ sáb 18:11. Caso de la demo verificado con su simulador: falla el 2 feb a las 10:00 y tolera 4.25 días | — |
| Borrador del pitch (`docs/PITCH.md`) | Rafael | ✅ v1 | sáb 14:00 |
| B2 Horizonte, pendiente y terreno reales | Rafael | ✅ | sáb 13:00 |
| B3 JSON finales (LOLA + Horizons) en `backend/out/`, con 4 sitios movidos a la cresta | Rafael | ✅ | sáb 14:00 |
| B5 Caso de la demo (`docs/CASO_DEMO.md`, réplica del simulador S2/S3 en Python) | Rafael | ✅ | sáb 17:00 |
| Confirmar en QuickMap las 6 coordenadas (`backend/sites_verified.json`) con marcador visible | Dilan y Joshua | ✅ 6/6 (`docs/validacion/quickmap_marcadores_dilan.pdf`) | sáb 16:00 |
| Decidir con Richard si el repo será público para el jurado | Rafael y Richard | ⏳ | sáb 18:00 |
| Entregar el terreno real a Richard para Blender | Rafael → Richard | ⏳ | sáb 14:00 |
| C0, 4, 5, S1, S2, SU1–SU3, C3 (portada), 9 (visor 3D con luz desde los datos) | Richard | ✅ en la rama `frontend` (sáb 15:15) | — |
| S3 (búsqueda de fechas y sitios), 6 (línea de tiempo), 7 (gráfico polar), 8 (métricas y recomendación) | Richard | ⏳ | sáb 23:00 |
| Integrar en `main` la rama `frontend` | Richard | ✅ | — |
| Merge del PR #1 (`backend` → `main`, no toca `frontend/`; sin conflictos, probado sáb 23:35) | Richard | ⏳ | dom 01:00 |
| Revisar D2, SU7 y 12 (implementadas, sin marcar) y **dejar de pulir la portada** | Richard | ⏳ | dom 03:30 |
| 3.3 Verificar coordenadas en Quickmap (`docs/VERIFICACION_SITIOS.md`) | Dilan y Joshua | ⏳ | sáb 15:00 |
| B4 Validación con Quickmap y Moon Trek (`docs/VALIDACION.md`; nuestros valores en `docs/validacion/`) | Rafael, Joshua y Dilan | ⏳ | sáb 18:00 |
| Fuentes publicadas de iluminación de los 6 sitios (artículos o páginas de NASA con su enlace) para la diapositiva de validación | Joshua | ✅ (`docs/validacion/informe_iluminacion_joshua.pdf`; comparación en `VALIDACION.md`) | sáb 20:00 |
| Explicar en 30 s el panorama del horizonte (`docs/validacion/malapert-massif_horizonte.png`) y el caso de la demo (`docs/CASO_DEMO.md`) | Joshua | ⏳ | sáb 21:00 |
| Storyboard del video de respaldo de 60 s con los clics de `docs/CASO_DEMO.md` | Odelmy | ⏳ | sáb 20:00 |
| Esqueleto de las diapositivas (problema, demo, validación, limitaciones, equipo) | Odelmy | ⏳ | sáb 22:00 |
| Nombre: app **GEOATHECMOON**, equipo **GeoAthectum** | Equipo | ✅ (falta cambiar "Simulador" en el doc de identidad) | sáb 18:00 |
| Primer deploy en Vercel (aunque esté incompleto) | Richard y Rafael | ✅ `geoathectum.vercel.app` | — |
| QA del guion de la demo en producción (celular y laptop), con los clics de `docs/CASO_DEMO.md` | Dilan | ⏳ | dom 01:00 |
| Cambiar "Simulador" por GEOATHECMOON en el doc de identidad | Odelmy | ⏳ | dom 01:00 |
| Guion del pitch en borrador | Odelmy y Joshua | ⏳ | dom 05:00 |
| Feature freeze | todos | ⏳ | dom 07:00 |
| Deploy final y video de respaldo | Richard y Odelmy | ⏳ | dom 08:00 |
| Ensayos del pitch (3 completos) | Joshua y todos | ⏳ | dom 10:00–12:30 |

## Turnos de sueño
Nadie debe pasar más de 20 h despierto. Rafael y Richard no duermen al mismo tiempo.
- Rafael: **sáb 23:30 → dom 03:30** (el backend está cerrado; vuelve para el QA de madrugada y los ensayos).
- Richard: **dom 03:30 → 07:00**, después del deploy, con todo el MVP en `main`.
- Joshua, Odelmy y Dilan: turnos de 4 h antes de las 05:00 (borrador del pitch).

## Si sobra tiempo (en orden inverso de recorte)
**Fuera de esta entrega:** IA1 (planificador con IA, `docs/TAREAS.md`), porque requiere servidor, clave de OpenAI y backend en vivo. Puede ir en el pitch como "siguiente paso".

Comparador (10), textura LRO (9.5), globo de portada (M2), sliders de pesos, animación 3D, servidor en vivo con coordenadas libres.

## Deploy en Vercel (revisado sáb 13:30, listo para hacerlo)
La app es estática: lee `/data/*.json` y el enlace directo usa `?sitio=` (query), así que **no hace falta `vercel.json` ni rewrites**. Los datos pesan 1 MB, los modelos 2.5 MB y el build 3.8 MB.
1. Vercel → *Add New Project* → importar `Richuti/GeoAthectum`.
2. **Root Directory: `frontend`** · Framework: **Vite** · Build: `npm run build` · Output: `dist`.
3. **No** definir `VITE_API_URL` (vacía = usa los JSON de `public/data`).
4. Rama de producción: `main`. Cada PR genera su propia preview, así que el PR de `backend` se puede probar antes del merge.
5. Prueba de humo: abrir Malapert en el celular y en la laptop de la presentación, y revisar el panel de fuentes (`lola` + `jpl-horizons`).
