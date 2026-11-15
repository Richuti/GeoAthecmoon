import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx'

export interface SelectOption { value: string; label: string; description?: string; meta?: string; disabled?: boolean }

/** Selector de vuelo. El menú sale del contenedor; foco, teclado y lector de pantalla comparten la opción activa. */
export function Select({ id, label, value, options, onChange, placeholder = 'Elige una opción', hint }: {
  id?: string; label: string; value: string; options: SelectOption[]; onChange: (value: string) => void; placeholder?: string; hint?: string
}) {
  const generated = useId()
  const field = id ?? generated
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number; transform?: string }>({ left: 0, top: 0, width: 0, maxHeight: 320 })
  const search = useRef({ text: '', time: 0 })
  const selected = options.find(o => o.value === value)
  const reveal = () => {
    const index = options.findIndex(o => o.value === value && !o.disabled)
    setActive(index >= 0 ? index : Math.max(0, options.findIndex(o => !o.disabled)))
    setOpen(true)
  }
  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    setOpen(false)
    trigger.current?.focus()
  }
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = trigger.current?.getBoundingClientRect()
      if (!r) return
      if (r.bottom < 0 || r.top > window.innerHeight) { setOpen(false); return }
      const width = Math.min(Math.max(r.width, 340), window.innerWidth - 32)
      const below = window.innerHeight - r.bottom - 24
      const above = r.top - 24
      const upward = below < 240 && above > below
      const maxHeight = Math.max(100, Math.min(360, upward ? above : below))
      setPosition({ width, maxHeight, left: Math.max(16, Math.min(r.left, window.innerWidth - width - 16)), top: upward ? r.top - 8 : r.bottom + 8,
        transform: upward ? 'translateY(-100%)' : undefined })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => {
      if (!trigger.current?.contains(e.target as Node) && !popup.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  useEffect(() => {
    if (open) popup.current?.querySelector(`[data-option-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])
  const keyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Tab') { setOpen(false); return }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open ? choose(active) : reveal(); return }
    const enabled = options.map((o, i) => !o.disabled ? i : -1).filter(i => i >= 0)
    if (!enabled.length) return
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault()
      if (!open) { reveal(); return }
      const index = Math.max(0, enabled.indexOf(active))
      setActive(e.key === 'Home' ? enabled[0] : e.key === 'End' ? enabled.at(-1)! : enabled[(index + (e.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length])
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      const now = performance.now()
      search.current = { text: (now - search.current.time < 700 ? search.current.text : '') + e.key.toLocaleLowerCase('es'), time: now }
      const found = options.findIndex(o => !o.disabled && o.label.toLocaleLowerCase('es').startsWith(search.current.text))
      if (found >= 0) { setActive(found); setOpen(true) }
    }
  }
  return <div className="min-w-0">
    <label id={`${field}-label`} htmlFor={field} className="mb-2 block text-sm text-ink-muted">{label}</label>
    <button ref={trigger} id={field} type="button" role="combobox" value={value} aria-expanded={open} aria-haspopup="listbox"
      aria-controls={open ? `${field}-list` : undefined} aria-labelledby={`${field}-label ${field}-value`}
      aria-describedby={hint ? `${field}-hint` : undefined} aria-activedescendant={open ? `${field}-option-${active}` : undefined}
      onKeyDown={keyDown} onClick={() => open ? setOpen(false) : reveal()} onBlur={() => setOpen(false)}
      className={cx('flex min-h-14 w-full items-center justify-between gap-3 border bg-hull px-4 py-3 text-left transition-colors hover:border-ink-faint', open ? 'border-ink' : 'border-seam-strong')}>
      <span id={`${field}-value`} className="min-w-0 truncate text-base font-bold text-ink">{selected?.label ?? placeholder}</span>
      <svg aria-hidden viewBox="0 0 20 20" className={cx('size-5 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none', open && 'rotate-180')}><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
    </button>
    {hint && <p id={`${field}-hint`} className="mt-2 text-xs leading-relaxed text-ink-muted">{hint}</p>}
    {open && createPortal(<div ref={popup} id={`${field}-list`} role="listbox" aria-labelledby={`${field}-label`}
      className="fixed z-[100] overflow-y-auto overscroll-contain border border-seam-strong bg-hull p-1 shadow-[0_12px_36px_rgb(0_0_0/0.5)]"
      style={position} onMouseDown={e => e.preventDefault()}>
      {options.map((option, i) => <div key={option.value} id={`${field}-option-${i}`} role="option" aria-selected={option.value === value}
        aria-disabled={option.disabled || undefined} data-option-index={i} onPointerMove={e => { if (e.pointerType === 'mouse' && !option.disabled) setActive(i) }} onClick={() => choose(i)}
        className={cx('flex cursor-pointer items-start gap-3 px-3 py-3.5', option.disabled ? 'cursor-not-allowed opacity-40' : active === i ? 'bg-hull-raised' : 'hover:bg-hull-raised/60')}>
        <span aria-hidden className={cx('mt-0.5 grid size-4 shrink-0 place-items-center border', option.value === value ? 'border-ink bg-ink text-void' : 'border-seam-strong')}>
          {option.value === value && <svg viewBox="0 0 16 16" className="size-3"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none" /></svg>}
        </span>
        <span className="min-w-0"><span className="block text-sm font-bold text-ink">{option.label}</span>
          {option.description && <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{option.description}</span>}
          {option.meta && <span className="mt-2 block text-xs text-ink">{option.meta}</span>}
        </span>
      </div>)}
    </div>, document.body)}
  </div>
}
