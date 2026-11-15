import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

/** Mismo cielo de NASA en el terreno y en el viaje, sin generar geometría. */
export function SpaceBackground() {
  const texture = useTexture('/textures/stars.jpg')
  const { scene } = useThree()
  useEffect(() => {
    const previous = scene.background
    const previousIntensity = scene.backgroundIntensity
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.colorSpace = THREE.SRGBColorSpace
    scene.background = texture
    // Una cámara expuesta para la superficie iluminada apenas distingue las estrellas.
    scene.backgroundIntensity = 0.08
    return () => {
      scene.background = previous
      scene.backgroundIntensity = previousIntensity
    }
  }, [texture, scene])
  return null
}
