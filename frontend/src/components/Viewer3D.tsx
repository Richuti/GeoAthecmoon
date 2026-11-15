// Visor 3D: terreno LOLA del sitio, luz del Sol según los datos, Sol y Tierra en el cielo y la nave: el mismo
// cohete que despega de la Tierra (launch_vehicle.glb), de pie sobre el sitio.
//
// Regla: el código NO genera geometría. Todo lo que se ve son los .glb de Richard; aquí solo se cargan y se
// ilumina la escena.
//
// Los datos mandan sobre el modelo: la intensidad del Sol es la fracción visible del disco solar calculada con
// el horizonte LOLA de 150 km. Si una montaña fuera del recorte de 20 km tapa el Sol, la escena queda a oscuras
// aunque el modelo no proyecte esa sombra.

import { OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { SpaceBackground } from './SpaceBackground'
import { descentFrame } from '../sim/transferView'
import { useFlightModel } from './sim/useFlightModel'

export interface Sky {
  sunAz: number
  sunEl: number
  /** Fracción visible del disco solar sobre el relieve real (0–1) */
  sunFraction: number
  earthAz: number
  earthEl: number
  earthVisible: boolean
}

/** Altura de la nave en la escena (km): unas 4 veces los 110 m del cohete; a escala real casi no se vería. */
export const SHIP_HEIGHT_KM = 0.44
/** Altura del centro de la nave sobre el suelo: la cámara apunta ahí. */
const SHIP_CENTER_KM = SHIP_HEIGHT_KM / 2
/** Distancia a la que se dibujan el Sol y la Tierra (km de escena) y su radio aparente agrandado. */
const SKY_DISTANCE = 40
const SUN_RADIUS = 0.6
const EARTH_RADIUS = 1.6

const DEG = Math.PI / 180

/** Dirección hacia un cuerpo: norte = -Z, este = +X, arriba = +Y. */
function direction(azDeg: number, elDeg: number): THREE.Vector3 {
  const az = azDeg * DEG
  const el = elDeg * DEG
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el))
}

// ---------------------------------------------------------------------------
// Piezas de la escena
// ---------------------------------------------------------------------------

function Terrain({ siteId, onGroundHeight }: { siteId: string; onGroundHeight: (y: number) => void }) {
  const { scene } = useGLTF(`/models/terrain/${siteId}.glb`)

  useLayoutEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh
        m.receiveShadow = true
        m.castShadow = true
      }
    })
    // Altura del suelo en el sitio (0, 0): un rayo vertical sobre el terreno.
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, -1, 0))
    const hit = ray.intersectObject(scene, true)[0]
    onGroundHeight(hit ? hit.point.y : 0)
  }, [scene, onGroundHeight])

  return <primitive object={scene} />
}

/** El mismo cohete del despegue, de pie: la base toca el suelo en (0, groundY, 0). */
function Ship({ groundY }: { groundY: number }) {
  const ship = useFlightModel('/models/launch_vehicle.glb')
  useLayoutEffect(() => {
    ship.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true
    })
  }, [ship])
  // El grupo escala; el modelo conserva su propia normalización (altura 1).
  return <group position={[0, groundY + SHIP_CENTER_KM, 0]} scale={SHIP_HEIGHT_KM}><primitive object={ship} dispose={null} /></group>
}

function SkyBody({ url, az, el, radius, unlit = false }: { url: string; az: number; el: number; radius: number; unlit?: boolean }) {
  const { scene } = useGLTF(url)
  const body = useMemo(() => {
    const clone = scene.clone(true)
    if (unlit) {
      // La Tierra se ve con su textura aunque el sitio esté en sombra (la ilumina el Sol, no el relieve).
      clone.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          const src = m.material as THREE.MeshStandardMaterial
          m.material = new THREE.MeshBasicMaterial({ map: src.map ?? null, color: src.map ? 0xffffff : src.color })
        }
      })
    }
    return clone
  }, [scene, unlit])
  const pos = direction(az, el).multiplyScalar(SKY_DISTANCE)
  return <primitive object={body} position={pos} scale={radius} />
}

/** Penumbra: casi nada de día (las sombras lunares son negras) y más de noche para que el relieve se lea. */
function nightFill(sky: Sky): number {
  const night = 1 - sky.sunFraction
  return 0.12 + night * (sky.earthVisible ? 0.95 : 0.75)
}

function Lights({ sky }: { sky: Sky }) {
  const light = useRef<THREE.DirectionalLight>(null)
  const pos = direction(sky.sunAz, sky.sunEl).multiplyScalar(30)

  useFrame((_, dt) => {
    if (!light.current) return
    const target = 3.2 * sky.sunFraction
    light.current.intensity += (target - light.current.intensity) * (1 - Math.exp(-dt * 5))
  })

  return (
    <>
      <directionalLight
        ref={light}
        position={pos}
        intensity={3.2 * sky.sunFraction}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
      {/* Sin atmósfera las sombras son casi negras. Se deja una penumbra azulada (luz de la Tierra, realzada)
          para que el relieve se adivine aunque el sitio esté en sombra; siempre muy por debajo del Sol. */}
      <hemisphereLight args={['#9fc4ff', '#05070d', nightFill(sky)]} />
    </>
  )
}

/** Coloca la cámara al cambiar de sitio: de lado al Sol, para ver las sombras largas. */
function CameraRig({ siteId, sky, groundY, controls, arrivalProgress }: { siteId: string; sky: Sky; groundY: number; controls: RefObject<OrbitControlsImpl | null>; arrivalProgress?: number }) {
  const { camera, size } = useThree()
  const sunAzRef = useRef(sky.sunAz)
  sunAzRef.current = sky.sunAz

  useEffect(() => {
    // A unos 3 km del sitio, de costado al Sol: se ven el módulo y las sombras largas.
    const view = direction(sunAzRef.current + 135, 0).multiplyScalar(3.2)
    camera.position.set(view.x, groundY + 0.9, view.z)
    controls.current?.target.set(0, groundY + SHIP_CENTER_KM, 0)
    controls.current?.update()
  }, [siteId, groundY, camera, controls])
  useFrame(() => {
    if (arrivalProgress === undefined) return
    const frame = descentFrame(arrivalProgress, size.width / size.height)
    const view = direction(sunAzRef.current + 135, 0).multiplyScalar(frame.distanceKm)
    const targetY = groundY + frame.altitudeKm + SHIP_CENTER_KM
    camera.position.set(view.x, targetY + frame.distanceKm * 0.55, view.z)
    camera.lookAt(0, targetY, 0)
    camera.updateMatrixWorld()
  })
  return null
}

// ---------------------------------------------------------------------------
// Componente público
// ---------------------------------------------------------------------------

export default function Viewer3D({
  siteId,
  sky,
  onGroundHeight,
  groundY,
  resetKey,
  arrivalProgress,
  active = true,
}: {
  siteId: string
  sky: Sky
  groundY: number
  onGroundHeight: (y: number) => void
  /** Cambia para volver a la vista inicial */
  resetKey: number
  arrivalProgress?: number
  active?: boolean
}) {
  const controls = useRef<OrbitControlsImpl | null>(null)

  return (
    <Canvas
      // PCFShadowMap explícito: three 0.187 quitó PCFSoftShadowMap (el valor de `shadows` a secas) y avisaba en consola.
      shadows="percentage"
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.01, far: 200, position: [6, 2.5, 6] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <SpaceBackground />
        <Lights sky={sky} />
        <Terrain siteId={siteId} onGroundHeight={onGroundHeight} />
        <Ship groundY={groundY + (arrivalProgress === undefined ? 0 : descentFrame(arrivalProgress, 1).altitudeKm)} />
        <SkyBody url="/models/sun.glb" az={sky.sunAz} el={sky.sunEl} radius={SUN_RADIUS} />
        <SkyBody url="/models/earth.glb" az={sky.earthAz} el={sky.earthEl} radius={EARTH_RADIUS} unlit />
        <CameraRig key={resetKey} siteId={siteId} sky={sky} groundY={groundY} controls={controls} arrivalProgress={arrivalProgress} />
      </Suspense>
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={arrivalProgress === undefined}
        enableDamping
        minDistance={0.3}
        maxDistance={24}
        maxPolarAngle={Math.PI * 0.49}
      />
    </Canvas>
  )
}

useGLTF.preload('/models/launch_vehicle.glb')
useGLTF.preload('/models/sun.glb')
useGLTF.preload('/models/earth.glb')
