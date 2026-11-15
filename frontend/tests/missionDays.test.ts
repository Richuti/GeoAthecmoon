import assert from 'node:assert/strict'
import { test } from 'node:test'
import { missionDays } from '../src/lib/missionDays.ts'

test('agenda: cuenta solo las muestras del plan y conserva el último día parcial', () => {
  const lit = Array(60).fill(true)
  const contact = Array.from({ length: 60 }, (_, i) => i >= 30)
  assert.deepEqual(missionDays(lit, contact, 6, 36, 1), [
    { offset: 0, hours: 24, lightHours: 24, contactHours: 0 },
    { offset: 24, hours: 6, lightHours: 6, contactHours: 6 },
  ])
})
test('agenda: reparte una muestra que cruza el límite de un día', () => {
  assert.deepEqual(missionDays([false, false, false, false, true], [true, true, true, true, true], 0, 5, 5), [
    { offset: 0, hours: 24, lightHours: 4, contactHours: 24 },
    { offset: 24, hours: 1, lightHours: 1, contactHours: 1 },
  ])
})
test('agenda: admite muestras subhorarias y ventanas vacías', () => {
  assert.deepEqual(missionDays([true, false], [false, true], 0, 2, .5), [{ offset: 0, hours: 1, lightHours: .5, contactHours: .5 }])
  assert.deepEqual(missionDays([], [], 0, 0, 1), [])
  assert.deepEqual(missionDays([], [], 0, 2, 0), [])
})
