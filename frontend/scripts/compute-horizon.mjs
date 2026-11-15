#!/usr/bin/env node
// Horizonte, crestas que lo limitan y pendiente de cada sitio, calculados directamente del DEM LOLA.
//
//   npm run horizon -- [--dem LDEM_80S_80M.IMG] [--sun AVGVISIB_75S_120M_201608.IMG] [--earth AVGVISIB_..._EARTH.IMG]
//
// Por defecto busca los archivos en la carpeta Descargas del usuario. Escribe assets-src/horizon/{id}.json
// (en la raíz del repo), que luego usa `npm run mock`.
//
// Método (el mismo de assets-src/terrain/build_terrains.py, para que los resultados coincidan):
// - DEM: LOLA LDEM_80S_80M (NASA/LRO, PDS), estereográfica polar sur, 80 m/píxel, altura = DN × 0.5 m.
// - Un rayo de 150 km por grado de azimut, con pasos de 40 m e interpolación bilineal.
// - Se resta la curvatura lunar d²/(2R), R = 1737.4 km, y el observador está 2 m sobre el suelo.
// - Además del ángulo del horizonte se guarda dónde está el punto que lo limita (distancia y altura).
// - Pendiente regional con diferencias centradas de ±80 m, en el sitio y en un anillo de 50 y 100 m.
//
// Si se pasan los mapas de iluminación oficiales del equipo LOLA (AVGVISIB, Mazarico et al. 2011), se guarda
// también el valor de NASA en el sitio, para comparar con nuestro cálculo (validación).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SITES } from './sites.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(ROOT, 'assets-src', 'horizon')
const DOWNLOADS = join(homedir(), 'Downloads')

const R = 1737400 // radio de referencia (m)
const RAY_KM = 150
const OBSERVER_M = 2

const DEM = { file: 'LDEM_80S_80M.IMG', n: 7600, scaleM: 80, offsetPx: 3799.5, factor: 0.5, product: 'LOLA LDEM_80S_80M (NASA/LRO, PDS)' }
const SUN_VIS = { file: 'AVGVISIB_75S_120M_201608.IMG', n: 7624, scaleM: 120, offsetPx: 3811.5, factor: 0.00004 }
const EARTH_VIS = { file: 'AVGVISIB_75S_120M_201608_EARTH.IMG', n: 7624, scaleM: 120, offsetPx: 3811.5, factor: 0.00004 }

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}

/** Raster polar sur en enteros de 16 bits (little endian), con muestreo bilineal en metros de proyección. */
export function polarGrid(buffer, spec) {
  const { n, scaleM, offsetPx, factor } = spec
  if (buffer.length !== n * n * 2) throw new Error(`tamaño inesperado: ${buffer.length} bytes y se esperaban ${n * n * 2}`)
  const dn = new Int16Array(buffer.buffer, buffer.byteOffset, n * n)
  const at = (l, s) => dn[l * n + s] * factor
  return (x, y) => {
    const s = x / scaleM + offsetPx
    const l = offsetPx - y / scaleM
    const s0 = Math.min(n - 2, Math.max(0, Math.floor(s)))
    const l0 = Math.min(n - 2, Math.max(0, Math.floor(l)))
    const fs = Math.min(1, Math.max(0, s - s0))
    const fl = Math.min(1, Math.max(0, l - l0))
    const top = at(l0, s0) * (1 - fs) + at(l0, s0 + 1) * fs
    const bottom = at(l0 + 1, s0) * (1 - fs) + at(l0 + 1, s0 + 1) * fs
    return top * (1 - fl) + bottom * fl
  }
}

/** Estereográfica polar sur (esférica), centro lon 0. Coordenadas en metros. */
export function project(lat, lon) {
  const r = 2 * R * Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)
  const lo = (lon * Math.PI) / 180
  return { x: r * Math.sin(lo), y: r * Math.cos(lo) }
}

/** Posición del sitio y vectores unitarios norte (alejándose del polo) y este, en el plano de proyección. */
export function siteFrame(lat, lon) {
  const lo = (lon * Math.PI) / 180
  return { p: project(lat, lon), north: { x: Math.sin(lo), y: Math.cos(lo) }, east: { x: Math.cos(lo), y: -Math.sin(lo) } }
}

/**
 * Horizonte en una dirección: ángulo máximo sobre el plano del observador y el punto que lo da.
 * Devuelve la elevación (°), la distancia (km) y la altura del punto respecto del suelo del sitio (m).
 */
export function horizonRay(height, frame, h0, azDeg, observerM = OBSERVER_M, rayKm = RAY_KM, stepM = 40, startM = 80) {
  const a = (azDeg * Math.PI) / 180
  const dx = Math.sin(a) * frame.east.x + Math.cos(a) * frame.north.x
  const dy = Math.sin(a) * frame.east.y + Math.cos(a) * frame.north.y
  const eye = h0 + observerM
  let best = -Infinity
  let bestD = startM
  let bestH = 0
  for (let s = startM; s <= rayKm * 1000 + 1e-6; s += stepM) {
    const h = height(frame.p.x + s * dx, frame.p.y + s * dy) - (s * s) / (2 * R)
    const ang = Math.atan2(h - eye, s)
    if (ang > best) {
      best = ang
      bestD = s
      bestH = h
    }
  }
  return { elevationDeg: (best * 180) / Math.PI, distanceKm: bestD / 1000, heightM: bestH - h0 }
}

function slopeAt(height, frame, dEast, dNorth, d = DEM.scaleM) {
  const qx = frame.p.x + dEast * frame.east.x + dNorth * frame.north.x
  const qy = frame.p.y + dEast * frame.east.y + dNorth * frame.north.y
  const hx = (height(qx + d * frame.east.x, qy + d * frame.east.y) - height(qx - d * frame.east.x, qy - d * frame.east.y)) / (2 * d)
  const hy = (height(qx + d * frame.north.x, qy + d * frame.north.y) - height(qx - d * frame.north.x, qy - d * frame.north.y)) / (2 * d)
  return (Math.atan(Math.hypot(hx, hy)) * 180) / Math.PI
}

function round(v, decimals) {
  const f = 10 ** decimals
  const r = Math.round(v * f) / f
  return Object.is(r, -0) ? 0 : r
}

function loadGrid(path, spec, label) {
  if (!path || !existsSync(path)) return null
  console.log(`  · ${label}: ${path}`)
  return polarGrid(readFileSync(path), spec)
}

function main() {
  const demPath = arg('dem', join(DOWNLOADS, DEM.file))
  if (!existsSync(demPath)) {
    console.error(`No encuentro el DEM ${demPath}. Descárgalo de https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/ y pásalo con --dem.`)
    process.exit(1)
  }
  const height = loadGrid(demPath, DEM, 'DEM')
  const sunVis = loadGrid(arg('sun', join(DOWNLOADS, SUN_VIS.file)), SUN_VIS, 'Iluminación (Sol)')
  const earthVis = loadGrid(arg('earth', join(DOWNLOADS, EARTH_VIS.file)), EARTH_VIS, 'Iluminación (Tierra)')
  mkdirSync(OUT_DIR, { recursive: true })

  const rows = []
  for (const site of SITES) {
    const frame = siteFrame(site.lat, site.lon)
    const h0 = height(frame.p.x, frame.p.y)
    const elevationDeg = []
    const distanceKm = []
    const obstacleHeightM = []
    for (let az = 0; az < 360; az++) {
      const r = horizonRay(height, frame, h0, az)
      elevationDeg.push(round(r.elevationDeg, 3))
      distanceKm.push(round(r.distanceKm, 2))
      obstacleHeightM.push(Math.round(r.heightM))
    }
    const atSite = slopeAt(height, frame, 0, 0)
    let max100 = atSite
    for (const rad of [50, 100]) {
      for (let a = 0; a < 360; a += 30) {
        const t = (a * Math.PI) / 180
        max100 = Math.max(max100, slopeAt(height, frame, rad * Math.sin(t), rad * Math.cos(t)))
      }
    }
    // Para validar con la misma regla del mapa de NASA: observador a ras de suelo (0 m) en lugar de 2 m.
    const reference =
      sunVis && earthVis
        ? {
            source: 'LOLA AVGVISIB_75S_120M_201608 (NASA/GSFC, Mazarico et al. 2011)',
            period: '2009-07-13 a 2013-07-18',
            rule: 'alguna parte del disco sobre el relieve, observador a ras de suelo',
            sunPct: round(100 * sunVis(frame.p.x, frame.p.y), 1),
            earthPct: round(100 * earthVis(frame.p.x, frame.p.y), 1),
            groundHorizonDeg: Array.from({ length: 360 }, (_, az) => round(horizonRay(height, frame, h0, az, 0).elevationDeg, 3)),
          }
        : null

    const out = {
      id: site.id,
      lat: site.lat,
      lon: site.lon,
      source: DEM.product,
      demResolutionM: DEM.scaleM,
      siteHeightM: round(h0, 1),
      horizon: { azimuthStepDeg: 1, rayKm: RAY_KM, observerHeightM: OBSERVER_M, curvatureIncluded: true, elevationDeg, distanceKm, obstacleHeightM },
      slope: { atSiteDeg: round(atSite, 2), max100mDeg: round(max100, 2), note: 'pendiente regional (DEM a 80 m)' },
      reference,
    }
    writeFileSync(join(OUT_DIR, `${site.id}.json`), JSON.stringify(out) + '\n')

    const iMax = elevationDeg.indexOf(Math.max(...elevationDeg))
    rows.push({
      sitio: site.id,
      'horiz. máx °': elevationDeg[iMax],
      'en az °': iMax,
      'a km': distanceKm[iMax],
      'pend. °': out.slope.atSiteDeg,
      'pend. 100 m °': out.slope.max100mDeg,
      'NASA Sol %': reference?.sunPct ?? '—',
      'NASA Tierra %': reference?.earthPct ?? '—',
    })
  }
  console.log()
  console.table(rows)
  console.log(`\nListo en ${OUT_DIR}. Ahora corre \`npm run mock\`.`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
