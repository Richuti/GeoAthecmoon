import assert from 'node:assert/strict'
import { test } from 'node:test'
import { storyCues, storyPosition, storyVideoProgress } from '../src/lib/storyTiming.ts'

test('la primera pantalla presenta la idea sin adelantar explicación y dato', () => {
  assert.deepEqual(storyCues(0, 0, true), { title: 1, body: 0, readout: 0, visible: 1 })
})

test('el título, la explicación y el dato entran temprano en ese orden', () => {
  assert.deepEqual(storyCues(0.1, 0.11), { title: 1, body: 0, readout: 0, visible: 1 })
  assert.deepEqual(storyCues(0.24, 0.27), { title: 1, body: 1, readout: 0, visible: 1 })
  assert.deepEqual(storyCues(0.4, 0.43), { title: 1, body: 1, readout: 1, visible: 1 })
})

test('un video que tarda en buscar el fotograma no adelanta el texto', () => {
  assert.equal(storyCues(0.7, 0.1).body, 0)
  assert.equal(storyCues(0.7, 0.1).readout, 0)
})

test('el final reserva un tramo para leer antes de salir', () => {
  assert.equal(storyVideoProgress(0.84), 1)
  assert.equal(storyCues(0.85, 1).visible, 1)
  assert.equal(storyCues(1, 1).visible, 0)
})

test('el texto completo permanece visible en toda la parte central de la escena', () => {
  for (const scroll of [0.4, 0.55, 0.7, 0.85]) {
    assert.deepEqual(storyCues(scroll, storyVideoProgress(scroll)), { title: 1, body: 1, readout: 1, visible: 1 })
  }
})

test('volver hacia atrás restaura cada momento sin acumular animaciones', () => {
  const before = storyCues(0.3, 0.35)
  storyCues(0.8, 0.95)
  assert.deepEqual(storyCues(0.3, 0.35), before)
})

test('los extremos y valores inválidos no producen estilos fuera de rango', () => {
  assert.equal(storyVideoProgress(-1), 0)
  assert.equal(storyVideoProgress(2), 1)
  assert.equal(storyVideoProgress(NaN), 0)
  assert.equal(storyCues(0, NaN).title, 0)
})

test('la unión de tomas funde el video sin crear una nueva pantalla de scroll', () => {
  const before = storyPosition(0.9 / 6, 5)
  assert.equal(before.scene, 0)
  assert.ok(before.blend > 0 && before.blend < 1)
  const after = storyPosition(1.01 / 6, 5)
  assert.equal(after.scene, 1)
  assert.ok(after.local < 0.02)
})

test('el cierre permanece sobre el último video, sin añadir otro fondo', () => {
  const end = storyPosition(1, 5)
  assert.equal(end.scene, 4)
  assert.equal(end.local, 1)
  assert.equal(end.finale, 1)
})
