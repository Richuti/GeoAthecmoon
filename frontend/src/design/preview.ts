// TEMPORAL (paso C0): carga los datos de prueba y hace cálculos mínimos para revisar el diseño con
// datos reales del generador. Se reemplaza así:
//   - carga y estado          → ya están en src/api.ts (4.1) y src/state (4.2)
//   - luz, contacto, viabilidad → src/lib/ (tarea 5), con interpolación y pruebas
//   - presets del módulo       → src/sim/lander.ts (S1)
// No agregues lógica nueva aquí: va en esos pasos.

import type { SiteData } from '../types'

export interface SitePreview {
  data: SiteData
  lit: boolean[]
  contact: boolean[]
  lightPct: number
  contactPct: number
  slopeScore: number
  viability: number
}

/** Pesos por defecto de la viabilidad (los mismos que propone la tarea 5.4). */
export const WEIGHTS = { light: 0.45, contact: 0.35, slope: 0.2 }

function horizonNearest(h: number[], az: number): number {
  return h[Math.round(((az % 360) + 360) % 360) % 360]
}

export function buildPreview(data: SiteData): SitePreview {
  const h = data.horizon.elevationDeg
  const lit = data.sun.el.map((el, i) => el > horizonNearest(h, data.sun.az[i]))
  const contact = data.earth.el.map((el, i) => el > horizonNearest(h, data.earth.az[i]))
  const pct = (flags: boolean[]) => (100 * flags.filter(Boolean).length) / flags.length
  const s = data.slope.max100mDeg
  const slopeScore = s <= 5 ? 100 : s >= 10 ? 0 : (100 * (10 - s)) / 5
  const lightPct = pct(lit)
  const contactPct = pct(contact)
  return {
    data,
    lit,
    contact,
    lightPct,
    contactPct,
    slopeScore,
    viability: WEIGHTS.light * lightPct + WEIGHTS.contact * contactPct + WEIGHTS.slope * slopeScore,
  }
}

/** Muestras hasta que la bandera cambia, o null si no cambia en lo que queda del periodo. */
export function stepsUntilChange(flags: boolean[], i: number): number | null {
  for (let k = i + 1; k < flags.length; k++) if (flags[k] !== flags[i]) return k - i
  return null
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const timeFmt = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })

export function sampleDate(data: SiteData, i: number): Date {
  return new Date(Date.parse(data.start) + i * data.stepHours * 3600_000)
}

export function formatDate(d: Date): string {
  return dateFmt.format(d).replace('.', '')
}

export function formatTime(d: Date): string {
  return timeFmt.format(d)
}

export function formatDuration(hours: number): string {
  const d = Math.floor(hours / 24)
  const h = Math.round(hours % 24)
  if (d === 0) return `${h} h`
  return h === 0 ? `${d} d` : `${d} d ${h} h`
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
