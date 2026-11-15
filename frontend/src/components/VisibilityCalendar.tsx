import { formatShortDate, indexAt, sampleTime, samplesFor } from '../lib/time'
import type { SiteData } from '../types'
import { Button } from './ui'

/** Horas reales de cada día. Sustituye las franjas anuales por días que se pueden elegir. */
export function VisibilityCalendar({ data, index, lit, contact, onSeek }: {
  data: SiteData; index: number; lit: boolean[]; contact: boolean[]; onSeek: (index: number) => void
}) {
  const date = sampleTime(data, index)
  const year = date.getUTCFullYear(), month = date.getUTCMonth()
  const firstMs = Date.UTC(year, month, 1), nextMs = Date.UTC(year, month + 1, 1)
  const dataStart = sampleTime(data, 0).getTime(), dataEnd = sampleTime(data, lit.length).getTime()
  const days = []
  for (let ms = Math.max(firstMs, dataStart); ms < Math.min(nextMs, dataEnd); ms += 86400000) {
    const day = new Date(ms)
    const from = indexAt(data, day, lit.length)
    const to = Math.min(lit.length, from + samplesFor(data, 24))
    const hours = (flags: boolean[]) => flags.slice(from, to).filter(Boolean).length * data.stepHours
    days.push({ from, day, light: hours(lit), earth: hours(contact), selected: day.getUTCDate() === date.getUTCDate() })
  }
  const fmt = (hours: number) => hours.toLocaleString('es', { maximumFractionDigits: 1 })
  const jump = (offset: number) => onSeek(indexAt(data, new Date(Date.UTC(year, month + offset, 1)), lit.length))
  return <section aria-label="Calendario de luz y contacto" className="mt-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-base font-bold capitalize text-ink">{date.toLocaleDateString('es', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h3><p className="mt-1 text-xs leading-relaxed text-ink-muted">Elige un día para explorar sus condiciones.</p></div>
      <div className="flex gap-2"><Button size="sm" className="min-h-11" aria-label="Mes anterior" disabled={firstMs <= dataStart} onClick={() => jump(-1)}>←</Button><Button size="sm" className="min-h-11" aria-label="Mes siguiente" disabled={nextMs >= dataEnd} onClick={() => jump(1)}>→</Button></div>
    </div>
    <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs"><span className="flex items-center gap-1.5 text-sun"><DaySymbol kind="sun" /> Horas con Sol</span><span className="flex items-center gap-1.5 text-earth"><DaySymbol kind="earth" /> Horas con la Tierra visible</span></div>
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
      {days.map(day => <button type="button" key={day.from} data-calendar-day={day.day.getUTCDate()} aria-pressed={day.selected} onClick={() => onSeek(day.from)}
        aria-label={`${formatShortDate(day.day)}: ${fmt(day.light)} horas con luz solar y ${fmt(day.earth)} horas con contacto con la Tierra`}
        className={`calendar-day ${day.selected ? 'calendar-day--selected' : ''}`}>
        <span className="text-sm font-bold text-ink">{day.day.getUTCDate()}</span>
        <span className="mt-2 flex items-center gap-1 text-xs tabular-nums text-sun"><DaySymbol kind="sun" /> {fmt(day.light)} h</span>
        <span className="mt-1 flex items-center gap-1 text-xs tabular-nums text-earth"><DaySymbol kind="earth" /> {fmt(day.earth)} h</span>
      </button>)}
    </div>
    <p className="mt-3 text-xs leading-relaxed text-ink-muted">Cada cifra suma las muestras horarias de ese día en UTC. El calendario muestra el mes; la viabilidad usa los días de tu misión.</p>
  </section>
}

function DaySymbol({ kind }: { kind: 'sun' | 'earth' }) {
  return kind === 'sun' ? <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0"><circle cx="8" cy="8" r="3" fill="currentColor" /><path d="M8 0v2m0 12v2M0 8h2m12 0h2M2.3 2.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4" stroke="currentColor" /></svg>
    : <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="m4 3 2 3-2 3 3 1 1 4m1-12 1 4 4 2-3 3" stroke="currentColor" strokeWidth="1.1" fill="none" /></svg>
}
