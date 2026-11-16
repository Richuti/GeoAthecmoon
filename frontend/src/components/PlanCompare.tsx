// Tarea 10: comparar tu plan con otro, lado a lado y de forma visual.
// - «Otro sitio»: las mismas fechas en otro lugar del polo sur.
// - «Mi plan guardado»: un plan de referencia que el usuario fija y que se conserva aunque cambie sitio, fecha o duración.
// Las cifras salen de planOutcome (src/sim/delay.ts): viabilidad, luz, contacto y batería con el módulo elegido.
import { useMemo, useState, type ReactNode } from 'react'
import { SITE_IMAGERY } from '../content/siteImagery'
import { formatShortDate, sampleTime } from '../lib/time'
import { VERDICT_LABEL, verdictOf } from '../lib/viability'
import type { Visibility } from '../lib/visibility'
import { planOutcome, type PlanOutcome } from '../sim/delay'
import type { LanderConfig } from '../sim/lander'
import type { SiteData } from '../types'
import { PlanStrips } from './PlanStrips'
import { Button, cx, Segmented, Select } from './ui'

export interface SavedPlan { siteId: string; startIndex: number; missionDays: number }
interface Ctx { data: SiteData; vis: Visibility }

export function PlanCompare({ contexts, siteId, startIndex, missionDays, cfg, moduleName, saved, onSave, onApply }: {
  contexts: Ctx[]
  siteId: string
  startIndex: number
  missionDays: number
  cfg: LanderConfig
  moduleName: string
  saved: SavedPlan | null
  onSave: (plan: SavedPlan) => void
  onApply: (plan: SavedPlan) => void
}) {
  const current = contexts.find((c) => c.data.site.id === siteId)
  const others = contexts.filter((c) => c.data.site.id !== siteId && c.data.start === current?.data.start && c.data.sun.el.length === current?.data.sun.el.length)

  // Resultado de cada sitio con las mismas fechas: sirve para proponer el mejor como punto de partida.
  const outcomes = useMemo(() => new Map(others.map((c) => [c.data.site.id, planOutcome(c.data, c.vis, cfg, startIndex, missionDays)])), [others, cfg, startIndex, missionDays])
  const bestOther = [...outcomes.entries()].sort((a, b) => b[1].viability - a[1].viability)[0]?.[0]

  const [mode, setMode] = useState<'site' | 'saved'>('site')
  const [pick, setPick] = useState<string | null>(null)
  const otherId = pick && outcomes.has(pick) ? pick : bestOther
  const effectiveMode = mode === 'saved' && saved ? 'saved' : 'site'

  const a = useMemo(() => (current ? planOutcome(current.data, current.vis, cfg, startIndex, missionDays) : null), [current, cfg, startIndex, missionDays])
  const savedCtx = saved ? contexts.find((c) => c.data.site.id === saved.siteId) : undefined
  const savedOutcome = useMemo(() => (saved && savedCtx ? planOutcome(savedCtx.data, savedCtx.vis, cfg, saved.startIndex, saved.missionDays) : null), [saved, savedCtx, cfg])

  if (!current || !a) return null
  const bCtx = effectiveMode === 'saved' ? savedCtx : others.find((c) => c.data.site.id === otherId)
  const b = effectiveMode === 'saved' ? savedOutcome : otherId ? outcomes.get(otherId) ?? null : null
  const sameAsSaved = saved && saved.siteId === siteId && saved.startIndex === a.from && saved.missionDays === missionDays

  const winner = b ? (Math.round(a.viability) === Math.round(b.viability) && a.survived === b.survived ? null : score(a) >= score(b) ? 'a' : 'b') : null

  return (
    <section aria-labelledby="compare-title" data-tour="compare-plans" className="glass-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="compare-title" className="text-xl font-bold text-ink">Compara tu plan</h2>
          <p className="mt-1 text-sm text-ink-muted">Compara la energía disponible, el envío de mediciones y la duración de cada plan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Con qué comparar" value={effectiveMode} onChange={(v) => setMode(v)} className="[&_button]:min-h-10"
            options={[{ value: 'site', label: 'Otro sitio' }, { value: 'saved', label: 'Mi plan guardado' }]} />
        </div>
      </div>

      {effectiveMode === 'site' && otherId && (
        <div className="mt-4 max-w-sm">
          <Select id="compare-site" label="Mismas fechas en" value={otherId} onChange={setPick}
            options={others.map((c) => ({ value: c.data.site.id, label: c.data.site.name, meta: `${Math.round(outcomes.get(c.data.site.id)?.viability ?? 0)}/100 con tus fechas` }))} />
        </div>
      )}
      {mode === 'saved' && !saved && (
        <p className="mt-4 text-sm text-ink-muted">Todavía no guardaste ningún plan. Usa «Guardar este plan» y después cambia sitio, fecha o duración para compararlos.</p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <PlanColumn label="Tu plan" ctx={current} o={a} moduleName={moduleName} best={winner === 'a'}
          action={<Button onClick={() => onSave({ siteId, startIndex: a.from, missionDays })} disabled={!!sameAsSaved}>
            {sameAsSaved ? 'Plan guardado ✓' : 'Guardar este plan'}</Button>} />
        {b && bCtx ? (
          <PlanColumn label={effectiveMode === 'saved' ? 'Plan guardado' : 'Alternativa'} ctx={bCtx} o={b} moduleName={moduleName} best={winner === 'b'}
            action={<Button variant="primary" onClick={() => onApply({ siteId: bCtx.data.site.id, startIndex: b.from, missionDays: effectiveMode === 'saved' && saved ? saved.missionDays : missionDays })}>
              Cambiar a este plan</Button>} />
        ) : (
          <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-seam-strong p-6 text-center text-sm text-ink-muted">
            Guarda un plan para compararlo aquí.
          </div>
        )}
      </div>
    </section>
  )
}

/** Sobrevivir pesa más que el puntaje: una misión que se queda sin batería nunca es la mejor. */
function score(o: PlanOutcome): number {
  return (o.survived ? 1000 : 0) + o.viability
}

function PlanColumn({ label, ctx, o, moduleName, best, action }: {
  label: string; ctx: Ctx; o: PlanOutcome; moduleName: string; best: boolean; action: ReactNode
}) {
  const d = ctx.data
  const photo = SITE_IMAGERY[d.site.id]
  const failDay = o.failedAtIndex === null ? null : Math.floor(((o.failedAtIndex - o.from) * d.stepHours) / 24) + 1
  const v = Math.round(o.viability)
  return (
    <article className={cx('plan-column flex flex-col', best && 'plan-column--best')}>
      <div className="relative h-24 overflow-hidden rounded-t-[15px] bg-hull">
        {photo && <img src={photo.src} alt="" loading="lazy" className="size-full object-cover opacity-80" style={{ objectPosition: photo.position }} />}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(5_7_13/0.9),transparent_70%)]" />
        <p className="absolute left-4 top-3 text-[0.6875rem] uppercase tracking-[0.14em] text-ink">{label}</p>
        {best && <p className="absolute right-3 top-3 rounded-full bg-ink px-2.5 py-0.5 text-[0.6875rem] font-bold text-void">Mejor opción</p>}
        <h3 className="absolute bottom-2 left-4 right-4 truncate text-lg font-bold text-ink">{d.site.name}</h3>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-ink-muted">{formatShortDate(sampleTime(d, o.from))} → {formatShortDate(sampleTime(d, o.to))}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-5xl font-black leading-none text-ink">{v}</span>
          <span className="text-sm text-ink-muted">/100 · {VERDICT_LABEL[verdictOf(o.viability)]}</span>
        </p>
        <div className="mt-4"><PlanStrips lit={ctx.vis.lit} contact={ctx.vis.contact} from={o.from} to={o.to} stepHours={d.stepHours} failedAt={o.failedAtIndex} startTime={sampleTime(d, o.from).getTime()} /></div>
        <p className={cx('mt-3 text-sm font-bold', o.survived ? 'text-ok' : 'text-critical')}>
          {o.survived ? `La batería aguanta toda la misión` : `La batería se agota el día ${failDay}`}
          <span className="block text-xs font-normal text-ink-faint">{moduleName}{d.slope.max100mDeg > 10 ? ` · pendiente de ${d.slope.max100mDeg.toFixed(1)}°, peligrosa` : ''}</span>
        </p>
        {/* El botón va al fondo: en las dos columnas queda a la misma altura aunque el contenido cambie. */}
        <div className="mt-auto pt-4">{action}</div>
      </div>
    </article>
  )
}
