import type { ReactNode } from 'react'
import { cx } from './cx'

interface EmptyStateProps {
  title: string
  children?: ReactNode
  /** Acción opcional (un botón) */
  action?: ReactNode
  className?: string
}

/** Lugar vacío: dice qué falta y qué hacer, sin disculparse. */
export function EmptyState({ title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cx('flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
