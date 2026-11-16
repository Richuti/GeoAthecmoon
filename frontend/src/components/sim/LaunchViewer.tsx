import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { EARTH_LAYERS, LAUNCH_SITE, boundsRad, earthDirection, earthEast } from '../../sim/earthImagery'
import { EARTH_RADIUS_KM } from '../../sim/transfer'
import { LAUNCH_PAD_DECK_M, LAUNCH_SHIP_HEIGHT_M, launchFrame } from '../../sim/transferView'
import { useEarthModel, useFlightModel } from './useFlightModel'

const EARTH_RADIUS_M = EARTH_RADIUS_KM * 1000
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const LAYER_URLS = EARTH_LAYERS.map(l => l.url)

// Capas de NASA en latitud y longitud, de la más amplia a la más cercana. Cada fragmento calcula su
// latitud y longitud desde la dirección en el modelo terrestre (misma convención que la plataforma) y
// funde cada capa en su borde. Los píxeles negros (sin datos) dejan ver la capa de abajo.
const LAYER_FRAGMENT = `
uniform sampler2D earthLayer[${EARTH_LAYERS.length}];
uniform sampler2D padMap;
uniform vec4 earthLayerBounds[${EARTH_LAYERS.length}];
varying vec3 vEarthDir;
vec3 earthLayerMix(vec3 base, sampler2D tex, vec4 b, vec2 lonLat) {
  vec2 uv = (lonLat - b.xy) / (b.zw - b.xy);
  vec2 edge = min(uv, 1.0 - uv);
  float w = smoothstep(0.0, 0.08, min(edge.x, edge.y));
  vec3 texel = texture2D(tex, clamp(uv, 0.0, 1.0)).rgb;
  // Solo el negro puro es «sin datos»; el océano profundo de Blue Marble es muy oscuro pero válido.
  w *= smoothstep(0.0003, 0.0015, max(texel.r, max(texel.g, texel.b)));
  return mix(base, texel * 1.35, w);
}
`
const LAYER_MAP_FRAGMENT = `#include <map_fragment>
vec3 earthDir = normalize(vEarthDir);
vec2 lonLat = vec2(atan(-earthDir.x, -earthDir.z), asin(clamp(earthDir.y, -1.0, 1.0)));
vec3 layered = diffuseColor.rgb;
${EARTH_LAYERS.map((_, i) => `layered = earthLayerMix(layered, earthLayer[${i}], earthLayerBounds[${i}], lonLat);`).join('\n')}
vec2 border = min(vRegionalUv, 1.0 - vRegionalUv);
float localBlend = smoothstep(0.02, 0.10, min(border.x, border.y));
diffuseColor.rgb = mix(layered, texture2D(regionalMap, vRegionalUv).rgb, localBlend);
vec2 padUv = (vRegionalUv - 0.5) * (10000.0 / 1200.0) + 0.5;
vec2 padEdge = min(padUv, 1.0 - padUv);
float padBlend = smoothstep(0.02, 0.12, min(padEdge.x, padEdge.y));
// El GLB de relieve ocupa este hueco: evita que el globo plano tape las depresiones reales.
if (max(abs(vRegionalUv.x - 0.5), abs(vRegionalUv.y - 0.5)) * 10000.0 < 560.0) discard;
diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(padMap, clamp(padUv, 0.0, 1.0)).rgb, padBlend);`

function LaunchScene({ altitudeM, ascent, reduced, onReady, onGround }: { altitudeM: number; ascent: number; reduced: boolean; onReady: () => void; onGround: (height: number) => void }) {
  const earth = useEarthModel()
  const earthShadow = useEarthModel()
  // La misma nave que se ve en la transferencia, el alunizaje y el planificador.
  const rocket = useFlightModel('/models/launch_vehicle.glb')
  const platform = useFlightModel('/models/launch_platform.glb')
  const regionalMap = useLoader(THREE.TextureLoader, '/textures/flight/kennedy-naip.jpg')
  const padMap = useLoader(THREE.TextureLoader, '/textures/flight/kennedy-pad-naip.jpg')
  const { scene: terrainSource } = useGLTF('/models/kennedy_terrain.glb')
  const layerMaps = useLoader(THREE.TextureLoader, LAYER_URLS)
  const terrain = useMemo(() => {
    const copy = terrainSource.clone(true)
    copy.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const mesh = object as THREE.Mesh
      const material = new THREE.MeshStandardMaterial({ map: padMap, roughness: 1, metalness: 0, transparent: true })
      material.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec2 vTerrainXZ;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTerrainXZ = (modelMatrix * vec4(transformed, 1.0)).xz;')
        shader.fragmentShader = 'varying vec2 vTerrainXZ;\n' + shader.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(560.0, 599.0, max(abs(vTerrainXZ.x), abs(vTerrainXZ.y)));')
      }
      material.customProgramCacheKey = () => 'kennedy-dem-edge-v1'
      mesh.material = material
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    copy.updateMatrixWorld(true)
    const heightAt = (x: number, z: number) => {
      const hit = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0)).intersectObject(copy, true)[0]
      if (!hit) throw new Error('No se encontró el suelo de la plataforma en el DEM.')
      return hit.point.y
    }
    return { scene: copy, height: heightAt(0, 0), gantryHeight: heightAt(-55, -35) }
  }, [terrainSource, padMap])
  useEffect(() => {
    onGround(terrain.height)
    return () => terrain.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) ((o as THREE.Mesh).material as THREE.Material).dispose() })
  }, [terrain, onGround])
  const ship = useRef<THREE.Group>(null)
  const { camera, scene, size } = useThree()
  const vectors = useMemo(() => ({ target: new THREE.Vector3(), offset: new THREE.Vector3(), day: new THREE.Color('#98bdd6'), night: new THREE.Color('#02040b'), sky: new THREE.Color() }), [])
  const ground = useMemo(() => {
    // Un punto de referencia visual de Florida sobre el GLB existente. Se usa la
    // intersección y normal del triángulo, no un radio supuesto que deje la base flotando.
    for (const map of [regionalMap, padMap, ...layerMaps]) {
      map.colorSpace = THREE.SRGBColorSpace
      map.anisotropy = 8
    }
    const layerBounds = EARTH_LAYERS.map(l => new THREE.Vector4(...boundsRad(l.bounds)))
    // Matriz de cada malla en el marco del modelo terrestre, antes de colocarlo en la escena.
    earth.updateMatrixWorld(true)
    const radial = new THREE.Vector3(...earthDirection(LAUNCH_SITE.latDeg, LAUNCH_SITE.lonDeg))
    // El GLB terrestre tiene caras con orientación interior: se admiten ambos
    // lados para encontrar la superficie próxima, no la cara opuesta del planeta.
    earth.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const mesh = object as THREE.Mesh
      const earthFrame = mesh.matrixWorld.clone()
      const source = mesh.material as THREE.MeshStandardMaterial
      mesh.material = new THREE.MeshBasicMaterial({ map: source.map, color: source.color.clone().multiplyScalar(1.5), side: THREE.DoubleSide, fog: true })
      mesh.material.userData.launchGround = true
      // Proyección regional sobre la malla terrestre existente: ningún plano nuevo.
      mesh.material.onBeforeCompile = shader => {
        shader.uniforms.regionalMap = { value: regionalMap }
        shader.uniforms.padMap = { value: padMap }
        shader.uniforms.earthLayer = { value: layerMaps }
        shader.uniforms.earthLayerBounds = { value: layerBounds }
        shader.uniforms.earthFrame = { value: earthFrame }
        shader.vertexShader = 'uniform mat4 earthFrame;\nvarying vec2 vRegionalUv;\nvarying vec3 vEarthDir;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEarthDir = (earthFrame * vec4(transformed, 1.0)).xyz;\nvRegionalUv = (modelMatrix * vec4(transformed, 1.0)).xz / 10000.0 * vec2(1.0, -1.0) + 0.5;')
        shader.fragmentShader = 'uniform sampler2D regionalMap;\nvarying vec2 vRegionalUv;\n' + LAYER_FRAGMENT + shader.fragmentShader.replace('#include <map_fragment>', LAYER_MAP_FRAGMENT)
      }
      mesh.material.customProgramCacheKey = () => 'kennedy-pad-naip-v3'
    })
    earthShadow.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const mesh = object as THREE.Mesh
      mesh.material = new THREE.ShadowMaterial({ opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
      mesh.material.userData.launchGround = true
      mesh.receiveShadow = true
      mesh.material.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec2 vGroundXZ;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundXZ = (modelMatrix * vec4(transformed, 1.0)).xz;')
        shader.fragmentShader = 'varying vec2 vGroundXZ;\n' + shader.fragmentShader.replace('void main() {', 'void main() {\nif (max(abs(vGroundXZ.x), abs(vGroundXZ.y)) < 560.0) discard;')
      }
      mesh.material.customProgramCacheKey = () => 'kennedy-shadow-cutout-v1'
    })
    earth.updateMatrixWorld(true)
    const hit = new THREE.Raycaster(radial.clone().multiplyScalar(2), radial.clone().negate()).intersectObject(earth, true)[0]
    if (!hit?.face) throw new Error('No se encontró la superficie del modelo terrestre.')
    const normal = hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld))
    if (normal.dot(radial) < 0) normal.negate()
    const rotation = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0))
    const east = new THREE.Vector3(...earthEast(LAUNCH_SITE.lonDeg)).applyQuaternion(rotation)
    rotation.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(east.z, east.x)))
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
  }, [earth, earthShadow, rocket, platform, regionalMap, padMap, layerMaps])
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
    ship.current?.position.set(0, terrain.height + frame.centerY, 0)
    vectors.target.set(0, terrain.height + frame.centerY, 0)
    const overhead = reduced ? 0 : clamp((ascent - 0.18) / 0.52)
    vectors.offset.set(THREE.MathUtils.lerp(0.65, 0.35, overhead), THREE.MathUtils.lerp(0.24, 1.3, overhead), THREE.MathUtils.lerp(0.95, 0.65, overhead)).multiplyScalar(frame.distanceM)
    camera.position.copy(vectors.target).add(vectors.offset)
    camera.lookAt(vectors.target)
    camera.updateMatrixWorld()
    vectors.sky.copy(vectors.day).lerp(vectors.night, clamp((ascent - 0.5) / 0.4))
    scene.background = vectors.sky
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(vectors.sky)
      // Bruma ligera: deja ver la costa a decenas de km y se disipa al subir.
      scene.fog.near = Math.max(300, altitudeM * 3)
      scene.fog.far = Math.max(30000, altitudeM * 80)
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
    <primitive object={terrain.scene} dispose={null} />
    {/* Anclajes medidos en el GLB NASA: boca a x=0; cubierta a 4.85 m. */}
    <group position={[9.2, terrain.height + 60, 0]} scale={120}><primitive object={platform} dispose={null} /></group>
    <Suspense fallback={null}><LaunchGantry groundY={terrain.gantryHeight} /></Suspense>
    <group ref={ship} position={[0, terrain.height + LAUNCH_PAD_DECK_M + LAUNCH_SHIP_HEIGHT_M / 2, 0]} scale={LAUNCH_SHIP_HEIGHT_M}>
      <primitive object={rocket} dispose={null} />
    </group>
  </>
}

/** Estructura de servicio NASA existente: volumen y sombras, sin geometría generada. */
function LaunchGantry({ groundY }: { groundY: number }) {
  const gantry = useFlightModel('/models/launch_gantry.glb')
  useEffect(() => {
    gantry.traverse(o => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).castShadow = true; (o as THREE.Mesh).receiveShadow = true } })
  }, [gantry])
  return <group position={[-55, groundY + 47.5, -35]} scale={95}><primitive object={gantry} dispose={null} /></group>
}

/** Billboards HTML proyectados: texturas transparentes, sin generar mallas 3D. */
function Exhaust({ altitudeM, ascent, groundY, plume, clouds }: { altitudeM: number; ascent: number; groundY: number; plume: RefObject<HTMLImageElement | null>; clouds: RefObject<(HTMLImageElement | null)[]> }) {
  const { camera, size } = useThree()
  const points = useMemo(() => Array.from({ length: 3 }, () => new THREE.Vector3()), [])
  useFrame(() => {
    const ignition = clamp(ascent / 0.025)
    const project = (x: number, y: number, z: number, index: number) => {
      const p = points[index].set(x, y, z).project(camera)
      return { x: (p.x + 1) * size.width / 2, y: (1 - p.y) * size.height / 2, visible: p.z > -1 && p.z < 1 }
    }
    const nozzleY = groundY + LAUNCH_PAD_DECK_M + altitudeM + 1
    const origin = project(0, nozzleY, 0, 0)
    const tail = project(0, nozzleY - 170 * ignition, 0, 1)
    if (plume.current) {
      const length = Math.hypot(tail.x - origin.x, tail.y - origin.y)
      const width = length * 0.45
      const flicker = 0.96 + 0.04 * Math.sin(ascent * 1300)
      Object.assign(plume.current.style, { left: `${origin.x}px`, top: `${origin.y}px`, width: `${width}px`, height: `${length}px`, opacity: `${origin.visible ? ignition * flicker : 0}`, transform: `translateX(-50%) rotate(${Math.atan2(origin.x - tail.x, tail.y - origin.y)}rad)`, transformOrigin: '50% 0' })
    }
    clouds.current.forEach((cloud, i) => {
      if (!cloud) return
      const expansion = clamp(ascent / 0.28)
      const drift = (i - 1.5) * (30 + expansion * 100)
      const center = project(drift, groundY + 10 + expansion * 22, i % 2 ? 25 : -20, 0)
      const edge = project(drift + 100 + expansion * 160, groundY + 10 + expansion * 22, i % 2 ? 25 : -20, 1)
      const width = Math.min(size.width * 2, Math.hypot(edge.x - center.x, edge.y - center.y) * 2)
      Object.assign(cloud.style, { left: `${center.x}px`, top: `${center.y}px`, width: `${width}px`, opacity: `${center.visible ? ignition * (1 - clamp((ascent - 0.35) / 0.35)) * 0.8 : 0}`, transform: `translate(-50%, -50%) scaleX(${i % 2 ? -1 : 1}) rotate(${i * 7 - 10}deg)` })
    })
  })
  return null
}

/** Escena local en metros. Solo carga GLB; el ascenso es una presentación ilustrativa. */
export default function LaunchViewer({ altitudeM, ascent, reduced, active, onReady }: { altitudeM: number; ascent: number; reduced: boolean; active: boolean; onReady: () => void }) {
  const [groundY, setGroundY] = useState(0)
  const plume = useRef<HTMLImageElement>(null)
  const clouds = useRef<(HTMLImageElement | null)[]>([])
  return <><Canvas shadows dpr={[1, 1.5]} frameloop={active ? 'always' : 'never'}
    gl={{ antialias: true, logarithmicDepthBuffer: true }} camera={{ position: [300, 120, 400], fov: 42, near: 0.5, far: 30000000 }} aria-hidden>
    <Suspense fallback={null}><LaunchScene altitudeM={altitudeM} ascent={ascent} reduced={reduced} onReady={onReady} onGround={setGroundY} /><Exhaust altitudeM={altitudeM} ascent={ascent} groundY={groundY} plume={plume} clouds={clouds} /></Suspense>
  </Canvas>
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <img ref={plume} src="/textures/flight/engine-plume.png" alt="" className="absolute max-w-none" style={{ opacity: 0 }} />
      {[0, 1, 2, 3].map(i => <img key={i} ref={el => { clouds.current[i] = el }} src="/textures/flight/launch-steam.png" alt="" className="absolute max-w-none" style={{ opacity: 0 }} />)}
    </div>
  </>
}
