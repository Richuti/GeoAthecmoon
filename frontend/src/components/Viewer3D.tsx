// Visor 3D: terreno LOLA del sitio, luz del Sol según los datos, Sol y Tierra en el cielo y el módulo con su
// panel apuntando al Sol y su antena a la Tierra.
//
// Regla: el código NO genera geometría. Todo lo que se ve son los .glb de Richard; aquí solo se cargan, se
// ilumina la escena y se orientan las piezas con nombre (SolarPanel, Antenna).
//
// Los datos mandan sobre el modelo: la intensidad del Sol es la fracción visible del disco solar calculada con
// el horizonte LOLA de 150 km. Si una montaña fuera del recorte de 20 km tapa el Sol, la escena queda a oscuras
// aunque el modelo no proyecte esa sombra.

import { OrbitControls, useGLTF, useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export interface Sky {
  sunAz: number
  sunEl: number
  /** Fracción visible del disco solar sobre el relieve real (0–1) */
  sunFraction: number
  earthAz: number
  earthEl: number
  earthVisible: boolean
}

/** Agrandamiento del módulo: a escala real (unos 7 m en un terreno de 20 km) no se vería. */
export const LANDER_SCALE = 30
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

/** Ángulo más corto entre dos ángulos (radianes), para que los giros no den la vuelta larga. */
function approachAngle(current: number, target: number, k: number): number {
  let d = target - current
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return current + d * k
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

function Lander({ groundY, sky }: { groundY: number; sky: Sky }) {
  const { scene } = useGLTF('/models/lander.glb')
  const panel = useMemo(() => scene.getObjectByName('SolarPanel') ?? null, [scene])
  const antenna = useMemo(() => scene.getObjectByName('Antenna') ?? null, [scene])

  useLayoutEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true
    })
    // Euler YXZ: primero se inclina (X) y después se gira hacia el azimut (Y).
    panel?.rotation.set(0, 0, 0, 'YXZ')
    antenna?.rotation.set(0, 0, 0, 'YXZ')
  }, [scene, panel, antenna])

  // El panel y la antena miran a -Z (norte). Para apuntar a (az, el): giro Y = -az, inclinación X = el.
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6)
    if (panel) {
      panel.rotation.y = approachAngle(panel.rotation.y, -sky.sunAz * DEG, k)
      panel.rotation.x += (Math.max(0, sky.sunEl) * DEG - panel.rotation.x) * k
    }
    if (antenna) {
      antenna.rotation.y = approachAngle(antenna.rotation.y, -sky.earthAz * DEG, k)
      antenna.rotation.x += (Math.max(0, sky.earthEl) * DEG - antenna.rotation.x) * k
    }
  })

  return <primitive object={scene} position={[0, groundY, 0]} scale={LANDER_SCALE / 1000} />
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

function Stars() {
  const tex = useTexture('/textures/stars.jpg')
  const { scene } = useThree()
  useEffect(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.colorSpace = THREE.SRGBColorSpace
    scene.background = tex
    // Tenue: desde el suelo iluminado una cámara real casi no ve estrellas.
    scene.backgroundIntensity = 0.08
    return () => {
      scene.background = null
    }
  }, [tex, scene])
  return null
}

/** Coloca la cámara al cambiar de sitio: de lado al Sol, para ver las sombras largas. */
function CameraRig({ siteId, sky, groundY, controls }: { siteId: string; sky: Sky; groundY: number; controls: RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree()
  const sunAzRef = useRef(sky.sunAz)
  sunAzRef.current = sky.sunAz

  useEffect(() => {
    // A unos 3 km del sitio, de costado al Sol: se ven el módulo y las sombras largas.
    const view = direction(sunAzRef.current + 135, 0).multiplyScalar(3.2)
    camera.position.set(view.x, groundY + 0.9, view.z)
    controls.current?.target.set(0, groundY + 0.1, 0)
    controls.current?.update()
  }, [siteId, groundY, camera, controls])
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
}: {
  siteId: string
  sky: Sky
  groundY: number
  onGroundHeight: (y: number) => void
  /** Cambia para volver a la vista inicial */
  resetKey: number
}) {
  const controls = useRef<OrbitControlsImpl | null>(null)

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.01, far: 200, position: [6, 2.5, 6] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Stars />
        <Lights sky={sky} />
        <Terrain siteId={siteId} onGroundHeight={onGroundHeight} />
        <Lander groundY={groundY} sky={sky} />
        <SkyBody url="/models/sun.glb" az={sky.sunAz} el={sky.sunEl} radius={SUN_RADIUS} />
        <SkyBody url="/models/earth.glb" az={sky.earthAz} el={sky.earthEl} radius={EARTH_RADIUS} unlit />
        <CameraRig key={resetKey} siteId={siteId} sky={sky} groundY={groundY} controls={controls} />
      </Suspense>
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        minDistance={0.3}
        maxDistance={24}
        maxPolarAngle={Math.PI * 0.49}
      />
    </Canvas>
  )
}

useGLTF.preload('/models/lander.glb')
useGLTF.preload('/models/sun.glb')
useGLTF.preload('/models/earth.glb')
