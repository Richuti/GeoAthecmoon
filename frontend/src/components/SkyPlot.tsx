// Tarea 7: gráfico polar del cielo visto desde el sitio.
// El centro es lo más alto del gráfico y el borde lo más bajo: el horizonte plano (0°) es un círculo
// punteado, y el relieve es la zona rellena que entra desde el borde. Si el Sol o la Tierra quedan dentro
// de esa zona, el relieve los tapa. Norte arriba y este a la derecha, igual que la franja de 360°.
import { useMemo } from 'react'
import type { BodyTrack } from '../types'
import type { BodyNow } from './HorizonStrip'
import { InfoTip, Panel } from './ui'

/** Rango de elevaciones del gráfico: el borde es MIN_EL y el centro MAX_EL. */
const MIN_EL = -5
const MAX_EL = 15
/** Misma escala ampliada cerca de 0° que la franja de horizonte (asinh: lineal cerca de 0). */
const K = 0.75
const s = (el: number) => Math.asinh(el / K)
const R = 100
const radius = (el: number) => {
  const e = Math.max(MIN_EL, Math.min(MAX_EL, el))
  return (R * (s(MAX_EL) - s(e))) / (s(MAX_EL) - s(MIN_EL))
}
const point = (az: number, el: number) => {
  const r = radius(el)
  const a = (az * Math.PI) / 180
  return [r * Math.sin(a), -r * Math.cos(a)] as const
}

const RINGS = [10, 4, 1, -1, -4]
const CARDINAL = [
  { az: 0, label: 'N' },
  { az: 90, label: 'E' },
  { az: 180, label: 'S' },
  { az: 270, label: 'O' },
]

interface SkyPlotProps {
  /** Elevación del relieve en cada grado de azimut, desde el norte en sentido horario */
  horizon: number[]
  sun: BodyNow
  earth: BodyNow
  /** Recorridos completos del periodo */
  sunTrack: BodyTrack
  earthTrack: BodyTrack
}

/** Recorrido del periodo como una sola línea tenue (submuestreado para no dibujar 8760 puntos). */
function trackPath(track: BodyTrack): string {
  const step = Math.max(1, Math.floor(track.az.length / 1500))
  let d = ''
  for (let i = 0; i < track.az.length; i += step) {
    const [x, y] = point(track.az[i], track.el[i])
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
  }
  return d
}

export function SkyPlot({ horizon, sun, earth, sunTrack, earthTrack }: SkyPlotProps) {
  const relief = useMemo(() => {
    // Anillo exterior (borde) y, por dentro, la silueta del relieve recorrida al revés: queda rellena la franja entre ambos.
    const n = horizon.length
    const step = 360 / n
    const ridge = horizon.map((el, k) => point(k * step, el))
    const ridgeD = ridge.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join('') + 'Z'
    const outer = `M0,${-R - 1}A${R + 1},${R + 1} 0 1 1 0,${R + 1}A${R + 1},${R + 1} 0 1 1 0,${-R - 1}Z`
    return { fill: outer + ridgeD, ridge: ridgeD }
  }, [horizon])
  const sunD = useMemo(() => trackPath(sunTrack), [sunTrack])
  const earthD = useMemo(() => trackPath(earthTrack), [earthTrack])
  // Rumbo opuesto a la Tierra (media circular de su azimut), más 45° para no caer sobre un punto cardinal.
  const labelAz = useMemo(() => {
    let sx = 0
    let sy = 0
    for (let i = 0; i < earthTrack.az.length; i += 24) {
      sx += Math.sin((earthTrack.az[i] * Math.PI) / 180)
      sy += Math.cos((earthTrack.az[i] * Math.PI) / 180)
    }
    return ((Math.atan2(sx, sy) * 180) / Math.PI + 180 + 45 + 360) % 360
  }, [earthTrack])

  return (
    <Panel
      label="Cielo desde el sitio"
      actions={
        <InfoTip label="Cómo leer el cielo" align="end">
          Es el cielo visto desde el sitio, con el norte arriba. El centro está a 15° de altura y el borde, 5° bajo el
          horizonte; la escala se amplía cerca de 0°, donde pasa todo. La zona gris es el relieve: si el Sol o la Tierra
          caen dentro, quedan tapados y se dibujan huecos. Las líneas tenues son su recorrido en todo el periodo.
        </InfoTip>
      }
    >
      <figure className="mx-auto w-full max-w-88">
        <svg viewBox="-118 -118 236 236" className="w-full" role="img"
          aria-label={`Cielo desde el sitio. Sol a ${sun.el.toFixed(1)}° de elevación, ${sun.visible ? 'visible' : 'tapado por el relieve'}. Tierra a ${earth.el.toFixed(1)}°, ${earth.visible ? 'visible' : 'tapada por el relieve'}.`}>
          {/* Anillos de elevación y rumbos */}
          {RINGS.map((el) => (
            <circle key={el} r={radius(el)} fill="none" stroke="var(--color-seam)" strokeOpacity={0.8} />
          ))}
          {[0, 45, 90, 135].map((az) => {
            const [x, y] = point(az, MIN_EL)
            return <line key={az} x1={x} y1={y} x2={-x} y2={-y} stroke="var(--color-seam)" strokeDasharray={az % 90 ? '2 4' : undefined} />
          })}

          {/* Recorridos del periodo */}
          <path d={earthD} fill="none" stroke="var(--color-earth)" strokeOpacity={0.35} strokeWidth={0.8} />
          <path d={sunD} fill="none" stroke="var(--color-sun)" strokeOpacity={0.35} strokeWidth={0.8} />

          {/* Relieve: desde el borde hasta la silueta */}
          <path d={relief.fill} fill="var(--color-relief)" fillRule="evenodd" fillOpacity={0.92} />
          <path d={relief.ridge} fill="none" stroke="var(--color-relief-edge)" strokeWidth={1} />
          {/* Horizonte plano (0°) */}
          <circle r={radius(0)} fill="none" stroke="var(--color-seam-strong)" strokeDasharray="3 3" />

          {/* Escala de elevación, en el rumbo más alejado de la Tierra para no taparla */}
          {[10, 4, 1, 0, -4].map((el) => {
            const [x, y] = point(labelAz, el)
            return (
              <text key={el} x={x} y={y} fontSize={6.5} textAnchor="middle" dominantBaseline="middle" fill="var(--color-ink-faint)"
                stroke="var(--color-void)" strokeWidth={2.5} paintOrder="stroke" className="font-mono">
                {el > 0 ? `+${el}` : el === 0 ? '0' : `−${-el}`}°
              </text>
            )
          })}
          {CARDINAL.map(({ az, label }) => {
            const a = (az * Math.PI) / 180
            return (
              <text key={label} x={110 * Math.sin(a)} y={-110 * Math.cos(a)} fontSize={9} textAnchor="middle" dominantBaseline="middle"
                fill={az === 0 ? 'var(--color-ink)' : 'var(--color-ink-muted)'} className="font-mono">
                {label}
              </text>
            )
          })}

          <Body now={earth} color="var(--color-earth)" size={4} />
          <Body now={sun} color="var(--color-sun)" size={5} />
        </svg>
        <figcaption className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-[0.6875rem] text-ink-faint">
          <span className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2 rounded-full bg-sun" />Sol</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2 rounded-full bg-earth" />Tierra</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2 rounded-full border-2 border-ink-faint" />Tapado por el relieve</span>
        </figcaption>
      </figure>
    </Panel>
  )
}

/** Posición actual: relleno si se ve, hueco si el relieve lo tapa. */
function Body({ now, color, size }: { now: BodyNow; color: string; size: number }) {
  const [x, y] = point(now.az, now.el)
  return now.visible ? (
    <g>
      <circle cx={x} cy={y} r={size + 4} fill={color} fillOpacity={0.18} />
      <circle cx={x} cy={y} r={size} fill={color} />
    </g>
  ) : (
    <circle cx={x} cy={y} r={size - 0.6} fill="var(--color-void)" stroke={color} strokeWidth={1.6} />
  )
}
