// Calcula una fila del mapa de supervivencia fuera del hilo principal: un año de simulaciones por sitio
// (unos 1 400 inicios) tarda cerca de 200 ms, y así la página no se congela.
import type { SiteData } from '../types'
import type { LanderConfig } from './lander.ts'
import { scanStarts, seriesOf } from './search.ts'
import { dailySurvival } from './survivalMap.ts'

export interface SurvivalJob { job: number; data: SiteData; cfg: LanderConfig; missionDays: number }

self.onmessage = (e: MessageEvent<SurvivalJob>) => {
  const { job, data, cfg, missionDays } = e.data
  const cells = dailySurvival(data, scanStarts(data, cfg, missionDays, seriesOf(data)))
  ;(self as unknown as { postMessage(message: unknown): void }).postMessage({ job, siteId: data.site.id, cells })
}
