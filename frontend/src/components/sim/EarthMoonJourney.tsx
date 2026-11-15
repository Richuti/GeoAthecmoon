import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { formatDateTime, formatDuration } from '../../lib/time'
import { EARTH_RADIUS_KM, LAUNCH_END, DESCENT_START, journeyAt, lunarTransfer } from '../../sim/transfer'
import { Button, Disclosure } from '../ui'
import type { SiteData } from '../../types'

const TransferViewer = lazy(() => import('./TransferViewer'))
const LaunchViewer = lazy(() => import('./LaunchViewer'))
const DescentViewer = lazy(() => import('./DescentViewer'))

class JourneyError extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFail() }
  render() { return this.state.failed ? <p className="p-6 text-sm text-ink-muted">No se pudo abrir la vista 3D. Puedes seguir recorriendo la trayectoria con los controles y sus datos calculados.</p> : this.props.children }
}

export function EarthMoonJourney({ arrival, destination, data, onArrive }: { arrival: Date; destination: string; data: SiteData; onArrive: () => void }) {
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [launchReady, setLaunchReady] = useState(false)
  const [orbitalReady, setOrbitalReady] = useState(false)
  const [descentReady, setDescentReady] = useState(false)
  const ready = launchReady && orbitalReady && descentReady
  const [failed, setFailed] = useState(false)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const orbit = useMemo(() => lunarTransfer(200), [])
  const onLaunchReady = useCallback(() => setLaunchReady(true), [])
  const onOrbitalReady = useCallback(() => setOrbitalReady(true), [])
  const onDescentReady = useCallback(() => setDescentReady(true), [])
  const onFail = useCallback(() => setFailed(true), [])
  const arrivalMs = arrival.getTime()
  useEffect(() => { setProgress(0); setPlaying(false) }, [arrivalMs])
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReduced(mq.matches); setPlaying(false) }
    mq.addEventListener('change', change)
    return () => mq.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (!playing || (!ready && !failed)) return
    let previous: number | null = null
    let frame = 0
    const advance = (now: number) => {
      // Si un cuadro tarda en dibujarse, el viaje espera en vez de saltar una fase.
      const elapsed = previous === null ? 0 : Math.min(now - previous, 100)
      previous = now
      // El lanzamiento tiene su propio tramo para poder observar la salida de la plataforma.
      setProgress(p => Math.min(1, p + elapsed * (p < LAUNCH_END ? LAUNCH_END / 10000 : p < DESCENT_START ? (DESCENT_START - LAUNCH_END) / 24000 : (1 - DESCENT_START) / 10000)))
      frame = window.requestAnimationFrame(advance)
    }
    frame = window.requestAnimationFrame(advance)
    return () => window.cancelAnimationFrame(frame)
  }, [playing, ready, failed])
  useEffect(() => { if (progress >= 1) setPlaying(false) }, [progress])
  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden)
  }, [])

  const sample = useMemo(() => journeyAt(orbit, progress), [orbit, progress])
  const launch = sample.launch
  const orbitalBlend = launch ? Math.max(0, Math.min(1, (sample.ascent - 0.8) / 0.2)) : 1
  const descentBlend = sample.descent ? Math.min(1, sample.descentProgress / 0.18) : 0
  const altitudeM = Math.max(0, sample.shipXKm - EARTH_RADIUS_KM) * 1000
  const complete = progress >= 1
  const phase = launch ? sample.ascent < 0.02 ? 'En la plataforma de lanzamiento' : sample.ascent < 0.65 ? 'Ascenso desde la Tierra' : 'Salida hacia la órbita' : complete ? 'Encuentro con la Luna' : 'Transferencia Tierra–Luna'
  const departure = new Date(arrivalMs - orbit.durationSeconds * 1000)
  const clock = new Date(departure.getTime() + sample.seconds * 1000)
  const seek = (value: number) => { setPlaying(false); setProgress(value) }

  return <section aria-label="Viaje Tierra–Luna">
    <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-4 border-y border-seam py-4">
      <Button variant="primary" size="lg" disabled={!ready && !failed} aria-label={playing ? 'Pausar viaje' : 'Reproducir viaje'} onClick={() => { if (complete) setProgress(0); setPlaying(p => !p) }}>{!ready && !failed ? 'Cargando viaje…' : playing ? 'Pausar viaje' : complete ? 'Repetir viaje' : 'Iniciar viaje'}</Button>
      <label className="min-w-40 flex-1 text-sm text-ink-muted">Avance del viaje
        <input type="range" aria-label="Avance del viaje Tierra–Luna" aria-valuetext={`${phase}. ${launch ? 'Ascenso ilustrativo' : formatDuration(sample.seconds / 3600) + ' de transferencia'}.`}
          min={0} max={1} step={0.001} value={progress} onChange={e => seek(Number(e.target.value))} className="range mt-2 w-full" style={{ '--fill': `${progress * 100}%` } as CSSProperties} />
      </label>
      <Button size="lg" onClick={() => seek(1)}>Ir a la llegada</Button>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="journey-stage glass-viewport relative h-[25rem] min-w-0 overflow-hidden bg-black sm:h-[28rem]">
        <JourneyError onFail={onFail}>
          <Suspense fallback={null}>
            <div className="absolute inset-0" style={{ opacity: 1 - orbitalBlend }} aria-hidden>
              <LaunchViewer altitudeM={altitudeM} ascent={sample.ascent} reduced={reduced} active={orbitalBlend < 1} onReady={onLaunchReady} />
            </div>
            <div className="absolute inset-0" style={{ opacity: orbitalBlend * (1 - descentBlend) }} aria-hidden>
              <TransferViewer orbit={orbit} sample={sample} reduced={reduced} active={orbitalBlend > 0 && descentBlend < 1} onReady={onOrbitalReady} />
            </div>
            <div className="absolute inset-0" style={{ opacity: descentBlend }} aria-hidden>
              <DescentViewer data={data} arrival={arrival} progress={sample.descentProgress} active={descentBlend > 0} onReady={onDescentReady} />
            </div>
          </Suspense>
        </JourneyError>
        {!ready && !failed && <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-ink-muted">Cargando Tierra, Luna y terreno…</p>}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgb(5_7_13/0.9),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 p-5 sm:p-6">
          <p className="text-sm text-ink-muted">Salida · Viaje · Encuentro</p>
          <h2 aria-live="polite" className="mt-2 text-xl font-bold text-ink">{phase}</h2>
        </div>
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/80 px-5 py-3 text-xs leading-relaxed text-ink-muted">
          {launch ? 'Ascenso ilustrativo. Cohete y plataforma de referencia NASA; el cálculo orbital comienza a 200 km.' : 'Trayectoria orbital idealizada. Tamaños de planetas y nave ampliados en la vista general.'}
        </p>
      </div>
      <div className="flex flex-col justify-center px-1 py-2 lg:px-6">
        <h3 className="text-xl font-bold text-ink">De la Tierra al sitio elegido.</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{launch ? `Recorre el viaje y después comprueba la luz, la comunicación y el suelo en ${destination}.` : complete ? 'El encuentro lunar no es todavía el alunizaje. Continúa para evaluar el sitio elegido.' : 'La Luna también se mueve. La nave se dirige al lugar donde estará al llegar, no a su posición actual.'}</p>
        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Transferencia calculada</dt><dd className="tabular-nums text-ink">{formatDuration(orbit.durationSeconds / 3600)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Tiempo en transferencia</dt><dd className="tabular-nums text-ink">{launch ? 'Aún no comienza' : formatDuration(sample.seconds / 3600)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Distancia al centro terrestre</dt><dd className="tabular-nums text-earth">{launch ? '—' : Math.round(sample.radiusKm).toLocaleString('es') + ' km'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Velocidad respecto a la Tierra</dt><dd className="tabular-nums text-ink">{launch ? '—' : sample.speedKmS.toFixed(2) + ' km/s'}</dd></div>
        </dl>
        <Button variant="primary" size="lg" className="mt-6 w-full" onClick={onArrive}>Evaluar misión en la Luna →</Button>
        <Disclosure className="mt-4" title="Cómo se calcula el viaje" description="Modelo orbital, límites y fuentes de NASA.">
          <div className="mt-2 space-y-3 text-xs leading-relaxed text-ink-muted">
            <p>Elipse de dos cuerpos, órbita inicial de 200 km y Luna circular a distancia media. La fase lunar se ajusta para un encuentro ideal a 100 km de su superficie. No usa efemérides de lanzamiento ni modela gravedad lunar o solar, captura, descenso o consumo del cohete.</p>
            <p>La batería y los datos del módulo se simulan desde el alunizaje, por separado del viaje.</p>
            <p>Salida orbital de referencia: {formatDateTime(departure)}. Encuentro de referencia: {formatDateTime(arrival)}. Se ancla a la fecha elegida de alunizaje; no calcula una ventana real de lanzamiento.</p>
            <p>Impulso de salida de órbita: {orbit.injectionDeltaVKmS.toFixed(2)} km/s (sin incluir el ascenso). Fecha durante el recorrido: {formatDateTime(clock)}.</p>
            <p><a className="underline underline-offset-4" href="https://ssd.jpl.nasa.gov/astro_par.html" target="_blank" rel="noreferrer">Constantes JPL</a> · <a className="underline underline-offset-4" href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html" target="_blank" rel="noreferrer">Datos Tierra–Luna de NASA</a>.</p>
            <p>Modelos de referencia: Tierra Blue Marble y módulo Apolo adaptado (NASA), el mismo en el despegue, el viaje y la Luna. Se muestra sin cohete para seguir siempre a la misma nave; no representa un vehículo CLPS concreto. Textura lunar del globo: <a className="underline underline-offset-4" href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer">NASA SVS, CGI Moon Kit</a>.</p>
            <p>Imagen a?rea de Kennedy: <a className="underline underline-offset-4" href="https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer" target="_blank" rel="noreferrer">USGS / USDA, NAIP</a>. Humo y escape son efectos visuales, sin din?mica de fluidos.</p>
            <p>Plataforma y torre: <a className="underline underline-offset-4" href="https://science.nasa.gov/3d-resources/mobile-launcher/" target="_blank" rel="noreferrer">NASA / Samuel H. Neblett, Mobile Launcher</a>. El conjunto es una referencia visual, no una reconstrucción de una instalación o un lanzamiento concretos.</p>
          </div>
        </Disclosure>
      </div>
    </div>
    <p className="mt-4 text-sm text-ink-muted">Tiempo acelerado. Puedes pausar, arrastrar la línea de tiempo o usar las flechas del teclado para recorrer el viaje.</p>
  </section>
}
