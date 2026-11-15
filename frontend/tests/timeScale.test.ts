import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatFactor, formatPlayback, playbackSeconds, speedFactor, speedLabel, speedOptions } from '../src/lib/timeScale.ts'

test('cada velocidad dice cuánto tiempo de misión pasa en un segundo', () => {
  assert.equal(speedLabel(1), '1 hora')
  assert.equal(speedLabel(6), '6 horas')
  assert.equal(speedLabel(24), '1 día')
  assert.deepEqual(speedOptions().map((o) => o.value), ['1', '6', '24'])
})

test('veces más rápido que el tiempo real', () => {
  assert.equal(speedFactor(1), 3600)
  assert.equal(speedFactor(24), 86400)
  assert.equal(formatFactor(1), '3 600×')
  assert.equal(formatFactor(24), '86 400×')
})

test('duración real de la reproducción', () => {
  // Misión de 14 días: 336 h
  assert.equal(playbackSeconds(336, 1), 336)
  assert.equal(playbackSeconds(336, 24), 14)
  assert.equal(formatPlayback(14), '14 s')
  assert.equal(formatPlayback(336), '5 min 36 s')
  assert.equal(formatPlayback(120), '2 min')
  // Año de datos: 8760 h a 1 hora por segundo
  assert.equal(formatPlayback(playbackSeconds(8760, 1)), '2 h 26 min')
  assert.equal(playbackSeconds(10, 0), 0)
})
