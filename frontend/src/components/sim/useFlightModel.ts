import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

/** Copia un GLB y lo normaliza sin generar geometría ni alterar el original. */
export function useFlightModel(url: string) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const group = new THREE.Group()
    const copy = scene.clone(true)
    copy.traverse(object => { if (object.name.startsWith('site-')) object.visible = false })
    group.add(copy)
    const box = new THREE.Box3().setFromObject(copy)
    const size = box.getSize(new THREE.Vector3())
    copy.position.sub(box.getCenter(new THREE.Vector3()))
    group.scale.setScalar(1 / Math.max(size.x, size.y, size.z))
    group.updateMatrixWorld(true)
    return group
  }, [scene])
}

/**
 * earth.glb y moon.glb (Solar System Scope) traen la textura en espejo: vistos desde fuera, el este queda a
 * la izquierda. Se reflejan en X al cargarlos, sin tocar la geometría; así sus caras miran hacia fuera y vale
 * la convención de `earthDirection` (src/sim/earthImagery.ts). Comprobado con las UV de cada archivo.
 */
export function useGlobeModel(url: '/models/earth.glb' | '/models/moon.glb') {
  const globe = useFlightModel(url)
  useMemo(() => {
    globe.scale.x = -Math.abs(globe.scale.x)
    globe.updateMatrixWorld(true)
  }, [globe])
  return globe
}

export const useEarthModel = () => useGlobeModel('/models/earth.glb')
