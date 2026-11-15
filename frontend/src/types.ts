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
  /** Opcional: distancia del sitio al cuerpo en km (da el tamaño aparente del disco y los eclipses) */
  distKm?: number[]
}

/** Elevación del relieve que tapa el cielo en cada dirección. */
export interface HorizonMask {
  /** Separación entre muestras de azimut en grados (1 = 360 valores) */
  azimuthStepDeg: number
  /** Elevación del horizonte topográfico en grados, empezando en 0° (N) y en sentido horario */
  elevationDeg: number[]
  /** Opcional: distancia en km al punto del relieve que limita el horizonte, uno por azimut */
  distanceKm?: number[]
  /** Opcional: altura de ese punto respecto del suelo del sitio, en metros (ya sin la curvatura lunar) */
  obstacleHeightM?: number[]
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

/** De dónde salió cada parte de los datos. La app lo muestra en el panel de fuentes. */
export interface DataSources {
  /** Posiciones del Sol y la Tierra: 'jpl-horizons' (NASA/JPL) o 'model' (modelo simplificado) */
  ephemeris: 'jpl-horizons' | 'model'
  /** Terreno, horizonte y pendiente: 'lola' (DEM LOLA, Moon Trek) o 'synthetic' (de prueba) */
  terrain: 'lola' | 'synthetic'
}

/** Una antena de la Red de Espacio Profundo (DSN) de NASA y la elevación de la Luna vista desde ella. */
export interface DsnStation {
  id: string
  name: string
  /** Antena de referencia del complejo, por ejemplo DSS-14 */
  antenna: string
  /** Elevación del centro de la Luna sobre el horizonte de la estación, en grados, una por muestra */
  el: number[]
}

/** Visibilidad de la Luna desde la DSN (JPL Horizons). */
export interface DsnData {
  /** Elevación mínima para poder enlazar, en grados */
  minElevationDeg: number
  stations: DsnStation[]
}

/** Valor publicado por NASA en el sitio, para comparar con nuestro cálculo. */
export interface IlluminationReference {
  /** Producto de NASA (mapas de iluminación del equipo LOLA) */
  source: string
  /** Periodo que promedia el producto */
  period: string
  /** Regla de visibilidad del producto */
  rule: string
  /** % del tiempo con alguna parte del Sol a la vista */
  sunPct: number
  /** % del tiempo con alguna parte de la Tierra a la vista */
  earthPct: number
  /** Opcional: horizonte del sitio con el observador a ras de suelo (0 m), para comparar con la misma regla */
  groundHorizonDeg?: number[]
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
  /** Opcional: origen de los datos. Si no viene, la app no muestra la fuente */
  sources?: DataSources
  /** Opcional: la Luna vista desde las estaciones de la DSN, con las mismas muestras de tiempo */
  dsn?: DsnData
  /** Opcional: iluminación publicada por NASA en el sitio (validación) */
  reference?: IlluminationReference
  /** true cuando son datos de prueba */
  mock?: boolean
}
