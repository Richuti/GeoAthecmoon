// TEMPORAL (paso C0): carga los datos de prueba y hace cálculos mínimos para revisar el diseño con
// datos reales del generador. Se reemplaza así:
//   - carga y estado          → ya están en src/api.ts (4.1) y src/state (4.2)
//   - luz, contacto, viabilidad → ya están en src/lib/ (5.1–5.4); falta la recomendación (5.5)
//   - presets del módulo       → src/sim/lander.ts (S1)
// No agregues lógica nueva aquí: va en esos pasos.

import { siteViability, type ViabilityResult } from '../lib/viability'
import { visibility } from '../lib/visibility'
import type { SiteData } from '../types'

export interface SitePreview {
  data: SiteData
  lit: boolean[]
  contact: boolean[]
  lightPct: number
  contactPct: number
  /** Viabilidad del periodo completo (puntaje, factores, resumen y avisos) */
  result: ViabilityResult
  /** Atajo: result.score */
  viability: number
}

export function buildPreview(data: SiteData): SitePreview {
  const vis = visibility(data)
  const result = siteViability(data, vis)
  return { data, ...vis, result, viability: result.score }
}

// ---------------------------------------------------------------------------
// Presets ilustrativos del módulo (se mueven a src/sim/lander.ts en S1)
// ---------------------------------------------------------------------------

export interface LanderPreview {
  panelPeakW: number
  batteryKWh: number
  baseLoadW: number
  instrumentLoadW: number
  dataPerDayMb: number
  downlinkMbPerHour: number
  missionDays: number
}

export const PRESETS = {
  light: { label: 'Explorador ligero', config: { panelPeakW: 300, batteryKWh: 3, baseLoadW: 60, instrumentLoadW: 90, dataPerDayMb: 1500, downlinkMbPerHour: 400, missionDays: 14 } },
  station: { label: 'Estación científica', config: { panelPeakW: 800, batteryKWh: 10, baseLoadW: 150, instrumentLoadW: 250, dataPerDayMb: 6000, downlinkMbPerHour: 1200, missionDays: 14 } },
  rover: { label: 'Rover corto', config: { panelPeakW: 200, batteryKWh: 1.5, baseLoadW: 40, instrumentLoadW: 120, dataPerDayMb: 800, downlinkMbPerHour: 300, missionDays: 14 } },
} satisfies Record<string, { label: string; config: LanderPreview }>

export type PresetId = keyof typeof PRESETS
