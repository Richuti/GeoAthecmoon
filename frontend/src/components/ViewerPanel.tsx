// Panel de la vista 3D: carga el visor aparte (three.js pesa) y pone encima la información del sitio,
// el estado del Sol y la Tierra según los datos, y los avisos de escala.

import { Component, lazy, Suspense, useCallback, useState, type ReactNode } from 'react'
import { formatCoords } from '../lib/format'
import { clearanceDeg } from '../lib/horizon'
import { CATEGORY_LABEL } from '../lib/sites'
import { sunFraction } from '../sim/simulate'
import type { SiteData } from '../types'
import { Badge, Button, cx, Panel } from './ui'
import type { Sky } from './Viewer3D'

const Viewer3D = lazy(() => import('./Viewer3D'))

class ViewerError extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function ViewerPanel({ data, index, contact, missionState, immersive = false }: { data: SiteData; index: number; contact: boolean; missionState?: 'nominal' | 'survival' | 'failed'; immersive?: boolean }) {
  const s = data.site
  const [ground, setGround] = useState<{ siteId: string; y: number } | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const onGroundHeight = useCallback((y: number) => setGround({ siteId: s.id, y }), [s.id])
  const loaded = ground?.siteId === s.id
  const Heading = immersive ? 'h2' : 'h1'

  const frac = sunFraction(clearanceDeg(data.horizon, data.sun.az[index], data.sun.el[index]))
  const sky: Sky = {
    sunAz: data.sun.az[index],
    sunEl: data.sun.el[index],
    sunFraction: frac,
    earthAz: data.earth.az[index],
    earthEl: data.earth.el[index],
    earthVisible: contact,
  }
  const sunState = frac >= 1 ? 'iluminado' : frac <= 0 ? 'en sombra' : `${Math.round(frac * 100)} % del disco`

  const unavailable = (
    <div className="absolute inset-0 grid place-items-center p-8 text-center">
      <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
        <span className="text-ink">No se pudo cargar el modelo 3D de este sitio.</span> La franja de horizonte de arriba
        muestra lo que verías girando 360° desde el sitio.
      </p>
    </div>
  )

  const content = (
    <>
      <div className="absolute inset-0" role="img" aria-label={`Vista 3D del relieve de ${s.name}, 20 por 20 kilómetros, con el Sol ${sunState}.`}>
        <ViewerError key={s.id} fallback={unavailable}>
          <Suspense fallback={null}>
            <Viewer3D siteId={s.id} sky={sky} groundY={loaded ? ground.y : 0} onGroundHeight={onGroundHeight} resetKey={resetKey} />
          </Suspense>
        </ViewerError>
      </div>

      {!loaded && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center" role="status">
          <p className="instrument-label text-ink-muted motion-safe:animate-pulse">Cargando relieve LOLA…</p>
        </div>
      )}

      {/* Velo arriba para leer el nombre sobre el cielo */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgb(5_7_13/0.85),transparent)]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <Badge>{CATEGORY_LABEL[s.category]}</Badge>
          <Heading className="mt-3 max-w-xl font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-[0.01em] sm:text-4xl xl:text-5xl">
            {s.name}
          </Heading>
          <p className="mt-2 font-mono text-xs text-ink-muted">{formatCoords(s)}</p>
        </div>
        <Button size="sm" aria-label="Restablecer vista" className="pointer-events-auto min-h-11 shrink-0 bg-void/90" onClick={() => setResetKey((k) => k + 1)}>
          <svg aria-hidden viewBox="0 0 20 20" className="size-4"><path d="M4 6v4h4M4.5 9a6 6 0 1 1 1 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          <span className="hidden sm:inline">Restablecer</span>
        </Button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-[linear-gradient(to_top,rgb(5_7_13/0.85),transparent)] p-4 pt-10 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <Badge tone={frac > 0 ? 'sun' : 'neutral'}>
            Sol {sky.sunEl.toFixed(2)}° · {sunState}
          </Badge>
          <Badge tone={contact ? 'earth' : 'neutral'}>
            Tierra {sky.earthEl.toFixed(2)}° · {contact ? 'con contacto' : 'sin contacto'}
          </Badge>
          {missionState && <Badge tone={missionState === 'nominal' ? 'ok' : missionState === 'survival' ? 'caution' : 'critical'}>
            Módulo: {missionState === 'nominal' ? 'operando' : missionState === 'survival' ? 'ahorrando energía' : 'sin energía'}
          </Badge>}
        </div>
        <p className={cx('max-w-xs text-right text-[0.6875rem] leading-relaxed text-ink-faint')}>
          Relieve LOLA (NASA/LRO). Módulo agrandado ×30; Sol y Tierra agrandados. Arrastra para girar.
        </p>
      </div>
    </>
  )
  return immersive ? <section aria-label={`Terreno lunar de ${s.name}`} className="glass-viewport relative h-full min-h-80 overflow-hidden bg-black">{content}</section> : (
    <Panel label={`Terreno 3D · LOLA · ${data.terrain?.extentKm ?? 20} × ${data.terrain?.extentKm ?? 20} km`}
      className="min-h-[26rem] flex-1 lg:min-h-[24rem]" bodyClassName="relative overflow-hidden p-0">{content}</Panel>
  )
}
