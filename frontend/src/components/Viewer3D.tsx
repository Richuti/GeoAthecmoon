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

function SkyBody({ url, az, el, radius, unlit = false, mirror = false }: { url: string; az: number; el: number; radius: number; unlit?: boolean; mirror?: boolean }) {
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
  // earth.glb trae la textura en espejo; se refleja en X (ver useGlobeModel).
  return <primitive object={body} position={pos} scale={[mirror ? -radius : radius, radius, radius]} />
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
    // En el descenso, la cámara mira el lado iluminado de la nave (50° del Sol), con el relieve detrás.
    const view = direction(sunAzRef.current + 50, 0).multiplyScalar(frame.distanceKm * 1.4)
    // Cerca del suelo se apunta más abajo del centro: el contacto y el polvo quedan sobre la leyenda.
    const nearGround = 1 - Math.min(1, frame.altitudeKm / 0.6)
    const targetY = groundY + frame.altitudeKm + SHIP_CENTER_KM * (1 - 0.4 * nearGround)
    // Cerca del suelo la cámara baja: el polvo se ve como una capa rasante, no como rayos hacia el cielo.
    const low = Math.min(1, frame.altitudeKm / 0.6)
    camera.position.set(view.x, targetY + frame.distanceKm * THREE.MathUtils.lerp(0.18, 0.55, low), view.z)
    camera.lookAt(0, targetY, 0)
    camera.updateMatrixWorld()
  })
  return null
}

// ---------------------------------------------------------------------------
// Descenso: brillo del motor y polvo (capa SVG proyectada, sin geometría)
// ---------------------------------------------------------------------------

interface DescentOverlay {
  near: RefObject<SVGPathElement | null>
  far: RefObject<SVGPathElement | null>
  glow: RefObject<SVGCircleElement | null>
}

/** Rayos fijos (ángulo y largo relativos), repetibles en cada visita: no hay azar en cada cuadro. */
const DUST_RAYS = Array.from({ length: 84 }, (_, i) => {
  const jitter = Math.sin(i * 12.9898) * 43758.5453
  const r = jitter - Math.floor(jitter)
  return { angle: (i / 84) * Math.PI * 2 + (r - 0.5) * 0.06, length: 0.45 + 0.55 * ((r * 7.3) % 1) }
})
/** Radio de la nave en la escena (km): el polvo nace justo fuera de ella. */
const SHIP_RADIUS_KM = SHIP_HEIGHT_KM * 0.08

/**
 * En el vacío no hay humo: el escape casi no se ve y el chorro arranca polvo que sale en líneas rectas,
 * rasantes y hacia fuera, y cae en balística al apagar el motor (sin nubes que floten).
 */
function DescentEffects({ groundY, progress, overlay }: { groundY: number; progress: number; overlay: DescentOverlay }) {
  const { camera, size } = useThree()
  const p = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const frame = descentFrame(progress, size.width / size.height)
    const project = (x: number, y: number, z: number) => {
      p.set(x, y, z).project(camera)
      return [(p.x + 1) * size.width / 2, (1 - p.y) * size.height / 2] as const
    }
    const baseY = groundY + frame.altitudeKm
    if (overlay.glow.current) {
      const [bx, by] = project(0, baseY, 0)
      const [, ty] = project(0, baseY + SHIP_HEIGHT_KM, 0)
      overlay.glow.current.setAttribute('cx', bx.toFixed(1))
      overlay.glow.current.setAttribute('cy', by.toFixed(1))
      overlay.glow.current.setAttribute('r', Math.max(3, Math.abs(by - ty) * 0.09).toFixed(1))
      overlay.glow.current.style.opacity = String(0.55 * frame.engine)
    }
    // Tras el apagado el polvo ya lanzado sigue hacia fuera y se asienta: la franja se aleja y se apaga.
    const outward = frame.touched ? 1 - frame.dust : 0
    const y = groundY + 0.004
    const near: string[] = [], far: string[] = []
    if (frame.dust > 0.001) for (const ray of DUST_RAYS) {
      const c = Math.cos(ray.angle), s = Math.sin(ray.angle)
      const r0 = SHIP_RADIUS_KM + 0.9 * outward
      const r1 = r0 + (0.1 + 0.42 * frame.dust) * ray.length
      const rm = (r0 + r1) / 2
      const [x0, y0] = project(r0 * c, y, r0 * s)
      const [xm, ym] = project(rm * c, y, rm * s)
      const [x1, y1] = project(r1 * c, y, r1 * s)
      near.push(`M${x0.toFixed(1)},${y0.toFixed(1)}L${xm.toFixed(1)},${ym.toFixed(1)}`)
      far.push(`M${xm.toFixed(1)},${ym.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}`)
    }
    overlay.near.current?.setAttribute('d', near.join(''))
    overlay.far.current?.setAttribute('d', far.join(''))
    if (overlay.near.current) overlay.near.current.style.opacity = String(0.32 * frame.dust)
    if (overlay.far.current) overlay.far.current.style.opacity = String(0.12 * frame.dust)
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
  const overlay: DescentOverlay = { near: useRef(null), far: useRef(null), glow: useRef(null) }
  const descending = arrivalProgress !== undefined

  return (<>
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
        <SkyBody url="/models/earth.glb" az={sky.earthAz} el={sky.earthEl} radius={EARTH_RADIUS} unlit mirror />
        <CameraRig key={resetKey} siteId={siteId} sky={sky} groundY={groundY} controls={controls} arrivalProgress={arrivalProgress} />
        {descending && <DescentEffects groundY={groundY} progress={arrivalProgress} overlay={overlay} />}
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
    {descending && <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-hidden">
      <defs>
        <radialGradient id="engine-glow"><stop offset="0" stopColor="#f4f7ff" /><stop offset="0.35" stopColor="#dfe8ff" stopOpacity="0.6" /><stop offset="1" stopColor="#dfe8ff" stopOpacity="0" /></radialGradient>
      </defs>
      {/* Polvo de regolito: gris, en trazos rectos y rasantes, más denso cerca de la nave. */}
      <path ref={overlay.far} fill="none" stroke="#bdb6a8" strokeWidth={1} strokeLinecap="round" style={{ opacity: 0 }} />
      <path ref={overlay.near} fill="none" stroke="#d6d0c4" strokeWidth={1.1} strokeLinecap="round" style={{ opacity: 0 }} />
      <circle ref={overlay.glow} fill="url(#engine-glow)" style={{ opacity: 0 }} />
    </svg>}
  </>)
}

useGLTF.preload('/models/launch_vehicle.glb')
useGLTF.preload('/models/sun.glb')
useGLTF.preload('/models/earth.glb')
