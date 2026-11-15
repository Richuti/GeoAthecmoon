import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  dayNumber,
  formatDate,
  formatDateTime,
  formatDuration,
  formatDurationLong,
  formatMissionClock,
  formatShortDate,
  formatTime,
  fromInputValue,
  hoursBetween,
  indexAt,
  sampleTime,
  samplesFor,
  toInputValue,
  totalDays,
  type Period,
} from '../src/lib/time.ts'

const hourly: Period = { start: '2027-01-01T00:00:00Z', stepHours: 1 }
const every6h: Period = { start: '2027-01-01T00:00:00Z', stepHours: 6 }
const SAMPLES = 1440

describe('muestra ↔ fecha', () => {
  test('la muestra 0 es el inicio', () => assert.equal(sampleTime(hourly, 0).toISOString(), '2027-01-01T00:00:00.000Z'))
  test('la muestra 34 son 34 horas después', () => assert.equal(sampleTime(hourly, 34).toISOString(), '2027-01-02T10:00:00.000Z'))
  test('con paso de 6 h', () => assert.equal(sampleTime(every6h, 5).toISOString(), '2027-01-02T06:00:00.000Z'))
  test('la última muestra del periodo es el 1 de marzo a las 23:00', () =>
    assert.equal(sampleTime(hourly, SAMPLES - 1).toISOString(), '2027-03-01T23:00:00.000Z'))

  test('indexAt es el inverso de sampleTime', () => {
    for (const i of [0, 1, 500, SAMPLES - 1]) assert.equal(indexAt(hourly, sampleTime(hourly, i), SAMPLES), i)
  })
  test('indexAt redondea a la muestra más cercana', () => {
    assert.equal(indexAt(hourly, Date.parse('2027-01-01T02:29:00Z'), SAMPLES), 2)
    assert.equal(indexAt(hourly, Date.parse('2027-01-01T02:31:00Z'), SAMPLES), 3)
  })
  test('indexAt recorta fechas fuera del periodo', () => {
    assert.equal(indexAt(hourly, Date.parse('2026-12-25T00:00:00Z'), SAMPLES), 0)
    assert.equal(indexAt(hourly, Date.parse('2027-06-01T00:00:00Z'), SAMPLES), SAMPLES - 1)
  })

  test('horas entre muestras', () => assert.equal(hoursBetween(every6h, 2, 10), 48))
  test('muestras para 14 días', () => assert.equal(samplesFor(hourly, 14 * 24), 336))
  test('día del periodo', () => {
    assert.equal(dayNumber(hourly, 0), 1)
    assert.equal(dayNumber(hourly, 23), 1)
    assert.equal(dayNumber(hourly, 24), 2)
    assert.equal(dayNumber(hourly, 250), 11)
  })
  test('día de la misión, contando desde su inicio', () => assert.equal(dayNumber(hourly, 100, 90), 1))
  test('días del periodo', () => assert.equal(totalDays(hourly, SAMPLES), 60))
})

describe('formato de fechas (UTC, meses en español)', () => {
  const d = new Date('2027-01-11T10:05:00Z')
  test('fecha', () => assert.equal(formatDate(d), '11 ene 2027'))
  test('día con dos cifras', () => assert.equal(formatDate(new Date('2027-02-03T00:00:00Z')), '03 feb 2027'))
  test('fecha corta', () => assert.equal(formatShortDate(new Date('2027-02-03T00:00:00Z')), '3 feb'))
  test('hora', () => assert.equal(formatTime(d), '10:05'))
  test('medianoche', () => assert.equal(formatTime(new Date('2027-01-01T00:00:00Z')), '00:00'))
  test('fecha y hora', () => assert.equal(formatDateTime(d), '11 ene 2027, 10:05 UTC'))
  test('los 12 meses', () => {
    const names = Array.from({ length: 12 }, (_, m) => formatShortDate(new Date(Date.UTC(2027, m, 1))).split(' ')[1])
    assert.deepEqual(names, ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'])
  })
  test('29 de febrero en año bisiesto', () => assert.equal(formatDate(new Date('2028-02-29T12:00:00Z')), '29 feb 2028'))
})

describe('formatDuration', () => {
  test('minutos', () => assert.equal(formatDuration(0.5), '30 min'))
  test('cero', () => assert.equal(formatDuration(0), '0 min'))
  test('horas', () => assert.equal(formatDuration(6), '6 h'))
  test('días exactos', () => assert.equal(formatDuration(72), '3 d'))
  test('días y horas', () => assert.equal(formatDuration(76), '3 d 4 h'))
  test('redondea a la hora más cercana', () => assert.equal(formatDuration(47.6), '2 d'))
  test('casi una hora se muestra como 1 h', () => assert.equal(formatDuration(59.6 / 60), '1 h'))
  test('negativo o no finito: —', () => {
    assert.equal(formatDuration(-1), '—')
    assert.equal(formatDuration(Number.NaN), '—')
    assert.equal(formatDuration(Infinity), '—')
  })
})

describe('formatDurationLong', () => {
  test('singular y plural', () => {
    assert.equal(formatDurationLong(1), '1 hora')
    assert.equal(formatDurationLong(5), '5 horas')
    assert.equal(formatDurationLong(24), '1 día')
    assert.equal(formatDurationLong(25), '1 día y 1 hora')
    assert.equal(formatDurationLong(76), '3 días y 4 horas')
  })
  test('minutos', () => assert.equal(formatDurationLong(1 / 60), '1 minuto'))
  test('sin dato', () => assert.equal(formatDurationLong(-3), 'sin dato'))
})

describe('reloj de misión', () => {
  test('día y hora desde el inicio de la misión', () => {
    // La misión empieza en la muestra 10 (01 ene, 10:00). La muestra 85 es el 04 ene a las 13:00: día 4.
    assert.equal(formatMissionClock(hourly, 85, 10), 'Día 4 · 4 ene, 13:00 UTC')
  })
})

describe('input datetime-local (UTC)', () => {
  test('a valor de input', () => assert.equal(toInputValue(new Date('2027-01-18T06:00:00Z')), '2027-01-18T06:00'))
  test('desde valor de input', () => assert.equal(fromInputValue('2027-01-18T06:00')?.toISOString(), '2027-01-18T06:00:00.000Z'))
  test('ida y vuelta', () => {
    const d = new Date('2027-02-27T23:00:00Z')
    assert.equal(fromInputValue(toInputValue(d))?.getTime(), d.getTime())
  })
  test('valores inválidos dan null', () => {
    for (const v of ['', 'mañana', '2027-13-40T99:99', '2027-01-18']) assert.equal(fromInputValue(v), null)
  })
})

describe('timeTicks: marcas de fecha bajo la barra', async () => {
  const { timeTicks } = await import('../src/lib/time.ts')
  test('60 días: una marca por semana', () => {
    const t = timeTicks('2027-01-01T00:00:00Z', 1, 1440)
    assert.equal(t.length, 9)
    assert.deepEqual(t.slice(0, 2), [{ index: 0, label: '1 ene' }, { index: 168, label: '8 ene' }])
  })
  test('un año: una marca por mes, el día 1', () => {
    const t = timeTicks('2027-01-01T00:00:00Z', 1, 8760)
    assert.equal(t.length, 12)
    assert.deepEqual(t.map((x) => x.label), ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'])
    assert.equal(t[1].index, 31 * 24)
  })
  test('si el periodo no empieza el día 1, la primera marca es el mes siguiente', () => {
    const t = timeTicks('2027-01-15T06:00:00Z', 6, 400)
    assert.equal(t[0].label, 'feb')
    assert.equal(t[0].index, Math.round((Date.UTC(2027, 1, 1) - Date.parse('2027-01-15T06:00:00Z')) / (6 * 3_600_000)))
  })
})
