// Rescate de un plan que ya falla (sin imprevisto): arma el caso con los datos reales y abre el copiloto de IA.
import { useMemo } from 'react'
import { formatDateTime, sampleTime } from '../../lib/time'
import type { CopilotCase } from '../../sim/copilot'
import { planRescueCase } from '../../sim/incident'
import type { LanderConfig } from '../../sim/lander'
import { seriesOf } from '../../sim/search'
import { useAppState } from '../../state'
import type { SiteData } from '../../types'
import { RescueCopilot } from './RescueCopilot'

export function PlanRescue({ data, cfg, startIndex, missionDays, startSignal, onApply }: {
  data: SiteData
  cfg: LanderConfig
  startIndex: number
  missionDays: number
  startSignal: number
  onApply: (siteId: string, cfg: LanderConfig, startIndex: number) => void
}) {
  const { state } = useAppState()
  const copilotCase = useMemo<CopilotCase | null>(() => {
    const sites = Object.values(state.data).map((d) => ({ data: d, series: seriesOf(d) }))
    const incident = planRescueCase({ data, cfg, startIndex, missionDays, sites, series: sites.find((s) => s.data.site.id === data.site.id)?.series })
    return incident ? { data, cfg, missionDays, incident, sites } : null
  }, [state.data, data, cfg, startIndex, missionDays])
  if (!copilotCase) return null
  const failedAt = copilotCase.incident.delayed.failedAtIndex
  return (
    <RescueCopilot id="rescate-ia" copilotCase={copilotCase} onApply={onApply} startSignal={startSignal}
      title="Tu misión falla. ¿Cómo la salvamos?"
      intro={`Con este plan, la batería llega al mínimo${failedAt !== null ? ` el ${formatDateTime(sampleTime(data, failedAt))}` : ''}. La IA prueba combinaciones con el simulador: esperar antes de alunizar, otro sitio, menos instrumentos o ahorrar antes. Parte de las salidas sencillas y busca la que salva la misión enviando más datos.`} />
  )
}
