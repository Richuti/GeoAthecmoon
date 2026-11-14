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

/** Para eventos de una misión: "Día 4, 13:00 UTC", contando desde la muestra de inicio. */
export function formatMissionClock(period: Period, i: number, startIndex: number): string {
  return `Día ${dayNumber(period, i, startIndex)}, ${formatTime(sampleTime(period, i))} UTC`
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
