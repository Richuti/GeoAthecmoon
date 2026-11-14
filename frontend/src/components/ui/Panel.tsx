import { useId, type ReactNode } from 'react'
import { cx } from './cx'

interface PanelProps {
  /** Nombre del panel. Va incrustado en la línea superior del marco, como en un plano técnico */
  label: string
  /** Un control pequeño (por ejemplo un InfoTip), incrustado en el borde a la derecha */
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Clases del cuerpo. Por defecto `p-4 pt-5`; usa `p-0` para contenido a sangre. */
  bodyClassName?: string
}

/** Marco de instrumento: línea fina, esquinas rectas y el nombre sobre el borde. Sin fondo propio. */
export function Panel({ label, actions, children, className, bodyClassName }: PanelProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cx('relative flex min-h-0 flex-col border border-seam', className)}>
      <h2 id={id} className="instrument-label absolute -top-2 left-3 z-10 bg-void px-1.5">
        {label}
      </h2>
      {actions && <div className="absolute -top-2 right-3 z-10 flex items-center bg-void px-1.5">{actions}</div>}
      <div className={cx('min-h-0 flex-1', bodyClassName ?? 'p-4 pt-5')}>{children}</div>
    </section>
  )
}
