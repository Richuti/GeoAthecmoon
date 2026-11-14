// Portada narrativa: cinco escenas donde el scroll mueve el video y revela el texto, cada una con un dato
// real calculado por la app. Las imágenes son ilustraciones generadas con IA (así lo dice cada escena).
//
// Rendimiento: un solo bucle requestAnimationFrame actualiza variables CSS y el tiempo de los videos de las
// escenas visibles, sin volver a dibujar React en cada cuadro. Con "reducir movimiento" se ven pósters fijos.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { StoryFacts } from '../lib/storyFacts'
import { formatDateTime, formatShortDate, sampleTime } from '../lib/time'
import { Button, cx } from './ui'

interface Readout {
  value: number
  decimals: number
  unit: string
  label: string
  source: string
}

interface Scene {
  id: string
  video: string
  chapter: string
  title: string
  body: ReactNode
  readout?: Readout | null
}

const MEDIA = '/media'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/** Nombre de sitio dentro de una frase: "Borde del cráter X" → "el borde del cráter X"; el resto igual. */
function inSentence(name: string | undefined): string {
  if (!name) return 'el polo sur'
  return /^Borde /.test(name) ? `el ${name.charAt(0).toLowerCase()}${name.slice(1)}` : name
}

function buildScenes(f: StoryFacts | null): Scene[] {
  const n = (v: number | undefined, d = 0) => (v === undefined ? '…' : v.toFixed(d))
  const ex = f?.dateExample
  const exStart = f && ex ? formatShortDate(sampleTime(f.period, 0)) : '…'
  const exBest = f && ex ? formatDateTime(sampleTime(f.period, ex.bestStartIndex)) : '…'

  return [
    {
      id: 'amanecer',
      video: 'v1-amanecer-polar',
      chapter: 'El problema',
      title: 'En el polo sur, el Sol nunca termina de salir.',
      body: (
        <>
          En {inSentence(f?.refName)} nunca sube más de {n(f?.sunMaxElDeg, 1)}° sobre el horizonte. Un cerro a
          kilómetros de distancia basta para dejar un sitio a oscuras.
        </>
      ),
      readout: f && { value: f.sunMaxElDeg, decimals: 1, unit: '°', label: 'Altura máxima del Sol', source: `JPL Horizons · ${f.periodDays} días` },
    },
    {
      id: 'sol-que-gira',
      video: 'v2-sol-que-gira',
      chapter: 'La luz',
      title: 'La luz no sube: da vueltas.',
      body: (
        <>
          El Sol no sale ni se pone como en la Tierra: rodea el horizonte una vez cada {n(f?.sunLapDays, 1)} días. Las
          sombras giran como las agujas de un reloj, y cada sitio tiene sus horas de luz y de sombra.
        </>
      ),
      readout: f && { value: f.sunLapDays, decimals: 1, unit: 'días', label: 'Una vuelta del Sol al horizonte', source: 'JPL Horizons' },
    },
    {
      id: 'tierra-baja',
      video: 'v3-tierra-baja',
      chapter: 'La comunicación',
      title: 'La Tierra también está baja.',
      body: (
        <>
          Desde {inSentence(f?.refName)}, la Tierra se ve solo el {n(f?.contactPct)} % del tiempo. Cuando una cresta
          la tapa, no hay comunicación directa y los datos tienen que esperar.
        </>
      ),
      readout: f && { value: f.contactPct, decimals: 0, unit: '%', label: 'Tiempo con contacto directo', source: 'JPL Horizons + relieve del sitio' },
    },
    {
      id: 'descenso',
      video: 'v4-descenso',
      chapter: 'La fecha',
      title: 'El mismo sitio, otra fecha, otra misión.',
      body: ex ? (
        <>
          En {inSentence(ex.siteName)}, una misión de 14 días que empieza el {exStart} logra {n(ex.fromStart)} % de viabilidad.
          Empezando el {exBest}, sube a {n(ex.best)} %.
        </>
      ) : (
        <>Elegir bien la fecha puede cambiar por completo la luz y el contacto de una misión.</>
      ),
      readout: ex && { value: ex.best, decimals: 0, unit: '%', label: `Viabilidad en ${ex.siteName}, mejor fecha`, source: 'Calculado por GeoAthectum' },
    },
    {
      id: 'noche',
      video: 'v5-noche-lunar',
      chapter: 'La noche',
      title: 'Sin Sol, solo queda la batería.',
      body: (
        <>
          Cuando el Sol se oculta, el módulo vive de lo que guardó. Un explorador ligero aguanta unas{' '}
          {n(f?.autonomyHours)} horas a oscuras: si la sombra dura más, la misión termina.
        </>
      ),
      readout: f && { value: f.autonomyHours, decimals: 0, unit: 'h', label: 'Autonomía sin Sol · explorador ligero', source: 'Simulador · valores ilustrativos' },
    },
  ]
}

export function Story({ facts, onOpen }: { facts: StoryFacts | null; onOpen: () => void }) {
  const reduced = useReducedMotion()
  const scenes = buildScenes(facts)
  const sectionRefs = useRef<Array<HTMLElement | null>>([])
  const [active, setActive] = useState(0)

  // Bucle de scroll: progreso de cada escena → variables CSS, tiempo del video y contadores.
  useEffect(() => {
    if (reduced) return
    const state = scenes.map(() => ({ t: 0 }))
    let raf = 0
    let lastActive = -1

    const frame = () => {
      const vh = window.innerHeight
      let current = -1
      sectionRefs.current.forEach((el, k) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const visible = r.top < vh && r.bottom > 0
        if (!visible) return
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)))
        const isFirst = k === 0
        const inn = isFirst ? 1 : smoothstep(0.06, 0.24, p)
        const out = 1 - smoothstep(0.84, 0.97, p)
        el.style.setProperty('--p', p.toFixed(4))
        el.style.setProperty('--in', inn.toFixed(4))
        el.style.setProperty('--vis', (inn * out).toFixed(4))
        if (r.top <= vh * 0.5 && r.bottom >= vh * 0.5) current = k

        // Video: el tiempo sigue al scroll con un poco de inercia.
        const video = el.querySelector('video')
        if (video && video.duration > 0) {
          const target = Math.min(video.duration - 0.05, p * video.duration)
          const s = state[k]
          s.t += (target - s.t) * 0.14
          if (Math.abs(video.currentTime - s.t) > 0.02 && !video.seeking) video.currentTime = s.t
        }

        // Contador del dato: sube mientras entra el texto.
        el.querySelectorAll<HTMLElement>('[data-count-to]').forEach((c) => {
          const to = Number(c.dataset.countTo)
          const d = Number(c.dataset.decimals ?? 0)
          c.textContent = (to * smoothstep(0, 1, inn)).toFixed(d)
        })

        // Cargar el video de la escena siguiente con tiempo.
        const next = sectionRefs.current[k + 1]?.querySelector('video')
        if (next && next.preload !== 'auto') next.preload = 'auto'
      })
      if (current !== lastActive) {
        lastActive = current
        setActive(current)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    // iOS Safari solo permite cambiar el tiempo de un video después de un gesto: lo "despierta" una vez.
    const unlock = () => {
      document.querySelectorAll('video').forEach((v) => {
        v.play().then(() => v.pause()).catch(() => undefined)
      })
      window.removeEventListener('touchstart', unlock)
    }
    window.addEventListener('touchstart', unlock, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('touchstart', unlock)
    }
    // Las escenas cambian de texto, no de cantidad: el bucle no necesita reiniciarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  const goTo = (k: number) => {
    const el = sectionRefs.current[k]
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    // Al 35 % de la escena, el texto ya está a la vista.
    const offset = reduced || k === 0 ? 0 : (el.offsetHeight - window.innerHeight) * 0.35
    window.scrollTo({ top: top + offset, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <div className="relative bg-void">
      <a
        href="#planificador"
        onClick={(e) => {
          e.preventDefault()
          onOpen()
        }}
        className="sr-only z-50 bg-ink px-4 py-2 font-bold text-void focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al planificador
      </a>

      <StoryBar onOpen={onOpen} />
      {!reduced && <ChapterNav scenes={scenes} active={active} onGo={goTo} />}

      {scenes.map((s, k) => (
        <section
          key={s.id}
          ref={(el) => {
            sectionRefs.current[k] = el
          }}
          aria-labelledby={`escena-${s.id}`}
          className={cx('relative', reduced ? 'min-h-dvh' : k === 0 ? 'h-[240vh]' : 'h-[280vh]')}
          style={{ '--p': 0, '--in': k === 0 ? 1 : 0, '--vis': k === 0 ? 1 : 0 } as CSSProperties}
        >
          <SceneStage scene={s} index={k} total={scenes.length} reduced={reduced} first={k === 0} />
        </section>
      ))}

      <Finale facts={facts} onOpen={onOpen} />
    </div>
  )
}

function StoryBar({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-4 sm:px-8">
      <p className="pointer-events-auto font-display text-xl font-extrabold uppercase leading-none tracking-[0.03em] text-ink [text-shadow:0_1px_12px_rgb(0_0_0/0.8)]">
        GeoAthectum
      </p>
      <Button variant="secondary" size="sm" className="pointer-events-auto bg-void/70" onClick={onOpen}>
        Abrir el planificador
      </Button>
    </div>
  )
}

function ChapterNav({ scenes, active, onGo }: { scenes: Scene[]; active: number; onGo: (k: number) => void }) {
  return (
    <nav
      aria-label="Capítulos"
      className={cx(
        'fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 transition-opacity duration-300 lg:block xl:right-8',
        active < 0 && 'pointer-events-none opacity-0',
      )}
    >
      <ol className="flex flex-col gap-3">
        {scenes.map((s, k) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onGo(k)}
              aria-current={k === active ? 'step' : undefined}
              className="group relative flex items-center gap-3"
            >
              <span
                className={cx(
                  'instrument-label absolute right-full mr-3 whitespace-nowrap transition-opacity duration-300',
                  k === active ? 'text-ink opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
                )}
              >
                {s.chapter}
              </span>
              <span className={cx('font-mono text-xs tabular-nums', k === active ? 'text-ink' : 'text-ink-faint')}>
                {String(k + 1).padStart(2, '0')}
              </span>
              <span className={cx('block h-px transition-all duration-300', k === active ? 'w-8 bg-ink' : 'w-4 bg-ink-faint')} />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function SceneStage({
  scene,
  index,
  total,
  reduced,
  first,
}: {
  scene: Scene
  index: number
  total: number
  reduced: boolean
  first: boolean
}) {
  const src = `${MEDIA}/${scene.video}`
  return (
    <div className={cx('overflow-hidden', reduced ? 'relative min-h-dvh' : 'sticky top-0 h-dvh')}>
      {reduced ? (
        <img src={`${src}.jpg`} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <video
          aria-hidden
          muted
          playsInline
          preload={first ? 'auto' : 'metadata'}
          poster={`${src}.jpg`}
          className="absolute inset-0 size-full origin-center object-cover"
          style={{ transform: 'scale(calc(1.08 - var(--p) * 0.08))' }}
        >
          <source src={`${src}.mp4`} type="video/mp4" />
        </video>
      )}

      {/* Velo para que el texto se lea sobre cualquier cuadro */}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(5_7_13/0.92)_0%,rgb(5_7_13/0.55)_38%,transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgb(5_7_13/0.7)_0%,transparent_55%)]" />

      <div
        className="absolute inset-x-0 bottom-0 px-5 pb-16 sm:px-10 sm:pb-20 lg:px-16"
        style={reduced ? undefined : { opacity: 'var(--vis)', transform: 'translateY(calc((1 - var(--in)) * 28px))' }}
      >
        <p className="instrument-label text-ink-muted">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} · {scene.chapter}
        </p>
        <h2
          id={`escena-${scene.id}`}
          className={cx(
            'mt-4 max-w-4xl font-display font-extrabold uppercase leading-[0.88] tracking-[0.01em] text-ink',
            first ? 'text-6xl sm:text-7xl lg:text-8xl' : 'text-5xl sm:text-6xl lg:text-7xl',
          )}
          style={reduced ? undefined : { clipPath: 'inset(0 calc((1 - var(--in)) * 100%) 0 0)' }}
        >
          {scene.title}
        </h2>
        <div className="mt-6 grid max-w-5xl gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">{scene.body}</p>
          {scene.readout && <ReadoutBox r={scene.readout} reduced={reduced} />}
        </div>
      </div>

      {first && !reduced && (
        <div
          aria-hidden
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
          style={{ opacity: 'calc(1 - var(--p) * 6)' }}
        >
          <span className="instrument-label text-ink-muted">Desliza</span>
          <span className="block h-8 w-px origin-top bg-ink-muted motion-safe:animate-pulse" />
        </div>
      )}

      <p className="absolute bottom-4 right-4 text-[0.6875rem] text-ink-faint sm:right-8">Ilustración generada con IA</p>
      {!reduced && (
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-ink/10">
          <div className="h-full bg-ink/60" style={{ width: 'calc(var(--p) * 100%)' }} />
        </div>
      )}
    </div>
  )
}

function ReadoutBox({ r, reduced }: { r: Readout; reduced: boolean }) {
  const shown = r.value.toFixed(r.decimals)
  return (
    <div className="border-l border-ink/30 pl-5">
      <p className={cx('flex items-baseline', r.unit === '°' ? 'gap-0.5' : 'gap-2')}>
        <span
          className="font-display text-6xl font-black leading-none text-ink sm:text-7xl"
          {...(reduced ? {} : { 'data-count-to': r.value, 'data-decimals': r.decimals })}
        >
          {shown}
        </span>
        <span className={cx('font-display font-bold text-ink-muted', r.unit === '°' ? 'text-5xl leading-none sm:text-6xl' : 'text-2xl')}>{r.unit}</span>
      </p>
      <p className="mt-2 text-sm text-ink">{r.label}</p>
      <p className="mt-0.5 text-xs text-ink-faint">Fuente: {r.source}</p>
    </div>
  )
}

function Finale({ facts, onOpen }: { facts: StoryFacts | null; onOpen: () => void }) {
  return (
    <section aria-labelledby="final" className="relative flex min-h-dvh items-end overflow-hidden">
      <img src={`${MEDIA}/i2-borde-crater.jpg`} alt="" className="absolute inset-0 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(5_7_13/0.95)_0%,rgb(5_7_13/0.6)_45%,rgb(5_7_13/0.2)_100%)]" />
      <div className="relative px-5 pb-20 sm:px-10 lg:px-16">
        <p className="instrument-label text-ink-muted">Tu turno</p>
        <h2 id="final" className="mt-4 max-w-4xl font-display text-6xl font-extrabold uppercase leading-[0.88] text-ink sm:text-7xl lg:text-8xl">
          Tú eliges dónde y cuándo.
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
          {facts ? `${facts.siteCount} sitios del polo sur y ${facts.periodDays} días` : 'Sitios del polo sur y semanas'} de
          posiciones reales del Sol y la Tierra. Mueve la fecha, cambia el módulo y mira si tu misión sobrevive.
        </p>
        <Button variant="primary" size="lg" className="mt-8" onClick={onOpen}>
          Abrir el planificador
        </Button>
        <p className="mt-10 max-w-xl text-xs leading-relaxed text-ink-faint">
          Las imágenes de esta portada son ilustraciones generadas con IA. Los datos vienen de JPL Horizons (NASA) y del
          relieve de cada sitio.
        </p>
      </div>
    </section>
  )
}
