import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { formatDateTime, formatDuration } from '../../lib/time'
import { EARTH_RADIUS_KM, LAUNCH_END, DESCENT_START, MOON_SOI_KM, TIME_SCALES_H_PER_S, journeyAt, lunarTransfer, transferPlaybackSeconds } from '../../sim/transfer'
import { APPROACH_FADE, descentFrame, finalLeg, terrainScreenFraction } from '../../sim/transferView'
import { Button, Disclosure, Segmented } from '../ui'
import type { SiteData } from '../../types'

const TransferViewer = lazy(() => import('./TransferViewer'))
const LaunchViewer = lazy(() => import('./LaunchViewer'))
const DescentViewer = lazy(() => import('./DescentViewer'))

const SOI_LABEL = Math.round(MOON_SOI_KM / 100) * 100

const SCALE_OPTIONS = TIME_SCALES_H_PER_S.map(h => ({ value: String(h), label: `1 s = ${h} h` }))

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
  /** Horas de viaje por segundo en pantalla durante la transferencia. */
  const [scale, setScale] = useState('5')
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
  const transferMs = transferPlaybackSeconds(orbit, Number(scale)) * 1000
  useEffect(() => {
    if (!playing || (!ready && !failed)) return
    let previous: number | null = null
    let frame = 0
    const advance = (now: number) => {
      // Si un cuadro tarda en dibujarse, el viaje espera en vez de saltar una fase.
      const elapsed = previous === null ? 0 : Math.min(now - previous, 100)
      previous = now
      // Despegue y descenso tienen su propio tramo ilustrativo (10 s cada uno). La transferencia avanza a
      // la escala elegida: el tiempo del modelo orbital es lineal con el avance de este tramo.
      setProgress(p => Math.min(1, p + elapsed * (p < LAUNCH_END ? LAUNCH_END / 10000 : p < DESCENT_START ? (DESCENT_START - LAUNCH_END) / (transferMs) : (1 - DESCENT_START) / 10000)))
      frame = window.requestAnimationFrame(advance)
    }
    frame = window.requestAnimationFrame(advance)
    return () => window.cancelAnimationFrame(frame)
  }, [playing, ready, failed, transferMs])
  useEffect(() => { if (progress >= 1) setPlaying(false) }, [progress])
  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden)
  }, [])

  const sample = useMemo(() => journeyAt(orbit, progress), [orbit, progress])
  const launch = sample.launch
  const orbitalBlend = launch ? Math.max(0, Math.min(1, (sample.ascent - 0.8) / 0.2)) : 1
  // Paso del encuentro al terreno: el globo se apaga y después aparece el relieve (sin superponer escalas).
  // Tramo final: llegada sobre el globo y descenso sobre el relieve. El relieve aparece encima del globo
  // cuando las dos cámaras coinciden (a 200 km sobre el sitio), así que no hay corte.
  const leg = finalLeg(sample.descentProgress)
  const orbiting = sample.descent && sample.descentProgress < APPROACH_FADE[0]
  const landing = descentFrame(leg.descent, 1)
  // El relieve LOLA cubre 300 km: aparece desde el centro y se abre hacia los bordes mientras la cámara baja,
  // con el globo lunar alrededor. Así nunca se ve el borde cuadrado del recorte.
  // La máscara se calcula con el tamaño del relieve en pantalla: siempre queda dentro de él.
  const terrainFraction = terrainScreenFraction(landing.cameraDistanceKm)
  const terrainOpen = terrainFraction * 0.8 >= 1.9
  const terrainMask = terrainOpen ? 'none' : `radial-gradient(circle closest-side at center, #000 ${Math.round(terrainFraction * 50)}%, transparent ${Math.round(terrainFraction * 80)}%)`
  const altitudeM = Math.max(0, sample.shipXKm - EARTH_RADIUS_KM) * 1000
  const complete = progress >= 1
  const moonDistanceKm = Math.hypot(sample.shipXKm - sample.moonXKm, sample.shipYKm - sample.moonYKm)
  const lunarGravity = !launch && moonDistanceKm < MOON_SOI_KM
  const phase = launch ? sample.ascent < 0.02 ? 'En la plataforma de lanzamiento' : sample.ascent < 0.65 ? 'Ascenso desde la Tierra' : 'Salida hacia la órbita'
    : orbiting ? 'Órbita hacia el polo sur' : sample.descent ? landing.touched ? `Alunizaje en ${destination}` : 'Descenso al polo sur'
    : lunarGravity ? 'Llegada a la Luna' : 'Transferencia Tierra–Luna'
  const departure = new Date(arrivalMs - orbit.durationSeconds * 1000)
  const clock = new Date(departure.getTime() + sample.seconds * 1000)
  const seek = (value: number) => { setPlaying(false); setProgress(value) }
  const cruising = !launch && !sample.descent

  return <section aria-label="Viaje Tierra–Luna">
    <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-4 border-y border-seam py-4">
      <Button variant="primary" size="lg" disabled={!ready && !failed} aria-label={playing ? 'Pausar viaje' : progress > 0 && !complete ? 'Continuar viaje' : 'Reproducir viaje'} onClick={() => { if (complete) setProgress(0); setPlaying(p => !p) }}>{!ready && !failed ? 'Cargando viaje…' : playing ? 'Pausar viaje' : complete ? 'Repetir viaje' : progress > 0 ? 'Continuar viaje' : 'Iniciar viaje'}</Button>
      <label className="min-w-40 flex-1 text-sm text-ink-muted">Avance del viaje
        <input type="range" aria-label="Avance del viaje Tierra–Luna" aria-valuetext={`${phase}. ${launch ? 'Ascenso ilustrativo' : sample.descent ? 'Descenso ilustrativo' : formatDuration(sample.seconds / 3600) + ' de transferencia'}.`}
          min={0} max={1} step={0.001} value={progress} onChange={e => seek(Number(e.target.value))} className="range mt-2 w-full" style={{ '--fill': `${progress * 100}%` } as CSSProperties} />
      </label>
      <Segmented label="Escala de tiempo del viaje" options={SCALE_OPTIONS} value={scale} onChange={setScale} />
      <Button size="lg" onClick={() => seek(1)}>Ir a la llegada</Button>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="journey-stage glass-viewport relative h-[25rem] min-w-0 overflow-hidden bg-black sm:h-[28rem]">
        <JourneyError onFail={onFail}>
          <Suspense fallback={null}>
            <div className="absolute inset-0" style={{ opacity: 1 - orbitalBlend }} aria-hidden>
              <LaunchViewer altitudeM={altitudeM} ascent={sample.ascent} reduced={reduced} active={orbitalBlend < 1} onReady={onLaunchReady} />
            </div>
            <div className="absolute inset-0" style={{ opacity: terrainOpen ? 0 : orbitalBlend }} aria-hidden>
              <TransferViewer orbit={orbit} sample={sample} reduced={reduced} active={orbitalBlend > 0 && !terrainOpen} onReady={onOrbitalReady} />
            </div>
            <div className="absolute inset-0" style={{ opacity: leg.terrain, maskImage: terrainMask, WebkitMaskImage: terrainMask }} aria-hidden>
              <DescentViewer data={data} arrival={arrival} progress={leg.descent} active={sample.descent && sample.descentProgress > APPROACH_FADE[0] - 0.04} onReady={onDescentReady} />
            </div>
          </Suspense>
        </JourneyError>
        {!ready && !failed && <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-ink-muted">Cargando Tierra, Luna y terreno…</p>}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgb(5_7_13/0.9),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 p-5 sm:p-6">
          <p className="text-sm text-ink-muted">
            {cruising ? <><span className="hidden sm:inline">Salida · Viaje · Encuentro</span><span className="font-bold tabular-nums text-ink sm:hidden">Tiempo de viaje {formatDuration(sample.seconds / 3600)} · 1 s = {scale} h · Luna {Math.round(moonDistanceKm).toLocaleString('es')} km</span></> : 'Salida · Viaje · Encuentro'}
          </p>
          <h2 aria-live="polite" className="mt-2 text-xl font-bold text-ink">{phase}</h2>
        </div>
        {/* Arriba a la derecha: en esta trayectoria la Luna pasa por la izquierda y la Tierra queda abajo. */}
        {/* En pantallas angostas el reloj va en la línea sobre el título: la trayectoria y la Luna pasan por aquí. */}
        {cruising && <div aria-hidden className="pointer-events-none absolute right-6 top-24 hidden text-right sm:block">
          <p className="text-xs text-ink-muted">Tiempo de viaje</p>
          <p className="text-4xl font-bold tabular-nums text-ink">{formatDuration(sample.seconds / 3600)}</p>
          <p className="mt-1 text-xs text-ink-muted">desde que sale de la órbita terrestre · 1 s = {scale} h</p>
          <dl className="mt-3 space-y-1 text-xs tabular-nums">
            <div className="flex justify-end gap-2"><dt className="text-ink-muted">Tierra</dt><dd className="text-earth">{Math.round(sample.radiusKm).toLocaleString('es')} km</dd></div>
            <div className="flex justify-end gap-2"><dt className="text-ink-muted">Luna</dt><dd className="text-ink">{Math.round(moonDistanceKm).toLocaleString('es')} km</dd></div>
            <div className="flex justify-end gap-2"><dt className="text-ink-muted">Velocidad</dt><dd className="text-ink">{sample.speedKmS.toFixed(2)} km/s</dd></div>
          </dl>
          {lunarGravity && <p className="mt-3 text-xs font-bold text-ink">Dentro de la influencia lunar</p>}
        </div>}
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/80 px-5 py-3 text-xs leading-relaxed text-ink-muted">
          {launch ? 'Ascenso ilustrativo. Cohete y plataforma de referencia NASA; el cálculo orbital comienza a 200 km.'
            : orbiting ? 'Llegada ilustrativa: un cuarto de órbita hasta el polo sur. El modelo no calcula el frenado ni la gravedad lunar.'
            : sample.descent ? 'Descenso ilustrativo sobre el relieve LOLA real, con el Sol de la fecha elegida. Sin aire no hay humo: el polvo sale rasante y cae enseguida.'
            : lunarGravity ? `A menos de ${SOI_LABEL.toLocaleString('es')} km domina la gravedad de la Luna; este modelo de dos cuerpos no la incluye.`
            : 'Tierra y Luna a escala real; la nave se dibuja más grande (40 km) para verla. El mapa muestra la trayectoria de dos cuerpos.'}
        </p>
      </div>
      <div className="flex flex-col justify-center px-1 py-2 lg:px-6">
        <h3 className="text-xl font-bold text-ink">De la Tierra al sitio elegido.</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{launch ? `Recorre el viaje y después comprueba la luz, la comunicación y el suelo en ${destination}.` : sample.descent ? `El descenso es una ilustración: el modelo no calcula el frenado ni el combustible. Lo que sí es real es el relieve y la luz de ${destination} en la fecha elegida. Después, evalúa si la misión sobrevive.` : lunarGravity ? `La nave entra en la zona donde manda la gravedad de la Luna (unos ${SOI_LABEL.toLocaleString('es')} km). Desde aquí, una misión real frena para quedar en órbita lunar.` : 'La Luna también se mueve. La nave se dirige al lugar donde estará al llegar, no a su posición actual.'}</p>
        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Transferencia calculada</dt><dd className="tabular-nums text-ink">{formatDuration(orbit.durationSeconds / 3600)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Tiempo en transferencia</dt><dd className="tabular-nums text-ink">{launch ? 'Aún no comienza' : formatDuration(sample.seconds / 3600)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Distancia al centro terrestre</dt><dd className="tabular-nums text-earth">{launch ? '—' : Math.round(sample.radiusKm).toLocaleString('es') + ' km'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Velocidad respecto a la Tierra</dt><dd className="tabular-nums text-ink">{launch ? '—' : sample.speedKmS.toFixed(2) + ' km/s'}</dd></div>
        </dl>
        <Button variant="primary" size="lg" className="mt-6 w-full" onClick={onArrive}>Evaluar misión en la Luna →</Button>
      </div>
    </div>
    <Disclosure className="mt-6" title="Cómo se calcula el viaje" description="Qué se calcula, qué es ilustración y de dónde salen los datos.">
      <div className="grid gap-8 md:grid-cols-3 md:gap-10">
        <section>
          <h4 className="text-sm font-bold text-ink">Lo que se calcula</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">Una elipse de dos cuerpos, desde una órbita de 200 km hasta 100 km sobre la Luna, con la Luna en órbita circular a su distancia media.</p>
          <dl className="mt-4 divide-y divide-seam text-sm">
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Duración</dt><dd className="tabular-nums text-ink">{formatDuration(orbit.durationSeconds / 3600)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Impulso de salida</dt><dd className="tabular-nums text-ink">{orbit.injectionDeltaVKmS.toFixed(2)} km/s</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Sale de la órbita</dt><dd className="text-right tabular-nums text-ink">{formatDateTime(departure)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Llega a la Luna</dt><dd className="text-right tabular-nums text-ink">{formatDateTime(arrival)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Ahora en el viaje</dt><dd className="text-right tabular-nums text-ink">{formatDateTime(clock)}</dd></div>
          </dl>
        </section>
        <section>
          <h4 className="text-sm font-bold text-ink">Lo que es ilustración</h4>
          <ul className="mt-2 list-disc space-y-2.5 pl-5 marker:text-ink-faint text-sm leading-relaxed text-ink-muted">
            <li>La fecha se ancla al alunizaje elegido; no es una ventana real de lanzamiento.</li>
            <li>No incluye la gravedad de la Luna ni del Sol, la captura en órbita lunar ni el frenado.</li>
            <li>El despegue y el descenso son animaciones: no se calcula el combustible. El humo y el escape son efectos visuales.</li>
            <li>La misma nave hace todo el recorrido; no representa un vehículo CLPS concreto.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-ink">La batería y los datos del módulo se simulan desde el alunizaje, aparte del viaje.</p>
        </section>
        <section>
          <h4 className="text-sm font-bold text-ink">Fuentes</h4>
          <ul className="mt-2 space-y-2.5 text-sm leading-relaxed text-ink-muted">
            <li><a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://ssd.jpl.nasa.gov/astro_par.html">Constantes JPL</a> y <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html">datos Tierra–Luna de NASA</a>: la órbita.</li>
            <li>NASA: la Tierra (Blue Marble) y el cohete Saturn V. La Luna: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://svs.gsfc.nasa.gov/4720/">NASA SVS, CGI Moon Kit</a>.</li>
            <li>Kennedy desde el aire: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer">USGS / USDA, NAIP</a>. Florida y el Caribe: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://nasa-gibs.github.io/gibs-api-docs/">NASA GIBS</a>.</li>
            <li>Plataforma y torre: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://science.nasa.gov/3d-resources/mobile-launcher/">NASA / Samuel H. Neblett, Mobile Launcher</a>. Referencia visual, no un lanzamiento concreto.</li>
          </ul>
        </section>
      </div>
    </Disclosure>
    <p className="mt-4 text-sm text-ink-muted">La transferencia avanza a la escala elegida (1 segundo en pantalla = {scale} horas de viaje). El despegue y el descenso duran 10 s cada uno y son ilustrativos. Puedes pausar, arrastrar la línea de tiempo o usar las flechas del teclado.</p>
  </section>
}
