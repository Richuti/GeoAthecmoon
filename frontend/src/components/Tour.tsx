// Recorrido en contexto: cada explicación aparece junto al elemento donde se usa, no en una pantalla aparte.
// Se muestra la primera vez que se llega a cada paso del planificador; se puede saltar y se repite desde «Ayuda».
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './ui'

export interface TourStep {
  /** Selector del elemento que se explica (usa atributos data-tour) */
  target: string
  title: string
  text: string
}

/** Evento para repetir el recorrido de la pantalla actual (lo dispara «Ayuda»). */
export const TOUR_EVENT = 'geoathecmoon:recorrido'
export function openTour() {
  window.dispatchEvent(new Event(TOUR_EVENT))
}

const key = (id: string) => `geoathecmoon:recorrido:${id}:v1`
function seen(id: string): boolean {
  try { return window.localStorage.getItem(key(id)) === '1' } catch { return false }
}
function markSeen(id: string) {
  try { window.localStorage.setItem(key(id), '1') } catch { /* sin almacenamiento: se verá de nuevo */ }
}

const GAP = 12
const PAD = 6

export function Tour({ id, steps }: { id: string; steps: TourStep[] }) {
  const [at, setAt] = useState<number | null>(null)
  const [box, setBox] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean; arrow: number } | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Solo los pasos cuyo elemento existe en esta pantalla (por ejemplo, el 3D puede no estar en el celular).
  const available = useCallback(() => steps.filter((s) => (document.querySelector(s.target)?.getClientRects().length ?? 0) > 0), [steps])
  const [list, setList] = useState<TourStep[]>([])

  const start = useCallback(() => {
    const l = available()
    if (!l.length) return
    setList(l)
    setAt(0)
  }, [available])
  const finish = useCallback(() => { markSeen(id); setAt(null); setBox(null) }, [id])

  useEffect(() => {
    const t = seen(id) ? 0 : window.setTimeout(start, 650)
    window.addEventListener(TOUR_EVENT, start)
    return () => { window.clearTimeout(t); window.removeEventListener(TOUR_EVENT, start) }
  }, [id, start])

  const step = at === null ? null : list[at]

  // Lleva el elemento a la vista y sigue su posición.
  useLayoutEffect(() => {
    if (!step) return
    const el = document.querySelector(step.target)
    if (!el) { finish(); return }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    let raf = 0
    const measure = () => {
      raf = 0
      setBox(el.getBoundingClientRect())
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    const t = window.setTimeout(measure, 450)
    window.addEventListener('scroll', queue, true)
    window.addEventListener('resize', queue)
    window.visualViewport?.addEventListener('resize', queue)
    return () => {
      window.clearTimeout(t)
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', queue, true)
      window.removeEventListener('resize', queue)
      window.visualViewport?.removeEventListener('resize', queue)
    }
  }, [step, finish])

  // Coloca la tarjeta debajo del elemento, o encima si no cabe.
  useLayoutEffect(() => {
    if (!box || !card.current) return
    const vw = window.innerWidth, vh = window.innerHeight
    const w = card.current.offsetWidth, h = card.current.offsetHeight
    const below = vh - box.bottom - GAP - PAD
    const above = box.top >= h + GAP + PAD && below < h
    const center = box.left + box.width / 2
    const left = Math.max(12, Math.min(vw - w - 12, center - w / 2))
    const top = above ? box.top - PAD - GAP - h : Math.min(vh - h - 12, box.bottom + PAD + GAP)
    setPos({ left, top, above, arrow: Math.max(18, Math.min(w - 18, center - left)) })
  }, [box, at])

  useEffect(() => { if (step) card.current?.querySelector<HTMLButtonElement>('[data-tour-next]')?.focus({ preventScroll: true }) }, [step])
  useEffect(() => {
    if (!step) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [step, finish])

  if (!step || at === null) return null
  const last = at === list.length - 1
  return createPortal(
    <div className="tour" aria-live="polite">
      {box && <div aria-hidden className="tour__spot" style={{ left: box.left - PAD, top: box.top - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }} />}
      <div ref={card} role="dialog" aria-modal="false" aria-labelledby={titleId} className="tour__card"
        style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }} data-above={pos?.above || undefined}>
        <span aria-hidden className="tour__arrow" style={{ left: pos?.arrow ?? 24 }} />
        <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">{at + 1} de {list.length}</p>
        <h2 id={titleId} className="mt-1 text-base font-bold leading-snug text-ink">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.text}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={finish} className="min-h-10 text-sm text-ink-muted underline underline-offset-4 hover:text-ink">Saltar</button>
          <div className="flex gap-2">
            {at > 0 && <Button size="sm" onClick={() => setAt(at - 1)}>Atrás</Button>}
            <Button data-tour-next size="sm" variant="primary" onClick={() => (last ? finish() : setAt(at + 1))}>{last ? 'Entendido' : 'Siguiente'}</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
