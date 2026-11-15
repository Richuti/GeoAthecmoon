/** Secuencia editorial: idea → explicación → dato, seguida de un tramo amplio de lectura. */
function progress(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
}

function reveal(from: number, to: number, value: number): number {
  const t = progress((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}

/** El último 16 % del recorrido mantiene el último fotograma para dar tiempo a leer. */
export function storyVideoProgress(scrollProgress: number): number {
  return progress(progress(scrollProgress) / 0.84)
}

/** Las entradas siguen la imagen; todo el contenido queda visible durante la parte central del scroll. */
export function storyCues(scrollProgress: number, videoProgress: number, first = false) {
  const video = progress(videoProgress)
  return {
    title: first ? 1 : reveal(0.02, 0.1, video),
    body: reveal(0.12, 0.26, video),
    readout: reveal(0.28, 0.42, video),
    visible: 1 - reveal(0.86, 0.98, progress(scrollProgress)),
  }
}

/** Una única película de scroll: encadena las tomas y conserva la noche bajo el cierre. */
export function storyPosition(globalProgress: number, sceneCount: number) {
  const position = progress(globalProgress) * (sceneCount + 1)
  const scene = Math.min(sceneCount - 1, Math.floor(position))
  const local = Math.min(1, position - scene)
  return {
    scene,
    local,
    blend: scene < sceneCount - 1 ? reveal(0.86, 1, local) : 0,
    finale: reveal(sceneCount - 0.14, sceneCount + 0.12, position),
  }
}
