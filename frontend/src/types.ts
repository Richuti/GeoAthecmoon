// Contrato de datos entre el backend (Python) y el frontend.
// Documentado en docs/CONTRATO_DATOS.md. Si cambias algo aquí, actualiza ese archivo.

export type SiteCategory = 'artemis' | 'clps' | 'apollo' | 'international' | 'custom'

export interface Site {
  id: string
  name: string
  /** Latitud selenográfica en grados (negativa = sur) */
  lat: number
  /** Longitud este en grados, de 0 a 360 */
  lon: number
  category: SiteCategory
  description?: string
}

/** GET /sites */
export interface SitesResponse {
  sites: Site[]
  mock?: boolean
}

/** Posiciones de un cuerpo (Sol o Tierra) vistas desde el sitio, una por muestra de tiempo. */
export interface BodyTrack {
  /** Azimut en grados desde el norte, en sentido horario (0 = N, 90 = E) */
  az: number[]
  /** Elevación aparente en grados sobre el horizonte matemático (sin relieve) */
  el: number[]
}

/** Elevación del relieve que tapa el cielo en cada dirección. */
export interface HorizonMask {
  /** Separación entre muestras de azimut en grados (1 = 360 valores) */
  azimuthStepDeg: number
  /** Elevación del horizonte topográfico en grados, empezando en 0° (N) y en sentido horario */
  elevationDeg: number[]
}

/** Pendiente del terreno en el punto de alunizaje (calculada del DEM). */
export interface Slope {
  /** Pendiente en el punto exacto, en grados */
  atSiteDeg: number
  /** Pendiente máxima en un radio de 100 m, en grados */
  max100mDeg: number
}

/** Recorte del DEM alrededor del sitio para la vista 3D. */
export interface Terrain {
  /** Muestras por lado (la malla es size × size) */
  size: number
  /** Ancho del recorte en km (el sitio queda en el centro) */
  extentKm: number
  /** Alturas en metros, fila por fila. Fila 0 = borde norte, columna 0 = borde oeste */
  heightsM: number[]
}

/** GET /sites/{id} */
export interface SiteData {
  site: Site
  /** Fecha y hora UTC (ISO 8601) de la primera muestra */
  start: string
  /** Horas entre muestras */
  stepHours: number
  horizon: HorizonMask
  slope: Slope
  sun: BodyTrack
  earth: BodyTrack
  /** Opcional: si no viene, la vista 3D usa un plano */
  terrain?: Terrain
  /** true cuando son datos de prueba */
  mock?: boolean
}
