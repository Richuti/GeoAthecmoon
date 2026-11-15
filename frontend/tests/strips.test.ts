import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runs } from '../src/lib/strips.ts'

test('runs: tramos verdaderos relativos al inicio de la ventana', () => {
  const f = [true, true, false, false, true, false, true, true]
  assert.deepEqual(runs(f, 0, f.length), [[0, 2], [4, 5], [6, 8]])
  assert.deepEqual(runs(f, 1, 7), [[0, 1], [3, 4], [5, 6]])
  assert.deepEqual(runs([false, false], 0, 2), [])
  assert.deepEqual(runs([true, true, true], 0, 3), [[0, 3]])
})
