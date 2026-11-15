// La misión en vivo, encima de la vista 3D: lo que le pasa al módulo se ve, no se lee en una tabla.
// - Indicadores: batería (con la línea de falla del 20 %), energía que entra y sale, y envío de datos.
// - Aviso grande cada vez que la reproducción cruza un suceso (se oculta el Sol, se pierde la Tierra…).
// - Estado de toda la pantalla: ahorro de energía, sin energía o misión cumplida.
// Todo sale de la serie del simulador (src/sim/simulate.ts); aquí no se calcula nada nuevo.
import { useEffect, useRef, useState } from 'react'
import { dayNumber } from '../../lib/time'
import type { EventType, SimEvent, SimResult } from '../../sim/simulate'
import type { SiteData } from '../../types'
import { cx } from '../ui'

export const EVENT_INFO: Record<EventType, { title: string; tone: 'sun' | 'earth' | 'ok' | 'caution' | 'critical' | 'neutral' }> = {
  landing: { title: 'Alunizaje', tone: 'neutral' },
  'sun-set': { title: 'El Sol se oculta', tone: 'sun' },
  'sun-rise': { title: 'Vuelve el Sol', tone: 'sun' },
  'contact-open': { title: 'La Tierra aparece', tone: 'earth' },
  'contact-close': { title: 'Se pierde la Tierra', tone: 'earth' },
  survival: { title: 'Modo ahorro de energía', tone: 'caution' },
  recovered: { title: 'Energía recuperada', tone: 'ok' },
  failure: { title: 'Batería agotada', tone: 'critical' },
  complete: { title: 'Misión cumplida', tone: 'ok' },
  eclipse: { title: 'Eclipse', tone: 'sun' },
}

/** Texto del suceso sin el reloj del principio ("Día 4 · 4 ene, 13:00 UTC: …"). */
export function eventText(e: SimEvent): string {
  const cut = e.message.indexOf('UTC: ')
  const text = cut >= 0 ? e.message.slice(cut + 5) : e.message
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const TOAST_MS = 3200

export function MissionLive({ data, result, index, playing, onPlay, onPause }: {
  data: SiteData
  result: SimResult
  index: number
  playing: boolean
  onPlay: () => void
  onPause: () => void
}) {
  const { series, events, summary } = result
  const last = series.soc.length - 1
  const k = Math.max(0, Math.min(last, index - result.from))
  const inMission = index >= result.from && index <= result.from + last
  const soc = series.soc[k] * 100
  const mode = series.mode[k]
  const gen = series.generatedW[k]
  const load = series.loadW[k]
  const queued = series.dataQueuedMb[k]
  const sending = k > 0 && series.dataSentMb[k] > series.dataSentMb[k - 1]
  const finished = k === last && inMission
  const failedNow = mode === 'failed'

  // Aviso del último suceso cruzado al avanzar (no al retroceder ni al saltar lejos hacia atrás).
  const [toast, setToast] = useState<{ e: SimEvent; key: number } | null>(null)
  const prev = useRef(index)
  useEffect(() => {
    const before = prev.current
    prev.current = index
    if (index <= before || index - before > 72) return
    const crossed = events.filter((e) => e.index > before && e.index <= index && e.type !== 'landing')
    const pick = crossed.find((e) => e.type === 'failure') ?? crossed.at(-1)
    if (!pick) return
    setToast({ e: pick, key: Date.now() })
    if (pick.type === 'failure' && playing) onPause()
  }, [index, events, playing, onPause])
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), toast.e.type === 'failure' || toast.e.type === 'complete' ? TOAST_MS * 2 : TOAST_MS)
    return () => window.clearTimeout(id)
  }, [toast])

  const atStart = k === 0 && !playing

  return (
    <div className={cx('mission-live pointer-events-none absolute inset-0', inMission && `mission-live--${mode}`, finished && summary.survived && 'mission-live--done')}>
      {/* Estado de toda la escena */}
      <div aria-hidden className="mission-live__veil absolute inset-0" />

      {/* Indicadores del módulo */}
      <div className="mission-hud absolute inset-x-3 bottom-[4.75rem] grid grid-cols-3 gap-1.5 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-24 sm:flex sm:w-44 sm:flex-col sm:gap-2" aria-label="Estado del módulo">
        <div className="mission-hud__card">
          <p className="mission-hud__label">Batería</p>
          <p className={cx('text-2xl font-bold tabular-nums leading-none', mode === 'failed' ? 'text-critical' : mode === 'survival' ? 'text-caution' : 'text-ink')}>{Math.round(soc)} %</p>
          <div className="mission-hud__battery mt-2" role="meter" aria-label="Carga de la batería" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(soc)}>
            <span className={cx('mission-hud__fill', `is-${mode}`)} style={{ width: `${Math.max(0, Math.min(100, soc))}%` }} />
            <span className="mission-hud__limit" title="Mínimo: 20 %" />
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-ink-muted">{mode === 'failed' ? 'Sin energía' : mode === 'survival' ? 'Ahorrando energía' : gen > load ? 'Cargando ▲' : 'Gastando ▼'}</p>
        </div>
        <div className="mission-hud__card">
          <p className="mission-hud__label">Energía</p>
          <p className={cx('flex items-center gap-1.5 text-sm font-bold tabular-nums', gen > 0 ? 'text-sun' : 'text-ink-faint')}>
            <SunGlyph />Panel {Math.round(gen)} W
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm tabular-nums text-ink-muted"><span aria-hidden className="inline-block w-3.5 text-center">⚡</span>Uso {Math.round(load)} W</p>
        </div>
        <div className="mission-hud__card">
          <p className="mission-hud__label">Datos</p>
          <p className={cx('flex items-center gap-1.5 text-sm font-bold', sending ? 'text-earth' : 'text-ink-faint')}>
            <span aria-hidden className={cx('mission-hud__link', sending && 'is-on')}><i /><i /><i /></span>
            {sending ? 'Enviando' : 'En espera'}
          </p>
          <p className="mt-1 text-[0.6875rem] tabular-nums text-ink-muted">{Math.round(queued).toLocaleString('es')} Mb por enviar</p>
        </div>
      </div>

      {/* Aviso del suceso */}
      {toast && (
        <div key={toast.key} role="status" className={cx('mission-toast absolute left-1/2 top-[38%] w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2', `is-${EVENT_INFO[toast.e.type].tone}`)}>
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">Día {dayNumber(data, toast.e.index, result.from)}</p>
          <p className="mission-toast__title mt-1 font-display text-3xl font-extrabold uppercase leading-none sm:text-4xl">{EVENT_INFO[toast.e.type].title}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{eventText(toast.e)}</p>
        </div>
      )}

      {/* Sin energía: sello sobre la escena */}
      {failedNow && !toast && inMission && (
        <div className="mission-stamp is-critical absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
          <p className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">Sin energía</p>
          <p className="mt-2 text-sm text-ink">La batería llegó al 20 % el día {summary.failedAtIndex !== null ? dayNumber(data, summary.failedAtIndex, result.from) : '—'}.</p>
        </div>
      )}
      {finished && summary.survived && !toast && (
        <div className="mission-stamp is-ok absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
          <p className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">Misión cumplida</p>
          <p className="mt-2 text-sm text-ink">Llegó a la Tierra el {Math.round(summary.dataSentPct)} % de los datos.</p>
        </div>
      )}

      {/* Inicio: una sola acción clara */}
      {atStart && !toast && (
        <div className="absolute inset-0 grid place-items-center">
          <button type="button" onClick={onPlay} className="mission-play pointer-events-auto">
            <span aria-hidden className="mission-play__icon"><svg viewBox="0 0 20 20"><path d="M6 4l10 6-10 6z" fill="currentColor" /></svg></span>
            <span className="text-left"><span className="block text-base font-bold">Ver la misión</span><span className="block text-xs text-ink-muted">Hora por hora, con los datos reales</span></span>
          </button>
        </div>
      )}
    </div>
  )
}

function SunGlyph() {
  return <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0"><circle cx="8" cy="8" r="3" fill="currentColor" /><path d="M8 0.5v2m0 11v2M0.5 8h2m11 0h2M2.7 2.7l1.4 1.4m7.8 7.8 1.4 1.4m0-10.6-1.4 1.4m-7.8 7.8-1.4 1.4" stroke="currentColor" strokeWidth="1.2" /></svg>
}
