// Descarga las capas de la Tierra para el despegue desde NASA GIBS (WMS, EPSG:4326).
// Uso: npm run earth-imagery   (se puede repetir; sobrescribe public/textures/flight/earth-*.jpg)
// Las capas y sus recuadros están en src/sim/earthImagery.ts.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EARTH_LAYERS, gibsUrl } from '../src/sim/earthImagery.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

for (const layer of EARTH_LAYERS) {
  const out = join(root, layer.url)
  await mkdir(dirname(out), { recursive: true })
  let lastError
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(gibsUrl(layer))
      const type = res.headers.get('content-type') ?? ''
      if (!res.ok || !type.startsWith('image/')) throw new Error(`HTTP ${res.status} ${type}`)
      const bytes = Buffer.from(await res.arrayBuffer())
      await writeFile(out, bytes)
      console.log(`${layer.id}: ${layer.gibsLayer}, ±${layer.halfKm} km, ${(bytes.length / 1e6).toFixed(1)} MB → ${layer.url}`)
      lastError = undefined
      break
    } catch (error) {
      lastError = error
      console.warn(`${layer.id}: intento ${attempt} falló (${error.message})`)
    }
  }
  if (lastError) { console.error(`No se pudo descargar ${layer.id}.`); process.exitCode = 1 }
}
