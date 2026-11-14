/** Une clases de Tailwind ignorando valores vacíos. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Tono de un dato. `sun` y `earth` solo para luz y comunicación; los demás para estados. */
export type Tone = 'neutral' | 'sun' | 'earth' | 'ok' | 'caution' | 'critical'

export const toneText: Record<Tone, string> = {
  neutral: 'text-ink',
  sun: 'text-sun',
  earth: 'text-earth',
  ok: 'text-ok',
  caution: 'text-caution',
  critical: 'text-critical',
}

export const toneBg: Record<Tone, string> = {
  neutral: 'bg-ink',
  sun: 'bg-sun',
  earth: 'bg-earth',
  ok: 'bg-ok',
  caution: 'bg-caution',
  critical: 'bg-critical',
}

/** Valor CSS del color de cada tono, para estilos en línea (SVG y sliders). */
export const toneVar: Record<Tone, string> = {
  neutral: 'var(--color-ink)',
  sun: 'var(--color-sun)',
  earth: 'var(--color-earth)',
  ok: 'var(--color-ok)',
  caution: 'var(--color-caution)',
  critical: 'var(--color-critical)',
}
