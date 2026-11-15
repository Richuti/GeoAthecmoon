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

/** La misión en miniatura: franjas de Sol y de Tierra, y la curva de la batería con el mínimo del 20 %. */
export function MissionGlyph({ result, series, tall = false, className }: { result: SimResult; series: Series; tall?: boolean; className?: string }) {
  const W = 240
  const H = tall ? 96 : 52
  const top = 15
  const soc = result.series.soc
  const n = soc.length
  const x = (k: number) => (n <= 1 ? 0 : (k / (n - 1)) * W)
  const y = (v: number) => H - 2 - v * (H - top - 4)
  const runs = (on: (k: number) => boolean) => {
    const out: Array<[number, number]> = []
    let s = -1
    for (let k = 0; k <= n; k++) {
      const v = k < n && on(k)
      if (v && s < 0) s = k
      if (!v && s >= 0) { out.push([s, k]); s = -1 }
    }
    return out
  }
  const from = result.from
  const sun = runs((k) => series.lit[from + k])
  const earth = runs((k) => series.contact[from + k])
  const stride = Math.max(1, Math.ceil(n / W))
  const pts: string[] = []
  for (let k = 0; k < n; k += stride) pts.push(`${x(k).toFixed(1)},${y(soc[k]).toFixed(1)}`)
  pts.push(`${x(n - 1).toFixed(1)},${y(soc[n - 1]).toFixed(1)}`)
  const failK = result.summary.failedAtIndex === null ? null : result.summary.failedAtIndex - from
  const ok = result.summary.survived
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cx('ai-glyph', tall && 'is-tall', className)} role="img" preserveAspectRatio="none"
      aria-label={`Batería durante la misión: ${ok ? 'sobrevive' : 'llega al mínimo'}; mínima ${Math.round(result.summary.minSocPct)} %.`}>
      {sun.map(([s, e]) => <rect key={`s${s}`} x={x(s)} y={0} width={Math.max(0.6, x(e) - x(s))} height={4} className="fill-sun" />)}
      {earth.map(([s, e]) => <rect key={`e${s}`} x={x(s)} y={7} width={Math.max(0.6, x(e) - x(s))} height={4} className="fill-earth" />)}
      <line x1={0} x2={W} y1={y(MIN_SOC)} y2={y(MIN_SOC)} className="ai-glyph__floor" />
      <polyline points={pts.join(' ')} fill="none" className={ok ? 'stroke-ok' : 'stroke-critical'} strokeWidth={tall ? 2 : 1.6} vectorEffect="non-scaling-stroke" />
      {failK !== null && failK >= 0 && <circle cx={x(failK)} cy={y(MIN_SOC)} r={3} className="fill-critical" />}
    </svg>
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
            <MissionGlyph result={e.result} series={e.series} className="ai-log__glyph" />
            <p className={cx('ai-log__result', ok ? 'is-ok' : 'is-fail')}>
              <b>{ok ? '✓ Sobrevive' : '✗ Falla'}</b><span className="tabular-nums">{e.metric}</span>
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
