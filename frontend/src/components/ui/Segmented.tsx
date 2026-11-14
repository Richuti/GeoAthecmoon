import { cx } from './cx'

interface SegmentedProps<T extends string> {
  /** Nombre accesible del grupo */
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

/** Selector de una opción entre pocas (modo, velocidad, preset). */
export function Segmented<T extends string>({ label, options, value, onChange, size = 'md', className }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('inline-flex rounded-hw border border-seam-strong bg-void p-0.5', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex-1 whitespace-nowrap rounded-[2px] font-bold transition-colors duration-150 ease-console',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-sm',
              active ? 'bg-hull-raised text-ink shadow-[inset_0_0_0_1px_var(--color-seam-strong)]' : 'text-ink-faint hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
