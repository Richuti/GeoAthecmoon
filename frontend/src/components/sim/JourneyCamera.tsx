import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as Controls } from 'three-stdlib'

/** Cámara automática hasta que se arrastra; después conserva el ángulo mientras sigue a la nave. */
export function useJourneyCamera(resetKey: number, active: boolean, aboveGround = false) {
  const { camera, invalidate } = useThree()
  const controls = useRef<Controls>(null)
  const manual = useRef(false)
  const last = useMemo(() => new THREE.Vector3(), [])
  const delta = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => { manual.current = false; invalidate() }, [resetKey, invalidate])
  const update = (position: THREE.Vector3, target: THREE.Vector3, up?: THREE.Vector3, subject = target) => {
    const c = controls.current
    if (manual.current && c) {
      camera.position.add(delta.copy(subject).sub(last))
      c.target.copy(subject)
      c.update()
    } else {
      camera.position.copy(position)
      if (up) camera.up.copy(up)
      camera.lookAt(target)
      if (c) { c.target.copy(target); c.update() }
    }
    if (c) {
      const distance = position.distanceTo(subject)
      c.minDistance = Math.max(distance * .08, .000001)
      c.maxDistance = Math.max(distance * 20, c.minDistance * 2)
    }
    last.copy(subject)
    camera.updateMatrixWorld()
  }
  return { update, orbit: <OrbitControls ref={controls} makeDefault enabled={active} enablePan={false} enableDamping
    maxPolarAngle={aboveGround ? Math.PI * .49 : Math.PI} onStart={() => { manual.current = true }} /> }
}
