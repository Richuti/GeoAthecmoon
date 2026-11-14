import type { ReactNode } from 'react'
import { cx, toneText, type Tone } from './cx'
import { InfoTip } from './InfoTip'

interface StatProps {
  label: string
  value: ReactNode
  unit?: string
  tone?: Tone
  /** Línea corta debajo del valor (estado o contexto) */
  detail?: ReactNode
  /** Explicación en lenguaje simple para el botón "?" */
  hint?: ReactNode
}

/** Una métrica: etiqueta de instrumento, valor en mono y unidad. Va dentro de <StatGrid>. */
export function Stat({ label, value, unit, tone = 'neutral', detail, hint }: StatProps) {
  return (
    <div className="min-w-0">
      <dt className="instrument-label flex items-center gap-1.5">
        <span className="truncate">{label}</span>
        {hint && <InfoTip label={label}>{hint}</InfoTip>}
      </dt>
      <dd className="mt-1.5 flex items-baseline gap-1">
        <span className={cx('font-mono text-xl tracking-tight', toneText[tone])}>{value}</span>
        {unit && <span className="font-mono text-xs text-ink-muted">{unit}</span>}
      </dd>
      {detail && <dd className="mt-0.5 truncate text-xs text-ink-muted">{detail}</dd>}
    </div>
  )
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cx('grid grid-cols-2 gap-x-4 gap-y-5', className)}>{children}</dl>
}
