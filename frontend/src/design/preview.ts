// TEMPORAL: presets ilustrativos del módulo para la vista previa del simulador.
// Se reemplazan por src/sim/lander.ts en la tarea S1. Los cálculos de la tarea 5 ya están en src/lib/.

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
