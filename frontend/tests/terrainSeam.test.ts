import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { stitchTerrainSeam } from '../src/sim/terrainSeam.ts'

/** Malla regular de `n × n` vértices entre -h y h, con la altura que da `f`. */
function grid(n: number, h: number, f: (x: number, z: number) => number): number[] {
  const out: number[] = []
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -h + (2 * h * i) / (n - 1), z = -h + (2 * h * j) / (n - 1)
    out.push(x, f(x, z), z)
  }
  return out
}

/** Anillo regional con hueco de ±10 km: vértices entre 10 y 20 km (norma del máximo). */
function ring(f: (x: number, z: number) => number): number[] {
  return withHole(grid(41, 20, f))
}
function withHole(pos: number[]): number[] {
  const out: number[] = []
  for (let k = 0; k < pos.length; k += 3) if (Math.max(Math.abs(pos[k]), Math.abs(pos[k + 2])) >= 10 - 1e-9) out.push(pos[k], pos[k + 1], pos[k + 2])
  return out
}

function borderHeights(pos: number[], at: (x: number, z: number) => boolean) {
  const m = new Map<string, number>()
  for (let k = 0; k < pos.length; k += 3) if (at(pos[k], pos[k + 2])) m.set(`${pos[k].toFixed(3)},${pos[k + 2].toFixed(3)}`, pos[k + 1])
  return m
}
const onBorder = (x: number, z: number) => Math.abs(Math.max(Math.abs(x), Math.abs(z)) - 10) < 1e-6

test('el borde regional toma la altura del recorte y ambos comparten la misma línea', () => {
  const near = grid(81, 10, (x, z) => 0.05 * x + 0.02 * z)
  const far = ring((x, z) => 0.05 * x + 0.02 * z + 0.6) // 600 m más alto, como un relieve más grueso
  stitchTerrainSeam(near, far)
  const a = borderHeights(near, onBorder), b = borderHeights(far, onBorder)
  let shared = 0
  for (const [key, y] of b) if (a.has(key)) { shared++; assert.ok(Math.abs(a.get(key)! - y) < 1e-9, key) }
  assert.ok(shared > 10)
})

test('el ajuste se desvanece hacia fuera y no toca el relieve lejano', () => {
  const near = grid(81, 10, () => 0)
  const far = ring(() => 0.9)
  const r = stitchTerrainSeam(near, far, 10, 3)
  assert.ok(Math.abs(r.maxFarShiftKm - 0.9) < 1e-9)
  for (let k = 0; k < far.length; k += 3) {
    const d = Math.max(Math.abs(far[k]), Math.abs(far[k + 2]))
    if (d >= 13) assert.equal(far[k + 1], 0.9)
    if (d > 10 && d < 13) assert.ok(far[k + 1] > 0 && far[k + 1] < 0.9)
  }
})

test('el recorte solo cambia su última fila, y casi nada', () => {
  const f = (x: number, z: number) => Math.sin(x) * 0.1 + Math.cos(z) * 0.05
  const near = grid(81, 10, f)
  const before = near.slice()
  const r = stitchTerrainSeam(near, ring(f))
  for (let k = 0; k < near.length; k += 3) if (!onBorder(near[k], near[k + 2])) assert.equal(near[k + 1], before[k + 1])
  assert.ok(r.maxNearShiftKm < 0.02)
  // x y z nunca cambian
  for (let k = 0; k < near.length; k += 3) { assert.equal(near[k], before[k]); assert.equal(near[k + 2], before[k + 2]) }
})

test('rechaza mallas que no comparten el borde', () => {
  assert.throws(() => stitchTerrainSeam(grid(5, 4, () => 0), ring(() => 0)), RangeError)
  assert.throws(() => stitchTerrainSeam([], [], 0), RangeError)
})

/** Posiciones de un .glb del proyecto (sin dependencias). */
function glbPositions(file: string): number[] {
  const b = readFileSync(file)
  const jl = b.readUInt32LE(12)
  const json = JSON.parse(b.subarray(20, 20 + jl).toString())
  const a = json.accessors[json.meshes[0].primitives[0].attributes.POSITION]
  const view = json.bufferViews[a.bufferView]
  const off = 20 + jl + 8 + (view.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = view.byteStride ?? 12
  const out: number[] = []
  for (let i = 0; i < a.count; i++) out.push(b.readFloatLE(off + i * stride), b.readFloatLE(off + i * stride + 4), b.readFloatLE(off + i * stride + 8))
  return out
}

for (const id of ['mons-mouton', 'malapert-massif', 'shackleton-rim']) {
  test(`${id}: los modelos reales quedan cosidos sin mover el recorte más de unos metros`, () => {
    const near = glbPositions(`public/models/terrain/${id}.glb`)
    const far = glbPositions(`public/models/terrain/${id}_far.glb`)
    const r = stitchTerrainSeam(near, far)
    assert.ok(r.maxNearShiftKm < 0.08, `recorte movido ${r.maxNearShiftKm} km`)
    const a = borderHeights(near, onBorder), b = borderHeights(far, onBorder)
    for (const [key, y] of b) if (a.has(key)) assert.ok(Math.abs(a.get(key)! - y) < 1e-4, key)
  })
}
