// Tiempo: muestra ↔ fecha, y formato en español.
//
// Todo es UTC: la app muestra lo mismo en cualquier zona horaria. Los nombres de los meses están escritos
// aquí (no con Intl) para que el texto sea idéntico en todos los navegadores.

/** Lo mínimo para ubicar una muestra en el tiempo (SiteData lo cumple). */
export interface Period {
  /** Fecha y hora UTC de la primera muestra (ISO 8601) */
  start: string
  /** Horas entre muestras */
  stepHours: number
}

const HOUR_MS = 3_600_000
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const pad2 = (n: number) => String(n).padStart(2, '0')

// ---------------------------------------------------------------------------
// Muestra ↔ fecha
// ---------------------------------------------------------------------------

/** Fecha de la muestra i. */
export function sampleTime(period: Period, i: number): Date {
  return new Date(Date.parse(period.start) + i * period.stepHours * HOUR_MS)
}

/** Muestra más cercana a una fecha, dentro de [0, samples − 1]. */
export function indexAt(period: Period, date: Date | number, samples: number): number {
  const t = typeof date === 'number' ? date : date.getTime()
  const f = (t - Date.parse(period.start)) / (period.stepHours * HOUR_MS)
  return Math.min(Math.max(0, Math.round(f)), Math.max(0, samples - 1))
}

/** Horas que hay entre dos muestras. */
export function hoursBetween(period: Period, from: number, to: number): number {
  return (to - from) * period.stepHours
}

/** Cuántas muestras ocupan esas horas (redondeado). */
export function samplesFor(period: Period, hours: number): number {
  return Math.round(hours / period.stepHours)
}

/** Día del periodo (o de la misión) en que cae la muestra i, contando desde 1. */
export function dayNumber(period: Period, i: number, fromIndex = 0): number {
  return Math.floor(((i - fromIndex) * period.stepHours) / 24) + 1
}

/** Días que cubren `samples` muestras. */
export function totalDays(period: Period, samples: number): number {
  return Math.round((samples * period.stepHours) / 24)
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

/** "01 ene 2027" */
export function formatDate(d: Date): string {
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "8 ene": para ejes y etiquetas cortas. */
export function formatShortDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/** "13:00" (24 h, UTC) */
export function formatTime(d: Date): string {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
}

/** "01 ene 2027, 13:00 UTC" */
export function formatDateTime(d: Date): string {
  return `${formatDate(d)}, ${formatTime(d)} UTC`
}

/** Duración compacta: "45 min", "6 h", "3 d", "3 d 4 h". Negativa o no finita: "—". */
export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '—'
  const minutes = Math.round(hours * 60)
  if (minutes < 60) return `${minutes} min`
  const totalH = Math.round(hours)
  const d = Math.floor(totalH / 24)
  const h = totalH % 24
  if (d === 0) return `${h} h`
  return h === 0 ? `${d} d` : `${d} d ${h} h`
}

/** Duración en palabras, para frases y lectores de pantalla: "3 días y 4 horas", "1 hora", "30 minutos". */
export function formatDurationLong(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return 'sin dato'
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const minutes = Math.round(hours * 60)
  if (minutes < 60) return plural(minutes, 'minuto', 'minutos')
  const totalH = Math.round(hours)
  const d = Math.floor(totalH / 24)
  const h = totalH % 24
  if (d === 0) return plural(h, 'hora', 'horas')
  if (h === 0) return plural(d, 'día', 'días')
  return `${plural(d, 'día', 'días')} y ${plural(h, 'hora', 'horas')}`
}

/**
 * Para eventos de una misión: "Día 4 · 4 ene, 13:00 UTC". El día cuenta desde el alunizaje y la fecha evita
 * confusiones cuando la misión no empieza a medianoche.
 */
export function formatMissionClock(period: Period, i: number, startIndex: number): string {
  const d = sampleTime(period, i)
  return `Día ${dayNumber(period, i, startIndex)} · ${formatShortDate(d)}, ${formatTime(d)} UTC`
}

// ---------------------------------------------------------------------------
// <input type="datetime-local"> (se interpreta como UTC)
// ---------------------------------------------------------------------------

/** "2027-01-18T06:00", para el valor de un input datetime-local. */
export function toInputValue(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${formatTime(d)}`
}

/** Lee el valor de un input datetime-local como UTC. Devuelve null si no es válido. */
export function fromInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const t = Date.parse(`${value}:00Z`)
  return Number.isNaN(t) ? null : new Date(t)
}

/**
 * Marcas de fecha para una barra de `n` muestras: una por semana en periodos cortos y una por mes (el día 1, en
 * UTC) cuando el periodo pasa de 70 días, para que no se amontonen.
 */
export function timeTicks(start: string, stepHours: number, n: number): Array<{ index: number; label: string }> {
  const t0 = Date.parse(start)
  const hours = (n - 1) * stepHours
  if (hours <= 70 * 24) {
    const perWeek = (7 * 24) / stepHours
    return Array.from({ length: Math.floor((n - 1) / perWeek) + 1 }, (_, k) => k * perWeek).map((i) => ({
      index: i,
      label: formatShortDate(sampleTime({ start, stepHours }, i)),
    }))
  }
  const out: Array<{ index: number; label: string }> = []
  const d = new Date(t0)
  const atMonthStart = d.getUTCDate() === 1 && d.getUTCHours() === 0 && d.getUTCMinutes() === 0
  let year = d.getUTCFullYear()
  let month = d.getUTCMonth() + (atMonthStart ? 0 : 1)
  for (;;) {
    const t = Date.UTC(year, month, 1)
    if (t > t0 + hours * HOUR_MS) break
    const m = new Date(t)
    out.push({ index: Math.round((t - t0) / (stepHours * HOUR_MS)), label: MONTHS[m.getUTCMonth()] })
    month++
  }
  return out
}
