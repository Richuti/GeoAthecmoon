// Piezas compartidas de la IA (copiloto de rescate y «Planéalo por mí»): la insignia, los pasos, la bitácora en
// vivo y la misión en miniatura. Todo número que se ve sale del simulador.
import type { Series, SimResult } from '../../sim/simulate'
import { MIN_SOC } from '../../sim/lander'
import { cx } from '../ui'
import './ai.css'

export function AiBadge({ className, children = 'IA' }: { className?: string; children?: string }) {
  return (
    <span className={cx('ai-badge', className)}>
      <svg aria-hidden viewBox="0 0 16 16"><path d="M8 1.5 9.6 6.4 14.5 8 9.6 9.6 8 14.5 6.4 9.6 1.5 8 6.4 6.4Z" fill="currentColor" /></svg>
      {children}
    </span>
  )
}

/** Cómo trabaja: la IA propone, el simulador calcula y la IA decide. Se animan mientras busca. */
export function AiSteps({ live, decide = 'y prueba otra idea, o elige el plan' }: { live: boolean; decide?: string }) {
  return (
    <ol className={cx('ai-steps', live && 'is-live')} aria-label="Cómo trabaja la IA">
      <li><span aria-hidden>1</span><div><b>La IA propone</b><small>una idea para probar</small></div></li>
      <li><span aria-hidden>2</span><div><b>El simulador calcula</b><small>con JPL Horizons y el relieve LOLA</small></div></li>
      <li><span aria-hidden>3</span><div><b>La IA aprende</b><small>{decide}</small></div></li>
    </ol>
  )
}

/** Resultados del motor con etiquetas, sin colores ni gráficas diminutas. */
export function MissionSummary({ result, tall = false, className }: { result: SimResult; tall?: boolean; className?: string }) {
  const s = result.summary
  return (
    <div className={cx('mission-summary', tall && 'is-expanded', className)}>
      {tall && <p className="mission-summary__verdict">{s.survived ? `La misión completa los ${result.plan.missionDays} días.` : 'La misión se detiene antes de completar el plan.'}</p>}
      <dl>
        <div><dt>Batería mínima</dt><dd>{`${Math.round(s.minSocPct)} %`}</dd></div>
        <div><dt>Datos enviados</dt><dd>{s.dataGeneratedMb > 0 ? `${Math.round(s.dataSentPct)} %` : 'Sin mediciones'}</dd></div>
      </dl>
      {tall && <div className="mission-summary__explanation">
        <p>{`La misión se detiene si la batería llega al ${Math.round(MIN_SOC * 100)} % de carga. El valor de arriba es la carga más baja alcanzada durante esta simulación.`}</p>
        <p>{s.dataGeneratedMb > 0 ? 'Datos enviados es la parte de las mediciones generadas que llegó a la Tierra.' : 'Durante esta simulación no se generaron mediciones para enviar.'}</p>
      </div>}
    </div>
  )
}

export interface LogEntry {
  id: number
  /** «Intento 4», «Salida sencilla» */
  label: string
  idea: string
  chips: string[]
  result: SimResult
  series: Series
  /** Texto del resultado: «21.0 Gb enviados» */
  metric: string
  tag?: string
  quiet?: boolean
}

/** Bitácora: cada intento entra en vivo con su idea, sus palancas, la misión en miniatura y el resultado. */
export function AiLog({ entries, thinking = false, thinkingText = 'La IA está pensando la siguiente idea…', chosenId }: {
  entries: LogEntry[]; thinking?: boolean; thinkingText?: string; chosenId?: number | null
}) {
  return (
    <ol className="ai-log" aria-live="polite">
      {entries.map((e) => {
        const ok = e.result.summary.survived
        return (
          <li key={e.id} className={cx('ai-log__item', ok ? 'is-ok' : 'is-fail', e.quiet && 'is-quiet', chosenId === e.id && 'is-chosen')}>
            <span className="ai-log__num" aria-hidden>{e.quiet ? '·' : e.id}</span>
            <div className="min-w-0">
              <p className="ai-log__label">{e.label}{e.tag && <span className="ai-log__tag">{e.tag}</span>}</p>
              <p className="ai-log__idea">{e.quiet ? e.idea : `«${e.idea || 'Probar esta combinación'}»`}</p>
              <ul className="ai-chips" aria-label="Qué cambia">{e.chips.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
            <MissionSummary result={e.result} className="ai-log__summary" />
            <p className={cx('ai-log__result', ok ? 'is-ok' : 'is-fail')}>
              <b>{ok ? 'Completa la misión' : 'Se detiene'}</b><span className="tabular-nums">{e.metric}</span>
            </p>
          </li>
        )
      })}
      {thinking && (
        <li className="ai-log__item is-thinking" role="status">
          <span className="ai-log__num" aria-hidden><i /><i /><i /></span>
          <p className="ai-log__idea">{thinkingText}</p>
        </li>
      )}
    </ol>
  )
}
