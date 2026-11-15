import { useCallback, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from './cx'
import { createPortal } from 'react-dom'

interface InfoTipProps {
  /** Qué se explica. Se usa en el nombre accesible del botón: "Qué significa: {label}" */
  label: string
  /** Explicación en lenguaje simple, una o dos frases */
  children: ReactNode
  /** Hacia dónde se alinea la burbuja respecto del botón */
  align?: 'start' | 'center' | 'end'
}

const WIDTH = 256 // px, igual que w-64
const MARGIN = 8 // separación mínima con el borde de la pantalla
const ROOM_BELOW = 170 // si queda menos espacio abajo, se abre hacia arriba

/**
 * Botón "?" con una explicación. Se abre con el mouse, con el teclado (foco) y con un toque.
 * La burbuja usa portal y posición fija: no la recortan los paneles con scroll o desenfoque ni sale de la pantalla
 * y sigue al botón si la página o un panel se desplazan.
 */
export function InfoTip({ label, children, align = 'center' }: InfoTipProps) {
  const id = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>()

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const ideal = align === 'start' ? r.left : align === 'end' ? r.right - WIDTH : r.left + r.width / 2 - WIDTH / 2
    const left = Math.max(MARGIN, Math.min(ideal, window.innerWidth - WIDTH - MARGIN))
    const below = window.innerHeight - r.bottom > ROOM_BELOW
    setStyle(below ? { left, top: r.bottom + MARGIN } : { left, bottom: window.innerHeight - r.top + MARGIN })
  }, [align])

  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  const show = () => setOpen(true)
  const hide = () => setOpen(false)

  return (
    <span className="inline-flex align-middle" onMouseEnter={show} onMouseLeave={hide}>
      <button
        ref={btn}
        type="button"
        aria-label={`Qué significa: ${label}`}
        aria-describedby={open ? id : undefined}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        onKeyDown={(e) => e.key === 'Escape' && hide()}
        className="grid size-4 place-items-center rounded-hw border border-seam-strong font-mono text-[0.625rem] leading-none text-ink-faint transition-colors hover:border-ink-faint hover:text-ink"
      >
        ?
      </button>
      {open && createPortal(<span
        role="tooltip"
        id={id}
        style={style}
        className={cx(
          'flight-tooltip pointer-events-none fixed z-50 w-64 rounded-hw border border-seam-strong bg-hull-raised p-3',
          'text-left font-sans text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-muted shadow-2xl shadow-black/60',
          'transition-opacity duration-150',
          open ? 'visible opacity-100' : 'invisible opacity-0',
        )}
      >
        {children}
      </span>, document.body)}
    </span>
  )
}
