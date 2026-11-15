// Panel de la vista 3D: carga el visor aparte (three.js pesa) y pone encima la información del sitio,
// el estado del Sol y la Tierra según los datos, y los avisos de escala.

import { Component, lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react'
import { formatCoords } from '../lib/format'
import { clearanceDeg, horizonAt } from '../lib/horizon'
import { CATEGORY_LABEL } from '../lib/sites'
import { formatDateTime, formatDurationLong, sampleTime } from '../lib/time'
import { contactSeries, litSeries } from '../lib/visibility'
import { horizonProfile, nextSunEvent, PATH_DAYS, skyPath } from '../sim/astronautView'
import { sunFraction } from '../sim/simulate'
import type { SiteData } from '../types'
import { Badge, Button, cx, Panel } from './ui'
import type { EyeData, Sky } from './Viewer3D'
import './eye-view.css'

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

export function ViewerPanel({ data, index, contact, missionState, immersive = false, missionOverlay, showShipStatus = false }: { data: SiteData; index: number; contact: boolean; missionState?: 'nominal' | 'survival' | 'failed'; immersive?: boolean; missionOverlay?: ReactNode; showShipStatus?: boolean }) {
  const s = data.site
  const [ground, setGround] = useState<{ siteId: string; y: number } | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [view, setView] = useState<'aerial' | 'astronaut'>('aerial')
  const astronaut = view === 'astronaut'
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

  // Junto al astronauta: horizonte LOLA y caminos del Sol y la Tierra de los próximos días, desde los datos.
  const series = useMemo(() => ({ lit: litSeries(data), contact: contactSeries(data) }), [data])
  const horizon = useMemo(() => horizonProfile(data.horizon), [data.horizon])
  const sunEvent = useMemo(() => nextSunEvent(data, series.lit, index), [data, series, index])
  const eye = useMemo<EyeData | undefined>(() => {
    if (!astronaut) return undefined
    return {
      horizon,
      sunPath: skyPath(data, 'sun', series.lit, index),
      earthPath: skyPath(data, 'earth', series.contact, index, PATH_DAYS, 2),
      from: index,
      event: sunEvent && { az: sunEvent.az, el: sunEvent.el, label: `${sunEvent.appears ? 'Vuelve el Sol' : 'Se oculta'} · ${formatDateTime(sampleTime(data, sunEvent.index))}` },
    }
  }, [astronaut, horizon, data, series, index, sunEvent])
  // Al entrar, mira hacia el Sol; si está oculto, hacia donde volverá a salir.
  const [aim, setAim] = useState({ yaw: 0, pitch: 2 })
  const enterAstronaut = () => {
    const az = series.lit[index] || !sunEvent ? data.sun.az[index] : sunEvent.az
    setAim({ yaw: az, pitch: Math.max(1, horizonAt(data.horizon, az) + 1.5) })
    setView('astronaut')
    setResetKey(k => k + 1)
  }
  const leaveAstronaut = () => {
    setView('aerial')
    setResetKey(k => k + 1)
  }
  const eventText = sunEvent
    ? `${sunEvent.appears ? 'El Sol vuelve a salir' : 'El Sol se oculta tras el relieve'} en ${formatDurationLong((sunEvent.index - index) * data.stepHours)}.`
    : series.lit[index] ? `El Sol no se oculta en los próximos ${PATH_DAYS} días.` : `El Sol no vuelve en los próximos ${PATH_DAYS} días.`

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
      <div className="absolute inset-0" role="img" aria-label={astronaut ? `Vista junto a un astronauta en ${s.name}, a escala real, con el Sol ${sunState}. ${eventText}` : `Vista 3D del relieve de ${s.name}, 20 por 20 kilómetros, con el Sol ${sunState}.`}>
        <ViewerError key={s.id} fallback={unavailable}>
          <Suspense fallback={null}>
            <Viewer3D siteId={s.id} sky={sky} groundY={loaded ? ground.y : 0} onGroundHeight={onGroundHeight} resetKey={resetKey} shipState={showShipStatus && !astronaut ? missionState : undefined}
              view={view} eye={eye} eyeYaw={aim.yaw} eyePitch={aim.pitch} />
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

      <div className="viewer-heading pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <Badge>{CATEGORY_LABEL[s.category]}</Badge>
          <Heading className="mt-3 max-w-xl font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-[0.01em] sm:text-4xl xl:text-5xl">
            {s.name}
          </Heading>
          <p className="mt-2 font-mono text-xs text-ink-muted">{formatCoords(s)}</p>
          {missionOverlay && <p className="mt-2 text-xs leading-relaxed text-ink-muted">Sol: {sunState} · Tierra: {contact ? 'con contacto' : 'sin contacto'}</p>}
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-wrap justify-end gap-2">
          <Button size="sm" aria-pressed={astronaut} className="min-h-11 bg-void/90" onClick={astronaut ? leaveAstronaut : enterAstronaut}>
            <svg aria-hidden viewBox="0 0 20 20" className="size-4">{astronaut
              ? <path d="M3 13l7-7 7 7M6 10v6h8v-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              : <><circle cx="10" cy="5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M6 18v-6.5a4 4 0 0 1 8 0V18M8 18v-4M12 18v-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></>}</svg>
            <span>{astronaut ? 'Vista aérea' : 'Junto al astronauta'}</span>
          </Button>
          <Button size="sm" aria-label={astronaut ? 'Mirar hacia el Sol' : 'Restablecer vista'} className="min-h-11 bg-void/90" onClick={astronaut ? enterAstronaut : () => setResetKey((k) => k + 1)}>
            <svg aria-hidden viewBox="0 0 20 20" className="size-4"><path d="M4 6v4h4M4.5 9a6 6 0 1 1 1 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            <span className="hidden sm:inline">{astronaut ? 'Mirar al Sol' : 'Restablecer'}</span>
          </Button>
        </div>
      </div>

      {astronaut && <div className={cx('eye-legend pointer-events-none absolute left-4 right-4', missionOverlay ? 'eye-legend--mission' : 'bottom-4')} role="note" aria-label="Qué se ve junto al astronauta">
        <p className="text-sm font-bold text-ink">{eventText}</p>
        <ul className="mt-2 space-y-1 text-xs text-ink-muted">
          <li><i aria-hidden className="eye-key is-horizon" />Horizonte calculado (LOLA, 150 km): manda sobre el modelo 3D</li>
          <li><i aria-hidden className="eye-key is-sun" />Sol, próximos {PATH_DAYS} días · un punto por día</li>
          <li><i aria-hidden className="eye-key is-earth" />Tierra · punteado: oculto o sin contacto</li>
        </ul>
        <p className="mt-2 text-[0.6875rem] text-ink-faint">Escala real. Arrastra para mirar alrededor.</p>
      </div>}

      {!missionOverlay && !astronaut && <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-[linear-gradient(to_top,rgb(5_7_13/0.85),transparent)] p-4 pt-10 sm:px-6">
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
          Relieve LOLA (NASA/LRO): 20 km de detalle y 300 km alrededor. Nave agrandada ×4; Sol y Tierra agrandados. Arrastra para girar.
        </p>
      </div>}
      {missionOverlay}
    </>
  )
  return immersive ? <section aria-label={`Terreno lunar de ${s.name}`} className="glass-viewport relative h-full min-h-80 overflow-hidden bg-black">{content}</section> : (
    <Panel label={`Terreno 3D · LOLA · ${data.terrain?.extentKm ?? 20} × ${data.terrain?.extentKm ?? 20} km`}
      className="min-h-[26rem] flex-1 lg:min-h-[24rem]" bodyClassName="relative overflow-hidden p-0">{content}</Panel>
  )
}
