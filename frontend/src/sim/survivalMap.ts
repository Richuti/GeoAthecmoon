// Mapa de supervivencia: para cada sitio y cada día del periodo, ¿sobrevive una misión que aluniza ese día?
//
// Sale de `scanStarts` (el simulador real, un inicio cada 6 h). Cada día guarda qué horarios de alunizaje
// sobreviven, para poder elegir uno al hacer clic. Responde de un vistazo "si se atrasa, ¿todavía funciona?":
// una franja verde larga es una misión que tolera atrasos.

import type { SiteData } from '../types'
import type { StartResult } from './search.ts'

export interface DayCell {
  /** Inicios probados ese día (0 si la misión ya no cabe en los datos) */
  total: number
  /** Inicios que sobreviven */
  ok: number
  /** Muestra de alunizaje de cada inicio que sobrevive, en orden */
  starts: number[]
}

export type DayState = 'safe' | 'partial' | 'fail' | 'none'

/** Agrupa las simulaciones por día UTC del periodo. */
export function dailySurvival(data: Pick<SiteData, 'stepHours' | 'sun'>, scan: StartResult[]): DayCell[] {
  const perDay = Math.max(1, Math.round(24 / data.stepHours))
  const days = Math.ceil(data.sun.el.length / perDay)
  const cells: DayCell[] = Array.from({ length: days }, () => ({ total: 0, ok: 0, starts: [] }))
  for (const r of scan) {
    const c = cells[Math.floor(r.startIndex / perDay)]
    if (!c) continue
    c.total++
    if (r.survived) {
      c.ok++
      c.starts.push(r.startIndex)
    }
  }
  return cells
}

export function dayState(c: DayCell): DayState {
  if (c.total === 0) return 'none'
  if (c.ok === c.total) return 'safe'
  return c.ok > 0 ? 'partial' : 'fail'
}

/** Días seguidos, desde `day`, en los que todos los horarios sobreviven. */
export function safeRunFrom(cells: DayCell[], day: number): number {
  let n = 0
  for (let d = day; d < cells.length && dayState(cells[d]) === 'safe'; d++) n++
  return n
}

export interface RowSummary {
  /** Días con todos los horarios a salvo */
  safeDays: number
  /** Días con datos suficientes para probar */
  testedDays: number
  /** La racha segura más larga */
  longest: { start: number; length: number }
}

export function rowSummary(cells: DayCell[]): RowSummary {
  let safeDays = 0
  let testedDays = 0
  let longest = { start: 0, length: 0 }
  let runStart = -1
  cells.forEach((c, d) => {
    const s = dayState(c)
    if (s !== 'none') testedDays++
    if (s === 'safe') {
      safeDays++
      if (runStart < 0) runStart = d
      if (d - runStart + 1 > longest.length) longest = { start: runStart, length: d - runStart + 1 }
    } else runStart = -1
  })
  return { safeDays, testedDays, longest }
}

/** Tramos contiguos con el mismo estado: pocos rectángulos para dibujar un año. */
export function stateRuns(cells: DayCell[]): Array<{ start: number; end: number; state: DayState }> {
  const out: Array<{ start: number; end: number; state: DayState }> = []
  cells.forEach((c, d) => {
    const s = dayState(c)
    const last = out.at(-1)
    if (last && last.state === s && last.end === d) last.end = d + 1
    else out.push({ start: d, end: d + 1, state: s })
  })
  return out
}
