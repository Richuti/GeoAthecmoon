// Franjas de la misión, hora por hora: cuándo hay Sol (ámbar) y cuándo se ve la Tierra (azul).
// Se lee de un vistazo dónde caen las noches y los cortes de comunicación; una marca roja señala si la batería se agota.
import { runs } from '../lib/strips'

export function PlanStrips({ lit, contact, from, to, stepHours, failedAt, compact = false }: {
  lit: boolean[]
  contact: boolean[]
  from: number
  to: number
  stepHours: number
  /** Muestra (absoluta) en la que la batería llega al 20 % */
  failedAt?: number | null
  compact?: boolean
}) {
  const n = Math.max(1, to - from)
  const days = Math.round((n * stepHours) / 24)
  const perDay = 24 / stepHours
  const row = (flags: boolean[], cls: string, y: number, h: number) =>
    runs(flags, from, to).map(([a, b]) => <rect key={`${y}-${a}`} className={cls} x={a} y={y} width={b - a} height={h} />)
  const h = compact ? 7 : 10
  const fail = failedAt != null && failedAt >= from && failedAt < to ? failedAt - from : null
  return (
    <div className="plan-strips">
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
        <span className="text-[0.6875rem] font-bold text-sun">Sol</span>
        <svg viewBox={`0 0 ${n} ${h}`} preserveAspectRatio="none" className="plan-strips__bar" style={{ height: h }} aria-hidden>
          <rect className="plan-strips__night" width={n} height={h} />
          {row(lit, 'plan-strips__sun', 0, h)}
          {fail !== null && <rect className="plan-strips__dead" x={fail} width={n - fail} height={h} />}
        </svg>
        <span className="text-[0.6875rem] font-bold text-earth">Tierra</span>
        <svg viewBox={`0 0 ${n} ${h}`} preserveAspectRatio="none" className="plan-strips__bar" style={{ height: h }} aria-hidden>
          <rect className="plan-strips__night" width={n} height={h} />
          {row(contact, 'plan-strips__earth', 0, h)}
          {fail !== null && <rect className="plan-strips__dead" x={fail} width={n - fail} height={h} />}
        </svg>
        <span />
        <div className="relative h-3" aria-hidden>
          {Array.from({ length: days + 1 }, (_, d) => d).filter((d) => d === 0 || d === days || (days <= 16 ? d % 2 === 0 : d % 7 === 0)).map((d) => (
            <span key={d} className="absolute top-0 -translate-x-1/2 text-[0.625rem] tabular-nums text-ink-faint" style={{ left: `${Math.min(100, (d * perDay * 100) / n)}%` }}>
              {d === 0 ? 'día 1' : d}
            </span>
          ))}
          {fail !== null && <span className="absolute top-0 -translate-x-1/2 text-[0.625rem] font-bold text-critical" style={{ left: `${(fail * 100) / n}%` }}>▲</span>}
        </div>
      </div>
      <p className="sr-only">
        Durante la misión hay Sol {Math.round((runs(lit, from, to).reduce((s, [a, b]) => s + b - a, 0) * 100) / n)} % del tiempo
        y la Tierra se ve {Math.round((runs(contact, from, to).reduce((s, [a, b]) => s + b - a, 0) * 100) / n)} % del tiempo.
        {fail !== null && ' La batería se agota antes del final.'}
      </p>
    </div>
  )
}
