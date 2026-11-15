// Capas de imágenes de la Tierra para el despegue, de la más amplia a la más cercana.
// Cada una cubre un cuadrado de ±halfKm alrededor de la plataforma, en latitud y longitud (EPSG:4326),
// y se funde con la anterior en su borde. Así el suelo nunca se acaba mientras la nave sube.
// Las descarga `npm run earth-imagery` desde NASA GIBS; son ilustración, ningún dato sale de ellas.

/** Complejo de lanzamiento 39A, Centro Espacial Kennedy (grados; longitud oeste negativa). */
export const LAUNCH_SITE = { latDeg: 28.6084, lonDeg: -80.6043 } as const

const EARTH_RADIUS_KM = 6371
const KM_PER_DEG = (Math.PI * EARTH_RADIUS_KM) / 180

export interface GeoBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface EarthLayer {
  id: string
  /** Ruta pública de la imagen. */
  url: string
  /** Capa de NASA GIBS (WMS, EPSG:4326). */
  gibsLayer: string
  halfKm: number
  sizePx: number
  bounds: GeoBounds
}

/** Cuadrado de ±halfKm alrededor de un punto, en grados. La longitud se ensancha con 1/cos(latitud). */
export function boundsAround(latDeg: number, lonDeg: number, halfKm: number): GeoBounds {
  if (!(halfKm > 0) || Math.abs(latDeg) >= 89) throw new RangeError('Extensión o latitud no válidas.')
  const dLat = halfKm / KM_PER_DEG
  const dLon = halfKm / (KM_PER_DEG * Math.cos((latDeg * Math.PI) / 180))
  return { west: lonDeg - dLon, south: latDeg - dLat, east: lonDeg + dLon, north: latDeg + dLat }
}

function layer(id: string, gibsLayer: string, halfKm: number, sizePx: number): EarthLayer {
  return { id, url: `/textures/flight/earth-${id}.jpg`, gibsLayer, halfKm, sizePx, bounds: boundsAround(LAUNCH_SITE.latDeg, LAUNCH_SITE.lonDeg, halfKm) }
}

/** De la más amplia a la más cercana; la imagen NAIP de Kennedy (10 km) va encima de todas. */
export const EARTH_LAYERS: readonly EarthLayer[] = [
  layer('region', 'BlueMarble_NextGeneration', 2000, 4096), // unos 980 m por píxel: Florida, el Golfo y el Caribe
  // Blue Marble también aquí: Landsat WELD deja huecos negros sobre el océano a esta escala.
  layer('state', 'BlueMarble_NextGeneration', 450, 2048), // unos 440 m por píxel, cerca de sus 500 m nativos
  layer('coast', 'Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual', 80, 4096), // unos 39 m por píxel
]

/** Petición WMS 1.1.1 a NASA GIBS (BBOX en longitud, latitud). */
export function gibsUrl(l: EarthLayer): string {
  const b = l.bounds
  const q = new URLSearchParams({
    SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.1.1', LAYERS: l.gibsLayer, STYLES: '', SRS: 'EPSG:4326',
    BBOX: [b.west, b.south, b.east, b.north].map((v) => v.toFixed(5)).join(','),
    WIDTH: String(l.sizePx), HEIGHT: String(l.sizePx), FORMAT: 'image/jpeg',
  })
  return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${q}`
}

/** Límites en radianes (oeste, sur, este, norte), como los usa el sombreador. */
export function boundsRad(b: GeoBounds): [number, number, number, number] {
  const k = Math.PI / 180
  return [b.west * k, b.south * k, b.east * k, b.north * k]
}

/**
 * earth.glb trae la geografía en espejo (la textura queda reflejada vista desde fuera). Al cargarlo se
 * refleja en X (`mirrorEarthModel`), y desde ahí vale la convención geográfica correcta (mano derecha):
 * x = −cos(lat)·sen(lon), y = sen(lat), z = −cos(lat)·cos(lon). Este = −X en lon 0, norte = +Y.
 */
export function earthDirection(latDeg: number, lonDeg: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return [-Math.cos(lat) * Math.sin(lon), Math.sin(lat), -Math.cos(lat) * Math.cos(lon)]
}

/** Dirección del norte local (tangente) en (lat, lon), con la misma convención. */
export function earthNorth(latDeg: number, lonDeg: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return [Math.sin(lat) * Math.sin(lon), Math.cos(lat), Math.sin(lat) * Math.cos(lon)]
}

/** Dirección del este local (tangente) en (lat, lon), con la misma convención. */
export function earthEast(lonDeg: number): [number, number, number] {
  const lon = (lonDeg * Math.PI) / 180
  return [-Math.cos(lon), 0, Math.sin(lon)]
}

/** Inversa de earthDirection, en grados (longitud entre −180 y 180). El sombreador hace lo mismo por fragmento. */
export function latLonOf(x: number, y: number, z: number): { latDeg: number; lonDeg: number } {
  const r = Math.hypot(x, y, z)
  return { latDeg: (Math.asin(y / r) * 180) / Math.PI, lonDeg: (Math.atan2(-x, -z) * 180) / Math.PI }
}
