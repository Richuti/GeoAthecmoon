// Selector de velocidad de la reproducción, igual en el planificador y en el simulador.
// En palabras simples: cuánto tiempo de misión avanza cada segundo y cuánto dura verla completa.
import { formatPlayback, PLAYBACK_SPEEDS, playbackSeconds, speedLabel, type PlaybackSpeed } from '../lib/timeScale'
import type { Speed } from '../state'
import { cx, Segmented } from './ui'

const NAMES: Record<PlaybackSpeed, string> = { 1: 'Lenta', 6: 'Normal', 24: 'Rápida' }
const OPTIONS = PLAYBACK_SPEEDS.map((s) => ({ value: `${s}` as `${PlaybackSpeed}`, label: NAMES[s] }))

export function TimeScale({ speed, onSpeed, spanHours, spanLabel, className }: {
  speed: Speed
  onSpeed: (speed: Speed) => void
  /** Horas que cubre la barra de reproducción */
  spanHours: number
  /** Qué se reproduce: "La misión de 14 días", "El periodo de 365 días" */
  spanLabel: string
  className?: string
}) {
  return (
    // Ancho fijo: la frase de abajo cambia de largo y así los botones no se mueven bajo el cursor.
    <div className={cx('min-w-0 sm:w-[21rem] sm:max-w-full', className)}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-ink-muted">Velocidad</span>
        <Segmented label="Velocidad de la reproducción" size="sm" options={OPTIONS}
          value={String(speed) as `${PlaybackSpeed}`} onChange={(v) => onSpeed(Number(v) as Speed)} />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted" aria-live="polite">
        Cada segundo avanza <span className="font-bold text-ink">{speedLabel(speed)}</span> · {spanLabel} dura{' '}
        <span className="tabular-nums text-ink">{formatPlayback(playbackSeconds(spanHours, speed))}</span>
      </p>
    </div>
  )
}
