// Traducción pura español → inglés (sin DOM, con pruebas en tests/i18n.test.ts). La usa ./index.ts.
import { EN, EN_PATTERNS } from './en.ts'

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
const DICT = new Map(Object.entries(EN).map(([k, v]) => [norm(k), v]))

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PATTERNS = EN_PATTERNS
  .map(([es, en]) => ({ es: norm(es), en }))
  .sort((a, b) => b.es.replace(/\{\}/g, '').length - a.es.replace(/\{\}/g, '').length)
  .map(({ es, en }) => ({ re: new RegExp('^' + es.split('{}').map(escapeRe).join('(.+?)') + '$', 's'), en }))

const MONTHS: Record<string, string> = { ene: 'Jan', feb: 'Feb', mar: 'Mar', abr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', ago: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dic: 'Dec' }
const LONG_MONTHS: Record<string, string> = { enero: 'January', febrero: 'February', marzo: 'March', abril: 'April', mayo: 'May', junio: 'June', julio: 'July', agosto: 'August', septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December' }
const unit = (n: string, one: string, many: string) => `${n} ${n === '1' ? one : many}`

/** Reglas sueltas dentro de cualquier texto: fechas, duraciones, "Día N" y números con formato español. */
function inline(s: string): string {
  return s
    .replace(/^(\d+) de (\d+)$/, '$1 of $2')
    .replace(/(domingo|lunes|martes|miércoles|jueves|viernes|sábado) (\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de (\d{4})/g,
      (_, w, d, m, y) => `${WEEKDAYS[w]}, ${LONG_MONTHS[m]} ${d}, ${y}`)
    .replace(/\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?: de (\d{4}))?/g,
      (_, d, m, y) => `${LONG_MONTHS[m]} ${d}${y ? `, ${y}` : ''}`)
    .replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de (\d{4})\b/g, (_, m, y) => `${LONG_MONTHS[m]} ${y}`)
    .replace(/\b(\d{1,2}) (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/g, (_, d, m) => `${d} ${MONTHS[m]}`)
    .replace(/\b(\d+) (?:días|día)\b/g, (_, n) => unit(n, 'day', 'days'))
    .replace(/\b(\d+) (?:horas|hora)\b/g, (_, n) => unit(n, 'hour', 'hours'))
    .replace(/\b(\d+) (?:minutos|minuto)\b/g, (_, n) => unit(n, 'minute', 'minutes'))
    .replace(/\b(\d+) (?:semanas|semana)\b/g, (_, n) => unit(n, 'week', 'weeks'))
    .replace(/\b(days?|hours?|weeks?) y (\d)/g, '$1 and $2')
    .replace(/\bDía (\d+)/g, 'Day $1')
    .replace(/\bdía (\d+)/g, 'day $1')
    .replace(/\b(\d{1,3}(?:\.\d{3})+)(?=\s?(?:km|Mb|Gb|kb|W|m)\b)/g, (m) => m.replace(/\./g, ','))
    .replace(/\b(\d+),(\d+)(?=\s?(?:kWh|kW|m²|Gb|Mb|°|%|h\b))/g, '$1.$2')
    .replace(/(\d) %/g, '$1%')
}

const STILL_SPANISH = /[áéíóúñ¿¡]|\b(los|las|del|que|con|para|una|la|el|en|y|pero|como|más|se|sus?)\b/
const WEEKDAYS: Record<string, string> = { domingo: 'Sunday', lunes: 'Monday', martes: 'Tuesday', 'miércoles': 'Wednesday', jueves: 'Thursday', viernes: 'Friday', 'sábado': 'Saturday' }

function tr(core: string, depth = 0): string {
  const hit = DICT.get(core)
  if (hit !== undefined) return hit
  if (depth < 4) {
    for (const p of PATTERNS) {
      const m = p.re.exec(core)
      if (!m) continue
      const parts = m.slice(1).map((g) => tr(norm(g), depth + 1))
      const out = p.en.replace(/\{(\d)\}/g, (_, i) => parts[Number(i)] ?? '')
      // Un patrón general puede tragarse otra frase: si el resultado sigue en español, no sirve.
      if (!STILL_SPANISH.test(out)) return out
    }
    // Varias oraciones en un mismo texto: se traduce cada una.
    const sentences = core.split(/(?<=[.:])\s+(?=[A-ZÁÉÍÓÚ¿¡])/)
    if (sentences.length > 1) return sentences.map((x) => tr(x, depth + 1)).join(' ')
  }
  return inline(core)
}

/** Traduce un texto al inglés conservando los espacios de los bordes. */
export function translate(raw: string): string {
  if (!/[A-Za-zÁ-ú]/.test(raw) && !/\d %/.test(raw)) return raw
  const core = norm(raw)
  if (!core) return raw
  const out = tr(core)
  if (out === core) return raw
  const lead = raw.match(/^\s*/)![0] ? ' ' : ''
  const trail = raw.match(/\s*$/)![0] ? ' ' : ''
  return lead + out + trail
}

