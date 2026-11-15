// Selector de escala de tiempo, igual en el planificador y en el simulador.
// Dice en palabras cuánto tiempo de misión pasa en cada segundo real y cuánto dura la reproducción completa.
import { formatFactor, formatPlayback, playbackSeconds, speedLabel, speedOptions } from '../lib/timeScale'
import type { Speed } from '../state'
import { cx, Segmented } from './ui'

export function TimeScale({ speed, onSpeed, spanHours, spanLabel, className }: {
  speed: Speed
  onSpeed: (speed: Speed) => void
  /** Horas que cubre la barra de reproducción */
  spanHours: number
  /** Qué se reproduce: "La misión de 14 días", "El año de datos" */
  spanLabel: string
  className?: string
}) {
  return (
    // Ancho fijo: el texto de abajo cambia de largo con la escala, y así los botones no se mueven bajo el cursor.
    <div className={cx('min-w-0 sm:w-[27rem] sm:max-w-full', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-xs text-ink-muted">1 segundo en pantalla =</span>
        <Segmented label="Escala de tiempo: tiempo de misión por cada segundo en pantalla" size="sm" options={speedOptions()}
          value={String(speed) as `${Speed}`} onChange={(v) => onSpeed(Number(v) as Speed)} />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-faint" aria-live="polite">
        {formatFactor(speed)} más rápido que la realidad · {spanLabel} se ve en{' '}
        <span className="tabular-nums text-ink-muted">{formatPlayback(playbackSeconds(spanHours, speed))}</span>
        <span className="sr-only"> (cada segundo avanza {speedLabel(speed)})</span>
      </p>
    </div>
  )
}
