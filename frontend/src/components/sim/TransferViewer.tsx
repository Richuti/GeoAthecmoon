// Solo carga modelos GLB. La cámara va junto a la nave: de frente durante la salida y el viaje (la Tierra se ve
// detrás, alejándose) y detrás de ella al llegar (la Luna crece delante). La trayectoria completa se dibuja en un
// mapa SVG de la esquina, con las posiciones del modelo orbital (src/sim/transfer.ts).
import { Html } from '@react-three/drei'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS_KM, MOON_RADIUS_KM, transferAt, type journeyAt, type TransferOrbit } from '../../sim/transfer'
import { LAUNCH_SITE, earthDirection, earthNorth } from '../../sim/earthImagery'
import { DESCENT_CAMERA_START_ELEV_DEG, DESCENT_CAMERA_START_KM, approachState, finalLeg } from '../../sim/transferView'
import { SpaceBackground } from '../SpaceBackground'
import { useEarthModel, useFlightModel, useGlobeModel } from './useFlightModel'
import { useJourneyCamera } from './JourneyCamera'

const KM_PER_UNIT = 50000
/**
 * Largo con que se dibuja el cohete en el viaje (km). A escala real (110 m) no se vería junto a la Tierra y la
 * Luna, que sí van a su tamaño real. La cámara se sitúa a unas tres naves de distancia. Lo dice la leyenda.
 */
export const TRANSFER_SHIP_KM = 40
const CAMERA_KM = TRANSFER_SHIP_KM * 3.2
/** Distancia de la cámara en la órbita lunar: el globo se ve entero y nítido. */
const ORBIT_VIEW_KM = 1500
/** Tamaño de la nave al terminar la llegada: el mismo que en el descenso (110 m × 4). */
const DESCENT_SHIP_KM = 0.44
// La nave sale por +X: se gira la Tierra para que Kennedy quede justo debajo, con el norte hacia +Y.
const LAUNCH_FACING = (() => {
  const up = new THREE.Vector3(...earthDirection(LAUNCH_SITE.latDeg, LAUNCH_SITE.lonDeg))
  const north = new THREE.Vector3(...earthNorth(LAUNCH_SITE.latDeg, LAUNCH_SITE.lonDeg))
  const targetUp = new THREE.Vector3(1, 0, 0)
  const targetNorth = new THREE.Vector3(0, 1, 0)
  const from = new THREE.Matrix4().makeBasis(up, north, new THREE.Vector3().crossVectors(up, north))
  const to = new THREE.Matrix4().makeBasis(targetUp, targetNorth, new THREE.Vector3().crossVectors(targetUp, targetNorth))
  return new THREE.Quaternion().setFromRotationMatrix(to.multiply(from.transpose()))
})()
const smooth = (from: number, to: number, x: number) => { const t = Math.max(0, Math.min(1, (x - from) / (to - from))); return t * t * (3 - 2 * t) }
const logLerp = (a: number, b: number, t: number) => Math.exp(THREE.MathUtils.lerp(Math.log(a), Math.log(b), t))
const Z = new THREE.Vector3(0, 0, 1)
const UP = new THREE.Vector3(0, 1, 0)

interface SceneProps {
  orbit: TransferOrbit
  sample: ReturnType<typeof journeyAt>
  reduced: boolean
  onReady: () => void
  cameraReset?: number
  active?: boolean
}

function TransferScene({ sample, reduced, onReady, cameraReset = 0, active = true }: SceneProps) {
  const flightCamera = useJourneyCamera(cameraReset, active)
  const earth = useEarthModel()
  const moon = useGlobeModel('/models/moon.glb')
  // La misma nave del despegue y del alunizaje.
  const rocket = useFlightModel('/models/launch_vehicle.glb')
  const moonMap = useLoader(THREE.TextureLoader, '/textures/flight/moon-lroc.jpg')
  const planetMaterials = useMemo(() => {
    moonMap.colorSpace = THREE.SRGBColorSpace
    // Filtrado anisótropo: cerca del polo la imagen equirectangular se estira y sin él se ve una mancha radial.
    moonMap.anisotropy = 16
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
  const ship = useRef<THREE.Group>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const v = useMemo(() => ({
    ship: new THREE.Vector3(), moon: new THREE.Vector3(), radial: new THREE.Vector3(), velocity: new THREE.Vector3(),
    toMoon: new THREE.Vector3(), nose: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(),
    cam: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(), lookB: new THREE.Vector3(), dir: new THREE.Vector3(), tangent: new THREE.Vector3(),
  }), [])
  useEffect(onReady, [onReady])

  useFrame(() => {
    const { flight, launch: isLaunch } = sample
    // Posiciones en km; se pasan a unidades de escena al final.
    v.moon.set(sample.moonXKm, sample.moonYKm, 0)
    moonGroup.current?.position.copy(v.moon).divideScalar(KM_PER_UNIT)
    let shipKm = TRANSFER_SHIP_KM
    // Vertical de la cámara: la de la Tierra en la salida y el viaje (el cohete sube y la Tierra queda abajo);
    // gira poco a poco hacia +Z al llegar a la Luna.
    const up = v.up.set(0, 0, 1)
    let upBlend = 1
    let dim = 0

    if (!sample.descent) {
      v.ship.set(sample.shipXKm, sample.shipYKm, 0)
      v.radial.copy(v.ship).normalize()
      v.velocity.set(sample.vxKmS, sample.vyKmS, 0).normalize()
      // Sale vertical de la plataforma y, ya en órbita, apunta hacia donde avanza.
      v.nose.copy(v.radial).lerp(v.velocity, isLaunch ? 0 : smooth(0, 0.02, flight)).normalize()
      // Salida de la atmósfera: la misma toma con que termina la escena del despegue (LaunchViewer: cámara
      // arriba y al sur-este del cohete, vertical = la de la Tierra), pasada a este marco: este = −Z,
      // vertical = +X (radial), sur = −Y. Ya en órbita pasa a la toma de frente: más allá de la nave,
      // mirándola, con la Tierra detrás, que se aleja.
      const cruise = isLaunch ? 0 : smooth(0, 0.04, flight)
      v.a.copy(v.radial).multiplyScalar(1.3).addScaledVector(UP, -0.65).addScaledVector(Z, -0.35).normalize()
      v.b.copy(v.radial).addScaledVector(Z, 0.55).addScaledVector(isLaunch ? v.radial : v.velocity, 0.35).normalize()
      v.a.lerp(v.b, cruise).normalize()
      v.cam.copy(v.ship).addScaledVector(v.a, CAMERA_KM)
      v.look.copy(v.ship).addScaledVector(v.radial, -CAMERA_KM * 0.6 * cruise)
      up.copy(v.radial).lerp(UP, cruise).normalize()
      // Al acercarse a la Luna: la cámara pasa por encima de la nave y mira hacia la Luna, que crece delante.
      const arrive = reduced ? 0 : smooth(0.8, 0.96, flight)
      upBlend = arrive
      if (arrive > 0) {
        v.toMoon.copy(v.moon).sub(v.ship).normalize()
        v.b.copy(v.toMoon).negate().addScaledVector(Z, 0.45).normalize()
        v.a.lerp(v.b, arrive).normalize()
        // Al final se aleja a 1500 km: el globo entero se ve nítido (de cerca su textura se ve borrosa).
        v.cam.copy(v.ship).addScaledVector(v.a, logLerp(CAMERA_KM, ORBIT_VIEW_KM, smooth(0.95, 1, flight)))
        v.lookB.copy(v.ship).addScaledVector(v.toMoon, CAMERA_KM * 1.5)
        v.look.lerp(v.lookB, arrive)
      }
    } else {
      // Llegada: un cuarto de órbita hasta el polo sur; termina con la cámara como empieza el descenso.
      const leg = finalLeg(sample.descentProgress)
      const st = approachState(leg.approach)
      v.dir.set(...st.dir)
      v.tangent.set(...st.tangent)
      v.ship.copy(v.moon).addScaledVector(v.dir, MOON_RADIUS_KM + st.altitudeKm)
      v.nose.copy(v.tangent).lerp(v.dir, st.upright).normalize()
      shipKm = logLerp(TRANSFER_SHIP_KM, DESCENT_SHIP_KM, st.overhead)
      v.a.copy(v.dir).addScaledVector(Z, 0.45).normalize()
      // A 1500 km se ve el globo entero mientras la nave gira hacia el polo sur; al final baja a 600 km.
      v.cam.copy(v.ship).addScaledVector(v.a, ORBIT_VIEW_KM)
      v.look.copy(v.ship).addScaledVector(v.dir, -CAMERA_KM * 1.5)
      const elev = DESCENT_CAMERA_START_ELEV_DEG * Math.PI / 180
      v.b.copy(v.dir).multiplyScalar(Math.sin(elev)).addScaledVector(Z, Math.cos(elev))
      v.cam.lerp(v.lookB.copy(v.ship).addScaledVector(v.b, DESCENT_CAMERA_START_KM), st.overhead)
      v.look.lerp(v.ship, st.overhead)
      dim = st.overhead
    }
    // Al bajar sobre el sitio, la luz del globo se atenúa hasta parecerse a la del relieve, que usa el Sol
    // real de la fecha (rasante en el polo sur): así el relieve no aparece como un hueco oscuro.
    if (ambient.current) ambient.current.intensity = 0.75 * (1 - 0.8 * dim)
    if (sun.current) sun.current.intensity = 3 * (1 - 0.8 * dim)

    flightCamera.update(v.cam.divideScalar(KM_PER_UNIT), v.look.divideScalar(KM_PER_UNIT), v.up.copy(up).lerp(Z, upBlend).normalize(), v.a.copy(v.ship).divideScalar(KM_PER_UNIT))

    if (ship.current) {
      ship.current.position.copy(v.ship).divideScalar(KM_PER_UNIT)
      ship.current.quaternion.setFromUnitVectors(UP, v.nose)
      ship.current.scale.setScalar(shipKm / KM_PER_UNIT)
    }
  })

  return <>
    {flightCamera.orbit}
    <SpaceBackground />
    <ambientLight ref={ambient} intensity={0.75} />
    <directionalLight ref={sun} position={[8, 5, 10]} intensity={3} />
    <group scale={EARTH_RADIUS_KM * 2 / KM_PER_UNIT}>
      <group quaternion={LAUNCH_FACING}><primitive object={earth} dispose={null} /></group>
    </group>
    {/* El polo sur del modelo lunar queda en −Y: la llegada baja hacia allí. */}
    <group ref={moonGroup} scale={MOON_RADIUS_KM * 2 / KM_PER_UNIT}><primitive object={moon} dispose={null} /></group>
    <group ref={ship}><primitive object={rocket} dispose={null} /></group>
    {!sample.launch && !sample.descent && sample.flight < 0.75 && <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }}>
      <span aria-hidden className="whitespace-nowrap text-xs text-earth">Tierra</span>
    </Html>}
  </>
}

/** Mapa de la esquina: toda la trayectoria de dos cuerpos, el arco de la Luna y la posición actual. */
function TrajectoryMap({ orbit, sample }: { orbit: TransferOrbit; sample: ReturnType<typeof journeyAt> }) {
  const geometry = useMemo(() => {
    const times = Array.from({ length: 121 }, (_, j) => orbit.durationSeconds * (j / 120) ** 2)
    const route = times.map(t => transferAt(orbit, t))
    const moonArc = Array.from({ length: 41 }, (_, j) => transferAt(orbit, orbit.durationSeconds * j / 40))
    return { times, route, moonArc }
  }, [orbit])
  // Caja en km: de la Luna (izquierda) a la Tierra (derecha); el eje Y del mapa crece hacia abajo.
  const minX = -orbit.apoapsisKm - 30000, maxX = 30000, minY = -30000, maxY = geometry.moonArc[0].moonYKm + 30000
  const w = 168, h = Math.round(w * (maxY - minY) / (maxX - minX))
  const px = (x: number) => ((x - minX) / (maxX - minX)) * w
  const py = (y: number) => h - ((y - minY) / (maxY - minY)) * h
  const line = (pts: { x: number; y: number }[]) => pts.map((p, j) => `${j ? 'L' : 'M'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join('')
  const route = geometry.route.map(p => ({ x: p.xKm, y: p.yKm }))
  const done = [...geometry.route.filter((_, j) => geometry.times[j] < sample.seconds).map(p => ({ x: p.xKm, y: p.yKm })), { x: sample.shipXKm, y: sample.shipYKm }]
  const shipX = sample.launch ? EARTH_RADIUS_KM : sample.descent ? -orbit.apoapsisKm : sample.shipXKm
  const shipY = sample.launch || sample.descent ? 0 : sample.shipYKm
  return <svg aria-hidden width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
    <path d={line(geometry.moonArc.map(p => ({ x: p.moonXKm, y: p.moonYKm })))} fill="none" stroke="#e8ebf1" strokeOpacity={0.3} strokeDasharray="1 3" />
    <path d={line(route)} fill="none" stroke="#e8ebf1" strokeOpacity={0.35} strokeDasharray="3 3" />
    {!sample.launch && <path d={line(done)} fill="none" stroke="#e8ebf1" strokeOpacity={0.9} strokeWidth={1.5} />}
    <circle cx={px(0)} cy={py(0)} r={5} fill="#5aa9ff" />
    <circle cx={px(sample.moonXKm)} cy={py(sample.moonYKm)} r={3.5} fill="#cfd3da" />
    <circle cx={px(shipX)} cy={py(shipY)} r={2.5} fill="#ffffff" />
    <circle cx={px(shipX)} cy={py(shipY)} r={6} fill="none" stroke="#ffffff" strokeOpacity={0.6} />
    <text x={px(0)} y={py(0) + 16} fill="#5aa9ff" fontSize={10} textAnchor="middle">Tierra</text>
    <text x={px(sample.moonXKm)} y={py(sample.moonYKm) - 8} fill="#cfd3da" fontSize={10} textAnchor="middle">Luna</text>
  </svg>
}

export default function TransferViewer({ orbit, sample, reduced, onReady, active = true, cameraReset = 0 }: SceneProps) {
  return <>
    <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, 1.5]} gl={{ logarithmicDepthBuffer: true }}
      camera={{ position: [0.14, 0, 0.42], fov: 42, near: 0.000001, far: 100 }} aria-hidden>
      <Suspense fallback={null}><TransferScene orbit={orbit} sample={sample} reduced={reduced} onReady={onReady} cameraReset={cameraReset} active={active} /></Suspense>
    </Canvas>
    {!sample.launch && !sample.descent && <div aria-hidden className="pointer-events-none absolute bottom-20 left-3 origin-bottom-left scale-[0.62] rounded-hw bg-void/60 p-2 backdrop-blur-sm sm:bottom-14 sm:left-6 sm:scale-100">
      <TrajectoryMap orbit={orbit} sample={sample} />
    </div>}
  </>
}
