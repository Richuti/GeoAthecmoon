# Material 3D para el despegue

## Base implementada

El viaje empieza en una escena local en metros, con el Saturn V existente y la plataforma con torre de NASA / Samuel H. Neblett. El apoyo se obtiene sobre la cara próxima del GLB terrestre, admitiendo ambas caras y orientando la normal hacia fuera. Se reutiliza la geometría de los GLB; no se genera terreno por código.

La cámara sigue el ascenso, cambia gradualmente hacia una vista superior y enlaza con la vista orbital. La salida de la plataforma ocupa aproximadamente 10 segundos y la transferencia unos 24 segundos de reproducción acelerada. El usuario puede pausar, retroceder o saltar a la llegada.

El ascenso es ilustrativo. La transferencia orbital y la misión lunar mantienen sus modelos y sus límites. La torre es una referencia NASA; la combinación con Saturn V no reconstruye un lanzamiento histórico ni representa un vehículo CLPS concreto.

## Lo que falta para un acabado fotorealista

### 1. Escenario de lanzamiento: prioridad

Archivo propuesto: `launch_site.glb`.

- Terreno, hormigón, carreteras, vegetación baja y detalles de servicio alrededor de la plataforma. Un entorno de aproximadamente 1 km es suficiente para los primeros planos.
- Unidades en metros, eje Y hacia arriba y origen en el punto de lanzamiento. Un nodo vacío `LaunchMount` debe señalar el apoyo de los motores sobre la cubierta.
- Sin el cohete incluido: ya existe `launch_vehicle.glb`. La torre y la plataforma pueden reemplazar la referencia actual si el escenario nuevo las integra.
- Texturas PBR incorporadas al GLB; normales y oclusión horneadas. Preferir texturas de 2K y un presupuesto inicial inferior a 200 000 triángulos y 15 MB.
- El terreno debe cubrir todo lo que ve la cámara a nivel de plataforma. La textura planetaria actual no tiene resolución suficiente para mostrar detalles del suelo en un primer plano.
- Entregar fuente y licencia, y comprobar el GLB en un visor web. La escena debe representar una instalación concreta solo si sus medidas y referencias se verifican.

Texto para quien prepare el modelo:

> Crear un escenario de lanzamiento terrestre realista para una aplicación web: terreno costero de Florida, plataforma de hormigón, caminos y estructuras de servicio, con materiales PBR y detalles horneados. Exportar GLB autocontenido, Y arriba, unidades en metros. Colocar un nodo LaunchMount donde se apoya el cohete. No incluir planetas, nave ni cámaras animadas; la aplicación coloca y mueve esos elementos. Mantener un nivel de detalle compatible con móvil y adjuntar fuentes/licencia.

### 2. Escape y humo

Archivo propuesto: `launch_exhaust.glb`.

- Pluma de los motores y humo de la salida con animación compatible con GLB, comprobada en un visor web.
- Origen en la salida de los motores; la pluma se extiende hacia −Y.
- Separar los efectos de encendido, ascenso y apagado para controlarlos con el mismo avance de la misión.
- Evitar cachés de simulación externas que no se incluyan en el archivo. Entregar los nombres de las animaciones y la licencia.

### 3. Etapas del vehículo: siguiente nivel

Un vehículo preparado por etapas, con piezas identificadas y pivotes coherentes, permitiría separación y encendido de etapas. La simulación actual no modela empuje, combustible, masa variable o aerodinámica; animar esas piezas no equivaldría a calcular esa dinámica.

## Fuente de la referencia incorporada

[NASA 3D Resources — Mobile Launcher](https://science.nasa.gov/3d-resources/mobile-launcher/), NASA / Samuel H. Neblett. GLB original `Mobile Launcher (assembled).glb`, conservado como `frontend/public/models/launch_platform.glb` (aprox. 194 KB).
