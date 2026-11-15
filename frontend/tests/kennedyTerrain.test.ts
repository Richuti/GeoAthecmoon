import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const bytes = readFileSync(new URL('../public/models/kennedy_terrain.glb', import.meta.url))
const jsonLength = bytes.readUInt32LE(12)
const model = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength))
const binary = 20 + jsonLength + 8
function floats(accessorIndex: number): number[] {
  const a = model.accessors[accessorIndex]
  const offset = binary + model.bufferViews[a.bufferView].byteOffset
  const components = a.type === 'VEC3' ? 3 : 2
  return Array.from({ length: a.count * components }, (_, i) => bytes.readFloatLE(offset + i * 4))
}

test('Kennedy: el GLB está completo, ligero y conserva la escala métrica del DEM', () => {
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF')
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  assert.ok(bytes.length < 1_100_000)
  assert.equal(model.extras.units, 'meters')
  assert.equal(model.extras.verticalExaggeration, 1)
  const a = model.accessors[0]
  assert.ok(a.min[0] < -590 && a.max[0] > 590)
  assert.ok(a.min[2] < -590 && a.max[2] > 590)
  assert.ok(a.min[1] > -2 && a.min[1] < 0)
  assert.ok(a.max[1] > 14 && a.max[1] < 15)
})

test('Kennedy: rampa en volumen con triángulos hacia arriba y alturas sin valores inválidos', () => {
  const positions = floats(0)
  const normals = floats(1)
  assert.ok(positions.every(Number.isFinite))
  assert.ok(normals.some((value, i) => i % 3 === 1 && value < .99))
  const a = model.accessors[3]
  const offset = binary + model.bufferViews[a.bufferView].byteOffset
  assert.equal(a.count / 3, 45000)
  for (let i = 0; i < a.count; i += 3) {
    const ids = [0, 1, 2].map(j => bytes.readUInt16LE(offset + (i + j) * 2))
    assert.ok(ids.every(id => id < model.accessors[0].count))
    const [p, q, r] = ids.map(id => id * 3)
    const normalY = (positions[q + 2] - positions[p + 2]) * (positions[r] - positions[p]) - (positions[q] - positions[p]) * (positions[r + 2] - positions[p + 2])
    assert.ok(normalY > 0)
  }
})

test('Kennedy: la ortofoto queda centrada y orientada norte arriba', () => {
  const uv = floats(2)
  const count = model.accessors[2].count
  const middle = Math.floor(count / 2) * 2
  assert.ok(Math.abs(uv[middle] - .5) < .00001)
  assert.ok(Math.abs(uv[middle + 1] - .5) < .00001)
  assert.ok(uv[1] > .99 && uv.at(-1)! < .01)
  assert.ok(uv.every(value => value >= 0 && value <= 1))
})
