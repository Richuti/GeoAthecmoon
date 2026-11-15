import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { formatDateTime, formatDuration, indexAt } from '../../lib/time'
import { EARTH_RADIUS_KM, LAUNCH_END, DESCENT_START, MOON_GM_KM3_S2, MOON_RADIUS_KM, MOON_SOI_KM, TIME_SCALES_H_PER_S, journeyAt, lunarTransfer, transferPlaybackSeconds } from '../../sim/transfer'
import { LUNAR_ORBIT_ALT_KM, descentAt, descentOrbit, earthMoonDistanceKm, hyperbolicSpeedKmS, lunarCapture } from '../../sim/lunarArrival'
import { APPROACH_FADE, TOUCHDOWN, approachState, descentFrame, descentProfileOf, finalLeg, terrainScreenFraction } from '../../sim/transferView'
import { Button, Disclosure, Segmented } from '../ui'
import type { SiteData } from '../../types'

const TransferViewer = lazy(() => import('./TransferViewer'))
const LaunchViewer = lazy(() => import('./LaunchViewer'))
const DescentViewer = lazy(() => import('./DescentViewer'))

const SOI_LABEL = Math.round(MOON_SOI_KM / 100) * 100

const SCALE_OPTIONS = TIME_SCALES_H_PER_S.map(h => ({ value: String(h), label: `1 s = ${h} h` }))

/** Altura legible: kilómetros arriba de 1 km, metros cerca del suelo. */
const formatAltitude = (km: number) => km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(km * 1000)} m`
const formatClock = (seconds: number) => `${Math.floor(seconds / 60)} min ${String(Math.floor(seconds % 60)).padStart(2, '0')} s`
const formatKg = (kg: number) => `${Math.round(kg).toLocaleString('es')} kg`

type Stat = { label: string; value: string; tone?: 'earth' | 'sun' }

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
  // El despegue no espera a las texturas de la Luna. Si falta la siguiente escena, espera en su fase.
  const ready = progress < LAUNCH_END * .8 ? launchReady : progress < LAUNCH_END ? launchReady && orbitalReady : progress < DESCENT_START ? orbitalReady : descentReady
  const [failed, setFailed] = useState(false)
  /** Horas de viaje por segundo en pantalla durante la transferencia. */
  const [scale, setScale] = useState('5')
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const arrivalMs = arrival.getTime()
  // Distancia Tierra–Luna el día de llegada, de las efemérides de JPL Horizons del sitio (media si faltan).
  const moonDistanceKm = useMemo(() => {
    const k = indexAt(data, arrivalMs, data.earth.el.length)
    const d = data.earth.distKm?.[k]
    return d !== undefined && Number.isFinite(d) ? earthMoonDistanceKm(d, data.earth.el[k]) : undefined
  }, [data, arrivalMs])
  const orbit = useMemo(() => lunarTransfer(200, moonDistanceKm), [moonDistanceKm])
  // Captura en órbita lunar, órbita de descenso y descenso propulsado (lunarArrival.ts).
  const capture = useMemo(() => lunarCapture(orbit), [orbit])
  const coast = useMemo(() => descentOrbit(), [])
  const powered = useMemo(() => descentProfileOf(), [])
  const onLaunchReady = useCallback(() => setLaunchReady(true), [])
  const onOrbitalReady = useCallback(() => setOrbitalReady(true), [])
  const onDescentReady = useCallback(() => setDescentReady(true), [])
  const onFail = useCallback(() => setFailed(true), [])
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
  const approach = approachState(leg.approach)
  const pdiSeconds = Math.min(1, leg.descent / TOUCHDOWN) * powered.durationSeconds
  const now = descentAt(powered, pdiSeconds)
  // El relieve LOLA cubre 300 km: aparece desde el centro y se abre hacia los bordes mientras la cámara baja,
  // con el globo lunar alrededor. Así nunca se ve el borde cuadrado del recorte.
  // La máscara se calcula con el tamaño del relieve en pantalla: siempre queda dentro de él.
  const terrainFraction = terrainScreenFraction(landing.cameraDistanceKm)
  const terrainOpen = terrainFraction * 0.8 >= 1.9
  const terrainMask = terrainOpen ? 'none' : `radial-gradient(circle closest-side at center, #000 ${Math.round(terrainFraction * 50)}%, transparent ${Math.round(terrainFraction * 80)}%)`
  const altitudeM = Math.max(0, sample.shipXKm - EARTH_RADIUS_KM) * 1000
  const complete = progress >= 1
  const moonDistanceKmNow = Math.hypot(sample.shipXKm - sample.moonXKm, sample.shipYKm - sample.moonYKm)
  const lunarGravity = !launch && moonDistanceKmNow < MOON_SOI_KM
  const phase = launch ? sample.ascent < 0.02 ? 'En la plataforma de lanzamiento' : sample.ascent < 0.65 ? 'Ascenso desde la Tierra' : 'Salida hacia la órbita'
    : orbiting ? 'Órbita hacia el polo sur' : sample.descent ? landing.touched ? `Alunizaje en ${destination}` : now.altitudeKm > 2 ? 'Descenso propulsado: frenado' : 'Descenso propulsado: aproximación final'
    : lunarGravity ? 'Llegada a la Luna' : 'Transferencia Tierra–Luna'
  // La nave toca el suelo en la fecha elegida: antes van el descenso propulsado, la caída desde 100 km y la transferencia.
  const departure = new Date(arrivalMs - (orbit.durationSeconds + coast.coastSeconds + powered.durationSeconds) * 1000)
  const missionSeconds = !sample.descent ? sample.seconds : orbit.durationSeconds + (orbiting ? approach.coastSeconds : coast.coastSeconds + pdiSeconds)
  const clock = new Date(departure.getTime() + missionSeconds * 1000)
  const orbitRadiusKm = MOON_RADIUS_KM + approach.altitudeKm
  const orbitSpeedKmS = Math.sqrt(MOON_GM_KM3_S2 * (2 / orbitRadiusKm - 1 / coast.semiMajorKm))
  const lunarSpeedKmS = hyperbolicSpeedKmS(capture.vInfinityKmS, Math.max(moonDistanceKmNow, MOON_RADIUS_KM + LUNAR_ORBIT_ALT_KM))
  const stats: Stat[] = launch ? [
    { label: 'Transferencia calculada', value: formatDuration(orbit.durationSeconds / 3600) },
    { label: 'Distancia Tierra–Luna al llegar', value: `${Math.round(orbit.moonDistanceKm).toLocaleString('es')} km` },
    { label: 'Frenado para quedar en órbita lunar', value: `${capture.loiDeltaVKmS.toFixed(2)} km/s` },
    { label: 'Descenso propulsado', value: formatClock(powered.durationSeconds) },
  ] : orbiting ? [
    { label: 'Frenado de captura (LOI)', value: `${capture.loiDeltaVKmS.toFixed(2)} km/s` },
    { label: 'Órbita polar', value: `${LUNAR_ORBIT_ALT_KM} km · ${Math.round(capture.orbitPeriodSeconds / 60)} min por vuelta` },
    { label: 'Impulso de descenso (DOI)', value: `${(coast.doiDeltaVKmS * 1000).toFixed(1)} m/s` },
    { label: 'Altura sobre la Luna', value: formatAltitude(approach.altitudeKm) },
    { label: 'Velocidad respecto a la Luna', value: `${orbitSpeedKmS.toFixed(2)} km/s` },
  ] : sample.descent ? [
    { label: 'Tiempo de descenso propulsado', value: `${formatClock(now.t)} de ${formatClock(powered.durationSeconds)}` },
    { label: 'Altura sobre el suelo', value: formatAltitude(now.altitudeKm) },
    { label: 'Velocidad horizontal', value: `${Math.round(now.horizontalSpeedMS).toLocaleString('es')} m/s` },
    { label: 'Velocidad vertical', value: `${now.verticalSpeedMS.toFixed(1)} m/s` },
    { label: 'Empuje del motor', value: landing.touched ? 'Apagado' : `${Math.round(now.throttle * 100)} %` },
    { label: 'Propelente restante', value: formatKg(now.propellantKg), tone: 'sun' },
    { label: 'Recorrido sobre la superficie', value: `${Math.round(now.downrangeKm)} de ${Math.round(powered.downrangeKm)} km` },
  ] : [
    { label: 'Transferencia calculada', value: formatDuration(orbit.durationSeconds / 3600) },
    { label: 'Tiempo en transferencia', value: formatDuration(sample.seconds / 3600) },
    { label: 'Distancia al centro terrestre', value: `${Math.round(sample.radiusKm).toLocaleString('es')} km`, tone: 'earth' },
    { label: 'Velocidad respecto a la Tierra', value: `${sample.speedKmS.toFixed(2)} km/s` },
    ...(lunarGravity ? [{ label: 'Velocidad respecto a la Luna', value: `${lunarSpeedKmS.toFixed(2)} km/s` }] : []),
  ]
  const seek = (value: number) => { setPlaying(false); setProgress(value) }
  const cruising = !launch && !sample.descent

  return <section aria-label="Viaje Tierra–Luna">
    <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-4 border-y border-seam py-4">
      <Button variant="primary" size="lg" data-tour="sim-start" disabled={!ready && !failed} aria-label={playing ? 'Pausar viaje' : progress > 0 && !complete ? 'Continuar viaje' : 'Reproducir viaje'} onClick={() => { if (complete) setProgress(0); setPlaying(p => !p) }}>{!ready && !failed ? 'Cargando viaje…' : playing ? 'Pausar viaje' : complete ? 'Repetir viaje' : progress > 0 ? 'Continuar viaje' : 'Iniciar viaje'}</Button>
      <label className="min-w-40 flex-1 text-sm text-ink-muted">Avance del viaje
        <input type="range" aria-label="Avance del viaje Tierra–Luna" aria-valuetext={`${phase}. ${launch ? 'Ascenso ilustrativo' : sample.descent ? 'Descenso propulsado calculado' : formatDuration(sample.seconds / 3600) + ' de transferencia'}.`}
          min={0} max={1} step={0.001} value={progress} onChange={e => seek(Number(e.target.value))} className="range mt-2 w-full" style={{ '--fill': `${progress * 100}%` } as CSSProperties} />
      </label>
      <Segmented label="Escala de tiempo del viaje" options={SCALE_OPTIONS} value={scale} onChange={setScale} />
      <Button size="lg" data-tour="sim-skip" onClick={() => seek(1)}>Ir a la llegada</Button>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="journey-stage glass-viewport relative h-[25rem] min-w-0 overflow-hidden bg-black sm:h-[28rem]">
        <JourneyError onFail={onFail}>
            <div className="absolute inset-0" inert={orbitalBlend >= .5} style={{ opacity: 1 - orbitalBlend, pointerEvents: orbitalBlend < .5 ? 'auto' : 'none' }} aria-hidden>
              <Suspense fallback={null}><LaunchViewer altitudeM={altitudeM} ascent={sample.ascent} reduced={reduced} active={orbitalBlend < 1} onReady={onLaunchReady} /></Suspense>
            </div>
            <div className="absolute inset-0" inert={terrainOpen || orbitalBlend < .5} style={{ opacity: terrainOpen ? 0 : orbitalBlend, pointerEvents: !terrainOpen && orbitalBlend >= .5 ? 'auto' : 'none' }} aria-hidden>
              <Suspense fallback={null}><TransferViewer orbit={orbit} sample={sample} reduced={reduced} active={orbitalBlend > 0 && !terrainOpen} onReady={onOrbitalReady} /></Suspense>
            </div>
            <div className="absolute inset-0" inert={!terrainOpen} style={{ opacity: leg.terrain, maskImage: terrainMask, WebkitMaskImage: terrainMask, pointerEvents: terrainOpen ? 'auto' : 'none' }} aria-hidden>
              <Suspense fallback={null}><DescentViewer data={data} arrival={arrival} progress={leg.descent} active={sample.descent && sample.descentProgress > APPROACH_FADE[0] - 0.04} onReady={onDescentReady} /></Suspense>
            </div>
        </JourneyError>
        {!ready && !failed && <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-ink-muted">Cargando Tierra, Luna y terreno…</p>}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgb(5_7_13/0.9),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 p-5 sm:p-6">
          <p className="text-sm text-ink-muted">
            {cruising ? <><span className="hidden sm:inline">Salida · Viaje · Encuentro</span><span className="font-bold tabular-nums text-ink sm:hidden">Tiempo de viaje {formatDuration(sample.seconds / 3600)} · 1 s = {scale} h · Luna {Math.round(moonDistanceKmNow).toLocaleString('es')} km</span></> : 'Salida · Viaje · Encuentro'}
          </p>
          <h2 aria-live="polite" className="mt-2 text-xl font-bold text-ink">{phase}</h2>
          {/* Pantallas angostas: las cifras van en una línea bajo el título para no tapar la nave. */}
          {sample.descent && <p aria-hidden className="mt-1 text-sm font-bold tabular-nums text-ink sm:hidden">
            {orbiting ? <>{formatAltitude(approach.altitudeKm)} · {orbitSpeedKmS.toFixed(2)} km/s</>
              : <>{formatAltitude(now.altitudeKm)} · {Math.round(now.horizontalSpeedMS)} m/s · <span className="text-sun">{formatKg(now.propellantKg)}</span></>}
          </p>}
        </div>
        {/* Arriba a la derecha: en esta trayectoria la Luna pasa por la izquierda y la Tierra queda abajo. */}
        {/* En pantallas angostas el reloj va en la línea sobre el título: la trayectoria y la Luna pasan por aquí. */}
        {cruising && <div aria-hidden className="pointer-events-none absolute right-6 top-24 hidden text-right sm:block">
          <p className="text-xs text-ink-muted">Tiempo de viaje</p>
          <p className="text-4xl font-bold tabular-nums text-ink">{formatDuration(sample.seconds / 3600)}</p>
          <p className="mt-1 text-xs text-ink-muted">desde que sale de la órbita terrestre · 1 s = {scale} h</p>
          <dl className="mt-3 space-y-1 text-xs tabular-nums">
            <div className="flex justify-end gap-2"><dt className="text-ink-muted">Tierra</dt><dd className="text-earth">{Math.round(sample.radiusKm).toLocaleString('es')} km</dd></div>
            <div className="flex justify-end gap-2"><dt className="text-ink-muted">Luna</dt><dd className="text-ink">{Math.round(moonDistanceKmNow).toLocaleString('es')} km</dd></div>
            <div className="flex justify-end gap-2"><dt className="text-ink-muted">Velocidad</dt><dd className="text-ink">{sample.speedKmS.toFixed(2)} km/s</dd></div>
          </dl>
          {lunarGravity && <p className="mt-3 text-xs font-bold text-ink">Dentro de la influencia lunar</p>}
          {lunarGravity && <p className="mt-1 text-xs tabular-nums text-ink-muted"><span>{lunarSpeedKmS.toFixed(2)} km/s</span> <span>respecto a la Luna</span></p>}
        </div>}
        {/* Llegada y descenso: las cifras calculadas acompañan a la escena. */}
        {sample.descent && <div aria-hidden className="pointer-events-none absolute right-6 top-24 hidden text-right sm:block">
          <p className="text-xs text-ink-muted">{orbiting ? 'Altura sobre la Luna' : 'Altura sobre el suelo'}</p>
          <p className="text-3xl font-bold tabular-nums text-ink sm:text-4xl">{formatAltitude(orbiting ? approach.altitudeKm : now.altitudeKm)}</p>
          <dl className="mt-2 space-y-1 text-xs tabular-nums">
            {orbiting ? <>
              <div className="flex justify-end gap-2"><dt className="text-ink-muted">Velocidad</dt><dd className="text-ink">{orbitSpeedKmS.toFixed(2)} km/s</dd></div>
              <div className="flex justify-end gap-2"><dt className="text-ink-muted">Caída libre</dt><dd className="text-ink">{formatClock(approach.coastSeconds)}</dd></div>
            </> : <>
              <div className="flex justify-end gap-2"><dt className="text-ink-muted">Horizontal</dt><dd className="text-ink">{Math.round(now.horizontalSpeedMS)} m/s</dd></div>
              <div className="flex justify-end gap-2"><dt className="text-ink-muted">Vertical</dt><dd className="text-ink">{now.verticalSpeedMS.toFixed(1)} m/s</dd></div>
              <div className="flex justify-end gap-2"><dt className="text-ink-muted">Empuje</dt><dd className="text-ink">{landing.touched ? 'Apagado' : `${Math.round(now.throttle * 100)} %`}</dd></div>
              <div className="flex justify-end gap-2"><dt className="text-ink-muted">Propelente</dt><dd className="text-sun">{formatKg(now.propellantKg)}</dd></div>
            </>}
          </dl>
        </div>}
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/80 px-5 py-3 text-xs leading-relaxed text-ink-muted">
          {launch ? 'Relieve real USGS 3DEP. Ascenso ilustrativo; el cálculo orbital comienza a 200 km.'
            : orbiting ? 'Captura y caída calculadas con la gravedad lunar. En pantalla el arco hasta el polo se acorta; la altura sigue la órbita calculada.'
            : sample.descent ? 'Descenso propulsado calculado con la gravedad lunar, el empuje y el consumo del módulo lunar Apolo 11, sobre el relieve LOLA real. La nave baja en vertical sobre el sitio; el recorrido horizontal va en cifras.'
            : lunarGravity ? `A menos de ${SOI_LABEL.toLocaleString('es')} km domina la gravedad de la Luna: la velocidad respecto a ella se calcula con cónicas empalmadas.`
            : 'Tierra y Luna a escala real; la nave se dibuja más grande (40 km) para verla. El mapa muestra la trayectoria de dos cuerpos.'}
        </p>
      </div>
      <div className="flex flex-col justify-center px-1 py-2 lg:px-6">
        <h3 className="text-xl font-bold text-ink">De la Tierra al sitio elegido.</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{launch ? `Recorre el viaje y después comprueba la luz, la comunicación y el suelo en ${destination}.` : orbiting ? 'La nave frena en el punto más cercano a la Luna para quedar en una órbita polar de 100 km, que pasa sobre el polo sur en cada vuelta. Un segundo impulso la deja caer hasta 15 km.' : sample.descent ? `El motor frena la nave desde 15 km hasta posarla a 1 m/s en ${destination}, con el relieve y la luz de la fecha elegida. Después, evalúa si la misión sobrevive.` : lunarGravity ? `La nave entra en la zona donde manda la gravedad de la Luna (unos ${SOI_LABEL.toLocaleString('es')} km). Su velocidad respecto a la Luna crece al acercarse.` : 'La Luna también se mueve. La nave se dirige al lugar donde estará al llegar, no a su posición actual.'}</p>
        <dl className="mt-5 space-y-4 text-sm">
          {stats.map(row => <div key={row.label} className="flex justify-between gap-4"><dt className="min-w-0 text-ink-muted">{row.label}</dt><dd className={`shrink-0 whitespace-nowrap text-right tabular-nums ${row.tone === 'earth' ? 'text-earth' : row.tone === 'sun' ? 'text-sun' : 'text-ink'}`}>{row.value}</dd></div>)}
        </dl>
        {/* Un solo botón principal a la vez: mientras no termina el viaje, el principal es «Iniciar viaje». */}
        <Button variant={complete ? 'primary' : 'secondary'} size="lg" data-tour="sim-evaluate" className="mt-6 w-full" onClick={onArrive}>Evaluar misión en la Luna →</Button>
      </div>
    </div>
    <Disclosure className="mt-6" title="Cómo se calcula el viaje" description="Qué se calcula, qué es ilustración y de dónde salen los datos.">
      <div className="grid gap-8 md:grid-cols-3 md:gap-10">
        <section>
          <h4 className="text-sm font-bold text-ink">Lo que se calcula</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">Una elipse de dos cuerpos desde una órbita terrestre de 200 km hasta la distancia real de la Luna el día de llegada. Cerca de la Luna, una hipérbola con su gravedad (cónicas empalmadas), el frenado para quedar en órbita polar de 100 km, el impulso que la baja a 15 km y el descenso propulsado, integrado paso a paso con la gravedad lunar, el empuje y el consumo de propelente.</p>
          <dl className="mt-4 divide-y divide-seam text-sm">
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Distancia Tierra–Luna al llegar</dt><dd className="text-right tabular-nums text-ink">{Math.round(orbit.moonDistanceKm).toLocaleString('es')} km</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Impulso de salida (TLI)</dt><dd className="tabular-nums text-ink">{orbit.injectionDeltaVKmS.toFixed(2)} km/s</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Transferencia</dt><dd className="tabular-nums text-ink">{formatDuration(orbit.durationSeconds / 3600)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Velocidad de llegada respecto a la Luna</dt><dd className="text-right tabular-nums text-ink">{capture.vInfinityKmS.toFixed(2)} km/s</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Frenado de captura (LOI)</dt><dd className="tabular-nums text-ink">{capture.loiDeltaVKmS.toFixed(2)} km/s</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Vuelta en órbita de 100 km</dt><dd className="tabular-nums text-ink">{Math.round(capture.orbitPeriodSeconds / 60)} min</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Impulso de descenso (DOI)</dt><dd className="tabular-nums text-ink">{(coast.doiDeltaVKmS * 1000).toFixed(1)} m/s</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Caída libre de 100 a 15 km</dt><dd className="tabular-nums text-ink">{formatClock(coast.coastSeconds)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Descenso propulsado</dt><dd className="tabular-nums text-ink">{formatClock(powered.durationSeconds)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Frenado del motor en el descenso</dt><dd className="tabular-nums text-ink">{powered.deltaVKmS.toFixed(2)} km/s</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Recorrido sobre la superficie</dt><dd className="tabular-nums text-ink">{Math.round(powered.downrangeKm)} km</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Propelente gastado</dt><dd className="tabular-nums text-ink">{formatKg(powered.doiPropellantKg + powered.propellantUsedKg)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Propelente al tocar el suelo</dt><dd className="tabular-nums text-sun">{formatKg(powered.propellantLeftKg)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Velocidad al tocar el suelo</dt><dd className="tabular-nums text-ink">{powered.touchdownSpeedMS.toFixed(1)} m/s</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Sale de la órbita</dt><dd className="text-right tabular-nums text-ink">{formatDateTime(departure)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Llega a la Luna</dt><dd className="text-right tabular-nums text-ink">{formatDateTime(arrival)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Ahora en el viaje</dt><dd className="text-right tabular-nums text-ink">{formatDateTime(clock)}</dd></div>
          </dl>
        </section>
        <section>
          <h4 className="text-sm font-bold text-ink">Lo que es ilustración</h4>
          <ul className="mt-2 list-disc space-y-2.5 pl-5 marker:text-ink-faint text-sm leading-relaxed text-ink-muted">
            <li>La fecha se ancla al alunizaje elegido; no es una ventana real de lanzamiento ni hay vueltas de espera en órbita lunar.</li>
            <li>El ascenso desde la Tierra es una animación: el cálculo empieza en la órbita de 200 km.</li>
            <li>Simplificaciones del cálculo: Luna esférica y sin concentraciones de masa, sin la gravedad del Sol, frenados de captura y de descenso instantáneos, y motor regulable del 10 al 100 % (el motor real del Apolo evitaba la banda de unos 65 a 92 %).</li>
            <li>En pantalla el tiempo se comprime, el arco hasta el polo se acorta y la nave baja en vertical sobre el sitio. Las cifras son las del cálculo.</li>
            <li>El cohete Saturn V es el modelo visual de todo el recorrido; las cifras de la llegada son las del módulo lunar del Apolo 11. El humo y el polvo son efectos visuales.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-ink">La batería y los datos del módulo se simulan desde el alunizaje, aparte del viaje.</p>
        </section>
        <section>
          <h4 className="text-sm font-bold text-ink">Fuentes</h4>
          <ul className="mt-2 space-y-2.5 text-sm leading-relaxed text-ink-muted">
            <li><a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://ssd.jpl.nasa.gov/astro_par.html">Constantes JPL</a> y <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html">datos Tierra–Luna de NASA</a>: la órbita.</li>
            <li><a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://ssd.jpl.nasa.gov/horizons/">JPL Horizons</a>: la distancia Tierra–Luna el día de llegada, vista desde el sitio.</li>
            <li>Módulo lunar del Apolo 11: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C">NASA NSSDC</a> (15 103 kg, 8 248 kg de propelente de descenso) y su motor de descenso (45.04 kN, impulso específico de 311 s).</li>
            <li>NASA: la Tierra (Blue Marble) y el cohete Saturn V. La Luna: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://svs.gsfc.nasa.gov/4720/">NASA SVS, CGI Moon Kit</a>.</li>
            <li>Kennedy desde el aire: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer">USGS / USDA, NAIP</a>. Florida y el Caribe: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://nasa-gibs.github.io/gibs-api-docs/">NASA GIBS</a>.</li>
            <li>Elevaciones de Kennedy: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer">USGS 3DEP</a>. Suelo real, sin exagerar las alturas.</li>
            <li>Plataforma y torre: <a className="underline decoration-seam-strong underline-offset-4 hover:text-ink hover:decoration-ink" target="_blank" rel="noreferrer" href="https://science.nasa.gov/3d-resources/mobile-launcher/">NASA / Samuel H. Neblett, Mobile Launcher</a>. Referencia visual, no un lanzamiento concreto.</li>
          </ul>
        </section>
      </div>
    </Disclosure>
    <p className="mt-4 text-sm text-ink-muted">La transferencia avanza a la escala elegida (1 segundo en pantalla = {scale} horas de viaje). El despegue y el descenso se muestran en 10 s cada uno; las cifras del descenso avanzan con el tiempo real de la maniobra. Puedes pausar, arrastrar la línea de tiempo o usar las flechas del teclado.</p>
  </section>
}
