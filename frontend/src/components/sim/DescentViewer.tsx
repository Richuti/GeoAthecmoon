import { useCallback, useState } from 'react'
import { clearanceDeg } from '../../lib/horizon'
import { indexAt } from '../../lib/time'
import { hasContact } from '../../lib/visibility'
import { sunFraction } from '../../sim/simulate'
import type { SiteData } from '../../types'
import Viewer3D from '../Viewer3D'

/** Misma malla LOLA y misma iluminación que Explorar sitio, a la fecha elegida. */
export default function DescentViewer({ data, arrival, progress, active, onReady }: {
  data: SiteData; arrival: Date; progress: number; active: boolean; onReady: () => void
}) {
  const [groundY, setGroundY] = useState(0)
  const ground = useCallback((y: number) => { setGroundY(y); onReady() }, [onReady])
  const i = indexAt(data, arrival, data.sun.el.length)
  const sky = {
    sunAz: data.sun.az[i], sunEl: data.sun.el[i],
    sunFraction: sunFraction(clearanceDeg(data.horizon, data.sun.az[i], data.sun.el[i])),
    earthAz: data.earth.az[i], earthEl: data.earth.el[i], earthVisible: hasContact(data, i),
    sunDistanceKm: data.sun.distKm?.[i], earthDistanceKm: data.earth.distKm?.[i],
  }
  return <Viewer3D key={data.site.id} siteId={data.site.id} sky={sky} groundY={groundY}
    onGroundHeight={ground} resetKey={0} arrivalProgress={progress} active={active} />
}
