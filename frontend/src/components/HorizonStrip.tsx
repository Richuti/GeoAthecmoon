import type { CSSProperties, ReactNode } from 'react'
import type { BodyTrack } from '../types'
import { cx } from './ui'

/** Posición de un cuerpo en un instante. `visible` = está sobre el relieve (no tapado). */
export interface BodyNow {
  az: number
  el: number
  visible: boolean
}

interface HorizonStripProps {
  /** Elevación del relieve en cada grado de azimut, desde el norte en sentido horario */
  horizon: number[]
  sun: BodyNow
  earth: BodyNow
  /** Recorridos completos del periodo, dibujados tenues detrás */
  sunTrack?: BodyTrack
  earthTrack?: BodyTrack
  /** Rango vertical en grados */
  range?: [number, number]
  /** Texto a la izquierda de la etiqueta (por ejemplo, el nombre del sitio) */
  title?: ReactNode
}

const COMPASS = [
  { az: 0, label: 'N' },
  { az: 45, label: 'NE' },
  { az: 90, label: 'E' },
  { az: 135, label: 'SE' },
  { az: 180, label: 'S' },
  { az: 225, label: 'SO' },
  { az: 270, label: 'O' },
  { az: 315, label: 'NO' },
  { az: 360, label: 'N' },
]

/**
 * Panorama de 360° desde el sitio: la silueta del relieve y el Sol y la Tierra rozándolo.
 * Es el elemento distintivo de la app: en el polo sur lunar todo ocurre en el horizonte.
 */
/**
 * Escala vertical ampliada cerca de 0°: en el polo el Sol pasa a 1–2° del horizonte y el relieve
 * cambia pocos grados. asinh es lineal cerca de 0 y comprime los valores grandes.
 */
const K = 0.75
const scale = (el: number) => Math.asinh(el / K)

const ELEVATION_TICKS = [10, 4, 1, 0, -1, -4]

export function HorizonStrip({ horizon, sun, earth, sunTrack, earthTrack, range = [-5, 11], title }: HorizonStripProps) {
  const [minEl, maxEl] = range
  const top = scale(maxEl)
  const span = top - scale(minEl)
  const y = (el: number) => top - scale(Math.max(minEl - 2, Math.min(maxEl + 2, el)))
  const pctTop = (el: number) => (y(el) / span) * 100

  const relief =
    `M0,${span + 1} ` +
    horizon.map((el, az) => `L${az},${y(el).toFixed(3)}`).join(' ') +
    ` L360,${y(horizon[0]).toFixed(3)} L360,${span + 1} Z`
  const ridge = horizon.map((el, az) => `${az === 0 ? 'M' : 'L'}${az},${y(el).toFixed(3)}`).join(' ') + ` L360,${y(horizon[0]).toFixed(3)}`

  const elevationTicks = ELEVATION_TICKS.filter((t) => t > minEl && t < maxEl)

  return (
    <figure className="relative min-w-0 border-y border-seam bg-void" aria-label="Horizonte de 360 grados visto desde el sitio">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 pt-2.5 sm:px-5">
        <span className="flex min-w-0 items-baseline gap-3">
          <span className="instrument-label">Horizonte 360°</span>
          {title && <span className="truncate text-sm text-ink-muted">{title}</span>}
        </span>
        <span className="flex items-center gap-4 font-mono text-[0.6875rem] text-ink-faint">
          <Legend className="bg-sun">Sol</Legend>
          <Legend className="bg-earth">Tierra</Legend>
          <Legend className="h-2 w-3 rounded-[1px] border-t border-relief-edge bg-relief">Relieve</Legend>
          <span className="hidden md:inline">Elevación ampliada</span>
        </span>
      </figcaption>

      <div className="overflow-x-auto">
        <div className="relative mx-4 mb-1 mt-2 min-w-[42rem] sm:mx-5">
          {/* Área del panorama */}
          <div className="relative h-28 lg:h-32">
            <svg
              className="absolute inset-0 size-full overflow-hidden"
              viewBox={`0 0 360 ${span}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              {/* Rumbos cada 15° */}
              {Array.from({ length: 25 }, (_, i) => i * 15).map((az) => (
                <line
                  key={az}
                  x1={az}
                  x2={az}
                  y1={0}
                  y2={span}
                  stroke="var(--color-seam)"
                  strokeWidth={1}
                  strokeDasharray={az % 45 === 0 ? undefined : '2 4'}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {/* Elevaciones de referencia */}
              {elevationTicks
                .filter((t) => t !== 0)
                .map((t) => (
                  <line key={t} x1={0} x2={360} y1={y(t)} y2={y(t)} stroke="var(--color-seam)" strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
                ))}
              {/* Horizonte plano (0°) */}
              <line
                x1={0}
                x2={360}
                y1={y(0)}
                y2={y(0)}
                stroke="var(--color-seam-strong)"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
              {earthTrack && <Track track={earthTrack} y={y} color="var(--color-earth)" />}
              {sunTrack && <Track track={sunTrack} y={y} color="var(--color-sun)" />}
              <path d={relief} fill="var(--color-relief)" />
              <path d={ridge} fill="none" stroke="var(--color-relief-edge)" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
            </svg>

            {/* Escala de elevación */}
            {elevationTicks.map((el) => (
              <span
                key={el}
                className="pointer-events-none absolute left-1 -translate-y-1/2 font-mono text-[0.625rem] text-ink-faint"
                style={{ top: `${pctTop(el)}%` }}
              >
                {el > 0 ? `+${el}` : el === 0 ? '0' : `−${-el}`}°
              </span>
            ))}

            <Body now={earth} range={range} pctTop={pctTop} kind="earth" />
            <Body now={sun} range={range} pctTop={pctTop} kind="sun" />
          </div>

          {/* Rumbos */}
          <div className="relative h-5">
            {COMPASS.map((c) => (
              <span
                key={c.az}
                className={cx(
                  'absolute top-1 -translate-x-1/2 font-mono text-[0.625rem]',
                  c.az % 90 === 0 ? 'text-ink-muted' : 'text-ink-faint',
                )}
                style={{ left: `${(c.az / 360) * 100}%` }}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}

function Legend({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cx('inline-block size-2 rounded-full', className)} />
      {children}
    </span>
  )
}

/** Recorrido del periodo: líneas tenues, cortadas donde el azimut da la vuelta (360° → 0°). */
function Track({ track, y, color }: { track: BodyTrack; y: (el: number) => number; color: string }) {
  let d = ''
  let prevAz = Number.NaN
  for (let i = 0; i < track.az.length; i += 2) {
    const az = track.az[i]
    const jump = Number.isNaN(prevAz) || Math.abs(az - prevAz) > 180
    d += `${jump ? 'M' : 'L'}${az.toFixed(2)},${y(track.el[i]).toFixed(3)} `
    prevAz = az
  }
  return <path d={d} fill="none" stroke={color} strokeOpacity={0.32} strokeWidth={1} vectorEffect="non-scaling-stroke" />
}

/** Marcador del Sol o la Tierra. Relleno si se ve; hueco si el relieve lo tapa. */
function Body({
  now,
  range,
  pctTop,
  kind,
}: {
  now: BodyNow
  range: [number, number]
  pctTop: (el: number) => number
  kind: 'sun' | 'earth'
}) {
  const [minEl, maxEl] = range
  const below = now.el < minEl
  const above = now.el > maxEl
  const el = Math.max(minEl, Math.min(maxEl, now.el))
  const style: CSSProperties = {
    left: `${(now.az / 360) * 100}%`,
    top: `${pctTop(el)}%`,
  }
  const isSun = kind === 'sun'
  const name = isSun ? 'Sol' : 'Tierra'
  const state = now.visible ? 'visible' : 'tapado por el relieve'

  return (
    <span
      role="img"
      aria-label={`${name}: azimut ${now.az.toFixed(0)}°, elevación ${now.el.toFixed(1)}°, ${state}`}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-300 ease-console"
      style={style}
    >
      <span
        className={cx(
          'block rounded-full',
          isSun ? 'size-3.5' : 'size-3',
          now.visible
            ? isSun
              ? 'bg-sun shadow-[0_0_0_4px_rgb(255_181_71/0.14),0_0_18px_rgb(255_181_71/0.55)]'
              : 'bg-earth shadow-[0_0_0_4px_rgb(90_169_255/0.14),0_0_14px_rgb(90_169_255/0.45)]'
            : isSun
              ? 'border-2 border-sun/70 bg-void'
              : 'border-2 border-earth/70 bg-void',
        )}
      />
      {(below || above) && (
        <span className={cx('absolute left-1/2 -translate-x-1/2 font-mono text-[0.625rem]', below ? 'top-full' : 'bottom-full', isSun ? 'text-sun' : 'text-earth')}>
          {below ? '↓' : '↑'}
        </span>
      )}
    </span>
  )
}
