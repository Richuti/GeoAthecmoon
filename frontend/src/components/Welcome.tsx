// Guía de primera visita: una sola pantalla con los tres pasos y qué significa cada dato.
// Aparece la primera vez que se abre el planificador; se puede saltar y se vuelve a abrir desde «Ayuda».
import { useEffect, useRef } from 'react'
import { Button } from './ui'

const SEEN_KEY = 'geoathecmoon:guia-vista:v1'
/** Evento para volver a abrir la guía desde otra parte de la app (la usa Help). */
export const WELCOME_EVENT = 'geoathecmoon:guia'

export function openWelcome() {
  window.dispatchEvent(new Event(WELCOME_EVENT))
}

function seen(): boolean {
  try { return window.localStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}
function markSeen() {
  try { window.localStorage.setItem(SEEN_KEY, '1') } catch { /* sin almacenamiento: se verá de nuevo */ }
}

const STEPS = [
  { title: 'Elige un sitio', text: 'Seis lugares reales del polo sur, estudiados para Artemis y CLPS.' },
  { title: 'Elige la fecha', text: 'Cuándo llegas y cuántos días se queda tu módulo en la superficie.' },
  { title: 'Mira el resultado', text: 'Un puntaje de 0 a 100, qué lo limita y qué fecha o sitio funciona mejor.' },
]

export function Welcome() {
  const dialog = useRef<HTMLDialogElement>(null)
  const open = () => { if (!dialog.current?.open) dialog.current?.showModal() }
  const close = () => { markSeen(); dialog.current?.close() }

  useEffect(() => {
    // Un instante después del montaje, para no competir con el cambio de pantalla y el scroll inicial.
    const id = seen() ? 0 : window.setTimeout(open, 400)
    window.addEventListener(WELCOME_EVENT, open)
    return () => { window.clearTimeout(id); window.removeEventListener(WELCOME_EVENT, open) }
  }, [])

  return (
    <dialog ref={dialog} aria-labelledby="welcome-title" aria-describedby="welcome-lead" className="welcome-dialog"
      onClose={markSeen} onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="p-6 sm:p-8">
        <p className="instrument-label text-ink-muted">Guía rápida · 30 segundos</p>
        <h2 id="welcome-title" tabIndex={-1} autoFocus className="mt-3 outline-none text-2xl font-bold leading-tight text-ink sm:text-3xl">Planifica un alunizaje en tres pasos.</h2>
        <p id="welcome-lead" className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
          En el polo sur de la Luna, las montañas tapan el Sol y la Tierra según la fecha. Aquí ves cuándo y dónde le conviene llegar a tu misión.
        </p>

        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="welcome-step">
              <span aria-hidden className="welcome-step__n">{i + 1}</span>
              <span className="mt-3 block text-sm font-bold text-ink">{s.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{s.text}</span>
            </li>
          ))}
        </ol>

        <h3 className="mt-7 text-sm font-bold text-ink">Qué significa cada dato</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="welcome-term">
            <dt className="flex items-center gap-2 font-bold text-sun"><SunIcon />Luz solar</dt>
            <dd className="mt-1 text-xs leading-relaxed text-ink-muted">Tiempo con Sol: es la energía de los paneles.</dd>
          </div>
          <div className="welcome-term">
            <dt className="flex items-center gap-2 font-bold text-earth"><EarthIcon />Tierra visible</dt>
            <dd className="mt-1 text-xs leading-relaxed text-ink-muted">Tiempo con la Tierra a la vista: solo entonces se envían datos.</dd>
          </div>
          <div className="welcome-term">
            <dt className="flex items-center gap-2 font-bold text-ink"><SlopeIcon />Pendiente</dt>
            <dd className="mt-1 text-xs leading-relaxed text-ink-muted">Inclinación del suelo. Con más de 10° casi ningún módulo puede posarse.</dd>
          </div>
        </dl>

        <p className="mt-6 text-xs leading-relaxed text-ink-muted">
          ¿Quieres ir más allá? El <strong className="text-ink">Simulador</strong> prueba, hora por hora, si la batería de tu módulo aguanta la misión.
          Esta guía sigue disponible en <strong className="text-ink">Ayuda</strong>.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <Button variant="primary" size="lg" onClick={close}>Empezar →</Button>
        </div>
      </div>
    </dialog>
  )
}

function SunIcon() {
  return <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0"><circle cx="8" cy="8" r="3" fill="currentColor" /><path d="M8 0.5v2m0 11v2M0.5 8h2m11 0h2M2.7 2.7l1.4 1.4m7.8 7.8 1.4 1.4m0-10.6-1.4 1.4m-7.8 7.8-1.4 1.4" stroke="currentColor" strokeWidth="1.2" /></svg>
}
function EarthIcon() {
  return <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M2 8h12M8 1.8c2 2 2 10.4 0 12.4M8 1.8c-2 2-2 10.4 0 12.4" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
}
function SlopeIcon() {
  return <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0"><path d="M1.5 13.5h13L1.5 5z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M5.5 13.5a4 4 0 0 0-.9-2.6" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
}
