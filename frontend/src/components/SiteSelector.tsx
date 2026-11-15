import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { formatCoords } from '../lib/format'
import { CATEGORY_HINT, CATEGORY_LABEL, groupByCategory } from '../lib/sites'
import type { Site } from '../types'
import { InfoTip, cx } from './ui'

/** Resumen de un sitio para la lista. Lo calcula quien usa el componente. */
export interface SiteSummary {
  /** Viabilidad de la misión en la fecha y duración elegidas, 0–100 */
  viability: number
  /** % del tiempo con luz solar */
  lightPct: number
  /** % del tiempo con contacto con la Tierra */
  contactPct: number
}

interface SiteSelectorProps {
  sites: Site[]
  selectedId: string
  /** Resúmenes de los sitios ya cargados, por id */
  summaries: Record<string, SiteSummary>
  /** Errores de carga, por id */
  errors: Record<string, string>
  onSelect: (id: string) => void
}

const NAV_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End']

/**
 * Lista de sitios agrupada por categoría.
 * - Teclado: Tab entra a la lista; ↑ ↓ Inicio Fin se mueven entre sitios; Enter o Espacio eligen.
 * - Móvil: se pliega y muestra solo el sitio elegido con un botón para ver todos.
 */
export function SiteSelector({ sites, selectedId, summaries, errors, onSelect }: SiteSelectorProps) {
  const listId = useId()
  const navRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const selected = sites.find((s) => s.id === selectedId)

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!NAV_KEYS.includes(e.key)) return
    const buttons = Array.from(navRef.current?.querySelectorAll<HTMLButtonElement>('button[data-site]') ?? [])
    if (buttons.length === 0) return
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    let next = current
    if (e.key === 'ArrowDown') next = current < 0 ? 0 : Math.min(current + 1, buttons.length - 1)
    if (e.key === 'ArrowUp') next = current < 0 ? 0 : Math.max(current - 1, 0)
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = buttons.length - 1
    e.preventDefault()
    buttons[next]?.focus()
  }

  return (
    <aside aria-label="Elegir sitio de alunizaje" className="glass-surface min-w-0 p-4 lg:sticky lg:top-6">
      <div className="flex items-baseline justify-between gap-3"><h2 className="text-base font-bold text-ink">Sitios de alunizaje</h2><span className="text-xs text-ink-muted">{sites.length} sitios</span></div>
      <p className="mb-4 mt-2 text-xs leading-relaxed text-ink-muted">Las cifras comparan la fecha y los días de tu plan.</p>
      {/* Móvil: solo el sitio elegido y un botón para desplegar la lista */}
      <button
        ref={toggleRef}
        type="button"
        className="flex min-h-16 w-full items-center justify-between gap-3 border border-seam-strong bg-hull px-4 py-3 text-left lg:hidden"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0">
          <span className="block truncate text-base font-bold text-ink">{selected?.name ?? 'Elige un sitio'}</span>
          {selected && <span className="text-xs text-ink-muted">{formatCoords(selected)}</span>}
        </span>
        <span className="shrink-0 text-xs font-bold text-ink">
          {open ? 'Cerrar ↑' : 'Cambiar ↓'}
        </span>
      </button>

      <nav
        id={listId}
        ref={navRef}
        aria-label="Sitios de alunizaje"
        onKeyDown={onKeyDown}
        className={cx('flex-col gap-4 max-lg:mt-4', open ? 'flex' : 'hidden', 'lg:flex')}
      >
        {groupByCategory(sites).map(({ category, sites: list }) => (
          <div key={category} role="group" aria-label={CATEGORY_LABEL[category]}>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs text-ink-muted">
              {CATEGORY_LABEL[category]}
              <InfoTip label={CATEGORY_LABEL[category]} align="start">
                {CATEGORY_HINT[category]}
              </InfoTip>
            </h3>
            <ul className="flex flex-col gap-0.5">
              {list.map((s) => (
                <li key={s.id}>
                  <SiteButton
                    site={s}
                    active={s.id === selectedId}
                    summary={summaries[s.id]}
                    error={errors[s.id]}
                    onSelect={() => {
                      onSelect(s.id)
                      setOpen(false)
                      if (window.innerWidth < 1024) toggleRef.current?.focus()
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

function SiteButton({
  site,
  active,
  summary,
  error,
  onSelect,
}: {
  site: Site
  active: boolean
  summary?: SiteSummary
  error?: string
  onSelect: () => void
}) {
  const light = summary ? Math.round(summary.lightPct) : null
  const contact = summary ? Math.round(summary.contactPct) : null

  return (
    <button
      type="button"
      data-site={site.id}
      aria-current={active ? 'true' : undefined}
      onClick={onSelect}
      className={cx(
        'site-choice flex w-full flex-col gap-2 border px-3 py-3.5 text-left transition-colors duration-150',
        active ? 'border-ink-faint bg-hull-raised' : 'border-transparent hover:border-seam hover:bg-hull',
      )}
    >
      <span className="flex w-full items-baseline justify-between gap-2">
        <span className={cx('text-sm font-bold', active ? 'text-ink' : 'text-ink-muted')}>{site.name}</span>
        {summary ? (
          <span className="font-mono text-xs text-ink">
            {Math.round(summary.viability)}<span className="text-ink-muted">/100</span><span className="sr-only"> de viabilidad</span>
          </span>
        ) : error ? (
          <span className="font-mono text-xs text-critical" title={error}>
            Error<span className="sr-only">: {error}</span>
          </span>
        ) : (
          <span className="font-mono text-xs text-ink-faint motion-safe:animate-pulse">
            …<span className="sr-only">cargando</span>
          </span>
        )}
      </span>
      {summary && (
        <>
          <span className="grid w-full grid-cols-2 gap-3 text-xs" aria-hidden>
            <span className="text-sun">Luz {light} %</span>
            <span className="text-earth">Tierra {contact} %</span>
          </span>
          <span className="sr-only">
            Luz {light} % del tiempo, contacto con la Tierra {contact} % del tiempo.
          </span>
        </>
      )}
    </button>
  )
}
