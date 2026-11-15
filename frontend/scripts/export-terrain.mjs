#!/usr/bin/env node
// Exporta el relieve de cada sitio para modelarlo en Blender.
//
//   npm run export-terrain
//
// Lee public/data/sites/{id}.json (el mismo `terrain.heightsM` con que la app calcula la luz y el
// horizonte) y escribe en assets-src/terrain/:
//
//   {id}.obj   malla lista para importar: 1 unidad = 1 km, Y arriba, norte hacia -Z, este hacia +X.
//              El sitio queda en (0, 0, 0). Lleva UVs y normales. El objeto se llama `Ground`.
//   {id}.png   mapa de alturas en escala de grises de 16 bits, 1024 × 1024, con el norte arriba.
//              Negro = altura mínima y blanco = máxima. Está suavizado con interpolación bicúbica, que
//              pasa exactamente por los puntos originales: la forma es la misma.
//   {id}.json  escalas exactas (alturas mínima, máxima y del sitio) y valores para el modificador Displace.
//
// Instrucciones para Blender: assets-src/terrain/README.md

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITES_DIR = join(ROOT, 'public', 'data', 'sites')
const OUT_DIR = join(ROOT, 'assets-src', 'terrain')

const PNG_SIZE = 1024

// ---------------------------------------------------------------------------
// Lectura del terreno
// ---------------------------------------------------------------------------

function loadSites() {
  return readdirSync(SITES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(SITES_DIR, f), 'utf8')))
    .filter((d) => {
      if (!d.terrain) console.warn(`⚠ ${d.site.id}: no tiene terrain, se salta.`)
      return Boolean(d.terrain)
    })
}

/** Altura (m) en la fila y columna dadas. Fila 0 = norte, columna 0 = oeste. */
function heightAt(t, row, col) {
  const r = Math.max(0, Math.min(t.size - 1, row))
  const c = Math.max(0, Math.min(t.size - 1, col))
  return t.heightsM[r * t.size + c]
}

/** Altura bilineal en coordenadas de malla fraccionarias (igual que el script de datos). */
function bilinear(t, fr, fc) {
  const r0 = Math.min(Math.floor(fr), t.size - 2)
  const c0 = Math.min(Math.floor(fc), t.size - 2)
  const tr = fr - r0
  const tc = fc - c0
  const top = heightAt(t, r0, c0) + (heightAt(t, r0, c0 + 1) - heightAt(t, r0, c0)) * tc
  const bottom = heightAt(t, r0 + 1, c0) + (heightAt(t, r0 + 1, c0 + 1) - heightAt(t, r0 + 1, c0)) * tc
  return top + (bottom - top) * tr
}

/** Interpolación Catmull-Rom: suave y pasa exactamente por los puntos originales. */
function catmullRom(p0, p1, p2, p3, t) {
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t)
}

function bicubic(t, fr, fc) {
  const r = Math.floor(fr)
  const c = Math.floor(fc)
  const cols = []
  for (let i = -1; i <= 2; i++) {
    cols.push(
      catmullRom(
        heightAt(t, r + i, c - 1),
        heightAt(t, r + i, c),
        heightAt(t, r + i, c + 1),
        heightAt(t, r + i, c + 2),
        fc - c,
      ),
    )
  }
  return catmullRom(cols[0], cols[1], cols[2], cols[3], fr - r)
}

// ---------------------------------------------------------------------------
// OBJ
// ---------------------------------------------------------------------------

/**
 * Malla Y arriba (convención OBJ). El importador de Blender la pasa a Z arriba con el norte en +Y;
 * al exportar a glTF con "+Y Up" vuelve a quedar con el norte en -Z, como espera la app.
 */
function buildObj(data, siteHeightM) {
  const t = data.terrain
  const n = t.size
  const cellKm = t.extentKm / (n - 1)
  const half = t.extentKm / 2
  const y = (row, col) => (heightAt(t, row, col) - siteHeightM) / 1000

  const lines = [
    `# GEOATHECMOON · terreno de ${data.site.name} (${data.site.id})`,
    `# ${n} × ${n} puntos sobre ${t.extentKm} km. 1 unidad = 1 km. Y arriba, norte = -Z, este = +X.`,
    `# El sitio está en (0, 0, 0). Alturas relativas al sitio (${siteHeightM.toFixed(1)} m).`,
    `# Fuente del terreno: ${data.sources?.terrain ?? 'desconocida'}. No cambies la forma grande: de ella salen la luz y el horizonte.`,
    'o Ground',
  ]

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x = -half + col * cellKm
      const z = -half + row * cellKm // fila 0 = norte = -Z
      lines.push(`v ${x.toFixed(4)} ${y(row, col).toFixed(5)} ${z.toFixed(4)}`)
    }
  }
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      lines.push(`vt ${(col / (n - 1)).toFixed(5)} ${(1 - row / (n - 1)).toFixed(5)}`)
    }
  }
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      // Gradiente por diferencias centrales; z crece hacia el sur.
      const dx = (y(row, col + 1) - y(row, col - 1)) / ((Math.min(col + 1, n - 1) - Math.max(col - 1, 0)) * cellKm)
      const dz = (y(row + 1, col) - y(row - 1, col)) / ((Math.min(row + 1, n - 1) - Math.max(row - 1, 0)) * cellKm)
      const len = Math.hypot(dx, 1, dz)
      lines.push(`vn ${(-dx / len).toFixed(5)} ${(1 / len).toFixed(5)} ${(-dz / len).toFixed(5)}`)
    }
  }
  lines.push('s 1')
  // Dos triángulos por celda, en sentido antihorario visto desde arriba (+Y), así la normal apunta arriba.
  const idx = (row, col) => row * n + col + 1
  const f = (...ids) => `f ${ids.map((i) => `${i}/${i}/${i}`).join(' ')}`
  for (let row = 0; row < n - 1; row++) {
    for (let col = 0; col < n - 1; col++) {
      const a = idx(row, col)
      const b = idx(row, col + 1)
      const c = idx(row + 1, col)
      const d = idx(row + 1, col + 1)
      lines.push(f(a, c, b), f(b, c, d))
    }
  }
  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// PNG de 16 bits (sin dependencias)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** PNG en escala de grises de 16 bits a partir de valores 0..65535, fila 0 arriba. */
function encodePng16(width, height, values) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 16 // profundidad de bits
  ihdr[9] = 0 // escala de grises
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const stride = width * 2 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0 // sin filtro
    for (let x = 0; x < width; x++) raw.writeUInt16BE(values[y * width + x], y * stride + 1 + x * 2)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function buildHeightmap(t, minM, maxM) {
  const values = new Uint16Array(PNG_SIZE * PNG_SIZE)
  const span = maxM - minM || 1
  for (let py = 0; py < PNG_SIZE; py++) {
    // Centro de cada píxel, mapeado a coordenadas de la malla (fila 0 = norte = arriba).
    const fr = ((py + 0.5) / PNG_SIZE) * (t.size - 1)
    for (let px = 0; px < PNG_SIZE; px++) {
      const fc = ((px + 0.5) / PNG_SIZE) * (t.size - 1)
      const h = Math.max(minM, Math.min(maxM, bicubic(t, fr, fc)))
      values[py * PNG_SIZE + px] = Math.round(((h - minM) / span) * 65535)
    }
  }
  return encodePng16(PNG_SIZE, PNG_SIZE, values)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const rows = []

  for (const data of loadSites()) {
    const t = data.terrain
    if (t.heightsM.length !== t.size * t.size) {
      throw new Error(`${data.site.id}: heightsM tiene ${t.heightsM.length} valores y se esperaban ${t.size ** 2}`)
    }
    const id = data.site.id
    const minM = Math.min(...t.heightsM)
    const maxM = Math.max(...t.heightsM)
    // Altura del sitio: centro exacto de la malla, interpolado igual que en el cálculo del horizonte.
    const siteHeightM = bilinear(t, (t.size - 1) / 2, (t.size - 1) / 2)
    const spanM = maxM - minM

    writeFileSync(join(OUT_DIR, `${id}.obj`), buildObj(data, siteHeightM))
    writeFileSync(join(OUT_DIR, `${id}.png`), buildHeightmap(t, minM, maxM))
    writeFileSync(
      join(OUT_DIR, `${id}.json`),
      JSON.stringify(
        {
          id,
          name: data.site.name,
          lat: data.site.lat,
          lon: data.site.lon,
          sources: data.sources ?? null,
          mock: data.mock ?? false,
          grid: { size: t.size, extentKm: t.extentKm, cellM: round((t.extentKm * 1000) / (t.size - 1), 2) },
          heightsM: { min: round(minM, 1), max: round(maxM, 1), site: round(siteHeightM, 1), span: round(spanM, 1) },
          obj: { units: 'km', up: '+Y', north: '-Z', east: '+X', origin: 'sitio, a su altura', object: 'Ground' },
          png: { width: PNG_SIZE, height: PNG_SIZE, bitDepth: 16, black: 'min', white: 'max', north: 'arriba' },
          blenderDisplace: {
            planeSizeKm: t.extentKm,
            strengthKm: round(spanM / 1000, 5),
            midlevel: round((siteHeightM - minM) / (spanM || 1), 5),
            nota: 'Con estos valores, el sitio queda a altura 0 en el centro del plano.',
          },
        },
        null,
        2,
      ) + '\n',
    )

    rows.push({
      sitio: id,
      'mín m': round(minM, 0),
      'máx m': round(maxM, 0),
      'sitio m': round(siteHeightM, 0),
      'desnivel m': round(spanM, 0),
      'Displace fuerza': round(spanM / 1000, 4),
      'Displace nivel medio': round((siteHeightM - minM) / (spanM || 1), 4),
    })
  }

  console.log(`Relieve exportado en ${OUT_DIR}\n`)
  console.table(rows)
}

function round(v, decimals) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

main()
