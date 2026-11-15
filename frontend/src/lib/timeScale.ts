// Escala de tiempo de la reproducción: cuántas horas de datos pasan en cada segundo real.
// Los datos son hora por hora (stepHours = 1), así que la escala más lenta útil es 1 s = 1 hora:
// por debajo solo se repetiría la misma muestra.

import { formatDurationLong } from './time.ts'

/** Horas de misión por cada segundo en pantalla. Coincide con `Speed` del estado. */
export const PLAYBACK_SPEEDS = [1, 6, 24] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

/** "1 hora", "6 horas", "1 día": lo que dura un segundo en pantalla. */
export function speedLabel(hoursPerSecond: number): string {
  return formatDurationLong(hoursPerSecond)
}

/** Opciones para el selector, en orden. */
export function speedOptions(): Array<{ value: `${PlaybackSpeed}`; label: string }> {
  return PLAYBACK_SPEEDS.map((s) => ({ value: `${s}` as `${PlaybackSpeed}`, label: speedLabel(s) }))
}

/** Veces más rápido que el tiempo real: 1 hora por segundo = 3600×. */
export function speedFactor(hoursPerSecond: number): number {
  return hoursPerSecond * 3600
}

/** "3 600×" con separador de miles en español. */
export function formatFactor(hoursPerSecond: number): string {
  return `${String(Math.round(speedFactor(hoursPerSecond))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}×`
}

/** Segundos reales que tarda en reproducirse un tramo de `hours` horas. */
export function playbackSeconds(hours: number, hoursPerSecond: number): number {
  if (!(hoursPerSecond > 0) || !(hours >= 0)) return 0
  return hours / hoursPerSecond
}

/** Duración real de la reproducción: "45 s", "2 min 20 s", "1 h 1 min". */
export function formatPlayback(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return s % 60 === 0 ? `${m} min` : `${m} min ${s % 60} s`
  const h = Math.floor(m / 60)
  return m % 60 === 0 ? `${h} h` : `${h} h ${m % 60} min`
}
