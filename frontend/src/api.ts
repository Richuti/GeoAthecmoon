// Cliente de datos: lista de sitios y datos completos de cada sitio.
//
// - Si VITE_API_URL tiene valor, pide al backend: GET {VITE_API_URL}/sites y GET {VITE_API_URL}/sites/{id}.
// - Si está vacío (lo normal, también en Vercel), lee los archivos estáticos /data/sites.json y
//   /data/sites/{id}.json. Hoy son datos reales (LOLA + JPL Horizons) que generan `npm run mock` o
//   `python backend/export.py`; si algún sitio trae datos de prueba, `dataNotice` lo dice.
//
// Valida cada respuesta contra el contrato (docs/CONTRATO_DATOS.md) y explica qué está mal si algo no cuadra.

import type { Site, SiteCategory, SiteData, SitesResponse } from './types'

// `env` lo pone Vite; en las pruebas de Node no existe, y entonces se leen los archivos estáticos.
const env = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env
const API_URL = (env?.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

/** true cuando la app lee los archivos estáticos de public/data en lugar de un servidor. */
export const usingLocalData = API_URL === ''

const CATEGORIES: readonly SiteCategory[] = ['artemis', 'clps', 'apollo', 'international', 'custom']

/** Error de carga o de formato, con un mensaje pensado para mostrarse en la interfaz. */
export class DataError extends Error {
  readonly url: string
  readonly problems: string[]

  constructor(message: string, url: string, problems: string[] = []) {
    super(message)
    this.name = 'DataError'
    this.url = url
    this.problems = problems
  }
}

function sitesUrl(): string {
  return usingLocalData ? '/data/sites.json' : `${API_URL}/sites`
}

function siteUrl(id: string): string {
  const safe = encodeURIComponent(id)
  return usingLocalData ? `/data/sites/${safe}.json` : `${API_URL}/sites/${safe}`
}

const MOCK_HINT = ' Para generar los archivos de public/data, corre `npm run mock` en frontend/.'

/**
 * Aviso para la interfaz cuando los datos de un sitio no son reales, o null si lo son.
 * Son reales solo si no traen `mock: true` y `sources` dice JPL Horizons y LOLA.
 */
export function dataNotice(d: Pick<SiteData, 'mock' | 'sources'>): string | null {
  const s = d.sources
  const fake: string[] = []
  if (!s || s.ephemeris !== 'jpl-horizons') fake.push('el Sol y la Tierra')
  if (!s || s.terrain !== 'lola') fake.push('el relieve')
  if (fake.length) {
    const verb = fake.length === 1 && fake[0] === 'el relieve' ? 'no es real' : 'no son reales'
    return `Datos de prueba: ${fake.join(' ni ')} de este sitio ${verb}. No uses estos resultados.`
  }
  if (d.mock) return 'Datos de prueba: este sitio está marcado como no real. No uses estos resultados.'
  return null
}

async function getJson(url: string): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new DataError(
      usingLocalData
        ? `No se pudo leer ${url}.`
        : `No se pudo conectar con el backend (${API_URL}). Revisa que esté encendido y que VITE_API_URL sea correcta.`,
      url,
    )
  }
  if (!res.ok) {
    const what = res.status === 404 ? `No existe ${url} (404).` : `El servidor respondió ${res.status} al pedir ${url}.`
    throw new DataError(what + (usingLocalData ? MOCK_HINT : ''), url)
  }
  try {
    return await res.json()
  } catch {
    // En desarrollo, Vite responde index.html (no JSON) cuando falta un archivo de public/.
    throw new DataError(`La respuesta de ${url} no es JSON válido.` + (usingLocalData ? MOCK_HINT : ''), url)
  }
}

// ---------------------------------------------------------------------------
// Validación del contrato
// ---------------------------------------------------------------------------

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isNumArray = (v: unknown): v is number[] => Array.isArray(v) && v.every(isNum)

/** Revisa un sitio y devuelve los problemas encontrados (vacío si está bien). */
function siteProblems(s: unknown, where: string): string[] {
  if (typeof s !== 'object' || s === null) return [`${where} no es un objeto.`]
  const o = s as Record<string, unknown>
  const p: string[] = []
  if (typeof o.id !== 'string' || !o.id) p.push(`${where}.id falta o no es texto.`)
  if (typeof o.name !== 'string' || !o.name) p.push(`${where}.name falta o no es texto.`)
  if (!isNum(o.lat) || o.lat < -90 || o.lat > 90) p.push(`${where}.lat debe ser un número entre -90 y 90.`)
  if (!isNum(o.lon) || o.lon < 0 || o.lon > 360) p.push(`${where}.lon debe ser longitud este, entre 0 y 360.`)
  if (!CATEGORIES.includes(o.category as SiteCategory)) {
    p.push(`${where}.category debe ser una de: ${CATEGORIES.join(', ')}.`)
  }
  return p
}

export function validateSites(json: unknown): string[] {
  if (typeof json !== 'object' || json === null || !Array.isArray((json as SitesResponse).sites)) {
    return ['La respuesta no tiene la forma { "sites": [...] }.']
  }
  const sites = (json as SitesResponse).sites
  const p = sites.flatMap((s, i) => siteProblems(s, `sites[${i}]`))
  const ids = sites.map((s) => s?.id)
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dup.length) p.push(`Hay ids repetidos: ${[...new Set(dup)].join(', ')}.`)
  return p
}

export function validateSiteData(json: unknown, expectedId?: string): string[] {
  if (typeof json !== 'object' || json === null) return ['La respuesta no es un objeto.']
  const d = json as Partial<SiteData> & Record<string, unknown>
  const p: string[] = siteProblems(d.site, 'site')
  if (expectedId && d.site?.id !== expectedId) p.push(`site.id es "${d.site?.id}" y se pidió "${expectedId}".`)

  if (typeof d.start !== 'string' || Number.isNaN(Date.parse(d.start))) p.push('start debe ser una fecha ISO 8601 en UTC.')
  if (!isNum(d.stepHours) || d.stepHours <= 0) p.push('stepHours debe ser un número mayor que 0.')

  const h = d.horizon
  if (!h || !isNum(h.azimuthStepDeg) || h.azimuthStepDeg <= 0 || !isNumArray(h.elevationDeg)) {
    p.push('horizon debe tener azimuthStepDeg (> 0) y elevationDeg (lista de números).')
  } else {
    const expected = Math.round(360 / h.azimuthStepDeg)
    if (h.elevationDeg.length !== expected) {
      p.push(`horizon.elevationDeg tiene ${h.elevationDeg.length} valores y deberían ser ${expected} (360 / ${h.azimuthStepDeg}).`)
    }
  }

  if (!d.slope || !isNum(d.slope.atSiteDeg) || !isNum(d.slope.max100mDeg)) {
    p.push('slope debe tener atSiteDeg y max100mDeg (números).')
  }

  let samples = -1
  for (const key of ['sun', 'earth'] as const) {
    const b = d[key]
    if (!b || !isNumArray(b.az) || !isNumArray(b.el)) {
      p.push(`${key} debe tener az y el (listas de números).`)
      continue
    }
    if (b.az.length === 0) p.push(`${key} no tiene muestras.`)
    if (b.az.length !== b.el.length) p.push(`${key}.az tiene ${b.az.length} valores y ${key}.el tiene ${b.el.length}.`)
    if (samples >= 0 && b.el.length !== samples) p.push(`sun y earth tienen distinta cantidad de muestras (${samples} y ${b.el.length}).`)
    samples = b.el.length
    if (b.az.some((a) => a < 0 || a > 360)) p.push(`${key}.az tiene valores fuera de 0–360.`)
    if (b.distKm !== undefined && (!isNumArray(b.distKm) || b.distKm.length !== b.el.length || b.distKm.some((x) => x <= 0))) {
      p.push(`${key}.distKm debe tener una distancia positiva por muestra (${b.el.length}).`)
    }
  }

  // Campos opcionales: si vienen, tienen que tener el largo correcto.
  if (h && isNumArray(h.elevationDeg)) {
    for (const key of ['distanceKm', 'obstacleHeightM'] as const) {
      const v = h[key]
      if (v !== undefined && (!isNumArray(v) || v.length !== h.elevationDeg.length)) {
        p.push(`horizon.${key} debe tener un valor por azimut (${h.elevationDeg.length}).`)
      }
    }
  }
  const dsn = d.dsn
  if (dsn !== undefined) {
    if (!isNum(dsn.minElevationDeg) || !Array.isArray(dsn.stations)) {
      p.push('dsn debe tener minElevationDeg y stations.')
    } else if (dsn.stations.some((s) => typeof s?.id !== 'string' || !isNumArray(s.el) || (samples >= 0 && s.el.length !== samples))) {
      p.push(`cada estación de dsn debe tener id y una elevación por muestra (${samples}).`)
    }
  }
  const ref = d.reference
  if (ref !== undefined && (!isNum(ref.sunPct) || !isNum(ref.earthPct))) p.push('reference debe tener sunPct y earthPct (números).')

  const t = d.terrain
  if (t !== undefined) {
    if (!isNum(t.size) || t.size < 2 || !isNum(t.extentKm) || t.extentKm <= 0 || !isNumArray(t.heightsM)) {
      p.push('terrain debe tener size (≥ 2), extentKm (> 0) y heightsM (lista de números).')
    } else if (t.heightsM.length !== t.size * t.size) {
      p.push(`terrain.heightsM tiene ${t.heightsM.length} valores y deberían ser ${t.size * t.size} (${t.size} × ${t.size}).`)
    }
  }
  return p
}

function invalid(url: string, problems: string[]): DataError {
  const shown = problems.slice(0, 3).join(' ')
  const more = problems.length > 3 ? ` (y ${problems.length - 3} problema(s) más)` : ''
  return new DataError(`Los datos de ${url} no cumplen el contrato: ${shown}${more}`, url, problems)
}

// ---------------------------------------------------------------------------
// API pública (con caché en memoria)
// ---------------------------------------------------------------------------

const cache = new Map<string, Promise<unknown>>()

/** Pide una vez y comparte el resultado. Si falla, se olvida para poder reintentar. */
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit) return hit as Promise<T>
  const promise = load().catch((err: unknown) => {
    cache.delete(key)
    throw err
  })
  cache.set(key, promise)
  return promise
}

/** Lista de sitios. */
export function getSites(): Promise<SitesResponse> {
  const url = sitesUrl()
  return cached(url, async () => {
    const json = await getJson(url)
    const problems = validateSites(json)
    if (problems.length) throw invalid(url, problems)
    return json as SitesResponse
  })
}

/** Datos completos de un sitio: horizonte, pendiente, Sol, Tierra y terreno. */
export function getSiteData(id: string): Promise<SiteData> {
  const url = siteUrl(id)
  return cached(url, async () => {
    const json = await getJson(url)
    const problems = validateSiteData(json, id)
    if (problems.length) throw invalid(url, problems)
    return json as SiteData
  })
}

/** Datos de todos los sitios de la lista (para comparar y recomendar). */
export async function getAllSiteData(sites: Site[]): Promise<SiteData[]> {
  return Promise.all(sites.map((s) => getSiteData(s.id)))
}

/** Borra la caché (por ejemplo, para un botón "Reintentar"). */
export function clearDataCache(): void {
  cache.clear()
}
