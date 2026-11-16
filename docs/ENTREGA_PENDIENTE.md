# Entrega conjunta para Richard

Todos estos cambios están en la rama `frontend`, sin commit ni push del asistente. Incluye los cambios pendientes de las sesiones anteriores y el relieve autorizado el 15 nov 2026.

## Comportamiento final

- Preparación del plan en una sola pantalla: sitio, fecha y duración; resultado como segundo paso. Editar conserva las elecciones y el simulador recibe el mismo plan sin repetir fecha.
- Explicaciones de energía y comunicación en texto, comparación de atrasos neutra y agenda diaria interactiva con horas reales y límites de batería. La disponibilidad de enlace no se confunde con volumen de datos enviado.
- Botón de reproducción con texto y fecha, hora y contador con tipografía consistente.
- Tierra y Sol con radios físicos y distancias de Horizons, en la misma escala métrica que el terreno lunar; medias documentadas si falta la distancia.
- Preparación anticipada del sitio y cargas separadas. El despegue puede comenzar aunque la textura lunar siga pendiente.
- Giro y zoom manual durante despegue, transferencia y descenso, con ratón y gestos táctiles, seguimiento de la nave y restablecimiento de cámara.
- Relieve real del área de lanzamiento, exportado offline desde USGS 3DEP a un GLB de aproximadamente 1 MB. Plataforma, nave, cámara y efectos se anclan al suelo. Ortofoto cercana NAIP y estructuras NASA con créditos.
- Textos en inglés, documentación, fuentes y pruebas actualizados.

## Validación

- `npm test`: 359 pruebas en verde.
- `npm run build`: correcto; persiste el aviso de tamaño de los paquetes 3D.
- Edge CDP: capturas y revisión a 1440 y 390 px; preparación revisada también a 320 px. Selección con teclado, giro, zoom táctil, traspaso del plan y ausencia de desbordamientos.
- Carga: retención deliberada de la textura lunar; el botón de iniciar el despegue se habilita antes de que llegue.
- Geometría: relieve no plano, escala sin exageración, triángulos orientados y UV georreferenciadas. Verificados 14.124 m de terreno bajo el cohete y su base apoyada a 4.85 m sobre el suelo, en la cubierta.

## Mensaje único de commit

```text
Mejora el planificador y el simulador con agenda diaria, cámara libre y relieve real

- Unifica sitio, fecha y duración y conserva el plan al abrir el simulador
- Aclara energía, envío de datos y comparación de atrasos con una agenda diaria
- Corrige reproducción, tipografía y adaptación a móvil
- Usa distancias y radios reales de Tierra y Sol y separa las cargas 3D
- Permite girar y acercar la cámara durante todo el viaje
- Integra el relieve USGS de Kennedy, texturas cercanas y estructuras NASA
- Actualiza traducciones, documentación, créditos y pruebas
```

## Archivos del conjunto pendiente

- `CLAUDE.md`
- `README.es.md`
- `README.md`
- `docs/CREDITOS.md`
- `docs/TAREAS.md`
- `frontend/src/App.tsx`
- `frontend/src/components/DelayCheck.tsx`
- `frontend/src/components/MissionBasics.tsx`
- `frontend/src/components/PlanCompare.tsx`
- `frontend/src/components/PlanStrips.tsx`
- `frontend/src/components/PlannerGuide.tsx`
- `frontend/src/components/Viewer3D.tsx`
- `frontend/src/components/ViewerPanel.tsx`
- `frontend/src/components/sim/DescentViewer.tsx`
- `frontend/src/components/sim/EarthMoonJourney.tsx`
- `frontend/src/components/sim/LaunchViewer.tsx`
- `frontend/src/components/sim/MissionResult.tsx`
- `frontend/src/components/sim/MissionTimeline.tsx`
- `frontend/src/components/sim/TransferViewer.tsx`
- `frontend/src/flight-glass.css`
- `frontend/src/i18n/en.ts`
- `frontend/tests/i18n.test.ts`
- `assets-src/terrain/kennedy/source.json`
- `docs/ENTREGA_PENDIENTE.md`
- `docs/RELIEVE_DESPEGUE.md`
- `frontend/public/models/kennedy_terrain.glb`
- `frontend/public/models/launch_gantry.glb`
- `frontend/public/textures/flight/kennedy-pad-naip.jpg`
- `frontend/scripts/build-kennedy-terrain.py`
- `frontend/scripts/fetch-launch-detail.mjs`
- `frontend/src/components/plan-agenda.css`
- `frontend/src/components/sim/JourneyCamera.tsx`
- `frontend/src/lib/missionDays.ts`
- `frontend/tests/kennedyTerrain.test.ts`
- `frontend/tests/missionDays.test.ts`
