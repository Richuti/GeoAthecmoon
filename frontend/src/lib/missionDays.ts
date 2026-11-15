export interface MissionDay {
  /** Horas desde el inicio de la misión, no desde la medianoche UTC. */
  offset: number
  hours: number
  lightHours: number
  contactHours: number
}

/** Suma condiciones por bloques de 24 h, dividiendo muestras que cruzan un límite. */
export function missionDays(lit: boolean[], contact: boolean[], from: number, to: number, stepHours: number): MissionDay[] {
  if (!Number.isFinite(stepHours) || stepHours <= 0 || to <= from) return []
  const total = (to - from) * stepHours
  const days: MissionDay[] = Array.from({ length: Math.ceil(total / 24) }, (_, d) => ({ offset: d * 24, hours: Math.min(24, total - d * 24), lightHours: 0, contactHours: 0 }))
  for (let i = from; i < to; i++) {
    const begin = (i - from) * stepHours
    const end = begin + stepHours
    for (let d = Math.floor(begin / 24); d < days.length && days[d].offset < end; d++) {
      const hours = Math.min(end, days[d].offset + days[d].hours) - Math.max(begin, days[d].offset)
      if (lit[i]) days[d].lightHours += hours
      if (contact[i]) days[d].contactHours += hours
    }
  }
  return days
}
