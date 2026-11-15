// Control de misión: mientras se reproduce, cada suceso aparece como «qué pasó» y «qué hacemos», con los números
// del simulador.
import { useMemo } from 'react'
import { controlFeed, type ControlContext, type Tone } from '../../sim/missionControl'
import { Button, cx } from '../ui'
import './mission-control.css'

const ICON: Record<Tone, string> = { info: 'ℹ', warn: '⚠', fail: '✗', ok: '✓' }

export function MissionControl({ ctx, index, playing, onRescue }: {
  ctx: ControlContext
  index: number
  playing: boolean
  /** Abre el copiloto de IA cuando la misión falla */
  onRescue?: () => void
}) {
  const feed = useMemo(() => controlFeed(ctx, index), [ctx, index])
  const latest = feed[0]
  const failedHere = latest?.tone === 'fail' && !ctx.result.summary.survived

  return (
    <section aria-label="Control de misión" className="mission-control mt-5">
      <p className="flex items-center gap-2 text-sm font-bold text-ink"><span aria-hidden className={cx('mission-control__led', playing && 'is-live')} />Control de misión
        <span className="text-xs font-normal text-ink-muted">· con los datos del simulador</span></p>

      <ol className="mission-control__feed mt-3" aria-live="polite">
        {feed.slice(0, 3).map((m, i) => (
          <li key={`${m.index}:${m.problem}`} className={cx('mission-control__msg', `is-${m.tone}`, i > 0 && 'is-old')}>
            <span aria-hidden className="mission-control__icon">{ICON[m.tone]}</span>
            <div className="min-w-0">
              <p className="mission-control__problem">{m.problem}</p>
              <p className="mission-control__response"><span aria-hidden>→ </span>{m.response}</p>
            </div>
          </li>
        ))}
        {feed.length === 0 && <li className="mission-control__msg is-info is-old"><span aria-hidden className="mission-control__icon">ℹ</span><p className="mission-control__response">Pulsa «Reproducir la misión»: aquí verás cada suceso y qué hacemos.</p></li>}
      </ol>
      {failedHere && onRescue && <Button variant="primary" className="mt-3 min-h-11" onClick={onRescue}>✦ Ver cómo lo resuelve la IA</Button>}
    </section>
  )
}
