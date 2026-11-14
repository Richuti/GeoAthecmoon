// Modelo del módulo de alunizaje: panel solar, batería, consumos y datos.
//
// Los valores de los presets son ILUSTRATIVOS: no copian ningún módulo real, y la interfaz lo dice.
// La duración de la misión no está aquí: vive en el estado de la app (missionDays) y la comparten
// la viabilidad y el simulador.

/** Irradiancia solar a 1 UA (W/m²). En la Luna no hay atmósfera que la reduzca. */
export const SOLAR_CONSTANT_W_M2 = 1361

/** Eficiencia al cargar la batería: de cada Wh que llega, se guarda el 90 %. */
export const CHARGE_EFFICIENCY = 0.9

/** Eficiencia al descargar: para entregar 1 Wh, la batería pierde 1 / 0.90 Wh. */
export const DISCHARGE_EFFICIENCY = 0.9

/** Profundidad de descarga máxima: la batería nunca baja del 20 %. Llegar a ese mínimo es la falla. */
export const MAX_DEPTH_OF_DISCHARGE = 0.8

/** Nivel mínimo de la batería (fracción de la capacidad). */
export const MIN_SOC = 1 - MAX_DEPTH_OF_DISCHARGE

/** Por encima de este nivel, el módulo sale del modo supervivencia y vuelve a encender los instrumentos. */
export const RECOVERY_SOC = 0.6

export interface LanderConfig {
  /** Área del panel solar (m²) */
  panelAreaM2: number
  /** Eficiencia de las celdas, de 0 a 1 */
  panelEfficiency: number
  /** Capacidad de la batería (kWh) */
  batteryKWh: number
  /** Consumo de supervivencia, siempre encendido: calefactores y computadora (W) */
  baseLoadW: number
  /** Consumo de los instrumentos, solo en modo nominal (W) */
  instrumentLoadW: number
  /** Datos que generan los instrumentos por día, en modo nominal (Mb) */
  dataPerDayMb: number
  /** Velocidad de envío cuando la Tierra es visible (Mb/h) */
  downlinkMbPerHour: number
  /** Por debajo de este nivel (fracción) entra en modo supervivencia. Entre MIN_SOC y RECOVERY_SOC. */
  survivalThreshold: number
}

export type PresetId = 'explorer' | 'station' | 'rover'

export interface Preset {
  id: PresetId
  label: string
  /** Qué tipo de misión representa, en una frase */
  description: string
  config: LanderConfig
}

const DEFAULTS = { panelEfficiency: 0.3, survivalThreshold: 0.4 }

/** Presets ilustrativos y genéricos. */
export const PRESETS: Record<PresetId, Preset> = {
  explorer: {
    id: 'explorer',
    label: 'Explorador ligero',
    description: 'Un módulo chico con pocos instrumentos: poca batería y consumo bajo.',
    config: { ...DEFAULTS, panelAreaM2: 0.75, batteryKWh: 3, baseLoadW: 60, instrumentLoadW: 90, dataPerDayMb: 1500, downlinkMbPerHour: 400 },
  },
  station: {
    id: 'station',
    label: 'Estación científica',
    description: 'Un módulo grande con muchos instrumentos: más panel y batería, pero más consumo y datos.',
    config: { ...DEFAULTS, panelAreaM2: 2, batteryKWh: 10, baseLoadW: 150, instrumentLoadW: 250, dataPerDayMb: 6000, downlinkMbPerHour: 1200 },
  },
  rover: {
    id: 'rover',
    label: 'Rover corto',
    description: 'Un vehículo liviano para pocos días: batería mínima e instrumentos que gastan mucho.',
    config: { ...DEFAULTS, panelAreaM2: 0.5, batteryKWh: 1.5, baseLoadW: 40, instrumentLoadW: 120, dataPerDayMb: 800, downlinkMbPerHour: 300 },
  },
}

export const DEFAULT_PRESET: PresetId = 'explorer'

/** Rangos de los controles de la interfaz (y de la validación). */
export const PARAMETER_RANGES: Record<keyof LanderConfig, { min: number; max: number; step: number }> = {
  panelAreaM2: { min: 0.1, max: 6, step: 0.05 },
  panelEfficiency: { min: 0.1, max: 0.4, step: 0.01 },
  batteryKWh: { min: 0.5, max: 30, step: 0.5 },
  baseLoadW: { min: 10, max: 500, step: 5 },
  instrumentLoadW: { min: 0, max: 800, step: 5 },
  dataPerDayMb: { min: 0, max: 20000, step: 100 },
  downlinkMbPerHour: { min: 10, max: 3000, step: 10 },
  survivalThreshold: { min: 0.25, max: 0.55, step: 0.05 },
}

/** Potencia del panel con el Sol completo a la vista (W): 1361 × área × eficiencia. */
export function panelPeakW(cfg: LanderConfig): number {
  return SOLAR_CONSTANT_W_M2 * cfg.panelAreaM2 * cfg.panelEfficiency
}

/** Consumo en modo nominal: supervivencia + instrumentos (W). */
export function nominalLoadW(cfg: LanderConfig): number {
  return cfg.baseLoadW + cfg.instrumentLoadW
}

/**
 * Horas que aguanta el módulo sin nada de Sol, desde la batería llena hasta el mínimo del 20 %.
 * Funciona en modo nominal hasta el umbral de supervivencia y después solo con el consumo base.
 */
export function autonomyHours(cfg: LanderConfig): number {
  const wh = cfg.batteryKWh * 1000
  const threshold = Math.min(Math.max(cfg.survivalThreshold, MIN_SOC), 1)
  const nominal = ((1 - threshold) * wh * DISCHARGE_EFFICIENCY) / nominalLoadW(cfg)
  const survival = ((threshold - MIN_SOC) * wh * DISCHARGE_EFFICIENCY) / cfg.baseLoadW
  return nominal + survival
}

/**
 * Fracción mínima del tiempo con Sol para que la energía alcance en modo nominal, a largo plazo.
 * Con Sol el panel cubre el consumo y guarda lo que sobra (con pérdidas); sin Sol se descarga (con
 * pérdidas). Devuelve Infinity si el panel no cubre el consumo ni con Sol pleno.
 */
export function minSunFraction(cfg: LanderConfig): number {
  const p = panelPeakW(cfg)
  const load = nominalLoadW(cfg)
  if (p <= load) return Infinity
  const drawInShade = load / DISCHARGE_EFFICIENCY
  const storedInSun = (p - load) * CHARGE_EFFICIENCY
  return drawInShade / (storedInSun + drawInShade)
}

const LABELS: Record<keyof LanderConfig, string> = {
  panelAreaM2: 'El área del panel',
  panelEfficiency: 'La eficiencia del panel',
  batteryKWh: 'La batería',
  baseLoadW: 'El consumo de supervivencia',
  instrumentLoadW: 'El consumo de los instrumentos',
  dataPerDayMb: 'Los datos por día',
  downlinkMbPerHour: 'La velocidad de envío',
  survivalThreshold: 'El umbral de supervivencia',
}

/** Problemas de una configuración, en español. Vacío si es válida. */
export function validateConfig(cfg: LanderConfig): string[] {
  const problems: string[] = []
  for (const key of Object.keys(PARAMETER_RANGES) as Array<keyof LanderConfig>) {
    const v = cfg[key]
    const { min, max } = PARAMETER_RANGES[key]
    if (typeof v !== 'number' || !Number.isFinite(v)) problems.push(`${LABELS[key]} no es un número.`)
    else if (v < min || v > max) problems.push(`${LABELS[key]} debe estar entre ${min} y ${max}.`)
  }
  return problems
}

/** Lleva cada valor a su rango (para configuraciones que vienen de otro lado). */
export function clampConfig(cfg: LanderConfig): LanderConfig {
  const out = { ...cfg }
  for (const key of Object.keys(PARAMETER_RANGES) as Array<keyof LanderConfig>) {
    const { min, max } = PARAMETER_RANGES[key]
    const v = Number.isFinite(out[key]) ? out[key] : min
    out[key] = Math.min(max, Math.max(min, v))
  }
  return out
}
