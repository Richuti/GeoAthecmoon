import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { SITE_IMAGERY, SITE_IMAGE_CREDIT } from '../content/siteImagery'
import { formatDateTime } from '../lib/time'
import type { Site } from '../types'
import { Button, cx, transition } from './ui'
import { Tour, type TourStep } from './Tour'

interface PlannerGuideProps {
  sites: Site[]
  selectedId: string
  errors: Record<string, string>
  onSelect: (id: string) => void
  date: Date
  missionDays: number
  step: number
  onStep: (step: number) => void
  schedule: ReactNode
  children: ReactNode
  /** «Planéalo por mí»: la IA, arriba de los sitios */
  assistant?: ReactNode
}

const STEPS = ['Preparar', 'Resultado'] as const
const TITLES = ['Prepara tu plan de alunizaje.', 'Este es tu plan de alunizaje.']
const HINTS = [
  'Elige el sitio, la fecha de llegada y los días en la superficie. Después comprueba si la misión funciona.',
  'Tu puntaje, qué lo limita y cómo mejorarlo.',
]

/** Explicaciones en contexto, una por elemento, la primera vez que se llega a cada paso. */
const TOURS: TourStep[][] = [
  [
    { target: '[data-tour="ai-planner"]', title: 'O deja que la IA lo planee', text: 'Elige tu módulo y el mes: la IA prueba sitios y fechas con el simulador y te deja el mejor plan listo.' },
    { target: '[data-tour="date"]', title: '¿Cuándo llegas?', text: 'La fecha cambia la energía disponible y las oportunidades para enviar mediciones. Las horas van en UTC.' },
    { target: '[data-tour="duration"]', title: '¿Cuánto tiempo te quedas?', text: 'Días que el módulo trabaja en la superficie. Más días significa más noches que aguantar.' },
    { target: '[data-tour="sites"]', title: 'Elige dónde alunizar', text: 'Cada foto es un lugar real del polo sur de la Luna. Toca el que quieras explorar.' },
    { target: '[data-tour="check"]', title: 'Comprueba el plan', text: 'Calculamos con datos reales de NASA si te conviene llegar ese día.' },
  ],
  [
    { target: '[data-tour="score"]', title: 'Tu puntaje', text: 'De 0 a 100: qué tan buenas son las condiciones durante tus días en la Luna. No es una probabilidad de éxito.' },
    { target: '[data-tour="factors"]', title: 'De qué depende', text: 'Luz solar (ámbar): energía para los paneles. Tierra visible (azul): solo entonces se envían datos. Pendiente: con más de 10° casi ningún módulo puede posarse.' },
    { target: '[data-tour="terrain"]', title: 'El terreno real', text: 'Relieve medido por la sonda LRO. La luz y la sombra siguen los datos de tu fecha. Arrastra para girar.' },
    { target: 'aside[aria-label="Elegir sitio de alunizaje"]', title: 'Compara sitios', text: 'El puntaje de cada lugar con tus mismas fechas. Toca uno para cambiar de destino.' },
    { target: '[data-tour="delay"]', title: '¿Y si te atrasas?', text: 'Elige un atraso y compáralo con tu plan: así sabes cuánto margen tienes.' },
    { target: '[data-tour="improve"]', title: 'Cómo mejorarlo', text: 'Si existe una fecha o un sitio mejor, aparece aquí con un botón para probarlo.' },
    { target: '[data-tour="compare-plans"]', title: 'Compara lado a lado', text: 'Pon tu plan junto a otro sitio o junto a un plan que guardaste. Elige un día de la agenda para ver sus horas de luz y de enlace con la Tierra.' },
    { target: '[data-tour="simulate"]', title: 'Simula tu módulo', text: 'Comprueba hora por hora si la batería aguanta toda la misión.' },
  ],
]

/** Sitio, fecha y duración juntos; después, el resultado con el mismo plan. */
export function PlannerGuide({ sites, selectedId, errors, onSelect, date, missionDays, step, onStep, schedule, children, assistant }: PlannerGuideProps) {
  const [reached, setReached] = useState(step)
  const heading = useRef<HTMLHeadingElement>(null)
  const mounted = useRef(false)
  const selected = sites.find(site => site.id === selectedId)
  const image = SITE_IMAGERY[selectedId]
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      void import('./Viewer3D').then(({ preloadSite }) => { if (!cancelled) preloadSite(selectedId) }).catch(() => { /* El visor permite reintentar al abrirlo. */ })
    }, 350)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [selectedId])
  // Si se llega a un paso desde fuera (por ejemplo, con el plan de la IA), queda disponible en la navegación.
  useEffect(() => { setReached((r) => Math.max(r, step)) }, [step])

  useLayoutEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    window.scrollTo({ top: 0, behavior: 'instant' })
    heading.current?.focus({ preventScroll: true })
  }, [step])

  const go = (next: number) => {
    if (next === step) return
    transition(() => {
      setReached(previous => Math.max(previous, next))
      onStep(next)
    }, next > step ? 'forward' : 'back')
  }

  return <main className="mx-auto w-full max-w-[1600px] px-5 pb-14 pt-8 sm:px-8 lg:pt-10">
    <Tour key={step} id={`planificador-unificado-${step}`} steps={TOURS[step]} />
    <div className={cx('mx-auto', step === 0 && 'max-w-5xl')}>
      <nav aria-label="Pasos del planificador" className="mb-8 max-w-xl">
        <ol className="grid grid-cols-2 gap-2">
          {STEPS.map((label, index) => <li key={label}>
            <button type="button" onClick={() => go(index)} disabled={index > reached}
              aria-current={step === index ? 'step' : undefined}
              className={cx('flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                step === index ? 'border-ink bg-ink text-void' : 'border-seam-strong bg-hull/60 text-ink-muted hover:border-ink-faint')}>
              <span aria-hidden>{index + 1}.</span>{label}
            </button>
          </li>)}
        </ol>
      </nav>
      <header className="mb-7 max-w-3xl">
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold tracking-tight text-ink outline-none sm:text-4xl">{TITLES[step]}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">{HINTS[step]}</p>
      </header>

      {step === 0 && <>
        {assistant}
        <h2 className="mb-4 mt-8 text-xl font-bold text-ink">Elige los detalles de tu plan</h2>
        <div className="mb-6">{schedule}</div>
        <h2 className="mb-4 text-xl font-bold text-ink">Sitio de alunizaje</h2>
        <div role="group" aria-label="Elige tu destino" data-tour="sites" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {sites.map(site => {
            const photo = SITE_IMAGERY[site.id]
            const active = selectedId === site.id
            return <button key={site.id} type="button" data-guide-site={site.id} aria-pressed={active}
              disabled={!!errors[site.id]} onClick={() => onSelect(site.id)}
              className={cx('guide-site glass-surface relative flex min-w-0 flex-col overflow-hidden text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40', active ? 'guide-site--selected' : 'hover:border-ink-faint')}>
              <div className="relative aspect-video w-full overflow-hidden bg-hull">
                {photo && <img src={photo.src} alt="" width={640} height={360} className="guide-site__photo size-full object-cover" style={{ objectPosition: photo.position }} />}
                {active && <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-ink text-void" aria-hidden>
                  <svg viewBox="0 0 20 20" className="size-4"><path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
                </span>}
              </div>
              <span className="flex flex-1 flex-col p-3 sm:p-4">
                <span className="text-sm font-bold leading-snug text-ink sm:text-base">{site.name}</span>
                <span className="mt-2 hidden text-xs leading-relaxed text-ink-muted sm:block">{site.description}</span>
                <span className="guide-site__cta mt-auto pt-3 text-xs font-bold text-ink-muted">{errors[site.id] ? 'Datos no disponibles' : active ? 'Destino elegido' : <>Elegir este sitio<span aria-hidden className="guide-site__arrow ml-1.5">→</span></>}</span>
              </span>
            </button>
          })}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">Imágenes regionales · {SITE_IMAGE_CREDIT}
          {image && <a href={image.source} target="_blank" rel="noreferrer" className="ml-2 underline underline-offset-4">Fuente del sitio elegido ↗</a>}
        </p>
        <div className="guide-actions glass-surface mt-6 flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1 text-xs text-ink-muted sm:text-sm"><p className="line-clamp-2 font-bold text-ink">{selected?.name}</p><p className="mt-1">{formatDateTime(date)} · {missionDays} días en superficie</p></div>
          <Button variant="primary" size="lg" className="w-full sm:w-auto" data-tour="check" onClick={() => go(1)}>Comprobar mi plan →</Button>
        </div>
      </>}

      {step === 1 && <>
        <div className="glass-surface mb-7 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm leading-relaxed text-ink"><span className="font-bold">{selected?.name}</span><span className="block text-ink-muted sm:ml-3 sm:inline">{formatDateTime(date)} · {missionDays} días en superficie</span></p>
          <Button onClick={() => go(0)}>Editar mi plan</Button>
        </div>
        {children}
      </>}
    </div>
  </main>
}
