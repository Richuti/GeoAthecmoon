#!/usr/bin/env node
// Genera datos de prueba que cumplen el contrato `SiteData` (src/types.ts, docs/CONTRATO_DATOS.md).
//
//   npm run mock
//
// Escribe public/data/sites.json y public/data/sites/{id}.json, todos con `mock: true`.
// No son datos reales: el Sol y la Tierra salen de un modelo simplificado y el terreno es sintético.
// Se reemplazan por los del backend en la tarea 11.
//
// Coherencia: el horizonte se calcula a partir de la misma malla `terrain.heightsM` que dibuja la
// vista 3D, así que las sombras en 3D coinciden con los porcentajes de luz.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')

// ---------------------------------------------------------------------------
// Parámetros generales
// ---------------------------------------------------------------------------

const START = '2027-01-01T00:00:00Z'
const STEP_HOURS = 1
const DAYS = 60
const SAMPLES = (DAYS * 24) / STEP_HOURS // 1440

const SIZE = 96 // puntos por lado de la malla
const EXTENT_KM = 20 // ancho del recorte (el sitio queda en el centro)
const CELL_KM = EXTENT_KM / (SIZE - 1)
const OBSERVER_M = 2 // altura de un panel o una antena sobre el suelo

const DEG = Math.PI / 180

// ---------------------------------------------------------------------------
// Sitios
// ---------------------------------------------------------------------------
// Coordenadas aproximadas, a verificar con Quickmap.
//
// Relieve de cada sitio:
//   baseM          altura de referencia (solo cosmético)
//   targetHorizon  horizonte máximo buscado en grados; el relieve se escala hasta lograrlo
//   noiseM         amplitud del relieve aleatorio (antes de escalar)
//   craters        cuántos cráteres aleatorios agregar (nunca sobre el centro)
//   features       accidentes fijos (antes de escalar), con dirección `az` desde el sitio
//   mound          loma local donde está el sitio, en metros reales (no se escala);
//                  controla la pendiente y deja el sitio un poco más alto que su entorno

const SITES = [
  {
    id: 'shackleton-rim',
    name: 'Borde del cráter Shackleton',
    lat: -89.67,
    lon: 197.0,
    category: 'artemis',
    description: 'Borde del cráter que está en el mismo polo. Sol casi continuo, pero la Tierra pasa muy baja.',
    relief: {
      baseM: 1900,
      targetHorizon: 1.2,
      noiseM: 90,
      craters: 4,
      features: [{ kind: 'crater', az: 180, rimDistKm: 0.3, radiusKm: 10.5, depthM: 3000 }],
      mound: { heightM: 45, radiusKm: 0.7, power: 2, offsetKm: 0.12, offsetAz: 160 },
    },
  },
  {
    id: 'connecting-ridge',
    name: 'Connecting Ridge',
    lat: -89.45,
    lon: 222.0,
    category: 'artemis',
    description: 'Cresta que une Shackleton con de Gerlache. Muy iluminada y alta sobre su entorno.',
    relief: {
      baseM: 1950,
      targetHorizon: 1.0,
      noiseM: 80,
      craters: 6,
      features: [{ kind: 'ridge', az: 40, lengthKm: 40, widthKm: 2.2, heightM: 700 }],
      mound: { heightM: 30, radiusKm: 0.5, power: 2, offsetKm: 0.1, offsetAz: 130 },
    },
  },
  {
    id: 'de-gerlache-rim',
    name: 'Borde del cráter de Gerlache',
    lat: -88.67,
    lon: 292.0,
    category: 'artemis',
    description: 'Borde de un cráter de 32 km. Buena luz con algunas sombras largas del relieve vecino.',
    relief: {
      baseM: 1600,
      targetHorizon: 2.6,
      noiseM: 150,
      craters: 7,
      features: [
        { kind: 'crater', az: 250, rimDistKm: 0.3, radiusKm: 16, depthM: 2500 },
        { kind: 'massif', az: 20, distKm: 8, radiusKm: 2.5, heightM: 900 },
      ],
      mound: { heightM: 35, radiusKm: 0.45, power: 2, offsetKm: 0.12, offsetAz: 70 },
    },
  },
  {
    id: 'mons-mouton',
    name: 'Mons Mouton',
    lat: -84.8,
    lon: 29.2,
    category: 'clps',
    description: 'Meseta de cima plana, cerca de donde alunizó IM-2 (2025). Terreno suave y Tierra visible.',
    relief: {
      baseM: 5900,
      targetHorizon: 3.2,
      noiseM: 160,
      craters: 8,
      features: [{ kind: 'massif', az: 300, distKm: 9, radiusKm: 3, heightM: 600 }],
      mound: { heightM: 120, radiusKm: 3, power: 4, offsetKm: 0.3, offsetAz: 0 },
    },
  },
  {
    id: 'malapert-massif',
    name: 'Macizo Malapert',
    lat: -86.0,
    lon: 2.9,
    category: 'artemis',
    description: 'Montaña cara a la Tierra: buen contacto directo. Ladera con más pendiente.',
    relief: {
      baseM: 4900,
      targetHorizon: 2.0,
      noiseM: 140,
      craters: 6,
      features: [{ kind: 'massif', az: 150, distKm: 7, radiusKm: 2.5, heightM: 700 }],
      mound: { heightM: 260, radiusKm: 1.2, power: 2, offsetKm: 0.3, offsetAz: 225 },
    },
  },
  {
    id: 'nobile-rim',
    name: 'Borde del cráter Nobile',
    lat: -85.4,
    lon: 37.0,
    category: 'clps',
    description: 'Zona que exploraría VIPER. Relieve alto alrededor: menos horas de sol y pendientes fuertes.',
    relief: {
      baseM: 2200,
      targetHorizon: 5.8,
      noiseM: 220,
      craters: 9,
      features: [
        { kind: 'crater', az: 200, rimDistKm: 0.4, radiusKm: 36, depthM: 3500 },
        { kind: 'ridge', az: 100, lengthKm: 30, widthKm: 2.5, heightM: 1200, offsetKm: 6, offsetAz: 10 },
        { kind: 'massif', az: 280, distKm: 6, radiusKm: 2, heightM: 1100 },
      ],
      mound: { heightM: 60, radiusKm: 0.33, power: 2, offsetKm: 0.14, offsetAz: 300 },
    },
  },
]

// ---------------------------------------------------------------------------
// Sol y Tierra (modelo simplificado)
// ---------------------------------------------------------------------------

/** Azimut (desde el N, horario) y elevación de un cuerpo cuyo punto sub-cuerpo es (subLat, subLon). */
function altAz(latDeg, lonDeg, subLatDeg, subLonDeg) {
  const phi = latDeg * DEG
  const dec = subLatDeg * DEG
  const h = (lonDeg - subLonDeg) * DEG // ángulo horario, positivo = el cuerpo está al oeste
  const sinEl = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h)
  const el = Math.asin(Math.max(-1, Math.min(1, sinEl)))
  const east = -Math.cos(dec) * Math.sin(h)
  const north = Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.sin(phi) * Math.cos(h)
  return { az: wrap360(Math.atan2(east, north) / DEG), el: el / DEG }
}

/** Punto subsolar en el día `d` desde START. */
function subSolar(d) {
  // Declinación ±1.54° (periodo 346.62 d). La fase hace que la luz en el sur mejore durante el periodo,
  // así la recomendación de "mejor fecha de inicio" tiene algo que encontrar.
  const lat = -1.54 * Math.sin((2 * Math.PI * (d + 18.5)) / 346.62)
  // La Luna gira hacia el este, así que el punto subsolar avanza hacia el oeste: 360° cada 29.53 d.
  const lon = wrap360(120 - (360 * d) / 29.53)
  return { lat, lon }
}

/** Punto subterrestre en el día `d`: libraciones en longitud y latitud. */
function subEarth(d) {
  const lon = 7.9 * Math.sin((2 * Math.PI * d) / 27.55)
  const lat = 6.7 * Math.sin((2 * Math.PI * d) / 27.21 + 1.0)
  return { lat, lon: wrap360(lon) }
}

function tracks(site) {
  const sun = { az: [], el: [] }
  const earth = { az: [], el: [] }
  for (let i = 0; i < SAMPLES; i++) {
    const d = (i * STEP_HOURS) / 24
    const s = subSolar(d)
    const e = subEarth(d)
    const sp = altAz(site.lat, site.lon, s.lat, s.lon)
    const ep = altAz(site.lat, site.lon, e.lat, e.lon)
    sun.az.push(round(sp.az, 2))
    sun.el.push(round(sp.el, 3))
    earth.az.push(round(ep.az, 2))
    earth.el.push(round(ep.el, 3))
  }
  return { sun, earth }
}

// ---------------------------------------------------------------------------
// Terreno sintético
// ---------------------------------------------------------------------------
// Coordenadas: x hacia el este y y hacia el norte, en km, con el sitio en (0, 0).

function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s) {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/** Ruido de valor suave en [-1, 1]. */
function makeValueNoise(seed) {
  const lattice = (ix, iy) => {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2246822519)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return ((h >>> 0) / 4294967296) * 2 - 1
  }
  const smooth = (t) => t * t * (3 - 2 * t)
  return (x, y) => {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const sx = smooth(x - ix)
    const sy = smooth(y - iy)
    const a = lattice(ix, iy)
    const b = lattice(ix + 1, iy)
    const c = lattice(ix, iy + 1)
    const d = lattice(ix + 1, iy + 1)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
  }
}

/** Punto a `distKm` del sitio en la dirección `az` (desde el N, horario). */
function polar(az, distKm) {
  return { x: distKm * Math.sin(az * DEG), y: distKm * Math.cos(az * DEG) }
}

/** Cráter: cuenco parabólico con borde levantado que cae suavemente hacia afuera. */
function craterHeight(dx, dy, radiusKm, depthM) {
  const u = Math.hypot(dx, dy) / radiusKm
  const rimM = 0.2 * depthM
  if (u < 1) return -depthM + (depthM + rimM) * u * u
  return rimM * Math.exp(-(((u - 1) / 0.35) ** 2))
}

/** Crea la función de relieve (en metros, sin escalar) y la loma local del sitio. */
function buildTerrainModel(site) {
  const cfg = site.relief
  const seed = hashString(site.id)
  const rng = makeRng(seed)
  const noise = makeValueNoise(seed)

  const craters = []
  const ridges = []
  const massifs = []

  for (const f of cfg.features) {
    if (f.kind === 'crater') {
      const c = polar(f.az, f.radiusKm + f.rimDistKm)
      craters.push({ ...c, radiusKm: f.radiusKm, depthM: f.depthM })
    } else if (f.kind === 'ridge') {
      const o = polar(f.offsetAz ?? 0, f.offsetKm ?? 0)
      const half = polar(f.az, f.lengthKm / 2)
      ridges.push({
        x1: o.x - half.x,
        y1: o.y - half.y,
        x2: o.x + half.x,
        y2: o.y + half.y,
        widthKm: f.widthKm,
        heightM: f.heightM,
      })
    } else if (f.kind === 'massif') {
      const c = polar(f.az, f.distKm)
      massifs.push({ ...c, radiusKm: f.radiusKm, heightM: f.heightM })
    }
  }

  // Cráteres aleatorios, siempre lejos del centro para no caer sobre el sitio.
  let tries = 0
  let added = 0
  while (added < cfg.craters && tries < 500) {
    tries++
    const radiusKm = 0.4 + rng() ** 2 * 2.6
    const x = (rng() * 2 - 1) * (EXTENT_KM / 2)
    const y = (rng() * 2 - 1) * (EXTENT_KM / 2)
    if (Math.hypot(x, y) < radiusKm * 1.6 + 1.2) continue
    craters.push({ x, y, radiusKm, depthM: radiusKm * 1000 * (0.15 + rng() * 0.1) })
    added++
  }

  const offX = rng() * 1000
  const offY = rng() * 1000

  /** Relieve sin escalar en metros. */
  const relief = (x, y) => {
    let h = 0
    // Ruido fractal: longitudes de onda de 6 km a ~0.4 km.
    let amp = cfg.noiseM
    let wave = 6
    for (let o = 0; o < 5; o++) {
      h += amp * noise(x / wave + offX + o * 17.3, y / wave + offY - o * 9.1)
      amp *= 0.5
      wave *= 0.5
    }
    for (const c of craters) h += craterHeight(x - c.x, y - c.y, c.radiusKm, c.depthM)
    for (const r of ridges) {
      const d = distToSegment(x, y, r.x1, r.y1, r.x2, r.y2)
      h += r.heightM * Math.exp(-((d / r.widthKm) ** 2))
    }
    for (const m of massifs) {
      const d = Math.hypot(x - m.x, y - m.y)
      h += m.heightM * Math.exp(-((d / m.radiusKm) ** 2))
    }
    return h
  }

  // Loma local (no se escala): sube el sitio sobre su entorno y define la pendiente.
  const mc = polar(cfg.mound.offsetAz, cfg.mound.offsetKm)
  const mound = (x, y) => {
    const d = Math.hypot(x - mc.x, y - mc.y) / cfg.mound.radiusKm
    return cfg.mound.heightM * Math.exp(-(d ** cfg.mound.power))
  }

  return { relief, mound }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1
  const vy = y2 - y1
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy)))
  return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy))
}

/** Evalúa una función (x, y) → m en la malla. Fila 0 = norte, columna 0 = oeste. */
function sampleGrid(fn) {
  const out = new Float64Array(SIZE * SIZE)
  for (let row = 0; row < SIZE; row++) {
    const y = EXTENT_KM / 2 - row * CELL_KM
    for (let col = 0; col < SIZE; col++) {
      const x = -EXTENT_KM / 2 + col * CELL_KM
      out[row * SIZE + col] = fn(x, y)
    }
  }
  return out
}

/** Altura interpolada (bilineal) de la malla en (x, y) km, o null si está afuera. */
function gridHeight(grid, x, y) {
  const fc = (x + EXTENT_KM / 2) / CELL_KM
  const fr = (EXTENT_KM / 2 - y) / CELL_KM
  if (fc < 0 || fr < 0 || fc > SIZE - 1 || fr > SIZE - 1) return null
  const c0 = Math.min(Math.floor(fc), SIZE - 2)
  const r0 = Math.min(Math.floor(fr), SIZE - 2)
  const tc = fc - c0
  const tr = fr - r0
  const i = r0 * SIZE + c0
  const top = grid[i] + (grid[i + 1] - grid[i]) * tc
  const bottom = grid[i + SIZE] + (grid[i + SIZE + 1] - grid[i + SIZE]) * tc
  return top + (bottom - top) * tr
}

/** Horizonte: rayos desde el centro (+2 m) sobre la malla, uno por grado de azimut. */
function horizonFromGrid(grid) {
  const h0 = gridHeight(grid, 0, 0) + OBSERVER_M
  const stepKm = CELL_KM / 2
  const out = []
  for (let az = 0; az < 360; az++) {
    const dx = Math.sin(az * DEG)
    const dy = Math.cos(az * DEG)
    let best = -90
    for (let d = stepKm; ; d += stepKm) {
      const h = gridHeight(grid, d * dx, d * dy)
      if (h === null) break
      const ang = Math.atan2(h - h0, d * 1000) / DEG
      if (ang > best) best = ang
    }
    out.push(best)
  }
  return out
}

/** Pendiente en grados de la superficie continua `fn` en (x, y) km, con una base de 20 m. */
function slopeAt(fn, x, y) {
  const e = 0.01 // 10 m
  const gx = (fn(x + e, y) - fn(x - e, y)) / 20
  const gy = (fn(x, y + e) - fn(x, y - e)) / 20
  return Math.atan(Math.hypot(gx, gy)) / DEG
}

function slopeStats(fn) {
  const atSiteDeg = slopeAt(fn, 0, 0)
  let max100mDeg = atSiteDeg
  for (let r = 0.01; r <= 0.1 + 1e-9; r += 0.01) {
    for (let a = 0; a < 360; a += 10) {
      const p = polar(a, r)
      max100mDeg = Math.max(max100mDeg, slopeAt(fn, p.x, p.y))
    }
  }
  return { atSiteDeg: round(atSiteDeg, 2), max100mDeg: round(max100mDeg, 2) }
}

/**
 * Escala el relieve para que el horizonte máximo quede en `targetHorizon`.
 * Sin esto el horizonte salía de 20–55° y varios sitios quedaban en 0% de luz.
 */
function calibrateTerrain(site) {
  const { relief, mound } = buildTerrainModel(site)
  const reliefGrid = sampleGrid(relief)
  const moundGrid = sampleGrid(mound)
  const target = site.relief.targetHorizon

  const gridFor = (scale) => {
    const g = new Float64Array(SIZE * SIZE)
    for (let i = 0; i < g.length; i++) g[i] = scale * reliefGrid[i] + moundGrid[i]
    return g
  }
  const maxHorizon = (scale) => Math.max(...horizonFromGrid(gridFor(scale)))

  let lo = 0
  let hi = 0.05
  while (maxHorizon(hi) < target && hi < 10) hi *= 2
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2
    if (maxHorizon(mid) < target) lo = mid
    else hi = mid
  }
  const scale = (lo + hi) / 2

  const grid = gridFor(scale)
  const surface = (x, y) => scale * relief(x, y) + mound(x, y)
  return {
    scale,
    heightsM: Array.from(grid, (h) => round(site.relief.baseM + h, 1)),
    horizon: horizonFromGrid(grid).map((v) => round(v, 3)),
    slope: slopeStats(surface),
  }
}

// ---------------------------------------------------------------------------
// Verificación (misma regla que usará el frontend)
// ---------------------------------------------------------------------------

function horizonAt(horizon, az) {
  const f = wrap360(az)
  const i0 = Math.floor(f) % 360
  const i1 = (i0 + 1) % 360
  const t = f - Math.floor(f)
  return horizon[i0] + (horizon[i1] - horizon[i0]) * t
}

function percentVisible(track, horizon) {
  let n = 0
  for (let i = 0; i < track.el.length; i++) if (track.el[i] > horizonAt(horizon, track.az[i])) n++
  return (100 * n) / track.el.length
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function wrap360(a) {
  return ((a % 360) + 360) % 360
}

function round(v, decimals) {
  const f = 10 ** decimals
  const r = Math.round(v * f) / f
  return Object.is(r, -0) ? 0 : r
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function siteInfo(site) {
  const { id, name, lat, lon, category, description } = site
  return { id, name, lat, lon, category, description }
}

function main() {
  mkdirSync(join(OUT_DIR, 'sites'), { recursive: true })

  const index = { sites: SITES.map(siteInfo), mock: true }
  writeFileSync(join(OUT_DIR, 'sites.json'), JSON.stringify(index, null, 2) + '\n')

  const rows = []
  for (const site of SITES) {
    const { sun, earth } = tracks(site)
    const t = calibrateTerrain(site)

    /** @type {import('../src/types').SiteData} */
    const data = {
      site: siteInfo(site),
      start: START,
      stepHours: STEP_HOURS,
      horizon: { azimuthStepDeg: 1, elevationDeg: t.horizon },
      slope: t.slope,
      sun,
      earth,
      terrain: { size: SIZE, extentKm: EXTENT_KM, heightsM: t.heightsM },
      mock: true,
    }
    writeFileSync(join(OUT_DIR, 'sites', `${site.id}.json`), JSON.stringify(data) + '\n')

    rows.push({
      sitio: site.id,
      'luz %': round(percentVisible(sun, t.horizon), 1),
      'com. %': round(percentVisible(earth, t.horizon), 1),
      'horiz. máx °': round(Math.max(...t.horizon), 2),
      'horiz. mín °': round(Math.min(...t.horizon), 2),
      'pend. °': t.slope.atSiteDeg,
      'pend. 100 m °': t.slope.max100mDeg,
      'escala relieve': round(t.scale, 3),
    })
  }

  console.log(`Datos de prueba en ${OUT_DIR}`)
  console.log(`${SITES.length} sitios · ${SAMPLES} muestras cada ${STEP_HOURS} h desde ${START}\n`)
  console.table(rows)
}

main()
