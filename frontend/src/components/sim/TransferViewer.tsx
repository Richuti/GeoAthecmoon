// Solo carga modelos GLB. La órbita se dibuja en SVG, proyectando las posiciones calculadas.
import { Html, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS_KM, MOON_RADIUS_KM, transferAt, type journeyAt, type TransferOrbit } from '../../sim/transfer'
import { encounterFrame } from '../../sim/transferView'

const KM_PER_UNIT = 50000
const smooth = (from: number, to: number, x: number) => { const t = Math.max(0, Math.min(1, (x - from) / (to - from))); return t * t * (3 - 2 * t) }

/** Centra y normaliza un GLB sin generar ni modificar su geometría. */
function useModel(url: string) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const group = new THREE.Group()
    const copy = scene.clone(true)
    copy.traverse(o => { if (o.name.startsWith('site-')) o.visible = false })
    group.add(copy)
    const box = new THREE.Box3().setFromObject(copy)
    const size = box.getSize(new THREE.Vector3())
    copy.position.sub(box.getCenter(new THREE.Vector3()))
    group.scale.setScalar(1 / Math.max(size.x, size.y, size.z))
    return group
  }, [scene])
}

interface SceneProps {
  orbit: TransferOrbit
  sample: ReturnType<typeof journeyAt>
  reduced: boolean
  onReady: () => void
  line: RefObject<SVGPathElement | null>
}

function TransferScene({ orbit, sample, reduced, onReady, line }: SceneProps) {
  const earth = useModel('/models/earth.glb')
  const moon = useModel('/models/moon.glb')
  const rocket = useModel('/models/launch_vehicle.glb')
  const lander = useModel('/models/lander.glb')
  const moonGroup = useRef<THREE.Group>(null)
  const earthGroup = useRef<THREE.Group>(null)
  const ship = useRef<THREE.Group>(null)
  const rocketGroup = useRef<THREE.Group>(null)
  const landerGroup = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const route = useMemo(() => Array.from({ length: 241 }, (_, j) => {
    const p = transferAt(orbit, orbit.durationSeconds * j / 240)
    return new THREE.Vector3(p.xKm / KM_PER_UNIT, p.yKm / KM_PER_UNIT, 0)
  }), [orbit])
  const point = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  useEffect(onReady, [onReady])

  useFrame(() => {
    const { flight, ascent, launch: isLaunch } = sample
    const x = sample.shipXKm / KM_PER_UNIT
    const y = sample.shipYKm / KM_PER_UNIT
    const mx = sample.moonXKm / KM_PER_UNIT
    const my = sample.moonYKm / KM_PER_UNIT
    moonGroup.current?.position.set(mx, my, 0)

    const wide = reduced ? 1 : smooth(0, 0.19, flight)
    const close = reduced ? 0 : smooth(0.72, 1, flight)
    const top = Math.max(my, orbit.semiMinorKm / KM_PER_UNIT)
    const wideDistance = Math.max(top / (2 * Math.tan(21 * Math.PI / 180)), 7.7 / (2 * Math.tan(21 * Math.PI / 180) * size.width / size.height)) * 1.7
    const moonSeparationKm = Math.hypot(x - mx, y - my) * KM_PER_UNIT
    const desiredShipSize = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.04, 0.15, wide), 0.002, close)
    const clearanceKm = Math.min(sample.radiusKm - EARTH_RADIUS_KM, moonSeparationKm - MOON_RADIUS_KM)
    const visualSize = isLaunch ? desiredShipSize : Math.min(desiredShipSize, Math.max(0.0005, clearanceKm * 1.6 / KM_PER_UNIT))
    // El realce visual no debe ocultar la nave dentro de un planeta, tampoco con la cámara reducida.
    const earthRadius = Math.min(EARTH_RADIUS_KM * (isLaunch ? 1 : 1 + 3 * wide * (1 - close)), Math.max(EARTH_RADIUS_KM, sample.radiusKm - visualSize * KM_PER_UNIT * 0.6))
    const moonRadius = Math.min(MOON_RADIUS_KM * (1 + 4 * wide * (1 - close) ** 2), Math.max(MOON_RADIUS_KM, moonSeparationKm - visualSize * KM_PER_UNIT * 0.6))
    earthGroup.current?.scale.setScalar(earthRadius * 2 / KM_PER_UNIT)
    moonGroup.current?.scale.setScalar(moonRadius * 2 / KM_PER_UNIT)

    // El acercamiento incluye a la nave y a la Luna hasta el encuentro.
    // La cámara usa el mismo instante que los modelos, también al arrastrar o repetir.
    const encounter = encounterFrame(sample, moonRadius, visualSize * KM_PER_UNIT, size.width / size.height)
    const distance = THREE.MathUtils.lerp(THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.42, 0.7, ascent), wideDistance, wide), encounter.distanceKm / KM_PER_UNIT, close)
    target.set(x, y, 0).lerp(new THREE.Vector3(-3.84, top / 2, 0), wide).lerp(new THREE.Vector3(encounter.xKm / KM_PER_UNIT, encounter.yKm / KM_PER_UNIT, 0), close)
    camera.position.copy(target).add(new THREE.Vector3(0, 0, distance))
    camera.lookAt(target)
    camera.updateMatrixWorld()

    if (ship.current) {
      direction.set(isLaunch ? 1 : sample.vxKmS, isLaunch ? 0 : sample.vyKmS, 0).normalize()
      ship.current.quaternion.setFromUnitVectors(up, direction)
      ship.current.position.set(x + (isLaunch ? visualSize / 2 : 0), y, 0.0002)
      ship.current.scale.setScalar(visualSize)
    }
    if (rocketGroup.current) rocketGroup.current.visible = isLaunch
    if (landerGroup.current) landerGroup.current.visible = !isLaunch
    if (line.current) {
      line.current.setAttribute('d', route.map((v, j) => {
        point.copy(v).project(camera)
        return `${j ? 'L' : 'M'}${((point.x + 1) * size.width / 2).toFixed(1)},${((1 - point.y) * size.height / 2).toFixed(1)}`
      }).join(' '))
    }
  })

  return <>
    <ambientLight intensity={0.75} />
    <directionalLight position={[8, 5, 10]} intensity={3} />
    <group ref={earthGroup} scale={EARTH_RADIUS_KM * 2 / KM_PER_UNIT}>
      <primitive object={earth} dispose={null} />
      <Html position={[0, -0.7, 0]} center style={{ pointerEvents: 'none' }}><span aria-hidden className="whitespace-nowrap text-xs text-earth">Tierra</span></Html>
    </group>
    <group ref={moonGroup} scale={MOON_RADIUS_KM * 2 / KM_PER_UNIT}>
      <primitive object={moon} dispose={null} />
      <Html position={[0, -0.8, 0]} center style={{ pointerEvents: 'none' }}><span aria-hidden className="whitespace-nowrap text-xs text-ink-muted">Luna</span></Html>
    </group>
    <group ref={ship}>
      <group ref={rocketGroup}><primitive object={rocket} dispose={null} /></group>
      <group ref={landerGroup}><primitive object={lander} dispose={null} /></group>
      <Html position={[0.7, 0.3, 0]} style={{ pointerEvents: 'none' }}><span aria-hidden className="whitespace-nowrap text-xs text-ink">Nave</span></Html>
    </group>
    {sample.flight > 0.05 && sample.flight < 0.88 && <Html position={[-orbit.apoapsisKm / KM_PER_UNIT, -0.3, 0]} center style={{ pointerEvents: 'none' }}>
      <span aria-hidden className="whitespace-nowrap text-xs text-ink-muted">Encuentro previsto</span>
    </Html>}
  </>
}

export default function TransferViewer({ orbit, sample, reduced, onReady }: Omit<SceneProps, 'line'>) {
  const line = useRef<SVGPathElement>(null)
  return <>
    <Canvas dpr={[1, 1.5]} camera={{ position: [0.14, 0, 0.42], fov: 42, near: 0.00001, far: 100 }} aria-hidden>
      <Suspense fallback={null}><TransferScene orbit={orbit} sample={sample} reduced={reduced} onReady={onReady} line={line} /></Suspense>
    </Canvas>
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-hidden"><path ref={line} fill="none" stroke="#e8ebf1" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4 5" /></svg>
  </>
}
