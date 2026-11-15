import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const WEEK = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
const WEEKDAY = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const pad = (n: number) => String(n).padStart(2, '0')
const dayStart = (t: number) => Math.floor(t / DAY) * DAY
const monthStart = (t: number) => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) }
const addMonths = (t: number, n: number) => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1) }
const longDate = (t: number) => { const d = new Date(t); return `${WEEKDAY[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}` }
const shortDate = (t: number) => { const d = new Date(t); return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}` }

/**
 * Fecha y hora en UTC con calendario propio. Sustituye al selector nativo, que no se puede adaptar al diseño.
 * Paso de una hora, como los datos. Teclado: flechas por días y semanas, Re Pág/Av Pág por meses, Inicio/Fin por semana.
 */
export function DateTimeField({ id, label, value, min, max, onChange, hint }: {
  id?: string; label: string; value: Date; min: Date; max: Date; onChange: (date: Date) => void; hint?: string
}) {
  const generated = useId()
  const field = id ?? generated
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const t = value.getTime(), lo = min.getTime(), hi = max.getTime()
  const [view, setView] = useState(() => monthStart(t))
  const [focusDay, setFocusDay] = useState(() => dayStart(t))
  const moved = useRef(false)
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number; transform?: string }>({ left: 0, top: 0, width: 0, maxHeight: 520 })

  const clamp = (x: number) => Math.min(hi, Math.max(lo, x))
  const hour = new Date(t).getUTCHours()
  const dayOff = (d: number) => d + DAY - 1 < lo || d > hi
  const reveal = () => { setView(monthStart(t)); setFocusDay(dayStart(t)); moved.current = true; setOpen(true) }
  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus() }
  const pickDay = (d: number) => { if (dayOff(d)) return; onChange(new Date(clamp(d + hour * HOUR))); setFocusDay(d) }
  const pickHour = (h: number) => onChange(new Date(clamp(dayStart(t) + h * HOUR)))

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = trigger.current?.getBoundingClientRect()
      if (!r) return
      const vp = window.visualViewport
      const left = vp?.offsetLeft ?? 0, top = vp?.offsetTop ?? 0
      const vw = vp?.width ?? window.innerWidth, vh = vp?.height ?? window.innerHeight
      if (r.bottom < top || r.top > top + vh) { setOpen(false); return }
      // Pantalla angosta: hoja inferior a todo el ancho, siempre visible completa.
      if (vw < 640) {
        setPosition({ width: vw - 16, left: left + 8, top: top + vh - 8, maxHeight: vh - 16, transform: 'translateY(-100%)' })
        return
      }
      const width = Math.min(Math.max(r.width, 580), vw - 32)
      const need = 400
      const below = top + vh - r.bottom - 24, above = r.top - top - 24
      const upward = below < need && above > below
      const cramped = (upward ? above : below) < Math.min(need, 300)
      const maxHeight = Math.max(0, cramped ? vh - 32 : upward ? above : below)
      setPosition({ width, maxHeight, left: Math.max(left + 16, Math.min(r.left, left + vw - width - 16)),
        top: cramped ? top + 16 : upward ? r.top - 8 : r.bottom + 8, transform: upward && !cramped ? 'translateY(-100%)' : undefined })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    window.visualViewport?.addEventListener('resize', place)
    window.visualViewport?.addEventListener('scroll', place)
    return () => {
      window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true)
      window.visualViewport?.removeEventListener('resize', place); window.visualViewport?.removeEventListener('scroll', place)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => {
      if (!trigger.current?.contains(e.target as Node) && !popup.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  // Lleva el foco al día activo al abrir y al moverse con el teclado.
  useEffect(() => {
    if (!open || !moved.current) return
    moved.current = false
    popup.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true })
  }, [open, focusDay, view])

  const gridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = new Date(focusDay)
    const weekday = (d.getUTCDay() + 6) % 7
    const step: Record<string, number> = { ArrowLeft: -DAY, ArrowRight: DAY, ArrowUp: -7 * DAY, ArrowDown: 7 * DAY, Home: -weekday * DAY, End: (6 - weekday) * DAY }
    let next: number | null = null
    if (e.key in step) next = focusDay + step[e.key]
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const m = addMonths(focusDay, e.key === 'PageUp' ? -1 : 1)
      const last = new Date(addMonths(m, 1) - DAY).getUTCDate()
      next = m + (Math.min(d.getUTCDate(), last) - 1) * DAY
    }
    if (next === null) return
    e.preventDefault()
    next = Math.min(dayStart(hi), Math.max(dayStart(lo), next))
    moved.current = true
    setFocusDay(next)
    setView(monthStart(next))
  }

  const first = view
  const offset = (new Date(first).getUTCDay() + 6) % 7
  const daysInMonth = new Date(addMonths(first, 1) - DAY).getUTCDate()
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7
  const canPrev = addMonths(view, -1) >= monthStart(lo)
  const canNext = addMonths(view, 1) <= monthStart(hi)
  const goMonth = (n: number) => {
    const m = addMonths(view, n)
    setView(m)
    const keep = Math.min(new Date(focusDay).getUTCDate(), new Date(addMonths(m, 1) - DAY).getUTCDate())
    setFocusDay(Math.min(dayStart(hi), Math.max(dayStart(lo), m + (keep - 1) * DAY)))
  }
  const selectedDay = dayStart(t)
  const v = new Date(t)

  return <div className="min-w-0">
    <label id={`${field}-label`} htmlFor={field} className="mb-2 block text-sm text-ink-muted">{label}</label>
    <button ref={trigger} id={field} type="button" aria-haspopup="dialog" aria-expanded={open}
      aria-controls={open ? `${field}-picker` : undefined} aria-labelledby={`${field}-label ${field}-value`}
      aria-describedby={hint ? `${field}-hint` : undefined}
      onClick={() => open ? setOpen(false) : reveal()}
      onKeyDown={e => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); reveal() } if (e.key === 'Escape' && open) { e.preventDefault(); close() } }}
      className={cx('flight-field date-trigger flex min-h-14 w-full min-w-0 items-center justify-between gap-3 border bg-hull px-4 py-2.5 text-left transition-colors hover:border-ink-faint', open ? 'border-ink' : 'border-seam-strong')}>
      <span id={`${field}-value`} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="truncate text-base font-bold text-ink">
          <span className="capitalize">{WEEKDAY_SHORT[v.getUTCDay()]}</span> {shortDate(t)}
        </span>
        <span className="text-sm tabular-nums text-ink-muted">{pad(hour)}:00 UTC</span>
      </span>
      <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0 text-ink-muted">
        <rect x="3" y="4.5" width="14" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3 8.5h14M7 2.8v3.2M13 2.8v3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </button>
    {hint && <p id={`${field}-hint`} className="mt-2 text-xs leading-relaxed text-ink-muted">{hint}</p>}

    {open && createPortal(<div ref={popup} id={`${field}-picker`} role="dialog" aria-labelledby={`${field}-label`}
      className="date-picker @container fixed z-[100] overflow-y-auto overscroll-contain"
      style={position}
      onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); close() } }}
      onBlur={e => { const next = e.relatedTarget as Node | null; if (next && !popup.current?.contains(next) && next !== trigger.current) setOpen(false) }}>
      <div className="grid gap-4 p-4 @[34rem]:grid-cols-[minmax(0,1fr)_12.5rem] @[34rem]:gap-5">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p aria-live="polite" className="pl-1 text-base font-bold text-ink">
              <span className="capitalize">{MONTHS[new Date(view).getUTCMonth()]}</span> {new Date(view).getUTCFullYear()}
            </p>
            <div className="flex gap-1">
              <button type="button" className="date-picker__nav" disabled={!canPrev} onClick={() => goMonth(-1)} aria-label="Mes anterior">
                <svg aria-hidden viewBox="0 0 20 20" className="size-4"><path d="m12 5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
              </button>
              <button type="button" className="date-picker__nav" disabled={!canNext} onClick={() => goMonth(1)} aria-label="Mes siguiente">
                <svg aria-hidden viewBox="0 0 20 20" className="size-4"><path d="m8 5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
              </button>
            </div>
          </div>
          <div role="grid" aria-label="Días" onKeyDown={gridKey} className="grid grid-cols-7 gap-1">
            {WEEK.map(w => <span key={w} role="columnheader" className="pb-1 text-center text-[11px] uppercase tracking-wider text-ink-faint">{w}</span>)}
            {Array.from({ length: cells }, (_, k) => {
              const d = first + (k - offset) * DAY
              const inMonth = k >= offset && k < offset + daysInMonth
              if (!inMonth) return <span key={k} aria-hidden />
              const off = dayOff(d)
              return <button key={k} type="button" data-day={d} disabled={off} tabIndex={d === focusDay ? 0 : -1}
                aria-pressed={d === selectedDay} aria-label={longDate(d)} onClick={() => pickDay(d)}
                className={cx('date-picker__day', d === selectedDay && 'is-selected')}>
                {new Date(d).getUTCDate()}
              </button>
            })}
          </div>
        </div>
        <div className="min-w-0 border-t border-white/10 pt-4 @[34rem]:border-t-0 @[34rem]:border-l @[34rem]:pl-5 @[34rem]:pt-0">
          <p className="mb-3 pl-1 text-sm text-ink-muted">Hora <span className="text-ink-faint">· UTC</span></p>
          <div role="group" aria-label="Hora UTC" className="grid grid-cols-6 gap-1 @[34rem]:grid-cols-4">
            {Array.from({ length: 24 }, (_, h) => {
              const at = dayStart(t) + h * HOUR
              return <button key={h} type="button" disabled={at < lo || at > hi} aria-pressed={h === hour}
                aria-label={`${pad(h)}:00 UTC`} onClick={() => pickHour(h)}
                className={cx('date-picker__hour tabular-nums', h === hour && 'is-selected')}>{pad(h)}</button>
            })}
          </div>
        </div>
      </div>
      <div className="date-picker__footer sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
        <p className="text-xs text-ink-muted">Datos del {shortDate(lo)} al {shortDate(hi)}</p>
        <button type="button" className="date-picker__done" onClick={() => close()}>Listo</button>
      </div>
    </div>, document.body)}
  </div>
}
