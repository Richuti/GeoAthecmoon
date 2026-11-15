import { useId, useMemo, useState } from 'react'
import { missionDays } from '../lib/missionDays'
import { formatShortDate } from '../lib/time'
import './plan-agenda.css'

/** El enlace disponible no equivale a datos transmitidos. */
export function PlanStrips({ lit, contact, from, to, stepHours, failedAt, startTime }: {
  lit: boolean[]; contact: boolean[]; from: number; to: number; stepHours: number
  failedAt?: number | null; startTime: number; compact?: boolean
}) {
  const days = useMemo(() => missionDays(lit, contact, from, to, stepHours), [lit, contact, from, to, stepHours])
  const [pick, setPick] = useState(0)
  const selected = Math.min(pick, Math.max(0, days.length - 1))
  const day = days[selected]
  const id = useId()
  if (!day) return null
  const page = Math.floor(selected / 14) * 14
  const when = (hour: number) => {
    const date = new Date(startTime + hour * 3_600_000)
    return `${formatShortDate(date)}, ${date.toISOString().slice(11, 16)}`
  }
  const failHour = failedAt != null && failedAt >= from && failedAt < to ? (failedAt - from) * stepHours : null
  const stopped = failHour !== null && failHour < day.offset + day.hours
  return (
    <div className="plan-agenda">
      <p className="plan-agenda__intro">Tu misión, día a día</p>
      <p className="plan-agenda__hint">Elige un día para ver sus condiciones.</p>
      <div className="plan-agenda__days" role="group" aria-label="Días de la misión">
        {days.slice(page, page + 14).map((_, index) => {
          const d = page + index
          return <button type="button" key={d} aria-pressed={selected === d} aria-controls={id} onClick={() => setPick(d)}><span>Día</span><strong>{d + 1}</strong></button>
        })}
      </div>
      {days.length > 14 && <div className="plan-agenda__pages">
        <button type="button" disabled={page === 0} onClick={() => setPick(Math.max(0, page - 14))}>Días anteriores</button>
        <button type="button" disabled={page + 14 >= days.length} onClick={() => setPick(page + 14)}>Días siguientes</button>
      </div>}
      <div id={id} className="plan-agenda__detail" aria-live="polite" aria-atomic="true">
        <h4>{`Día ${selected + 1} de la misión`}</h4>
        <p className="plan-agenda__date">{`${when(day.offset)} → ${when(day.offset + day.hours)} UTC`}</p>
        {stopped && <p className="plan-agenda__stop">{failHour! < day.offset ? 'La nave ya se ha detenido. Estas son las condiciones del sitio, sin actividad de la misión.' : `La batería llega al mínimo el ${when(failHour!)} UTC. La misión se detiene en ese momento.`}</p>}
        <dl className="plan-agenda__facts">
          <div><dt>Energía del panel</dt><dd><strong>{`${Number(day.lightHours.toFixed(2))} h con luz`}</strong><span>{day.lightHours === day.hours ? 'Recibe luz durante todo este día.' : day.lightHours === 0 ? 'Sin luz durante este día. La nave depende de la batería.' : 'Durante las horas sin luz, la nave depende de la batería.'}</span></dd></div>
          <div><dt>Datos enviados</dt><dd><strong>{`${Number(day.contactHours.toFixed(2))} h con enlace`}</strong><span>{day.contactHours === day.hours ? 'Hay enlace con la Tierra durante todo este día.' : day.contactHours === 0 ? 'Sin enlace durante este día. Las mediciones se guardan a bordo.' : 'Sin enlace, las mediciones se guardan para enviarlas después.'}</span></dd></div>
        </dl>
        <p className="plan-agenda__hint">El enlace indica cuándo puede enviar; la cantidad enviada se calcula en el simulador.</p>
      </div>
    </div>
  )
}
