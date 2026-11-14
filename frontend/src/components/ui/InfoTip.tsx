import { useId, type ReactNode } from 'react'
import { cx } from './cx'

interface InfoTipProps {
  /** Qué se explica. Se usa en el nombre accesible del botón: "Qué significa: {label}" */
  label: string
  /** Explicación en lenguaje simple, una o dos frases */
  children: ReactNode
  /** Hacia dónde se abre la burbuja, para que no se salga de la pantalla */
  align?: 'start' | 'center' | 'end'
}

const alignments = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
}

/** Botón "?" con una explicación. Se abre con el mouse y también con el teclado (foco). */
export function InfoTip({ label, children, align = 'center' }: InfoTipProps) {
  const id = useId()
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`Qué significa: ${label}`}
        aria-describedby={id}
        className="grid size-4 place-items-center rounded-hw border border-seam-strong font-mono text-[0.625rem] leading-none text-ink-faint transition-colors hover:border-ink-faint hover:text-ink"
      >
        ?
      </button>
      <span
        role="tooltip"
        id={id}
        className={cx(
          'pointer-events-none invisible absolute top-full z-40 mt-2 w-64 rounded-hw border border-seam-strong bg-hull-raised p-3',
          'text-left font-sans text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-muted shadow-2xl shadow-black/60',
          'opacity-0 transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100',
          alignments[align],
        )}
      >
        {children}
      </span>
    </span>
  )
}
