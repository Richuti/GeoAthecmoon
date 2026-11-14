import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { formatCoords } from '../lib/format'
import { CATEGORY_HINT, CATEGORY_LABEL, groupByCategory } from '../lib/sites'
import type { Site } from '../types'
import { InfoTip, Panel, cx } from './ui'

/** Resumen de un sitio para la lista. Lo calcula quien usa el componente. */
export interface SiteSummary {
  /** Viabilidad del periodo, 0–100 */
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
    <Panel
      label={`Sitios · ${sites.length}`}
      bodyClassName="p-2 pt-4 lg:min-h-0 lg:overflow-y-auto"
      actions={
        <InfoTip label="Lista de sitios" align="end">
          El número es la viabilidad de todo el periodo. Las barras muestran el % del tiempo con luz (ámbar) y con
          contacto con la Tierra (azul). Usa las flechas ↑ ↓ para recorrer la lista.
        </InfoTip>
      }
    >
      {/* Móvil: solo el sitio elegido y un botón para desplegar la lista */}
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left lg:hidden"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm text-ink">{selected?.name ?? 'Elige un sitio'}</span>
          {selected && <span className="font-mono text-[0.625rem] text-ink-faint">{formatCoords(selected)}</span>}
        </span>
        <span className="shrink-0 rounded-hw border border-seam-strong px-2.5 py-1 text-xs font-bold text-ink-muted">
          {open ? 'Ocultar' : `Cambiar sitio (${sites.length})`}
        </span>
      </button>

      <nav
        id={listId}
        ref={navRef}
        aria-label="Sitios de alunizaje"
        onKeyDown={onKeyDown}
        className={cx('flex-col gap-3 max-lg:mt-2 max-lg:border-t max-lg:border-seam max-lg:pt-3', open ? 'flex' : 'hidden', 'lg:flex')}
      >
        {groupByCategory(sites).map(({ category, sites: list }) => (
          <div key={category} role="group" aria-label={CATEGORY_LABEL[category]}>
            <h3 className="instrument-label flex items-center gap-1.5 px-3 pb-1 pt-1">
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
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </Panel>
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
        'flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors duration-150',
        active ? 'bg-hull-raised shadow-[inset_2px_0_0_var(--color-ink)]' : 'hover:bg-hull-raised/60',
      )}
    >
      <span className="flex w-full items-baseline justify-between gap-2">
        <span className={cx('text-sm', active ? 'text-ink' : 'text-ink-muted')}>{site.name}</span>
        {summary ? (
          <span className="font-mono text-xs text-ink">
            {Math.round(summary.viability)}%<span className="sr-only"> de viabilidad</span>
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
      <span className="font-mono text-[0.625rem] text-ink-faint">{formatCoords(site)}</span>
      {summary && (
        <>
          <span className="mt-0.5 grid grid-cols-2 gap-1.5" aria-hidden>
            <MiniBar pct={summary.lightPct} className="bg-sun" />
            <MiniBar pct={summary.contactPct} className="bg-earth" />
          </span>
          <span className="sr-only">
            Luz {light} % del tiempo, contacto con la Tierra {contact} % del tiempo.
          </span>
        </>
      )}
    </button>
  )
}

function MiniBar({ pct, className }: { pct: number; className: string }) {
  return (
    <span className="block h-0.5 overflow-hidden bg-seam">
      <span className={cx('block h-full opacity-80', className)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  )
}
