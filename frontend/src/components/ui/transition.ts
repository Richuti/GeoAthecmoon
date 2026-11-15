// Transiciones entre pantallas con la API View Transitions del navegador.
// La cabecera queda fija (tiene su propio nombre de transición) y el contenido sale y entra con un desplazamiento corto:
// hacia la izquierda al avanzar y hacia la derecha al volver. Sin soporte o con «reducir movimiento», el cambio es directo
// y una animación CSS de entrada suaviza la pantalla nueva (ver `.app-screen` en flight-glass.css).
import { flushSync } from 'react-dom'

export type TransitionKind = 'forward' | 'back' | 'fade'

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } }

export function transition(update: () => void, kind: TransitionKind = 'fade') {
  const doc = document as ViewTransitionDocument
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return
  }
  const root = document.documentElement
  root.dataset.transition = kind
  const t = doc.startViewTransition(() => flushSync(update))
  t.finished.finally(() => { if (root.dataset.transition === kind) delete root.dataset.transition })
}
