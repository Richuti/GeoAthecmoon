#!/usr/bin/env node
// Descarga de JPL Horizons (NASA/JPL) la posición real del Sol y de la Tierra vista desde cada sitio, y la
// de la Luna vista desde cada estación de la Red de Espacio Profundo (DSN).
//
//   npm run horizons            descarga solo lo que falta
//   npm run horizons -- --force vuelve a descargar todo
//
// Guarda public/data/horizons/{id}.json (Sol y Tierra: azimut, elevación y distancia) y
// public/data/horizons/dsn.json (elevación de la Luna en cada estación). Luego `npm run mock` los usa.
//
// Se corre en Node (no en el navegador) porque la API puede no permitir pedidos desde otra web (CORS).
// El resultado queda en el repo, así la app no depende de que Horizons responda durante la demo.
//
// API: https://ssd-api.jpl.nasa.gov/doc/horizons.html

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DSN_STATIONS, SAMPLES, SITES, START, STEP_HOURS } from './sites.mjs'

const API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'horizons')
const AU_KM = 149597870.7

/** Cuerpos que pedimos a Horizons desde cada sitio. */
const BODIES = [
  { key: 'sun', command: '10', label: 'Sol' },
  { key: 'earth', command: '399', label: 'Tierra' },
]

const RETRIES = 3
const PAUSE_MS = 1500 // pausa entre pedidos, para no cargar la API

// ---------------------------------------------------------------------------
// Pedido a Horizons
// ---------------------------------------------------------------------------

/** Fecha en el formato que acepta Horizons: `2027-01-01 00:00`. */
function horizonsTime(date) {
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

/**
 * Parámetros de la consulta. Son los mismos que tiene que usar el backend (ver docs/CONTRATO_DATOS.md).
 * `center` es el cuerpo sobre el que está el observador: 301 (Luna) para los sitios, 399 (Tierra) para la DSN.
 */
export function queryParams({ command, center, lon, lat, altKm = 0 }) {
  const start = new Date(START)
  const stop = new Date(start.getTime() + (SAMPLES - 1) * STEP_HOURS * 3600_000)
  return {
    format: 'json',
    COMMAND: `'${command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: `'coord@${center}'`,
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${lon},${lat},${altKm}'`, // longitud este, latitud, altura en km
    START_TIME: `'${horizonsTime(start)}'`,
    STOP_TIME: `'${horizonsTime(stop)}'`,
    STEP_SIZE: `'${STEP_HOURS} h'`,
    TIME_TYPE: "'UT'",
    QUANTITIES: "'4,20'", // 4: azimut y elevación aparentes · 20: distancia al observador (delta, en UA)
    ANG_FORMAT: "'DEG'",
    CSV_FORMAT: "'YES'",
  }
}

async function fetchTrack(params, label) {
  const url = `${API_URL}?${new URLSearchParams(params)}`
  let lastError
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'geoathecmoon-data-script' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const r = parseResult(json.result)
      if (r.az.length !== SAMPLES) throw new Error(`llegaron ${r.az.length} muestras y se esperaban ${SAMPLES}`)
      return { ...r, version: json.signature?.version ?? null }
    } catch (err) {
      lastError = err
      if (attempt < RETRIES) await sleep(PAUSE_MS * attempt * 2)
    }
  }
  throw new Error(`${label}: ${lastError.message}`)
}

/**
 * Lee la tabla CSV entre $$SOE y $$EOE. Las columnas se ubican por el encabezado (la línea anterior a
 * $$SOE), porque Horizons agrega columnas de presencia solar o lunar según el observador:
 *   ` Date__(UT)__HR:MN, , , Azi_(a-app), Elev_(a-app), delta, deldot,`
 */
export function parseResult(text) {
  const soe = text.indexOf('$$SOE')
  const eoe = text.indexOf('$$EOE')
  if (soe < 0 || eoe < 0) {
    throw new Error(`respuesta sin tabla de efemérides:\n${text.slice(0, 600)}`)
  }
  const headerLine = text
    .slice(0, soe)
    .split('\n')
    .reverse()
    .find((l) => l.includes('Azi'))
  if (!headerLine) throw new Error('no se encontró el encabezado de columnas')
  const header = headerLine.split(',').map((c) => c.trim())
  const iAz = header.findIndex((c) => c.startsWith('Azi'))
  const iEl = header.findIndex((c) => c.startsWith('Elev'))
  const iDelta = header.findIndex((c) => c === 'delta')
  if (iAz < 0 || iEl < 0) throw new Error(`encabezado inesperado: "${headerLine}"`)

  const az = []
  const el = []
  const distKm = []
  const times = []
  for (const line of text.slice(soe + 5, eoe).split('\n')) {
    if (!line.trim()) continue
    const cols = line.split(',').map((c) => c.trim())
    const a = Number(cols[iAz])
    const e = Number(cols[iEl])
    if (!Number.isFinite(a) || !Number.isFinite(e)) throw new Error(`fila inválida: "${line}"`)
    times.push(cols[0])
    az.push(round(a, 4))
    el.push(round(e, 4))
    if (iDelta >= 0) {
      const d = Number(cols[iDelta])
      if (!Number.isFinite(d)) throw new Error(`distancia inválida: "${line}"`)
      distKm.push(Math.round(d * AU_KM))
    }
  }
  return { az, el, distKm: iDelta >= 0 ? distKm : null, first: times[0], last: times.at(-1) }
}

// ---------------------------------------------------------------------------
// Caché
// ---------------------------------------------------------------------------

const sitePath = (siteId) => join(OUT_DIR, `${siteId}.json`)
const DSN_PATH = join(OUT_DIR, 'dsn.json')

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

/** true si el archivo guardado corresponde al sitio y al periodo actuales, con distancias. */
function isSiteCacheValid(site) {
  const c = existsSync(sitePath(site.id)) && readJson(sitePath(site.id))
  return Boolean(
    c &&
      c.start === START &&
      c.stepHours === STEP_HOURS &&
      c.site?.lat === site.lat &&
      c.site?.lon === site.lon &&
      BODIES.every((b) => c[b.key]?.el?.length === SAMPLES && c[b.key]?.distKm?.length === SAMPLES),
  )
}

function isDsnCacheValid() {
  const c = existsSync(DSN_PATH) && readJson(DSN_PATH)
  return Boolean(
    c &&
      c.start === START &&
      c.stepHours === STEP_HOURS &&
      DSN_STATIONS.every((s) => {
        const st = c.stations?.find((x) => x.id === s.id)
        return st && st.lat === s.lat && st.lon === s.lon && st.el?.length === SAMPLES
      }),
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const force = process.argv.includes('--force')
  mkdirSync(OUT_DIR, { recursive: true })

  console.log(`JPL Horizons · ${SITES.length} sitios y ${DSN_STATIONS.length} estaciones DSN · ${SAMPLES} muestras cada ${STEP_HOURS} h desde ${START}\n`)

  const rows = []
  let failed = 0
  for (const site of SITES) {
    if (!force && isSiteCacheValid(site)) {
      console.log(`  = ${site.id} (ya descargado)`)
      rows.push(summary(site, readJson(sitePath(site.id))))
      continue
    }
    try {
      const out = {
        source: 'JPL Horizons (NASA/JPL), https://ssd.jpl.nasa.gov/horizons/',
        fetchedAt: new Date().toISOString(),
        site: { id: site.id, lat: site.lat, lon: site.lon },
        start: START,
        stepHours: STEP_HOURS,
        query: queryParams({ command: '<10 | 399>', center: 301, lon: site.lon, lat: site.lat }),
      }
      for (const body of BODIES) {
        const r = await fetchTrack(queryParams({ command: body.command, center: 301, lon: site.lon, lat: site.lat }), `${site.id} · ${body.label}`)
        out.apiVersion = r.version
        out[body.key] = { az: r.az, el: r.el, distKm: r.distKm }
        console.log(`  ↓ ${site.id} · ${body.label}: ${r.first} → ${r.last}`)
        await sleep(PAUSE_MS)
      }
      writeFileSync(sitePath(site.id), JSON.stringify(out) + '\n')
      rows.push(summary(site, out))
    } catch (err) {
      failed++
      console.error(`  ✗ ${err.message}`)
    }
  }

  // La Luna vista desde cada estación DSN. Es la misma para todos los sitios: desde la Tierra, un sitio
  // del polo sur está a menos de 0.3° del centro de la Luna, mucho menos que la elevación mínima de enlace.
  if (!force && isDsnCacheValid()) {
    console.log('  = dsn (ya descargado)')
  } else {
    try {
      const out = {
        source: 'JPL Horizons (NASA/JPL), https://ssd.jpl.nasa.gov/horizons/ · estaciones: NASA/JPL DSN 301',
        fetchedAt: new Date().toISOString(),
        start: START,
        stepHours: STEP_HOURS,
        target: 'Luna (301), centro',
        stations: [],
      }
      for (const st of DSN_STATIONS) {
        const r = await fetchTrack(queryParams({ command: '301', center: 399, lon: st.lon, lat: st.lat, altKm: st.altKm }), `DSN ${st.id}`)
        out.stations.push({ id: st.id, name: st.name, antenna: st.antenna, lon: st.lon, lat: st.lat, altKm: st.altKm, el: r.el.map((v) => round(v, 2)) })
        console.log(`  ↓ DSN ${st.antenna} ${st.id}: ${r.first} → ${r.last}`)
        await sleep(PAUSE_MS)
      }
      writeFileSync(DSN_PATH, JSON.stringify(out) + '\n')
    } catch (err) {
      failed++
      console.error(`  ✗ ${err.message}`)
    }
  }

  console.log()
  console.table(rows)
  if (failed) {
    console.error(`\n${failed} descarga(s) fallaron. Vuelve a correr \`npm run horizons\` para reintentar.`)
    process.exitCode = 1
  } else {
    console.log(`\nListo en ${OUT_DIR}. Ahora corre \`npm run mock\`.`)
  }
}

function summary(site, data) {
  const range = (a) => `${Math.min(...a).toFixed(2)} … ${Math.max(...a).toFixed(2)}`
  return {
    sitio: site.id,
    'elev. Sol °': range(data.sun.el),
    'elev. Tierra °': range(data.earth.el),
    'Tierra a km': range(data.earth.distKm),
    'Tierra sobre 0° %': Math.round((100 * data.earth.el.filter((e) => e > 0).length) / data.earth.el.length),
  }
}

function round(v, decimals) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
