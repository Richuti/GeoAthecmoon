import { useCallback, useEffect, useState } from 'react'

// Una entrada por carga de página. Volver desde el planificador no vuelve a interrumpir la visita.
let presented = false

export function BrandIntro() {
  const [visible, setVisible] = useState(() => !presented && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const dismiss = useCallback(() => setVisible(false), [])

  useEffect(() => {
    presented = true
    if (!visible) return
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    const previousGutter = root.style.scrollbarGutter
    root.style.scrollbarGutter = 'stable'
    root.style.overflow = 'hidden'
    // Respaldo por si una extensión del navegador suprime los eventos de animación.
    const timer = window.setTimeout(dismiss, 2500)
    const keyboard = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Tab') dismiss() }
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { if (preference.matches) dismiss() }
    document.addEventListener('keydown', keyboard)
    preference.addEventListener('change', change)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', keyboard)
      preference.removeEventListener('change', change)
      root.style.overflow = previousOverflow
      root.style.scrollbarGutter = previousGutter
    }
  }, [visible, dismiss])

  if (!visible) return null
  return <section className="brand-intro" aria-label="Presentación de GEOATHECMOON"
    onAnimationEnd={e => { if (e.target === e.currentTarget) dismiss() }}>
    <div className="brand-intro__identity">
      <svg className="brand-intro__mark" aria-hidden viewBox="245 285 510 355">
        {/* El archivo original de Richard, sin redibujar ni alterar el monograma. */}
        <image href="/brand/logo.png" width="1000" height="1000" />
      </svg>
      <div>
        <p className="brand-intro__name" aria-label="GEOATHECMOON"><span aria-hidden><span>GEOATHEC</span><span>MOON</span></span></p>
        <p className="brand-intro__caption">Planificador lunar</p>
      </div>
    </div>
    <button className="brand-intro__skip" type="button" onClick={dismiss}>Saltar intro <span aria-hidden>↗</span></button>
  </section>
}
