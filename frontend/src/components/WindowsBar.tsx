import type { MouseEvent } from 'react'
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
}

/** Convierte banderas en rangos continuos [inicio, fin). */
function runs(flags: boolean[]): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let from = -1
  flags.forEach((f, i) => {
    if (f && from < 0) from = i
    if (!f && from >= 0) {
      out.push([from, i])
      from = -1
    }
  })
  if (from >= 0) out.push([from, flags.length])
  return out
}

const dayLabel = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Franjas de luz (ámbar) y contacto (azul) a lo largo del periodo, con el instante actual. */
export function WindowsBar({ lit, contact, index, start, stepHours, onSeek }: WindowsBarProps) {
  const n = lit.length
  const startMs = Date.parse(start)
  const samplesPerWeek = (7 * 24) / stepHours
  const weeks = Array.from({ length: Math.floor((n - 1) / samplesPerWeek) + 1 }, (_, k) => k * samplesPerWeek)

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return
    const r = e.currentTarget.getBoundingClientRect()
    onSeek(Math.round(((e.clientX - r.left) / r.width) * (n - 1)))
  }

  return (
    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-x-3 gap-y-1.5">
      <Row label="Luz" />
      <Track runs={runs(lit)} n={n} className="fill-sun" index={index} onClick={seek} />
      <Row label="Contacto" />
      <Track runs={runs(contact)} n={n} className="fill-earth" index={index} onClick={seek} />
      <span />
      <div className="relative h-4">
        {weeks.map((i) => (
          <span
            key={i}
            className="absolute top-0.5 -translate-x-1/2 whitespace-nowrap font-mono text-[0.625rem] text-ink-faint first:translate-x-0 max-sm:odd:hidden"
            style={{ left: `${(i / (n - 1)) * 100}%` }}
          >
            {dayLabel.format(new Date(startMs + i * stepHours * 3600_000))}
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
}: {
  runs: Array<[number, number]>
  n: number
  className: string
  index: number
  onClick: (e: MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div className="relative h-3 cursor-pointer overflow-hidden bg-hull-raised" onClick={onClick} aria-hidden>
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${n} 1`} preserveAspectRatio="none">
        {segments.map(([a, b]) => (
          <rect key={a} x={a} y={0} width={b - a} height={1} className={cx(className, 'opacity-85')} />
        ))}
      </svg>
      <span className="absolute inset-y-0 w-px bg-ink" style={{ left: `${(index / (n - 1)) * 100}%` }} />
    </div>
  )
}
