// Recursos existentes, sin generar geometría. Ejecutar: node scripts/fetch-launch-detail.mjs
import { writeFile } from 'node:fs/promises'
import { boundsAround, LAUNCH_SITE } from '../src/sim/earthImagery.ts'

const b = boundsAround(LAUNCH_SITE.latDeg, LAUNCH_SITE.lonDeg, .6)
const params = new URLSearchParams({
  bbox: [b.west, b.south, b.east, b.north].join(','), bboxSR: '4326', imageSR: '4326',
  size: '2048,2048', format: 'jpg', compressionQuality: '92', bandIds: '0,1,2',
  adjustAspectRatio: 'false', interpolation: 'RSP_BilinearInterpolation', f: 'image',
})
const assets = [
  ['textures/flight/kennedy-pad-naip.jpg', `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?${params}`, 'image/'],
  ['models/launch_gantry.glb', 'https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/gantry/Gantry.glb', null],
]
for (const [file, url, type] of assets) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok || (type && !res.headers.get('content-type')?.startsWith(type))) throw new Error(`Respuesta inválida: ${file} (${res.status})`)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (file.endsWith('.glb') && bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('El archivo NASA no es un GLB.')
  await writeFile(new URL(`../public/${file}`, import.meta.url), bytes)
  console.log(`${file}: ${bytes.length} bytes`)
}
