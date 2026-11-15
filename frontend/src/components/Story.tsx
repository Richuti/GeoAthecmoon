// Portada con scroll: imágenes fijas unidas por el horizonte real.
//
// - Cada escena es una ilustración fija. Mientras se lee, la cámara avanza muy lento (acercamiento y paneo).
// - La escena siguiente sube desde abajo recortada con la silueta REAL del horizonte del sitio de referencia
//   (LOLA): la imagen nueva asoma detrás de la cresta.
// - Abajo, una franja fija muestra ese horizonte y el Sol de JPL Horizons. El scroll avanza los días: cuando el
//   relieve tapa al Sol, la ilustración se oscurece. La luz de la portada la deciden los datos, no la imagen.
// - Al final, el cierre y un pie de página con la marca gigante rellena con el mapa de luz LOLA del polo sur.
//
// Rendimiento: un solo bucle requestAnimationFrame escribe estilos y atributos; React no se vuelve a dibujar
// en cada cuadro. Con "reducir movimiento" las escenas se ven apiladas y quietas.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { StoryFacts } from '../lib/storyFacts'
import { storyCues, storyVideoProgress } from '../lib/storyTiming'
import { formatDate, formatDateTime, sampleTime } from '../lib/time'
import { visibility } from '../lib/visibility'
import type { SiteData } from '../types'
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
  /** Archivo en public/media (ilustración fija, 16:9) */
  image: string
  /** Punto del sujeto (Sol, Tierra o módulo): encuadre en pantallas verticales y centro del acercamiento */
  focus: string
  /** Paneo horizontal de la cámara durante la escena, en % */
  pan: number
  /** El sujeto ocupa el centro: en escritorio el texto va en una columna angosta a la izquierda */
  narrow?: boolean
  /** En el celular el sujeto llena el ancho: el texto baja al suelo en lugar de ir en el cielo */
  mobileGround?: boolean
  chapter: string
  title: string
  body: ReactNode
  readout?: Readout | null
}

const MEDIA = '/media'
/** Días de datos que recorre la franja del horizonte durante todo el scroll (una vuelta del Sol, aprox.). */
const BAND_DAYS = 30
/** Escala vertical ampliada cerca de 0°, la misma de la franja de horizonte del planificador. */
const K = 0.75
const s = (el: number) => Math.asinh(el / K)
const BAND_RANGE: [number, number] = [-2, 8]
/** Altura de la cresta en el barrido entre escenas, en % de la pantalla. */
const RIDGE_AMP = 16

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

const smooth = (from: number, to: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

function buildScenes(f: StoryFacts | null): Scene[] {
  const n = (v: number | undefined, d = 0) => (v === undefined ? '…' : v.toFixed(d))
  const ex = f?.dateExample
  const exStart = f && ex ? formatDate(sampleTime(f.period, 0)) : '…'
  const exBest = f && ex ? formatDateTime(sampleTime(f.period, ex.bestStartIndex)) : '…'

  return [
    {
      id: 'amanecer',
      image: 'escena-1-amanecer.jpg',
      focus: '61% 60%',
      pan: -1.5,
      chapter: 'El problema',
      title: 'Aquí, la luz depende del relieve.',
      body: (
        <>
          En {inSentence(f?.refName)}, el Sol alcanza una altura máxima de {n(f?.sunMaxElDeg, 1)}° durante los{' '}
          {f?.periodDays ?? '…'} días analizados. Un cerro a decenas de kilómetros basta para dejar el sitio a oscuras.
        </>
      ),
      readout: f && { value: f.sunMaxElDeg, decimals: 1, unit: '°', label: 'Altura máxima del Sol', source: `JPL Horizons · ${f.periodDays} días` },
    },
    {
      id: 'sol-que-gira',
      image: 'escena-2-sol.jpg',
      focus: '39% 52%',
      pan: 1.5,
      chapter: 'La luz',
      title: 'El Sol gira. Las sombras también.',
      body: (
        <>
          Desde {inSentence(f?.refName)}, el Sol da una vuelta completa al horizonte en unos {n(f?.sunLapDays, 1)} días.
          Al cambiar su dirección, cambia qué montaña da sombra.
        </>
      ),
      readout: f && { value: f.sunLapDays, decimals: 1, unit: 'días', label: 'Una vuelta del Sol al horizonte', source: 'JPL Horizons' },
    },
    {
      id: 'tierra-baja',
      image: 'escena-3-tierra.jpg',
      focus: '58% 61%',
      pan: -1,
      chapter: 'La comunicación',
      title: 'La Tierra también está baja.',
      body: (
        <>
          Desde {inSentence(f?.refName)}, la Tierra queda por encima del relieve el {n(f?.contactPct)} % del tiempo.
          Cuando el terreno la oculta, no hay comunicación directa y los datos esperan.
        </>
      ),
      readout: f && { value: f.contactPct, decimals: 0, unit: '%', label: 'Tiempo con la Tierra a la vista', source: 'JPL Horizons + LOLA' },
    },
    {
      id: 'descenso',
      image: 'escena-4-descenso.jpg',
      focus: '50% 32%',
      pan: 0,
      narrow: true,
      mobileGround: true,
      chapter: 'La fecha',
      title: 'El mismo sitio, otra fecha, otra misión.',
      body: ex ? (
        <>
          En {inSentence(ex.siteName)}, una misión de 14 días que empieza el {exStart} obtiene {n(ex.fromStart)} puntos
          de viabilidad sobre 100. Si empieza el {exBest}, obtiene {n(ex.best)}.
        </>
      ) : (
        <>Elegir bien la fecha puede cambiar por completo la luz y el contacto de una misión.</>
      ),
      readout: ex && { value: ex.best, decimals: 0, unit: '/100', label: `Viabilidad en la mejor fecha · ${ex.siteName}`, source: 'GeoAthectum · JPL Horizons + LOLA' },
    },
    {
      id: 'noche',
      image: 'escena-5-noche.jpg',
      focus: '50% 50%',
      pan: 0,
      narrow: true,
      mobileGround: true,
      chapter: 'La noche',
      title: 'Sin Sol, solo queda la batería.',
      body: (
        <>
          En {inSentence(f?.refName)}, el tramo más largo sin luz del periodo dura {n(f?.longestShadowHours)} horas.
          Mientras dure, los paneles no generan nada.
        </>
      ),
      readout: f && { value: f.longestShadowHours, decimals: 0, unit: 'h', label: 'Mayor tramo sin luz', source: 'JPL Horizons + LOLA · hora por hora' },
    },
  ]
}

/** Silueta del horizonte normalizada (0 = lo más bajo, 1 = lo más alto), muestreada a lo ancho de la pantalla. */
function ridgeProfile(horizon: number[] | undefined, points = 72): number[] {
  if (!horizon?.length) return Array.from({ length: points }, (_, k) => 0.5 + 0.35 * Math.sin(k / 5) * Math.cos(k / 13))
  const vals = Array.from({ length: points }, (_, k) => horizon[Math.round((k / (points - 1)) * (horizon.length - 1))])
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  return vals.map((v) => (hi > lo ? (v - lo) / (hi - lo) : 0.5))
}

/** Puntos de la cresta a la altura `base` (% de pantalla), de izquierda a derecha. */
function ridgePoints(profile: number[], base: number): [number, number][] {
  return profile.map((r, k) => [(k / (profile.length - 1)) * 100, base - RIDGE_AMP * r])
}

export function Story({ facts, reference, onOpen }: { facts: StoryFacts | null; reference?: SiteData; onOpen: () => void }) {
  const reduced = useReducedMotion()
  const scenes = buildScenes(facts)
  const profile = useMemo(() => ridgeProfile(reference?.horizon.elevationDeg), [reference])
  const lit = useMemo(() => (reference ? visibility(reference).lit : null), [reference])

  const journey = useRef<HTMLElement | null>(null)
  const layers = useRef<Array<HTMLDivElement | null>>([])
  const images = useRef<Array<HTMLImageElement | null>>([])
  const texts = useRef<Array<HTMLElement | null>>([])
  const edge = useRef<SVGPolylineElement | null>(null)
  const stage = useRef<HTMLDivElement | null>(null)
  const band = useRef<BandHandle | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (reduced) return
    const n = scenes.length
    let raf = 0
    let lastActive = -1
    let light = 1

    const frame = () => {
      const track = journey.current
      if (!track) return
      const vh = window.innerHeight
      const r = track.getBoundingClientRect()
      const g = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)))
      const pos = g * n
      const scene = Math.min(n - 1, Math.floor(pos))
      const local = Math.min(1, pos - scene)
      const wipe = scene < n - 1 ? smooth(0.7, 1, local) : 0

      layers.current.forEach((el, k) => {
        const img = images.current[k]
        if (!el || !img) return
        const visible = k === scene || (k === scene + 1 && wipe > 0)
        el.style.visibility = visible ? 'visible' : 'hidden'
        if (!visible) return
        // La escena siguiente sube recortada por la cresta real; la actual queda debajo.
        if (k === scene + 1) {
          const pts = ridgePoints(profile, (1 - wipe) * (100 + RIDGE_AMP))
          el.style.clipPath = `polygon(0% 100%, 100% 100%, ${pts.reverse().map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(', ')})`
        } else {
          el.style.clipPath = 'none'
        }
        // Cámara lenta: acercamiento y paneo a lo largo de la escena.
        const p = k === scene ? local : 0
        const sc = scenes[k]
        img.style.transform = `translate3d(${(sc.pan * p).toFixed(3)}%, 0, 0) scale(${(1.06 + 0.07 * p).toFixed(4)})`
      })

      // Línea de la cresta durante el barrido.
      if (edge.current) {
        edge.current.style.opacity = wipe > 0 && wipe < 1 ? '1' : '0'
        if (wipe > 0) edge.current.setAttribute('points', ridgePoints(profile, (1 - wipe) * (100 + RIDGE_AMP)).map(([x, y]) => `${x},${y}`).join(' '))
      }

      // Texto de cada escena.
      texts.current.forEach((el, k) => {
        if (!el) return
        if (k !== scene) {
          el.style.setProperty('--visible', '0')
          return
        }
        const cues = storyCues(local, storyVideoProgress(local), k === 0)
        el.style.setProperty('--title', cues.title.toFixed(4))
        el.style.setProperty('--body', cues.body.toFixed(4))
        el.style.setProperty('--readout', cues.readout.toFixed(4))
        el.style.setProperty('--visible', (k === n - 1 ? 1 : 1 - smooth(0.62, 0.74, local)).toFixed(4))
      })

      // Los datos deciden la luz: si el relieve real tapa al Sol, la ilustración se oscurece.
      const idx = band.current?.update(g) ?? null
      const target = idx === null || !lit ? 1 : lit[idx] ? 1 : 0.5
      light += (target - light) * 0.08
      stage.current?.style.setProperty('--light', light.toFixed(3))

      // Pasado el viaje (cierre y pie de página) se ocultan los capítulos.
      const shown = r.bottom < vh * 0.6 ? -1 : scene
      if (shown !== lastActive) {
        lastActive = shown
        setActive(shown)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // Las escenas cambian de texto, no de cantidad: el bucle no necesita reiniciarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, profile, lit])

  const goTo = (k: number) => {
    const el = journey.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const offset = (el.offsetHeight - window.innerHeight) * ((k + (k === 0 ? 0 : 0.3)) / scenes.length)
    window.scrollTo({ top: top + offset, behavior: 'smooth' })
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

      <StoryBar onOpen={onOpen} solid={reduced || active < 0} />

      {reduced ? (
        scenes.map((sc, k) => (
          <section key={sc.id} aria-labelledby={`escena-${sc.id}`} className="relative min-h-dvh overflow-hidden">
            <img src={`${MEDIA}/${sc.image}`} alt="" className="absolute inset-0 size-full object-cover" style={{ objectPosition: sc.focus }} />
            <SceneText scene={sc} index={k} still />
          </section>
        ))
      ) : (
        <>
          <ChapterNav scenes={scenes} active={active} onGo={goTo} />
          <section ref={journey} aria-label="Viaje al polo sur lunar" className="relative" style={{ height: `${scenes.length * 115 + 30}svh` }}>
            <div ref={stage} className="sticky top-0 h-dvh overflow-hidden bg-void" style={{ '--light': 1 } as CSSProperties}>
              <div className="absolute inset-0" style={{ filter: 'brightness(var(--light))' }}>
                {scenes.map((sc, k) => (
                  <div key={sc.id} ref={(el) => { layers.current[k] = el }} className="absolute inset-0 overflow-hidden"
                    style={{ visibility: k === 0 ? 'visible' : 'hidden' }}>
                    <img ref={(el) => { images.current[k] = el }} src={`${MEDIA}/${sc.image}`} alt="" decoding="async"
                      className="absolute inset-0 size-full object-cover will-change-transform"
                      style={{ objectPosition: sc.focus, transformOrigin: sc.focus, transform: 'scale(1.06)' }} />
                  </div>
                ))}
              </div>
              <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
                <polyline ref={edge} fill="none" stroke="var(--color-relief-edge)" strokeWidth={1.25} vectorEffect="non-scaling-stroke"
                  style={{ opacity: 0, transition: 'opacity 120ms' }} />
              </svg>
              {scenes.map((sc, k) => (
                <article key={sc.id} ref={(el) => { texts.current[k] = el }} aria-hidden={active !== k}
                  className="pointer-events-none absolute inset-0"
                  style={{ '--title': k === 0 ? 1 : 0, '--body': 0, '--readout': 0, '--visible': k === 0 ? 1 : 0 } as CSSProperties}>
                  <SceneText scene={sc} index={k} />
                </article>
              ))}
              {reference && <HorizonBand ref={band} data={reference} lit={lit} />}
              <p className="absolute right-4 top-16 text-[0.6875rem] text-ink-faint sm:right-8">Ilustración · los datos no salen de la imagen</p>
            </div>
          </section>
        </>
      )}

      <Finale facts={facts} onOpen={onOpen} />
      <Footer onOpen={onOpen} />
    </div>
  )
}

function StoryBar({ onOpen, solid }: { onOpen: () => void; solid: boolean }) {
  return (
    <div className={cx('pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b px-4 py-4 transition-colors duration-300 sm:px-8',
      solid ? 'border-seam bg-void' : 'border-transparent')}>
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
    <nav aria-label="Capítulos"
      className={cx('fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 transition-opacity duration-300 lg:block xl:right-8', active < 0 && 'pointer-events-none opacity-0')}>
      <ol className="flex flex-col items-end gap-1">
        {scenes.map((sc, k) => (
          <li key={sc.id}>
            <button type="button" onClick={() => onGo(k)} aria-current={k === active ? 'step' : undefined} aria-label={sc.chapter}
              className="group relative flex h-6 w-10 items-center justify-end">
              <span className={cx('instrument-label pointer-events-none absolute right-full mr-3 whitespace-nowrap transition-opacity duration-300',
                k === active ? 'text-ink opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100')}>
                {sc.chapter}
              </span>
              <span aria-hidden className={cx('block h-px transition-all duration-300', k === active ? 'w-8 bg-ink' : 'w-4 bg-ink-faint group-hover:bg-ink-muted')} />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * Texto de una escena. Las ilustraciones tienen el horizonte a media altura y cielo negro arriba:
 * el relato va en el cielo y el dato abajo, junto a la franja del horizonte real, para no tapar nunca
 * la cresta, el Sol, la Tierra ni el módulo. En el celular, si el sujeto llena el ancho, el relato baja al suelo.
 */
function SceneText({ scene, index, still = false }: { scene: Scene; index: number; still?: boolean }) {
  const rise = (name: string): CSSProperties | undefined =>
    still ? undefined : { opacity: `var(--${name})`, transform: `translateY(calc((1 - var(--${name})) * 14px))` }
  const ground = scene.mobileGround
  return (
    <div className="absolute inset-0" style={still ? undefined : { opacity: 'var(--visible)' }}>
      {/* Velo solo donde el texto cae sobre el suelo iluminado (celular, sujeto al centro) */}
      {ground && <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(5_7_13/0.92)_0%,rgb(5_7_13/0.7)_38%,transparent_62%)] lg:hidden" />}

      <div className={cx('absolute inset-x-0 px-5 sm:px-10 lg:bottom-auto lg:top-0 lg:px-16 lg:pt-28',
        ground ? (still ? 'bottom-10' : 'bottom-36') : 'top-0 pt-24 sm:pt-28')}>
        <h2 id={`escena-${scene.id}`}
          className={cx('font-display font-extrabold uppercase leading-[0.9] tracking-[0.005em] text-ink [text-wrap:balance]',
            scene.narrow ? 'max-w-3xl lg:max-w-[30vw]' : 'max-w-4xl',
            index === 0 ? 'text-[2.75rem] sm:text-7xl lg:text-8xl' : scene.narrow ? 'text-[2.5rem] sm:text-6xl lg:text-[3.25rem] xl:text-6xl' : 'text-[2.5rem] sm:text-6xl lg:text-7xl')}
          style={rise('title')}>
          {scene.title}
        </h2>
        <p className={cx('mt-5 text-[0.9375rem] leading-relaxed text-ink-muted sm:text-lg', scene.narrow ? 'max-w-xl lg:max-w-[28vw]' : 'max-w-xl')}
          style={rise('body')}>
          {scene.body}
        </p>
        {/* Celular: el dato en una línea, debajo del relato */}
        {scene.readout && (
          <p className="mt-4 flex items-baseline gap-2 lg:hidden" style={rise('readout')}>
            <span className="font-display text-4xl font-black leading-none text-ink">{scene.readout.value.toFixed(scene.readout.decimals)}</span>
            <span className="font-display text-xl font-bold text-ink-muted">{scene.readout.unit}</span>
            <span className="text-xs leading-snug text-ink-faint">{scene.readout.label} · {scene.readout.source}</span>
          </p>
        )}
      </div>

      {/* Escritorio: el dato abajo, sobre el suelo y junto a la franja del horizonte real */}
      {scene.readout && (
        <div className={cx('absolute left-16 hidden lg:block', still ? 'bottom-10' : 'bottom-32')}
          style={still ? undefined : { opacity: 'var(--readout)', clipPath: 'inset(-1rem calc((1 - var(--readout)) * 100%) 0 0)' }}>
          <ReadoutBox r={scene.readout} />
        </div>
      )}
    </div>
  )
}

function ReadoutBox({ r }: { r: Readout }) {
  return (
    <div className="relative border border-seam-strong bg-void/70 px-5 pb-4 pt-5">
      <p className="instrument-label absolute -top-2 left-3 bg-void px-1.5">Dato real</p>
      <p className={cx('flex items-baseline', r.unit === '°' ? 'gap-0.5' : 'gap-2')}>
        <span className="font-display text-6xl font-black leading-none text-ink sm:text-7xl">{r.value.toFixed(r.decimals)}</span>
        <span className={cx('font-display font-bold text-ink-muted', r.unit === '°' ? 'text-5xl leading-none sm:text-6xl' : 'text-2xl')}>{r.unit}</span>
      </p>
      <p className="mt-2 text-sm text-ink">{r.label}</p>
      <p className="mt-0.5 text-xs text-ink-faint">Fuente: {r.source}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Franja del horizonte real: la firma de la portada
// ---------------------------------------------------------------------------

interface BandHandle {
  /** Mueve el Sol al instante que corresponde al avance `g` (0–1) y devuelve el índice de la muestra. */
  update: (g: number) => number
}

function HorizonBand({ ref, data, lit }: { ref: React.Ref<BandHandle>; data: SiteData; lit: boolean[] | null }) {
  const [minEl, maxEl] = BAND_RANGE
  const top = s(maxEl)
  const span = top - s(minEl)
  const y = (el: number) => top - s(Math.max(minEl - 1, Math.min(maxEl + 1, el)))
  const h = data.horizon.elevationDeg
  const step = 360 / h.length
  const samples = Math.min(data.sun.el.length, Math.round((BAND_DAYS * 24) / data.stepHours))

  const paths = useMemo(() => {
    const relief = `M0,${span + 1} ` + h.map((el, k) => `L${(k * step).toFixed(2)},${y(el).toFixed(3)}`).join(' ') + ` L360,${y(h[0]).toFixed(3)} L360,${span + 1} Z`
    let track = ''
    let prev = Number.NaN
    for (let i = 0; i < samples; i += 2) {
      const az = data.sun.az[i]
      track += `${Number.isNaN(prev) || Math.abs(az - prev) > 180 ? 'M' : 'L'}${az.toFixed(2)},${y(data.sun.el[i]).toFixed(3)} `
      prev = az
    }
    return { relief, track }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const sun = useRef<HTMLSpanElement | null>(null)
  const label = useRef<HTMLSpanElement | null>(null)
  const last = useRef(-1)

  useEffect(() => {
    if (typeof ref === 'function') ref(handle)
    else if (ref) (ref as React.RefObject<BandHandle | null>).current = handle
  })
  const handle: BandHandle = {
    update: (g) => {
      const i = Math.min(samples - 1, Math.round(g * (samples - 1)))
      if (i === last.current) return i
      last.current = i
      const visible = lit ? lit[i] : true
      const el = data.sun.el[i]
      if (sun.current) {
        sun.current.style.left = `${(data.sun.az[i] / 360) * 100}%`
        sun.current.style.top = `${(y(el) / span) * 100}%`
        sun.current.dataset.visible = String(visible)
      }
      if (label.current) {
        label.current.textContent = `${formatDateTime(sampleTime(data, i))} · Sol ${el.toFixed(1)}° · ${visible ? 'iluminado' : 'tapado por el relieve'}`
      }
      return i
    },
  }

  return (
    <figure className="absolute inset-x-0 bottom-0 z-10 border-t border-seam bg-void/85 px-4 pb-2 pt-2 sm:px-8" aria-label={`Horizonte real de ${data.site.name} y recorrido del Sol`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 text-[0.6875rem] leading-snug">
        <span className="text-ink-muted">Horizonte real · {data.site.name} · LOLA + JPL Horizons</span>
        <span ref={label} className="font-mono text-ink-faint" />
      </figcaption>
      <div className="relative mt-1.5 h-12 sm:h-14">
        <svg aria-hidden viewBox={`0 0 360 ${span}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
          <line x1={0} x2={360} y1={y(0)} y2={y(0)} stroke="var(--color-seam-strong)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d={paths.track} fill="none" stroke="var(--color-sun)" strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />
          <path d={paths.relief} fill="var(--color-relief)" stroke="var(--color-relief-edge)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
        <span ref={sun} aria-hidden data-visible="true"
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sun bg-sun data-[visible=false]:bg-void"
          style={{ left: '0%', top: '50%' }} />
      </div>
    </figure>
  )
}

// ---------------------------------------------------------------------------
// Cierre y pie de página
// ---------------------------------------------------------------------------

function Finale({ facts, onOpen }: { facts: StoryFacts | null; onOpen: () => void }) {
  return (
    <section aria-labelledby="final" className="relative border-t border-seam px-5 pb-20 pt-24 sm:px-10 lg:px-16">
      <p className="instrument-label text-ink-muted">Tu turno</p>
      <h2 id="final" className="mt-4 max-w-4xl font-display text-6xl font-extrabold uppercase leading-[0.88] text-ink sm:text-7xl lg:text-8xl">
        Tú eliges dónde y cuándo.
      </h2>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
        {facts ? `${facts.siteCount} sitios del polo sur y ${facts.periodDays} días` : 'Sitios del polo sur y un año'} de posiciones
        reales del Sol y la Tierra, con el relieve de LOLA. Compara fechas, configura tu módulo y comprueba si tu misión sobrevive.
      </p>
      <Button variant="primary" size="lg" className="mt-8" onClick={onOpen}>
        Abrir el planificador
      </Button>
      <p className="mt-10 max-w-xl text-xs leading-relaxed text-ink-faint">
        Fuentes: JPL Horizons (NASA/JPL) y altimetría LOLA (Lunar Reconnaissance Orbiter).
        {facts && <> Periodo: {formatDate(sampleTime(facts.period, 0))} – {formatDate(sampleTime(facts.period, (facts.periodDays * 24) / facts.period.stepHours - 1))}. Fechas en UTC.</>}
      </p>
    </section>
  )
}

/**
 * Pie de página: la marca gigante, rellena con el mapa real de horas de sol del polo sur
 * (LOLA AVGVISIB, NASA/GSFC). Ámbar = mucha luz; azul oscuro = sombra permanente. El mapa se desliza
 * despacio con el scroll.
 */
function Footer({ onOpen }: { onOpen: () => void }) {
  const fill = useRef<SVGPatternElement | null>(null)
  const root = useRef<HTMLElement | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    let raf = 0
    const frame = () => {
      const el = root.current
      const pat = fill.current
      if (el && pat) {
        const r = el.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, 1 - r.top / window.innerHeight))
        pat.setAttribute('patternTransform', `translate(${(-120 * p).toFixed(1)} ${(-260 + 140 * p).toFixed(1)})`)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  return (
    <footer ref={root} className="relative overflow-hidden border-t border-seam bg-void">
      <div className="flex flex-col gap-6 px-5 pb-6 pt-14 sm:flex-row sm:items-end sm:justify-between sm:px-10 lg:px-16">
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          Dentro de las letras está el mapa real de luz del polo sur: en ámbar, los lugares con más horas de sol; en azul
          oscuro, los cráteres donde nunca llega. Fuente: equipo LOLA, NASA/GSFC (Mazarico et al. 2011).
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <button type="button" onClick={onOpen} className="font-bold text-ink underline decoration-seam-strong underline-offset-4 hover:decoration-ink">
            Abrir el planificador
          </button>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
            className="text-ink-muted hover:text-ink">
            Volver arriba ↑
          </button>
        </div>
      </div>
      <p className="px-5 text-xs text-ink-faint sm:px-10 lg:px-16">
        NASA Space Apps Challenge 2026 · Reto «Lunar Landing Site Navigator»
      </p>

      <div aria-hidden className="select-none px-2 pb-2 pt-6 sm:px-3">
        <svg width="0" height="0" className="absolute">
          <defs>
            <pattern ref={fill} id="lola-light" patternUnits="userSpaceOnUse" width="1400" height="1400" patternTransform="translate(0 -260)">
              <image href="/textures/illumination/south_pole_sun.jpg" width="1400" height="1400" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          </defs>
        </svg>
        {/* Una sola palabra en todos los anchos: en el celular, más alta y algo más angosta para que pese igual. */}
        <GiantWord text="GEOATHECTUM" viewBox="0 0 1000 150" fontSize={168} y={140} textLength={992} className="hidden sm:block" />
        <GiantWord text="GEOATHECTUM" viewBox="0 0 1000 205" fontSize={232} y={192} textLength={994} className="sm:hidden" />
      </div>
    </footer>
  )
}

function GiantWord({ text, viewBox, fontSize, y, textLength, className }: {
  text: string
  viewBox: string
  fontSize: number
  y: number
  textLength: number
  className?: string
}) {
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className={cx('block w-full', className)}
      style={{ filter: 'drop-shadow(0 0 36px rgb(255 181 71 / 0.16))' }}>
      <text x="500" y={y} textAnchor="middle" textLength={textLength} lengthAdjust="spacingAndGlyphs"
        fill="url(#lola-light)" fontFamily="'Big Shoulders Stencil', 'Arial Narrow', sans-serif" fontWeight={900} fontSize={fontSize}>
        {text}
      </text>
    </svg>
  )
}
