// Solo carga modelos GLB. La órbita, el tramo recorrido, el arco de la Luna y la marca de la nave se dibujan
// en SVG, proyectando las posiciones calculadas por el modelo orbital (src/sim/transfer.ts).
import { Html } from '@react-three/drei'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS_KM, MOON_RADIUS_KM, transferAt, type journeyAt, type TransferOrbit } from '../../sim/transfer'
import { LAUNCH_SITE, earthDirection, earthNorth } from '../../sim/earthImagery'
import { departureFrame, encounterFrame, overviewFrame } from '../../sim/transferView'
import { SpaceBackground } from '../SpaceBackground'
import { useEarthModel, useFlightModel, useGlobeModel } from './useFlightModel'

const KM_PER_UNIT = 50000
/** Realce de los cuerpos en la vista general (a escala real la Luna sería un punto). Lo dice la leyenda. */
const EARTH_BOOST = 4
const MOON_BOOST = 5
// La nave sale por +X. Se gira la Tierra para que Kennedy quede bajo esa salida, inclinada 40° hacia la
// cámara (+Z) para que Florida se vea, con el norte hacia arriba (+Y). Se alinean dos ejes del sitio:
// la vertical y el norte local.
const LAUNCH_FACING = (() => {
  const up = new THREE.Vector3(...earthDirection(LAUNCH_SITE.latDeg, LAUNCH_SITE.lonDeg))
  const north = new THREE.Vector3(...earthNorth(LAUNCH_SITE.latDeg, LAUNCH_SITE.lonDeg))
  const targetUp = new THREE.Vector3(Math.cos(40 * Math.PI / 180), 0, Math.sin(40 * Math.PI / 180))
  const targetNorth = new THREE.Vector3(0, 1, 0)
  const from = new THREE.Matrix4().makeBasis(up, north, new THREE.Vector3().crossVectors(up, north))
  const to = new THREE.Matrix4().makeBasis(targetUp, targetNorth, new THREE.Vector3().crossVectors(targetUp, targetNorth))
  return new THREE.Quaternion().setFromRotationMatrix(to.multiply(from.transpose()))
})()
const smooth = (from: number, to: number, x: number) => { const t = Math.max(0, Math.min(1, (x - from) / (to - from))); return t * t * (3 - 2 * t) }
/** Interpola distancias de cámara en escala logarítmica: el alejamiento se siente parejo. */
const logLerp = (a: number, b: number, t: number) => Math.exp(THREE.MathUtils.lerp(Math.log(a), Math.log(b), t))

interface Overlay {
  route: RefObject<SVGPathElement | null>
  done: RefObject<SVGPathElement | null>
  moonPath: RefObject<SVGPathElement | null>
  marker: RefObject<SVGGElement | null>
}

interface SceneProps {
  orbit: TransferOrbit
  sample: ReturnType<typeof journeyAt>
  reduced: boolean
  onReady: () => void
  overlay: Overlay
}

function TransferScene({ orbit, sample, reduced, onReady, overlay }: SceneProps) {
  const earth = useEarthModel()
  const moon = useGlobeModel('/models/moon.glb')
  // La misma nave del despegue y del alunizaje.
  const rocket = useFlightModel('/models/launch_vehicle.glb')
  const moonMap = useLoader(THREE.TextureLoader, '/textures/flight/moon-lroc.jpg')
  const planetMaterials = useMemo(() => {
    moonMap.colorSpace = THREE.SRGBColorSpace
    const materials: THREE.Material[] = []
    for (const [model, map] of [[earth, null], [moon, moonMap]] as const) model.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const mesh = object as THREE.Mesh
      const source = mesh.material as THREE.MeshStandardMaterial
      const material = source.clone()
      material.side = THREE.DoubleSide
      material.map = map ?? source.map
      if (map) { material.map!.flipY = false; material.color.set(0xffffff) }
      // Las caras del GLB miran hacia dentro (también tras el reflejo, que Three.js compensa): desde fuera
      // se ven sus reversos y la normal saldría invertida. Se corrige el sombreado sin alterar la geometría.
      material.onBeforeCompile = shader => { shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = -objectNormal;') }
      material.customProgramCacheKey = () => 'planet-inward-faces-v1'
      mesh.material = material
      materials.push(material)
    })
    return materials
  }, [earth, moon, moonMap])
  useEffect(() => () => planetMaterials.forEach(material => material.dispose()), [planetMaterials])
  const moonGroup = useRef<THREE.Group>(null)
  const earthGroup = useRef<THREE.Group>(null)
  const ship = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  // Trayectoria y recorrido de la Luna, muestreados del mismo modelo que mueve los cuerpos.
  // Muestreo más denso al principio: cerca de la Tierra la nave va a 10 km/s y la curva cambia rápido.
  const routeTimes = useMemo(() => Array.from({ length: 241 }, (_, j) => orbit.durationSeconds * (j / 240) ** 2.5), [orbit])
  const route = useMemo(() => routeTimes.map(t => {
    const p = transferAt(orbit, t)
    return new THREE.Vector3(p.xKm / KM_PER_UNIT, p.yKm / KM_PER_UNIT, 0)
  }), [orbit, routeTimes])
  const moonRoute = useMemo(() => Array.from({ length: 61 }, (_, j) => {
    const p = transferAt(orbit, orbit.durationSeconds * j / 60)
    return new THREE.Vector3(p.moonXKm / KM_PER_UNIT, p.moonYKm / KM_PER_UNIT, 0)
  }), [orbit])
  const point = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  useEffect(onReady, [onReady])

  useFrame(() => {
    const { flight, launch: isLaunch } = sample
    const aspect = size.width / size.height
    const x = sample.shipXKm / KM_PER_UNIT
    const y = sample.shipYKm / KM_PER_UNIT
    const mx = sample.moonXKm / KM_PER_UNIT
    const my = sample.moonYKm / KM_PER_UNIT
    moonGroup.current?.position.set(mx, my, 0)

    // Tres encuadres: salida (Tierra y nave), vista general (todo el viaje) y encuentro (nave y Luna).
    const wide = reduced ? 1 : smooth(0.01, 0.14, flight)
    const close = reduced ? 0 : smooth(0.72, 1, flight)
    const moonSeparationKm = Math.hypot(x - mx, y - my) * KM_PER_UNIT
    const earthRadius = EARTH_RADIUS_KM * (1 + (EARTH_BOOST - 1) * wide * (1 - close))
    const moonRadius = Math.min(MOON_RADIUS_KM * (1 + (MOON_BOOST - 1) * wide * (1 - close) ** 2), Math.max(MOON_RADIUS_KM, moonSeparationKm * 0.8))
    earthGroup.current?.scale.setScalar(earthRadius * 2 / KM_PER_UNIT)
    moonGroup.current?.scale.setScalar(moonRadius * 2 / KM_PER_UNIT)

    const depart = departureFrame(sample, EARTH_RADIUS_KM, aspect)
    const overview = overviewFrame(orbit, aspect, EARTH_RADIUS_KM * EARTH_BOOST, MOON_RADIUS_KM * MOON_BOOST)
    const shipSizeKm = Math.min(100, moonSeparationKm * 0.5)
    const encounter = encounterFrame(sample, moonRadius, shipSizeKm, aspect)
    // La leyenda ocupa la franja inferior: la vista general se corre hacia abajo para dejarle espacio.
    const overviewY = overview.yKm - overview.distanceKm * Math.tan(21 * Math.PI / 180) * 0.1
    const cx = THREE.MathUtils.lerp(THREE.MathUtils.lerp(depart.xKm, overview.xKm, wide), encounter.xKm, close)
    const cy = THREE.MathUtils.lerp(THREE.MathUtils.lerp(depart.yKm, overviewY, wide), encounter.yKm, close)
    const distanceKm = logLerp(logLerp(depart.distanceKm, overview.distanceKm * 1.12, wide), encounter.distanceKm, close)
    camera.position.set(cx / KM_PER_UNIT, cy / KM_PER_UNIT, distanceKm / KM_PER_UNIT)
    camera.lookAt(cx / KM_PER_UNIT, cy / KM_PER_UNIT, 0)
    camera.updateMatrixWorld()

    // El cohete se ve mientras su tamaño en pantalla lo permite (salida y encuentro); en la vista general
    // mediría menos de un píxel y lo reemplaza la marca SVG. Nunca se dibuja dentro de un planeta.
    const clearanceKm = Math.min(sample.radiusKm - EARTH_RADIUS_KM, moonSeparationKm - MOON_RADIUS_KM)
    const visualKm = Math.min(THREE.MathUtils.lerp(distanceKm * 0.07, shipSizeKm, close), Math.max(1, clearanceKm * 1.6))
    if (ship.current) {
      ship.current.visible = !isLaunch
      direction.set(isLaunch ? 1 : sample.vxKmS, isLaunch ? 0 : sample.vyKmS, 0).normalize()
      ship.current.quaternion.setFromUnitVectors(up, direction)
      ship.current.position.set(x, y, 0.0002)
      ship.current.scale.setScalar(visualKm / KM_PER_UNIT)
    }

    const project = (v: THREE.Vector3) => {
      point.copy(v).project(camera)
      return `${((point.x + 1) * size.width / 2).toFixed(1)},${((1 - point.y) * size.height / 2).toFixed(1)}`
    }
    const path = (points: THREE.Vector3[]) => points.map((v, j) => `${j ? 'L' : 'M'}${project(v)}`).join(' ')
    overlay.route.current?.setAttribute('d', path(route))
    overlay.moonPath.current?.setAttribute('d', path(moonRoute))
    // Tramo recorrido: puntos de la ruta hasta el instante actual, más la posición exacta de la nave.
    const travelled = isLaunch ? [] : [...route.filter((_, j) => routeTimes[j] < sample.seconds), new THREE.Vector3(x, y, 0)]
    overlay.done.current?.setAttribute('d', travelled.length > 1 ? path(travelled) : '')
    if (overlay.marker.current) {
      overlay.marker.current.setAttribute('transform', `translate(${project(new THREE.Vector3(x, y, 0))})`)
      // En la salida se ve el propio cohete; desde que se aleja, el anillo marca dónde está.
      overlay.marker.current.style.opacity = isLaunch ? '0' : String(Math.max(wide, close))
    }
  })

  return <>
    <SpaceBackground />
    <ambientLight intensity={0.75} />
    <directionalLight position={[8, 5, 10]} intensity={3} />
    <group ref={earthGroup} scale={EARTH_RADIUS_KM * 2 / KM_PER_UNIT}>
      <group quaternion={LAUNCH_FACING}><primitive object={earth} dispose={null} /></group>
      <Html position={[0, -0.7, 0]} center style={{ pointerEvents: 'none' }}><span aria-hidden className="whitespace-nowrap text-xs text-earth">Tierra</span></Html>
    </group>
    <group ref={moonGroup} scale={MOON_RADIUS_KM * 2 / KM_PER_UNIT}>
      <primitive object={moon} dispose={null} />
      <Html position={[0, -0.8, 0]} center style={{ pointerEvents: 'none' }}><span aria-hidden className="whitespace-nowrap text-xs text-ink-muted">Luna</span></Html>
    </group>
    <group ref={ship}><primitive object={rocket} dispose={null} /></group>
    {sample.flight > 0.05 && sample.flight < 0.88 && <Html position={[-orbit.apoapsisKm / KM_PER_UNIT, 0, 0]} style={{ pointerEvents: 'none' }}>
      {/* Anclado por la izquierda: el texto crece hacia dentro del cuadro, no se corta en el borde. */}
      <span aria-hidden className="ml-2 mt-2 block whitespace-nowrap text-xs text-ink-muted">Encuentro previsto</span>
    </Html>}
  </>
}

export default function TransferViewer({ orbit, sample, reduced, onReady, active = true }: Omit<SceneProps, 'overlay'> & { active?: boolean }) {
  const overlay: Overlay = { route: useRef(null), done: useRef(null), moonPath: useRef(null), marker: useRef(null) }
  return <>
    <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ position: [0.14, 0, 0.42], fov: 42, near: 0.00001, far: 100 }} aria-hidden>
      <Suspense fallback={null}><TransferScene orbit={orbit} sample={sample} reduced={reduced} onReady={onReady} overlay={overlay} /></Suspense>
    </Canvas>
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-hidden">
      {/* Recorrido de la Luna durante el viaje: llega al punto de encuentro a la vez que la nave. */}
      <path ref={overlay.moonPath} fill="none" stroke="#e8ebf1" strokeOpacity={0.22} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round" />
      <path ref={overlay.route} fill="none" stroke="#e8ebf1" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4 5" />
      <path ref={overlay.done} fill="none" stroke="#e8ebf1" strokeOpacity={0.85} strokeWidth={1.75} strokeLinecap="round" />
      <g ref={overlay.marker} style={{ opacity: 0 }}>
        <circle r={9} fill="none" stroke="#e8ebf1" strokeOpacity={0.55} strokeWidth={1} />
        <circle r={3.5} fill="#ffffff" />
        <text x={14} y={-10} fill="#e8ebf1" fontSize={12}>Nave</text>
      </g>
    </svg>
  </>
}
