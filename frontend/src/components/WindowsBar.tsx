import type { MouseEvent } from 'react'
import { timeTicks } from '../lib/time'
import { windows, type TimeWindow } from '../lib/visibility'
import { cx } from './ui'

interface WindowsBarProps {
  /** Una bandera por muestra: hay luz */
  lit: boolean[]
  /** Una bandera por muestra: hay contacto con la Tierra */
  contact: boolean[]
  /** Muestra actual (cursor) */
  index: number
  start: string
  stepHours: number
  /** Al hacer clic en la barra se salta a esa muestra */
  onSeek?: (index: number) => void
  /** Rango [from, to) a marcar (la misión simulada) */
  highlight?: { from: number; to: number }
  /** Opcional: una bandera por muestra, hay enlace con alguna antena de la DSN. Agrega una fila. */
  dsn?: boolean[] | null
  /** Opcional: eclipses del Sol por la Tierra, marcados como un corte en la franja de luz */
  eclipses?: Array<{ start: number; end: number }>
}

/** Franjas de luz (ámbar) y contacto (azul) a lo largo del periodo, con el instante actual. */
export function WindowsBar({ lit, contact, index, start, stepHours, onSeek, highlight, dsn, eclipses }: WindowsBarProps) {
  const n = lit.length
  const ticks = timeTicks(start, stepHours, n)

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return
    const r = e.currentTarget.getBoundingClientRect()
    onSeek(Math.round(((e.clientX - r.left) / r.width) * (n - 1)))
  }

  return (
    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-x-3 gap-y-1.5">
      <Row label="Luz" />
      <Track runs={windows(lit)} n={n} className="fill-sun" index={index} onClick={seek} highlight={highlight} cuts={eclipses} />
      <Row label="Contacto" />
      <Track runs={windows(contact)} n={n} className="fill-earth" index={index} onClick={seek} highlight={highlight} />
      {dsn && <>
        <Row label="DSN" />
        <Track runs={windows(dsn)} n={n} className="fill-earth/55" index={index} onClick={seek} highlight={highlight} />
      </>}
      <span />
      <div className="relative h-4">
        {ticks.map(({ index: i, label }) => (
          <span
            key={i}
            className="absolute top-0.5 -translate-x-1/2 whitespace-nowrap font-mono text-[0.625rem] text-ink-faint first:translate-x-0 max-sm:odd:hidden"
            style={{ left: `${(i / (n - 1)) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Row({ label }: { label: string }) {
  return <span className="instrument-label">{label}</span>
}

function Track({
  runs: segments,
  n,
  className,
  index,
  onClick,
  highlight,
  cuts,
}: {
  highlight?: { from: number; to: number }
  runs: TimeWindow[]
  n: number
  className: string
  index: number
  onClick: (e: MouseEvent<HTMLDivElement>) => void
  /** Tramos a cortar sobre la franja (un mínimo de ancho para que se vean en un año) */
  cuts?: Array<{ start: number; end: number }>
}) {
  const minCut = n / 300
  return (
    <div className="relative h-3 cursor-pointer overflow-hidden bg-hull-raised" onClick={onClick} aria-hidden>
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${n} 1`} preserveAspectRatio="none">
        {segments.map((s) => (
          <rect key={s.start} x={s.start} y={0} width={s.end - s.start} height={1} className={cx(className, 'opacity-85')} />
        ))}
        {cuts?.map((c) => {
          const w = Math.max(minCut, c.end - c.start)
          return <rect key={`cut${c.start}`} x={(c.start + c.end) / 2 - w / 2} y={0.2} width={w} height={0.6} className="fill-void" />
        })}
      </svg>
      {highlight && (
        <span
          className="pointer-events-none absolute inset-y-0 border-x border-ink/80 bg-ink/10"
          style={{ left: `${(highlight.from / n) * 100}%`, width: `${((highlight.to - highlight.from) / n) * 100}%` }}
        />
      )}
      <span className="absolute inset-y-0 w-px bg-ink" style={{ left: `${(index / (n - 1)) * 100}%` }} />
    </div>
  )
}
