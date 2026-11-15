// Entrada del build de servidor que usa scripts/prerender.mjs. Recibe los JSON de public/data ya leídos
// y devuelve el HTML estático de la portada, con las mismas cifras que calcula la app.

import { renderToStaticMarkup } from 'react-dom/server'
import { storyFacts } from '../lib/storyFacts'
import { visibility } from '../lib/visibility'
import type { SiteData } from '../types'
import { StaticLanding, type StaticSite } from './StaticLanding'

export function render(data: SiteData[]): { html: string; sites: StaticSite[] } {
  const facts = storyFacts(data)
  const sites = data.map((d): StaticSite => {
    const v = visibility(d)
    return {
      id: d.site.id, name: d.site.name, description: d.site.description ?? '',
      lat: d.site.lat, lon: d.site.lon,
      lightPct: v.lightPct, contactPct: v.contactPct, slopeDeg: d.slope.max100mDeg,
    }
  })
  return { html: renderToStaticMarkup(<StaticLanding facts={facts} sites={sites} />), sites }
}
