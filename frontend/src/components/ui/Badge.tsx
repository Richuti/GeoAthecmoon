import type { ReactNode } from 'react'
import { cx, toneBg, type Tone } from './cx'

const styles: Record<Tone, string> = {
  neutral: 'border-seam-strong text-ink-muted',
  sun: 'border-sun/30 bg-sun/8 text-sun',
  earth: 'border-earth/30 bg-earth/8 text-earth',
  ok: 'border-ok/30 bg-ok/8 text-ok',
  caution: 'border-caution/30 bg-caution/8 text-caution',
  critical: 'border-critical/30 bg-critical/8 text-critical',
}

interface BadgeProps {
  tone?: Tone
  /** Muestra un punto del color del tono antes del texto */
  dot?: boolean
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-hw border px-2 py-0.5 font-mono text-[0.6875rem] leading-5',
        styles[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cx('size-1.5', toneBg[tone])} />}
      {children}
    </span>
  )
}
