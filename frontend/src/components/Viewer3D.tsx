// Visor 3D: terreno LOLA del sitio, luz del Sol según los datos, Sol y Tierra en el cielo y la nave: el mismo
// cohete que despega de la Tierra (launch_vehicle.glb), de pie sobre el sitio.
//
// Regla: el código NO genera geometría. Todo lo que se ve son los .glb de Richard; aquí solo se cargan y se
// ilumina la escena.
//
// Los datos mandan sobre el modelo: la intensidad del Sol es la fracción visible del disco solar calculada con
// el horizonte LOLA de 150 km. Si una montaña fuera del recorte de 20 km tapa el Sol, la escena queda a oscuras
// aunque el modelo no proyecte esa sombra.

import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { SpaceBackground } from './SpaceBackground'
import { descentFrame } from '../sim/transferView'
import { useFlightModel } from './sim/useFlightModel'
import type { Mode } from '../sim/simulate'
import { ASTRONAUT_AZ_DEG, ASTRONAUT_DISTANCE_KM, ASTRONAUT_HEIGHT_KM, EYE_HEIGHT_KM, type SkyPoint } from '../sim/astronautView'

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

/** Altura real del cohete (km): junto al astronauta la nave se ve a escala real, no agrandada. */
const SHIP_REAL_HEIGHT_KM = 0.11
/** Junto al astronauta, el Sol y la Tierra van más lejos que el relieve de 150 km (mismo tamaño aparente). */
const EYE_SKY_DISTANCE = 600

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
        // El recorte de 20 km se funde en sus últimos 2.5 km con el relieve de 300 km que hay debajo:
        // así no se ve un borde recto, ni en el planificador ni en el descenso. No se altera la geometría.
        const material = m.material as THREE.MeshStandardMaterial
        material.transparent = true
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = 'varying vec2 vPatchXZ;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPatchXZ = (modelMatrix * vec4(transformed, 1.0)).xz;')
          shader.fragmentShader = 'varying vec2 vPatchXZ;\n' + shader.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(7.5, 9.9, max(abs(vPatchXZ.x), abs(vPatchXZ.y)));')
        }
        material.customProgramCacheKey = () => 'terrain-patch-fade-v1'
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
function Ship({ groundY, height = SHIP_HEIGHT_KM }: { groundY: number; height?: number }) {
  const ship = useFlightModel('/models/launch_vehicle.glb')
  useLayoutEffect(() => {
    ship.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true
    })
  }, [ship])
  // El grupo escala; el modelo conserva su propia normalización (altura 1).
  return <group position={[0, groundY + height / 2, 0]} scale={height}><primitive object={ship} dispose={null} /></group>
}

function SkyBody({ url, az, el, radius, unlit = false, mirror = false, distance = SKY_DISTANCE }: { url: string; az: number; el: number; radius: number; unlit?: boolean; mirror?: boolean; distance?: number }) {
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
  const pos = direction(az, el).multiplyScalar(distance)
  // Mismo tamaño aparente a cualquier distancia.
  const r = radius * distance / SKY_DISTANCE
  // earth.glb trae la textura en espejo; se refleja en X (ver useGlobeModel).
  return <primitive object={body} position={pos} scale={[mirror ? -r : r, r, r]} />
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
    // La vista inicial es exactamente la última del alunizaje (mismo sitio, ángulo y distancia), para que
    // «Evaluar» y el planificador muestren el lugar donde se vio aterrizar la nave.
    const frame = descentFrame(1, size.width / size.height)
    const elev = frame.cameraElevationDeg * DEG
    const horizontal = direction(sunAzRef.current + 50, 0)
    const targetY = groundY + SHIP_CENTER_KM * 0.6
    const d = frame.cameraDistanceKm
    camera.position.set(horizontal.x * Math.cos(elev) * d, targetY + Math.sin(elev) * d, horizontal.z * Math.cos(elev) * d)
    controls.current?.target.set(0, targetY, 0)
    controls.current?.update()
  }, [siteId, groundY, camera, controls, size.width, size.height])
  useFrame(() => {
    if (arrivalProgress === undefined) return
    const frame = descentFrame(arrivalProgress, size.width / size.height)
    // Empieza casi cenital a 200 km (como termina la llegada sobre el globo) y baja hasta una toma oblicua
    // del lado iluminado de la nave (50° del Sol), alta lo justo para ver la base apoyada en el suelo.
    const elev = frame.cameraElevationDeg * DEG
    const horizontal = direction(sunAzRef.current + 50, 0)
    const nearGround = 1 - Math.min(1, frame.altitudeKm / 0.6)
    const targetY = groundY + frame.altitudeKm + SHIP_CENTER_KM * (1 - 0.4 * nearGround)
    const d = frame.cameraDistanceKm
    camera.position.set(horizontal.x * Math.cos(elev) * d, targetY + Math.sin(elev) * d, horizontal.z * Math.cos(elev) * d)
    if (camera instanceof THREE.PerspectiveCamera && camera.far < 2000) { camera.far = 2000; camera.updateProjectionMatrix() }
    camera.lookAt(0, targetY, 0)
    camera.updateMatrixWorld()
  })
  return null
}

// ---------------------------------------------------------------------------
// Descenso: brillo del motor y polvo (capa SVG proyectada, sin geometría)
// ---------------------------------------------------------------------------

interface DescentOverlay {
  sheet: RefObject<SVGPathElement | null>
  inner: RefObject<SVGPathElement | null>
  outer: RefObject<SVGPathElement | null>
  glow: RefObject<SVGCircleElement | null>
  marker: RefObject<SVGGElement | null>
}

/** Granos fijos (ángulo, fase y rapidez), repetibles en cada visita: no hay azar en cada cuadro. */
const DUST_GRAINS = Array.from({ length: 150 }, (_, i) => {
  const hash = (k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) }
  return { angle: hash(1) * Math.PI * 2, phase: hash(2), speed: 0.7 + 0.6 * hash(3) }
})
/** Radio de la nave en la escena (km): el polvo nace justo fuera de ella. */
const SHIP_RADIUS_KM = SHIP_HEIGHT_KM * 0.08

/** Relieve LOLA de 300 × 300 km alrededor del sitio: el suelo más allá del recorte de 20 km y al bajar desde 600 km. */
function FarTerrain({ siteId }: { siteId: string }) {
  const { scene } = useGLTF(`/models/terrain/${siteId}_far.glb`)
  useLayoutEffect(() => {
    scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true })
  }, [scene])
  return <primitive object={scene} />
}

/**
 * En el vacío no hay humo: el escape casi no se ve y el chorro arranca polvo que fluye hacia fuera en una capa
 * baja y rasante. Al apagar el motor deja de salir; lo ya lanzado sigue hacia fuera y cae (no hay aire).
 */
function DescentEffects({ groundY, progress, overlay }: { groundY: number; progress: number; overlay: DescentOverlay }) {
  const { camera, size } = useThree()
  const p = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    const frame = descentFrame(progress, size.width / size.height)
    const project = (x: number, y: number, z: number) => {
      p.set(x, y, z).project(camera)
      return [(p.x + 1) * size.width / 2, (1 - p.y) * size.height / 2] as const
    }
    const baseY = groundY + frame.altitudeKm
    const [bx, by] = project(0, baseY, 0)
    const [, ty] = project(0, baseY + SHIP_HEIGHT_KM, 0)
    const shipPx = Math.abs(by - ty)
    if (overlay.glow.current) {
      overlay.glow.current.setAttribute('cx', bx.toFixed(1))
      overlay.glow.current.setAttribute('cy', by.toFixed(1))
      overlay.glow.current.setAttribute('r', Math.max(3, shipPx * 0.09).toFixed(1))
      overlay.glow.current.style.opacity = String(0.55 * frame.engine)
    }
    // Mientras la nave mide pocos píxeles (desde 200 km), un anillo marca dónde está.
    if (overlay.marker.current) {
      const [cx, cy] = project(0, baseY + SHIP_CENTER_KM, 0)
      overlay.marker.current.setAttribute('transform', `translate(${cx.toFixed(1)},${cy.toFixed(1)})`)
      overlay.marker.current.style.opacity = String(Math.max(0, Math.min(1, (24 - shipPx) / 12)))
    }

    const y = groundY + 0.006
    const reach = 0.25 + 0.75 * Math.min(1, frame.dust * 1.4)
    // Tras el contacto ya no sale polvo nuevo: la capa se aleja y se apaga.
    const drift = frame.touched ? (1 - frame.dust) * 0.8 : 0
    const ring = (r: number) => {
      const pts: string[] = []
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * Math.PI * 2
        const [x, yy] = project(r * Math.cos(a), y, r * Math.sin(a))
        pts.push(`${k ? 'L' : 'M'}${x.toFixed(1)},${yy.toFixed(1)}`)
      }
      return pts.join('') + 'Z'
    }
    const inner: string[] = [], outer: string[] = []
    if (frame.dust > 0.001) {
      overlay.sheet.current?.setAttribute('d', ring(SHIP_RADIUS_KM + drift + reach * 0.85))
      const time = clock.getElapsedTime()
      for (const g of DUST_GRAINS) {
        // Cada grano sale del borde de la nave, viaja hacia fuera en línea recta y vuelve a salir (flujo continuo).
        const f = (g.phase + time * 0.55 * g.speed) % 1
        const r = SHIP_RADIUS_KM + drift + f * reach
        const len = 0.025 + 0.06 * g.speed * (1 - f)
        const c = Math.cos(g.angle), sn = Math.sin(g.angle)
        const [x0, y0] = project(r * c, y, r * sn)
        const [x1, y1] = project((r + len) * c, y, (r + len) * sn)
        ;(f < 0.5 ? inner : outer).push(`M${x0.toFixed(1)},${y0.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}`)
      }
    }
    overlay.inner.current?.setAttribute('d', inner.join(''))
    overlay.outer.current?.setAttribute('d', outer.join(''))
    if (overlay.sheet.current) overlay.sheet.current.style.opacity = String(0.55 * frame.dust)
    if (overlay.inner.current) overlay.inner.current.style.opacity = String(0.55 * frame.dust)
    if (overlay.outer.current) overlay.outer.current.style.opacity = String(0.28 * frame.dust)
  })
  return null
}

// ---------------------------------------------------------------------------
// Junto al astronauta: persona a escala real, cámara tras su hombro y capa con el horizonte y los caminos
// del Sol y la Tierra (SVG proyectado, sin geometría)
// ---------------------------------------------------------------------------

export interface EyeData {
  /** Horizonte LOLA, un punto por grado */
  horizon: Array<{ az: number; el: number }>
  sunPath: SkyPoint[]
  earthPath: SkyPoint[]
  /** Muestra actual: el camino marca un punto por día desde aquí */
  from: number
  /** Próximo cambio de luz, con su texto */
  event: { az: number; el: number; label: string } | null
}

/** Dirección de la mirada (grados): la comparten la cámara y el astronauta, que gira hacia donde se mira. */
interface Gaze { yaw: number; pitch: number }

const ASTRONAUT_XZ = direction(ASTRONAUT_AZ_DEG, 0).multiplyScalar(ASTRONAUT_DISTANCE_KM)

/** Altura del relieve LOLA en (x, z): un rayo vertical sobre el terreno del sitio. */
function useGroundAt(siteId: string, x: number, z: number): number {
  const { scene } = useGLTF(`/models/terrain/${siteId}.glb`)
  return useMemo(() => {
    const hit = new THREE.Raycaster(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0)).intersectObject(scene, true)[0]
    return hit ? hit.point.y : 0
  }, [scene, x, z])
}

function Astronaut({ siteId, gaze }: { siteId: string; gaze: RefObject<Gaze> }) {
  const model = useFlightModel('/models/astronaut.glb')
  const ground = useGroundAt(siteId, ASTRONAUT_XZ.x, ASTRONAUT_XZ.z)
  const group = useRef<THREE.Group>(null)
  useLayoutEffect(() => { model.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true }) }, [model])
  // El modelo mira hacia +Z; se gira para mirar hacia el azimut de la vista (de espaldas a la cámara).
  useFrame(() => { if (group.current) group.current.rotation.y = Math.PI - gaze.current.yaw * DEG })
  return <group ref={group} position={[ASTRONAUT_XZ.x, ground + ASTRONAUT_HEIGHT_KM / 2, ASTRONAUT_XZ.z]} scale={ASTRONAUT_HEIGHT_KM}>
    <primitive object={model} dispose={null} />
  </group>
}

/** Cámara tras el hombro del astronauta. Arrastrar gira la mirada; el astronauta gira con ella. */
function EyeRig({ siteId, gaze, startYaw, startPitch, resetKey }: { siteId: string; gaze: RefObject<Gaze>; startYaw: number; startPitch: number; resetKey: number }) {
  const { camera, gl } = useThree()
  const ground = useGroundAt(siteId, ASTRONAUT_XZ.x, ASTRONAUT_XZ.z)
  const v = useMemo(() => ({ eye: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), look: new THREE.Vector3() }), [])

  useEffect(() => {
    gaze.current.yaw = startYaw
    gaze.current.pitch = startPitch
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al entrar o al restablecer la vista
  }, [resetKey])

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.near = 0.0003
    cam.far = 1500
    cam.updateProjectionMatrix()
    const el = gl.domElement
    let last: { x: number; y: number } | null = null
    const down = (e: PointerEvent) => { last = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => {
      if (!last) return
      gaze.current.yaw = (gaze.current.yaw - (e.clientX - last.x) * 0.18 + 360) % 360
      gaze.current.pitch = Math.max(-8, Math.min(28, gaze.current.pitch + (e.clientY - last.y) * 0.12))
      last = { x: e.clientX, y: e.clientY }
    }
    const up = (e: PointerEvent) => { last = null; if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId) }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.style.cursor = 'grab'
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.style.cursor = ''
      cam.near = 0.01
      cam.far = 400
      cam.updateProjectionMatrix()
    }
  }, [camera, gl, gaze])

  useFrame(() => {
    const { yaw, pitch } = gaze.current
    v.fwd.copy(direction(yaw, 0))
    v.right.set(-v.fwd.z, 0, v.fwd.x)
    v.eye.set(ASTRONAUT_XZ.x, ground + EYE_HEIGHT_KM, ASTRONAUT_XZ.z)
    // 10 m detrás, 3 m a la derecha y 0.3 m sobre sus ojos: el astronauta se ve entero, a la izquierda y
    // sobre la franja de abajo, donde van los indicadores de la misión.
    camera.position.copy(v.eye).addScaledVector(v.fwd, -0.01).addScaledVector(v.right, 0.003)
    camera.position.y += 0.0003
    v.look.copy(v.eye).add(direction(yaw, pitch))
    camera.lookAt(v.look)
  })
  return null
}

export interface EyeOverlayRefs {
  horizon: RefObject<SVGPathElement | null>
  sunLit: RefObject<SVGPathElement | null>
  sunHidden: RefObject<SVGPathElement | null>
  sunDays: RefObject<SVGPathElement | null>
  earthSeen: RefObject<SVGPathElement | null>
  earthHidden: RefObject<SVGPathElement | null>
  labels: RefObject<Record<string, HTMLElement | null>>
}

/** Proyecta en cada cuadro el horizonte y los caminos sobre la capa SVG, y coloca las etiquetas. */
function EyeProjector({ eye, sky, refs }: { eye: EyeData; sky: Sky; refs: EyeOverlayRefs }) {
  const { camera, size } = useThree()
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), fwd: new THREE.Vector3() }), [])
  useFrame(() => {
    camera.getWorldDirection(tmp.fwd)
    const project = (az: number, el: number): [number, number] | null => {
      const d = direction(az, el)
      if (d.dot(tmp.fwd) < 0.1) return null
      tmp.p.copy(camera.position).addScaledVector(d, 50).project(camera)
      return [(tmp.p.x + 1) * size.width / 2, (1 - tmp.p.y) * size.height / 2]
    }
    const line = (pts: Array<{ az: number; el: number }>) => {
      let d = ''
      let pen = false
      for (const pt of pts) {
        const xy = project(pt.az, pt.el)
        if (!xy) { pen = false; continue }
        d += `${pen ? 'L' : 'M'}${xy[0].toFixed(1)},${xy[1].toFixed(1)}`
        pen = true
      }
      return d
    }
    /** Separa un camino en tramos visibles y ocultos (el punto de cambio va en los dos para que se unan). */
    const split = (path: SkyPoint[]) => {
      const seen: SkyPoint[][] = []
      const hidden: SkyPoint[][] = []
      let cur: SkyPoint[] = []
      path.forEach((pt, k) => {
        if (k > 0 && pt.visible !== path[k - 1].visible) {
          cur.push(pt);
          (path[k - 1].visible ? seen : hidden).push(cur)
          cur = [path[k - 1]]
        }
        cur.push(pt)
      })
      if (cur.length) (path.at(-1)?.visible ? seen : hidden).push(cur)
      return { seen: seen.map(line).join(''), hidden: hidden.map(line).join('') }
    }
    refs.horizon.current?.setAttribute('d', line(eye.horizon))
    const sun = split(eye.sunPath)
    refs.sunLit.current?.setAttribute('d', sun.seen)
    refs.sunHidden.current?.setAttribute('d', sun.hidden)
    const earth = split(eye.earthPath)
    refs.earthSeen.current?.setAttribute('d', earth.seen)
    refs.earthHidden.current?.setAttribute('d', earth.hidden)
    // Un punto por día en el camino del Sol, para leer cuánto falta.
    const perDay = eye.sunPath.length > 1 ? Math.round(24 / Math.max(1, eye.sunPath[1].index - eye.sunPath[0].index)) : 24
    let dots = ''
    eye.sunPath.forEach((pt, k) => {
      if (k === 0 || k % perDay !== 0) return
      const xy = project(pt.az, pt.el)
      if (xy) dots += `M${(xy[0] - 2.5).toFixed(1)},${xy[1].toFixed(1)}a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0`
    })
    refs.sunDays.current?.setAttribute('d', dots)

    const place = (key: string, az: number, el: number, dy = 0) => {
      const node = refs.labels.current?.[key]
      if (!node) return
      const xy = project(az, el)
      const onScreen = xy !== null && xy[0] > -40 && xy[0] < size.width + 40 && xy[1] > -40 && xy[1] < size.height + 40
      node.style.visibility = onScreen ? 'visible' : 'hidden'
      if (xy) node.style.transform = `translate(${xy[0].toFixed(0)}px, ${(xy[1] + dy).toFixed(0)}px)`
    }
    place('sun', sky.sunAz, sky.sunEl, -26)
    place('earth', sky.earthAz, sky.earthEl, -34)
    if (eye.event) place('event', eye.event.az, eye.event.el, 14)
    for (const [key, az] of [['N', 0], ['E', 90], ['S', 180], ['O', 270]] as const) {
      const h = eye.horizon[az]?.el ?? 0
      place(key, az, h, 12)
    }
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
  shipState,
  view = 'aerial',
  eye,
  eyeYaw = 0,
  eyePitch = 2,
}: {
  siteId: string
  sky: Sky
  groundY: number
  onGroundHeight: (y: number) => void
  /** Cambia para volver a la vista inicial */
  resetKey: number
  arrivalProgress?: number
  active?: boolean
  shipState?: Mode
  /** Vista aérea (por defecto) o junto al astronauta, a escala real */
  view?: 'aerial' | 'astronaut'
  eye?: EyeData
  /** Hacia dónde mira el astronauta al entrar o al restablecer (grados) */
  eyeYaw?: number
  eyePitch?: number
}) {
  const controls = useRef<OrbitControlsImpl | null>(null)
  const astronaut = view === 'astronaut' && arrivalProgress === undefined
  const gaze = useRef<Gaze>({ yaw: eyeYaw, pitch: eyePitch })
  const eyeRefs: EyeOverlayRefs = {
    horizon: useRef(null), sunLit: useRef(null), sunHidden: useRef(null), sunDays: useRef(null),
    earthSeen: useRef(null), earthHidden: useRef(null), labels: useRef({}),
  }
  const label = (key: string) => (node: HTMLElement | null) => { eyeRefs.labels.current[key] = node }
  const shipHeight = astronaut ? SHIP_REAL_HEIGHT_KM : SHIP_HEIGHT_KM
  const skyDistance = astronaut ? EYE_SKY_DISTANCE : SKY_DISTANCE
  const overlay: DescentOverlay = { sheet: useRef(null), inner: useRef(null), outer: useRef(null), glow: useRef(null), marker: useRef(null) }
  const descending = arrivalProgress !== undefined

  return (<>
    <Canvas
      // PCFShadowMap explícito: three 0.187 quitó PCFSoftShadowMap (el valor de `shadows` a secas) y avisaba en consola.
      shadows="percentage"
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.01, far: 400, position: [6, 2.5, 6] }}
      // Conviven el relieve de 300 km, la nave y, junto al astronauta, una persona de 1.85 m: profundidad logarítmica.
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, logarithmicDepthBuffer: true }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <SpaceBackground />
        <Lights sky={sky} />
        <Terrain siteId={siteId} onGroundHeight={onGroundHeight} />
        <FarTerrain siteId={siteId} />
        <Ship groundY={groundY + (arrivalProgress === undefined ? 0 : descentFrame(arrivalProgress, 1).altitudeKm)} height={shipHeight} />
        {astronaut && <Astronaut siteId={siteId} gaze={gaze} />}
        {astronaut && <EyeRig siteId={siteId} gaze={gaze} startYaw={eyeYaw} startPitch={eyePitch} resetKey={resetKey} />}
        {astronaut && eye && <EyeProjector eye={eye} sky={sky} refs={eyeRefs} />}
        {shipState && <Html position={[0, groundY + shipHeight * 0.55, 0]} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
          <span aria-hidden className={`incident-ship-label is-${shipState}`}>{shipState === 'failed' ? 'Sin energía' : shipState === 'survival' ? 'Instrumentos apagados' : sky.sunFraction <= 0 ? 'Panel sin Sol' : sky.sunFraction < 1 ? 'Panel con luz parcial' : 'Panel iluminado'}</span>
        </Html>}
        <SkyBody url="/models/sun.glb" az={sky.sunAz} el={sky.sunEl} radius={SUN_RADIUS} distance={skyDistance} />
        <SkyBody url="/models/earth.glb" az={sky.earthAz} el={sky.earthEl} radius={EARTH_RADIUS} distance={skyDistance} unlit mirror />
        {!astronaut && <CameraRig key={resetKey} siteId={siteId} sky={sky} groundY={groundY} controls={controls} arrivalProgress={arrivalProgress} />}
        {descending && <DescentEffects groundY={groundY} progress={arrivalProgress} overlay={overlay} />}
      </Suspense>
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={arrivalProgress === undefined && !astronaut}
        enableDamping
        minDistance={0.3}
        maxDistance={24}
        maxPolarAngle={Math.PI * 0.49}
      />
    </Canvas>
    {astronaut && eye && <div aria-hidden className="eye-overlay pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 size-full">
        <path ref={eyeRefs.horizon} className="eye-horizon" />
        <path ref={eyeRefs.earthHidden} className="eye-earth is-hidden" />
        <path ref={eyeRefs.earthSeen} className="eye-earth" />
        <path ref={eyeRefs.sunHidden} className="eye-sun is-hidden" />
        <path ref={eyeRefs.sunLit} className="eye-sun" />
        <path ref={eyeRefs.sunDays} className="eye-sun-days" />
      </svg>
      <span ref={label('sun')} className="eye-label is-sun">Sol ahora</span>
      <span ref={label('earth')} className="eye-label is-earth">Tierra</span>
      {eye.event && <span ref={label('event')} className="eye-label is-event">{eye.event.label}</span>}
      {(['N', 'E', 'S', 'O'] as const).map(k => <span key={k} ref={label(k)} className="eye-label is-compass">{k}</span>)}
    </div>}
    {descending && <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-hidden">
      <defs>
        <radialGradient id="engine-glow"><stop offset="0" stopColor="#f4f7ff" /><stop offset="0.35" stopColor="#dfe8ff" stopOpacity="0.6" /><stop offset="1" stopColor="#dfe8ff" stopOpacity="0" /></radialGradient>
        {/* Capa de polvo: tenue junto a la base (deja ver la nave), más densa en el anillo que sale y nula al borde. */}
        <radialGradient id="dust-sheet"><stop offset="0" stopColor="#cfc9bd" stopOpacity="0.15" /><stop offset="0.45" stopColor="#cfc9bd" stopOpacity="0.55" /><stop offset="1" stopColor="#cfc9bd" stopOpacity="0" /></radialGradient>
        <filter id="dust-soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        <filter id="dust-grain"><feGaussianBlur stdDeviation="0.7" /></filter>
      </defs>
      {/* Polvo de regolito: una capa baja y suave con granos que fluyen hacia fuera en línea recta. */}
      <path ref={overlay.sheet} fill="url(#dust-sheet)" filter="url(#dust-soft)" style={{ opacity: 0 }} />
      <path ref={overlay.outer} fill="none" stroke="#bdb6a8" strokeWidth={1} strokeLinecap="round" filter="url(#dust-grain)" style={{ opacity: 0 }} />
      <path ref={overlay.inner} fill="none" stroke="#e2ddd2" strokeWidth={1.3} strokeLinecap="round" filter="url(#dust-grain)" style={{ opacity: 0 }} />
      <circle ref={overlay.glow} fill="url(#engine-glow)" style={{ opacity: 0 }} />
      <g ref={overlay.marker} style={{ opacity: 0 }}>
        <circle r={9} fill="none" stroke="#e8ebf1" strokeOpacity={0.6} strokeWidth={1} />
        <circle r={3} fill="#ffffff" />
        <text x={14} y={-10} fill="#e8ebf1" fontSize={12}>Nave</text>
      </g>
    </svg>}
  </>)
}

useGLTF.preload('/models/launch_vehicle.glb')
useGLTF.preload('/models/sun.glb')
useGLTF.preload('/models/earth.glb')

