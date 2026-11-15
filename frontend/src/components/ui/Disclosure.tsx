import type { ReactNode } from 'react'
import { cx } from './cx'

/** Sección técnica plegable: título, contexto y un control de apertura reconocible. */
export function Disclosure({ title, description, children, className, defaultOpen = false }: {
  title: string; description?: string; children: ReactNode; className?: string; defaultOpen?: boolean
}) {
  return <details open={defaultOpen || undefined} className={cx('border border-seam bg-hull/30 [&[open]>summary>svg]:rotate-180', className)}>
    <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-hull-raised/60 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink sm:text-base">{title}</span>
        {description && <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{description}</span>}
      </span>
      <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none">
        <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </summary>
    <div className="border-t border-seam px-5 pb-5 pt-5">{children}</div>
  </details>
}
