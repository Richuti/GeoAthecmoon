/**
 * Costura entre el recorte LOLA de 20 km (`{id}.glb`) y el relieve regional de 300 km (`{id}_far.glb`).
 *
 * El relieve regional trae un hueco cuadrado de ±10 km justo donde va el recorte, pero sus bordes no tienen
 * las mismas alturas (es más grueso: hasta ~0.9 km de diferencia en Malapert). Si el recorte se funde a
 * transparente, por el hueco se ve el vacío y el sitio parece un pozo; si no se funde, queda un escalón.
 *
 * Aquí no se crea geometría: solo se mueven en vertical vértices que ya existen, y siempre hacia alturas
 * medidas por LOLA en el recorte de detalle.
 * - El borde del hueco regional toma la altura del borde del recorte; la diferencia se reparte en los
 *   `blendKm` siguientes, para que no aparezca un muro.
 * - La última fila del recorte se alinea con ese borde ya corregido (cambio de pocos metros), así las
 *   dos mallas comparten exactamente la misma línea y no queda rendija.
 *
 * Las posiciones van en kilómetros, en el sistema de la escena: x = este, y = arriba, z = sur; sitio en (0, 0, 0).
 */

type Side = 'n' | 's' | 'w' | 'e'
/** Puntos de un lado del borde: `t` es la coordenada a lo largo del lado (x en n/s, z en w/e). */
type Edge = Record<Side, Array<{ t: number; y: number }>>

const EPS = 1e-4

function sideOf(x: number, z: number, half: number): Side | null {
  if (Math.abs(z + half) < EPS) return 'n'
  if (Math.abs(z - half) < EPS) return 's'
  if (Math.abs(x + half) < EPS) return 'w'
  if (Math.abs(x - half) < EPS) return 'e'
  return null
}

/** Todos los lados a los que pertenece un punto del borde (una esquina pertenece a dos). */
function sidesOf(x: number, z: number, half: number): Side[] {
  const out: Side[] = []
  if (Math.abs(z + half) < EPS) out.push('n')
  if (Math.abs(z - half) < EPS) out.push('s')
  if (Math.abs(x + half) < EPS) out.push('w')
  if (Math.abs(x - half) < EPS) out.push('e')
  return out
}

const along = (side: Side, x: number, z: number) => (side === 'n' || side === 's' ? x : z)

function collectEdge(pos: ArrayLike<number>, half: number): Edge {
  const edge: Edge = { n: [], s: [], w: [], e: [] }
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2]
    if (Math.max(Math.abs(x), Math.abs(z)) > half + EPS) continue
    for (const side of sidesOf(x, z, half)) edge[side].push({ t: along(side, x, z), y })
  }
  for (const side of Object.keys(edge) as Side[]) {
    const pts = edge[side].sort((a, b) => a.t - b.t)
    // Una malla sin índices repite vértices: se deja uno por posición.
    edge[side] = pts.filter((p, k) => k === 0 || p.t - pts[k - 1].t > EPS)
  }
  return edge
}

/** Altura del borde en `t`, interpolada linealmente entre los vértices del lado. */
function heightAt(points: Array<{ t: number; y: number }>, t: number): number {
  if (points.length === 0) throw new RangeError('El borde del terreno no tiene vértices en un lado.')
  if (t <= points[0].t) return points[0].y
  const last = points[points.length - 1]
  if (t >= last.t) return last.y
  let lo = 0, hi = points.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (points[mid].t <= t) lo = mid; else hi = mid
  }
  const a = points[lo], b = points[hi]
  return a.y + ((b.y - a.y) * (t - a.t)) / (b.t - a.t)
}

/** Punto del borde más cercano a (x, z), que está fuera del cuadrado o sobre él. */
function nearestBorder(x: number, z: number, half: number): { side: Side; t: number } {
  const cx = Math.max(-half, Math.min(half, x)), cz = Math.max(-half, Math.min(half, z))
  const side = sideOf(cx, cz, half)
  if (side) return { side, t: along(side, cx, cz) }
  // Dentro del cuadrado (no debería pasar en el relieve regional): el lado más cercano.
  const d = { n: cz + half, s: half - cz, w: cx + half, e: half - cx }
  const near = (Object.keys(d) as Side[]).reduce((a, b) => (d[b] < d[a] ? b : a))
  return { side: near, t: near === 'n' || near === 's' ? cx : cz }
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export interface SeamResult {
  /** Mayor ajuste aplicado al relieve regional (km). */
  maxFarShiftKm: number
  /** Mayor ajuste aplicado a la última fila del recorte (km). */
  maxNearShiftKm: number
}

/**
 * Cose las dos mallas modificando solo la coordenada y de `near` y `far` (arreglos x, y, z por vértice).
 * `half` es la mitad del lado del recorte (10 km); `blendKm`, el ancho donde se reparte el ajuste regional.
 */
export function stitchTerrainSeam(near: Float32Array | number[], far: Float32Array | number[], half = 10, blendKm = 3): SeamResult {
  if (!(half > 0) || !(blendKm > 0)) throw new RangeError('Medidas de costura no válidas.')
  const nearEdge = collectEdge(near, half)
  const farEdge = collectEdge(far, half)
  for (const side of Object.keys(nearEdge) as Side[]) {
    if (nearEdge[side].length < 2 || farEdge[side].length < 2) throw new RangeError('Las mallas no comparten el borde del recorte.')
  }

  // 1. Relieve regional: el borde toma la altura del recorte y el ajuste se desvanece hacia fuera.
  let maxFarShiftKm = 0
  for (let i = 0; i < far.length; i += 3) {
    const x = far[i], z = far[i + 2]
    const r = Math.max(Math.abs(x), Math.abs(z))
    if (r > half + blendKm) continue
    const { side, t } = nearestBorder(x, z, half)
    const delta = heightAt(nearEdge[side], t) - heightAt(farEdge[side], t)
    const shift = delta * (1 - smoothstep(half, half + blendKm, r))
    far[i + 1] += shift
    maxFarShiftKm = Math.max(maxFarShiftKm, Math.abs(shift))
  }

  // 2. Recorte: su última fila sigue exactamente la línea del borde regional ya corregido.
  const stitchedFar = collectEdge(far, half)
  let maxNearShiftKm = 0
  for (let i = 0; i < near.length; i += 3) {
    const x = near[i], z = near[i + 2]
    const side = sideOf(x, z, half)
    if (!side) continue
    const y = heightAt(stitchedFar[side], along(side, x, z))
    maxNearShiftKm = Math.max(maxNearShiftKm, Math.abs(y - near[i + 1]))
    near[i + 1] = y
  }
  return { maxFarShiftKm, maxNearShiftKm }
}
