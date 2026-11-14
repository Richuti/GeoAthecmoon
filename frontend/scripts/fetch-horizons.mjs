#!/usr/bin/env node
// Descarga de JPL Horizons (NASA/JPL) la posición real del Sol y de la Tierra vista desde cada sitio.
//
//   npm run horizons            descarga solo los sitios que faltan
//   npm run horizons -- --force vuelve a descargar todo
//
// Guarda public/data/horizons/{id}.json. Luego `npm run mock` usa estos archivos para `sun` y `earth`
// en lugar del modelo simplificado.
//
// Se corre en Node (no en el navegador) porque la API puede no permitir pedidos desde otra web (CORS).
// El resultado queda en el repo, así la app no depende de que Horizons responda durante la demo.
//
// API: https://ssd-api.jpl.nasa.gov/doc/horizons.html

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SAMPLES, SITES, START, STEP_HOURS } from './sites.mjs'

const API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'horizons')

/** Cuerpos que pedimos a Horizons. */
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

/** Parámetros de la consulta. Son los mismos que tiene que usar el backend (ver docs/CONTRATO_DATOS.md). */
function queryParams(site, command) {
  const start = new Date(START)
  const stop = new Date(start.getTime() + (SAMPLES - 1) * STEP_HOURS * 3600_000)
  return {
    format: 'json',
    COMMAND: `'${command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'coord@301'", // un punto sobre la Luna
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${site.lon},${site.lat},0'`, // longitud este, latitud, altura en km
    START_TIME: `'${horizonsTime(start)}'`,
    STOP_TIME: `'${horizonsTime(stop)}'`,
    STEP_SIZE: `'${STEP_HOURS} h'`,
    QUANTITIES: "'4'", // azimut y elevación aparentes (sin atmósfera)
    ANG_FORMAT: "'DEG'",
    CSV_FORMAT: "'YES'",
  }
}

async function fetchBody(site, body) {
  const url = `${API_URL}?${new URLSearchParams(queryParams(site, body.command))}`
  let lastError
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'geoathectum-data-script' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      return { ...parseResult(json.result), version: json.signature?.version ?? null }
    } catch (err) {
      lastError = err
      if (attempt < RETRIES) await sleep(PAUSE_MS * attempt * 2)
    }
  }
  throw new Error(`${site.id} · ${body.label}: ${lastError.message}`)
}

/**
 * Lee la tabla CSV entre $$SOE y $$EOE. Cada fila es:
 *   ` 2027-Jan-01 00:00,*, ,  66.121367,     1.147512,`
 *   fecha, presencia solar, cuerpo que interfiere, azimut, elevación
 */
function parseResult(text) {
  const soe = text.indexOf('$$SOE')
  const eoe = text.indexOf('$$EOE')
  if (soe < 0 || eoe < 0) {
    throw new Error(`respuesta sin tabla de efemérides:\n${text.slice(0, 600)}`)
  }
  const az = []
  const el = []
  const times = []
  for (const line of text.slice(soe + 5, eoe).split('\n')) {
    if (!line.trim()) continue
    const cols = line.split(',').map((c) => c.trim())
    const a = Number(cols[3])
    const e = Number(cols[4])
    if (!Number.isFinite(a) || !Number.isFinite(e)) throw new Error(`fila inválida: "${line}"`)
    times.push(cols[0])
    az.push(round(a, 4))
    el.push(round(e, 4))
  }
  return { az, el, first: times[0], last: times.at(-1) }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function cachePath(siteId) {
  return join(OUT_DIR, `${siteId}.json`)
}

/** true si el archivo guardado corresponde al sitio y al periodo actuales. */
function isCacheValid(site) {
  const path = cachePath(site.id)
  if (!existsSync(path)) return false
  try {
    const c = JSON.parse(readFileSync(path, 'utf8'))
    return (
      c.start === START &&
      c.stepHours === STEP_HOURS &&
      c.site?.lat === site.lat &&
      c.site?.lon === site.lon &&
      c.sun?.el?.length === SAMPLES &&
      c.earth?.el?.length === SAMPLES
    )
  } catch {
    return false
  }
}

async function main() {
  const force = process.argv.includes('--force')
  mkdirSync(OUT_DIR, { recursive: true })

  console.log(`JPL Horizons · ${SITES.length} sitios · ${SAMPLES} muestras cada ${STEP_HOURS} h desde ${START}\n`)

  const rows = []
  let failed = 0
  for (const site of SITES) {
    if (!force && isCacheValid(site)) {
      console.log(`  = ${site.id} (ya descargado)`)
      rows.push(summary(site, JSON.parse(readFileSync(cachePath(site.id), 'utf8'))))
      continue
    }
    try {
      const out = {
        source: 'JPL Horizons (NASA/JPL), https://ssd.jpl.nasa.gov/horizons/',
        fetchedAt: new Date().toISOString(),
        site: { id: site.id, lat: site.lat, lon: site.lon },
        start: START,
        stepHours: STEP_HOURS,
        query: queryParams(site, '<10 | 399>'),
      }
      for (const body of BODIES) {
        const r = await fetchBody(site, body)
        if (r.az.length !== SAMPLES) {
          throw new Error(`${body.label}: llegaron ${r.az.length} muestras y se esperaban ${SAMPLES}`)
        }
        out.apiVersion = r.version
        out[body.key] = { az: r.az, el: r.el }
        console.log(`  ↓ ${site.id} · ${body.label}: ${r.first} → ${r.last}`)
        await sleep(PAUSE_MS)
      }
      writeFileSync(cachePath(site.id), JSON.stringify(out) + '\n')
      rows.push(summary(site, out))
    } catch (err) {
      failed++
      console.error(`  ✗ ${err.message}`)
    }
  }

  console.log()
  console.table(rows)
  if (failed) {
    console.error(`\n${failed} sitio(s) fallaron. Vuelve a correr \`npm run horizons\` para reintentar.`)
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

main()
