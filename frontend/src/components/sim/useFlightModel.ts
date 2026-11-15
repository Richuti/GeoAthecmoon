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
