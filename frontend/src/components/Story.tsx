// Portada continua: un solo escenario fijo encadena las tomas y revela los datos con el avance del video.
// Los datos se calculan a partir de JPL Horizons y del horizonte topográfico LOLA.
//
// Rendimiento: un solo bucle requestAnimationFrame actualiza variables CSS y el tiempo de los videos de las
// escenas visibles, sin volver a dibujar React en cada cuadro. Con "reducir movimiento" se ven pósters fijos.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { StoryFacts } from '../lib/storyFacts'
import { storyCues, storyPosition, storyVideoProgress } from '../lib/storyTiming'
import { formatDate, formatDateTime, sampleTime } from '../lib/time'
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
  const exStart = f && ex ? formatDate(sampleTime(f.period, 0)) : '…'
  const exBest = f && ex ? formatDateTime(sampleTime(f.period, ex.bestStartIndex)) : '…'

  return [
    {
      id: 'amanecer',
      video: 'v1-amanecer-polar',
      chapter: 'El problema',
      title: 'Aquí, la luz depende del relieve.',
      body: (
        <>
          En {inSentence(f?.refName)}, el Sol alcanza una altura máxima de {n(f?.sunMaxElDeg, 1)}° durante los{' '}
          {f?.periodDays ?? '…'} días analizados. El relieve determina cuándo llega la luz al sitio.
        </>
      ),
      readout: f && { value: f.sunMaxElDeg, decimals: 1, unit: '°', label: 'Altura máxima del Sol', source: `JPL Horizons · ${f.periodDays} días` },
    },
    {
      id: 'sol-que-gira',
      video: 'v2-sol-que-gira',
      chapter: 'La luz',
      title: 'El Sol gira. Las sombras también.',
      body: (
        <>
          Desde {inSentence(f?.refName)}, el Sol completa una vuelta al horizonte en aproximadamente {n(f?.sunLapDays, 1)} días.
          Al cambiar su dirección, el relieve cambia las zonas iluminadas.
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
          Desde {inSentence(f?.refName)}, la Tierra queda por encima del relieve el {n(f?.contactPct)} % del periodo
          analizado. Cuando el terreno la oculta, se pierde la línea de visión para la comunicación directa.
        </>
      ),
      readout: f && { value: f.contactPct, decimals: 0, unit: '%', label: 'Tiempo con línea de visión a la Tierra', source: 'JPL Horizons + LOLA' },
    },
    {
      id: 'descenso',
      video: 'v4-descenso',
      chapter: 'La fecha',
      title: 'El mismo sitio, otra fecha, otra misión.',
      body: ex ? (
        <>
          En {inSentence(ex.siteName)}, una misión de 14 días que empieza el {exStart} obtiene {n(ex.fromStart)} puntos
          de viabilidad sobre 100. Al comenzar el {exBest}, obtiene {n(ex.best)} puntos.
        </>
      ) : (
        <>Elegir bien la fecha puede cambiar por completo la luz y el contacto de una misión.</>
      ),
      readout: ex && { value: ex.best, decimals: 0, unit: '/100', label: `Índice de viabilidad · ${ex.siteName}`, source: 'GeoAthectum · JPL Horizons + LOLA' },
    },
    {
      id: 'noche',
      video: 'v5-noche-lunar',
      chapter: 'La noche',
      title: 'Sin Sol, solo queda la batería.',
      body: (
        <>
          En {inSentence(f?.refName)}, el tramo más largo sin luz dentro del periodo analizado dura{' '}
          {n(f?.longestShadowHours)} horas. Durante esas horas, los paneles solares no pueden abastecer al módulo.
        </>
      ),
      readout: f && { value: f.longestShadowHours, decimals: 0, unit: 'h', label: 'Mayor tramo sin luz en el periodo', source: 'JPL Horizons + LOLA · muestras horarias' },
    },
  ]
}

export function Story({ facts, onOpen }: { facts: StoryFacts | null; onOpen: () => void }) {
  const reduced = useReducedMotion()
  const scenes = buildScenes(facts)
  const sectionRefs = useRef<Array<HTMLElement | null>>([])
  const journey = useRef<HTMLElement | null>(null)
  const videos = useRef<Array<HTMLVideoElement | null>>([])
  const [active, setActive] = useState(0)

  // El scroll solicita un fotograma; el fotograma alcanzado revela cada parte del relato.
  useEffect(() => {
    if (reduced) return
    const state = scenes.map(() => ({ t: 0 }))
    let raf = 0
    let lastActive = -1

    const frame = () => {
      const track = journey.current
      if (!track) return
      const vh = window.innerHeight
      const r = track.getBoundingClientRect()
      const global = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)))
      const position = storyPosition(global, scenes.length)
      const current = position.finale > 0.5 ? -1 : position.scene
      track.style.setProperty('--finale', position.finale.toFixed(4))
      sectionRefs.current.forEach((el, k) => {
        const video = videos.current[k]
        if (!el || !video) return
        const isCurrent = k === position.scene
        const isNext = k === position.scene + 1
        video.style.opacity = isCurrent ? '1' : isNext ? position.blend.toFixed(4) : '0'
        el.style.setProperty('--scene-opacity', isCurrent ? ((1 - position.blend) * (1 - position.finale)).toFixed(4) : '0')
        if (!isCurrent && !isNext) return
        const p = isCurrent ? position.local : 0

        // Video: el tiempo sigue al scroll con un poco de inercia.
        const end = Number.isFinite(video.duration) && video.duration > 0 ? Math.max(0.01, video.duration - 0.05) : null
        if (end !== null) {
          const target = storyVideoProgress(p) * end
          const s = state[k]
          s.t += (target - s.t) * 0.22
          if (Math.abs(video.currentTime - s.t) > 0.02 && !video.seeking) video.currentTime = s.t
        }

        // El texto espera al fotograma, incluso si el navegador tarda en buscarlo.
        // Si el video falla, el póster conserva el relato guiado por el scroll.
        const unavailable = !video || video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
        const videoProgress = unavailable ? storyVideoProgress(p) : end === null ? 0 : video.currentTime / end
        const cues = storyCues(p, videoProgress, k === 0)
        el.style.setProperty('--title', cues.title.toFixed(4))
        el.style.setProperty('--body', cues.body.toFixed(4))
        el.style.setProperty('--readout', cues.readout.toFixed(4))
        el.style.setProperty('--visible', cues.visible.toFixed(4))

        // Cargar el video de la escena siguiente con tiempo.
        const next = videos.current[k + 1]
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
      videos.current.forEach((v) => {
        if (!v) return
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
    const el = reduced ? sectionRefs.current[k] : journey.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const offset = reduced ? 0 : (el.offsetHeight - window.innerHeight) * ((k + (k === 0 ? 0 : 0.38)) / (scenes.length + 1))
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

      {reduced ? <>{scenes.map((s, k) => (
        <section
          key={s.id}
          ref={(el) => {
            sectionRefs.current[k] = el
          }}
          aria-labelledby={`escena-${s.id}`}
          className="relative min-h-dvh"
          style={{ '--p': 0, '--title': 1, '--body': 1, '--readout': 1, '--visible': 1 } as CSSProperties}
        >
          <SceneStage scene={s} index={k} total={scenes.length} reduced={reduced} first={k === 0} />
        </section>
      ))}<Finale facts={facts} onOpen={onOpen} /></> : (
        <section ref={journey} aria-label="Viaje al polo sur lunar" className="relative h-[900svh]" style={{ '--finale': 0 } as CSSProperties}>
          <div className="sticky top-0 h-dvh overflow-hidden bg-void">
            {scenes.map((s, k) => (
              <video key={s.id} ref={(el) => { videos.current[k] = el }} aria-hidden muted playsInline
                preload={k === 0 ? 'auto' : 'metadata'} poster={`${MEDIA}/${s.video}.jpg`}
                className="absolute inset-0 size-full object-cover" style={{ opacity: k === 0 ? 1 : 0 }}>
                <source src={`${MEDIA}/${s.video}.mp4`} type="video/mp4" />
              </video>
            ))}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(5_7_13/0.92)_0%,rgb(5_7_13/0.4)_38%,transparent_75%)]" />
            {scenes.map((s, k) => (
              <article key={s.id} ref={(el) => { sectionRefs.current[k] = el }} aria-hidden={active !== k}
                className="pointer-events-none absolute inset-0" style={{ '--scene-opacity': k === 0 ? 1 : 0, '--title': k === 0 ? 1 : 0, '--body': 0, '--readout': 0, '--visible': 1 } as CSSProperties}>
                <SceneStage scene={s} index={k} total={scenes.length} reduced={false} first={k === 0} continuous />
              </article>
            ))}
            <Finale facts={facts} onOpen={onOpen} continuous active={active < 0} />
          </div>
        </section>
      )}
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
  continuous = false,
}: {
  scene: Scene
  index: number
  total: number
  reduced: boolean
  first: boolean
  continuous?: boolean
}) {
  const src = `${MEDIA}/${scene.video}`
  const poster = `${src}.jpg`
  return (
    <div className={cx('overflow-hidden', continuous ? 'absolute inset-0' : 'relative min-h-dvh')}
      style={continuous ? { opacity: 'var(--scene-opacity)' } : undefined}>
      {continuous ? null : reduced ? (
        <img src={poster} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <video
          aria-hidden
          muted
          playsInline
          preload={first ? 'auto' : 'metadata'}
          poster={poster}
          className="absolute inset-0 size-full object-cover"
        >
          <source src={`${src}.mp4`} type="video/mp4" />
        </video>
      )}

      {/* Velo para que el texto se lea sobre cualquier cuadro */}
      {!continuous && <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(5_7_13/0.92)_0%,rgb(5_7_13/0.55)_38%,transparent_70%)]" />}

      <div
        className="absolute inset-x-0 bottom-0 px-5 pb-16 sm:px-10 sm:pb-20 lg:px-16"
        style={reduced ? undefined : { opacity: 'var(--visible)' }}
      >
        <p className="instrument-label text-ink-muted" style={reduced ? undefined : { opacity: 'var(--title)' }}>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} · {scene.chapter}
        </p>
        <h2
          id={`escena-${scene.id}`}
          className={cx(
            'mt-4 max-w-4xl font-display font-extrabold uppercase leading-[0.88] tracking-[0.01em] text-ink',
            first ? 'text-6xl sm:text-7xl lg:text-8xl' : 'text-5xl sm:text-6xl lg:text-7xl',
          )}
          style={reduced ? undefined : { opacity: 'var(--title)', clipPath: 'inset(0 0 calc((1 - var(--title)) * 100%) 0)' }}
        >
          {scene.title}
        </h2>
        <div className="mt-6 grid max-w-5xl gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg"
            style={reduced ? undefined : { opacity: 'var(--body)', transform: 'translateY(calc((1 - var(--body)) * 12px))' }}>{scene.body}</p>
          {scene.readout && <div style={reduced ? undefined : { opacity: 'var(--readout)', clipPath: 'inset(0 calc((1 - var(--readout)) * 100%) 0 0)' }}>
            <ReadoutBox r={scene.readout} />
          </div>}
        </div>
      </div>

      {first && !reduced && (
        <div
          aria-hidden
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
          style={{ opacity: 'calc(1 - var(--body) * 6)' }}
        >
          <span className="instrument-label text-ink-muted">Desliza</span>
          <span className="block h-8 w-px origin-top bg-ink-muted motion-safe:animate-pulse" />
        </div>
      )}

    </div>
  )
}

function ReadoutBox({ r }: { r: Readout }) {
  const shown = r.value.toFixed(r.decimals)
  return (
    <div>
      <p className={cx('flex items-baseline', r.unit === '°' ? 'gap-0.5' : 'gap-2')}>
        <span
          className="font-display text-6xl font-black leading-none text-ink sm:text-7xl"
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

function Finale({ facts, onOpen, continuous = false, active = true }: { facts: StoryFacts | null; onOpen: () => void; continuous?: boolean; active?: boolean }) {
  return (
    <section aria-labelledby="final" aria-hidden={!active}
      className={cx('flex items-end overflow-hidden', continuous ? 'absolute inset-0' : 'relative min-h-dvh', !active && 'pointer-events-none')}
      style={continuous ? { opacity: 'var(--finale)' } : undefined}>
      {!continuous && <img src={`${MEDIA}/i2-borde-crater.jpg`} alt="" className="absolute inset-0 size-full object-cover" />}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(5_7_13/0.95)_0%,rgb(5_7_13/0.6)_45%,rgb(5_7_13/0.2)_100%)]" />
      <div className="relative px-5 pb-20 sm:px-10 lg:px-16">
        <p className="instrument-label text-ink-muted">Tu turno</p>
        <h2 id="final" className="mt-4 max-w-4xl font-display text-6xl font-extrabold uppercase leading-[0.88] text-ink sm:text-7xl lg:text-8xl">
          Tú eliges dónde y cuándo.
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
          {facts ? `${facts.siteCount} sitios del polo sur y ${facts.periodDays} días de efemérides` : 'Sitios del polo sur y efemérides'} de
          JPL Horizons, con relieve de LOLA. Compara fechas, configura tu módulo y evalúa la misión antes de alunizar.
        </p>
        <Button variant="primary" size="lg" className="mt-8" onClick={onOpen} tabIndex={active ? undefined : -1}>
          Abrir el planificador
        </Button>
        <p className="mt-10 max-w-xl text-xs leading-relaxed text-ink-faint">
          Fuentes: JPL Horizons (NASA/JPL) y altimetría LOLA (Lunar Reconnaissance Orbiter).
          {facts && <> Periodo: {formatDate(sampleTime(facts.period, 0))} – {formatDate(sampleTime(facts.period, (facts.periodDays * 24) / facts.period.stepHours - 1))}. Fechas en UTC.</>}
        </p>
      </div>
    </section>
  )
}
