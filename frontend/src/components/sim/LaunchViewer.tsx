import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS_KM } from '../../sim/transfer'
import { LAUNCH_PAD_DECK_M, LAUNCH_ROCKET_HEIGHT_M, launchFrame } from '../../sim/transferView'
import { useFlightModel } from './useFlightModel'

const EARTH_RADIUS_M = EARTH_RADIUS_KM * 1000
const clamp = (value: number) => Math.max(0, Math.min(1, value))

function LaunchScene({ altitudeM, ascent, reduced, onReady }: { altitudeM: number; ascent: number; reduced: boolean; onReady: () => void }) {
  const earth = useFlightModel('/models/earth.glb')
  const earthShadow = useFlightModel('/models/earth.glb')
  const rocket = useFlightModel('/models/launch_vehicle.glb')
  const platform = useFlightModel('/models/launch_platform.glb')
  const ship = useRef<THREE.Group>(null)
  const { camera, scene, size } = useThree()
  const vectors = useMemo(() => ({ target: new THREE.Vector3(), offset: new THREE.Vector3(), day: new THREE.Color('#98bdd6'), night: new THREE.Color('#02040b'), sky: new THREE.Color() }), [])
  const ground = useMemo(() => {
    // Un punto de referencia visual de Florida sobre el GLB existente. Se usa la
    // intersección y normal del triángulo, no un radio supuesto que deje la base flotando.
    const lat = THREE.MathUtils.degToRad(28.6), lon = THREE.MathUtils.degToRad(279)
    const radial = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), -Math.cos(lat) * Math.cos(lon))
    // El GLB terrestre tiene caras con orientación interior: se admiten ambos
    // lados para encontrar la superficie próxima, no la cara opuesta del planeta.
    earth.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const mesh = object as THREE.Mesh
      const source = mesh.material as THREE.MeshStandardMaterial
      mesh.material = new THREE.MeshBasicMaterial({ map: source.map, color: source.color.clone().multiplyScalar(1.5), side: THREE.DoubleSide, fog: true })
      mesh.material.userData.launchGround = true
    })
    earthShadow.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const mesh = object as THREE.Mesh
      mesh.material = new THREE.ShadowMaterial({ opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
      mesh.material.userData.launchGround = true
      mesh.receiveShadow = true
    })
    earth.updateMatrixWorld(true)
    const hit = new THREE.Raycaster(radial.clone().multiplyScalar(2), radial.clone().negate()).intersectObject(earth, true)[0]
    if (!hit?.face) throw new Error('No se encontró la superficie del modelo terrestre.')
    const normal = hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld))
    if (normal.dot(radial) < 0) normal.negate()
    const rotation = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0))
    const position = hit.point.clone().applyQuaternion(rotation).multiplyScalar(-2 * EARTH_RADIUS_M)
    for (const model of [rocket, platform]) model.traverse(object => {
      if ((object as THREE.Mesh).isMesh) { (object as THREE.Mesh).castShadow = true; (object as THREE.Mesh).receiveShadow = true }
    })
    platform.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const mesh = object as THREE.Mesh
      const source = mesh.material as THREE.MeshStandardMaterial
      const material = source.clone()
      material.metalness = Math.min(material.metalness, 0.35)
      material.roughness = Math.max(material.roughness, 0.55)
      material.userData.launchGround = true
      mesh.material = material
    })
    return { rotation, position }
  }, [earth, earthShadow, rocket, platform])
  useEffect(onReady, [onReady])
  useEffect(() => () => {
    for (const model of [earth, earthShadow, platform]) model.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const material = (object as THREE.Mesh).material as THREE.Material
      if (material.userData.launchGround) material.dispose()
    })
  }, [earth, earthShadow, platform])

  useFrame(() => {
    const frame = launchFrame(altitudeM, size.width / size.height)
    ship.current?.position.set(0, frame.centerY, 0)
    vectors.target.set(0, frame.centerY, 0)
    const overhead = reduced ? 0 : clamp((ascent - 0.18) / 0.52)
    vectors.offset.set(THREE.MathUtils.lerp(0.65, 0.35, overhead), THREE.MathUtils.lerp(0.24, 1.3, overhead), THREE.MathUtils.lerp(0.95, 0.65, overhead)).multiplyScalar(frame.distanceM)
    camera.position.copy(vectors.target).add(vectors.offset)
    camera.lookAt(vectors.target)
    camera.updateMatrixWorld()
    vectors.sky.copy(vectors.day).lerp(vectors.night, clamp((ascent - 0.5) / 0.4))
    scene.background = vectors.sky
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(vectors.sky)
      scene.fog.near = Math.max(100, altitudeM * 2)
      scene.fog.far = Math.max(4000, altitudeM * 150)
    }
  })

  return <>
    <fog attach="fog" args={['#98bdd6', 2000, 12000]} />
    <hemisphereLight args={['#d5e9ff', '#72725a', 1.25]} />
    <directionalLight position={[200, 350, 120]} intensity={2.8} castShadow
      shadow-mapSize={[1024, 1024]} shadow-camera-left={-220} shadow-camera-right={220}
      shadow-camera-top={220} shadow-camera-bottom={-220} shadow-camera-near={1} shadow-camera-far={1000} shadow-bias={-0.0001} />
    <group position={ground.position} quaternion={ground.rotation} scale={EARTH_RADIUS_M * 2}>
      <primitive object={earth} dispose={null} />
      <primitive object={earthShadow} dispose={null} />
    </group>
    {/* Anclajes medidos en el GLB NASA: boca a x=0; cubierta a 4.85 m. */}
    <group position={[9.2, 60, 0]} scale={120}><primitive object={platform} dispose={null} /></group>
    <group ref={ship} position={[0, LAUNCH_PAD_DECK_M + LAUNCH_ROCKET_HEIGHT_M / 2, 0]} scale={LAUNCH_ROCKET_HEIGHT_M}>
      <primitive object={rocket} dispose={null} />
    </group>
  </>
}

/** Escena local en metros. Solo carga GLB; el ascenso es una presentación ilustrativa. */
export default function LaunchViewer({ altitudeM, ascent, reduced, active, onReady }: { altitudeM: number; ascent: number; reduced: boolean; active: boolean; onReady: () => void }) {
  return <Canvas shadows dpr={[1, 1.5]} frameloop={active ? 'always' : 'never'}
    gl={{ antialias: true, logarithmicDepthBuffer: true }} camera={{ position: [300, 120, 400], fov: 42, near: 0.5, far: 30000000 }} aria-hidden>
    <Suspense fallback={null}><LaunchScene altitudeM={altitudeM} ascent={ascent} reduced={reduced} onReady={onReady} /></Suspense>
  </Canvas>
}
