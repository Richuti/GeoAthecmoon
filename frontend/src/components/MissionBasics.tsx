/** Esquemas explicativos, sin cifras ni estados simulados. */
export function MissionBasics() {
  return <section aria-label="Cómo obtiene energía y envía mediciones la nave" className="mission-basics mt-6 grid gap-7 border-t border-seam pt-5 md:grid-cols-2 md:gap-8">
    <figure>
      <h3 className="text-base font-bold text-ink">Para mantener la nave encendida</h3>
      <svg viewBox="0 0 300 60" aria-hidden className="mt-3 h-14 w-full text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
        <g stroke="var(--color-sun)"><circle cx="30" cy="30" r="10" /><path d="M30 11v5m0 28v5M11 30h5m28 0h5M17 17l4 4m18 18 4 4M17 43l4-4m18-18 4-4" /></g>
        <path d="M65 30h43l-5-4m5 4-5 4M190 30h43l-5-4m5 4-5 4" />
        <rect x="132" y="16" width="36" height="27" rx="1" /><path d="M144 16v27m12-27v27m-24-13h36m-18 13v7m-10 0h20" />
        <rect x="257" y="14" width="26" height="34" rx="2" /><path d="M265 14V9h10v5m-3 8-7 11h10l-7 9" />
      </svg>
      <figcaption>
        <div className="grid grid-cols-3 text-center text-xs font-bold text-ink"><span>Sol</span><span>Panel</span><span>Batería</span></div>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">El panel transforma la luz del Sol en electricidad. Si no produce suficiente, la nave usa la batería. Cuando esa reserva llega al mínimo, la misión se detiene.</p>
      </figcaption>
    </figure>
    <figure>
      <h3 className="text-base font-bold text-ink">Para recibir las mediciones de la misión</h3>
      <svg viewBox="0 0 300 60" aria-hidden className="mt-3 h-14 w-full text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="17" y="14" width="26" height="34" rx="2" /><path d="M23 23h14m-14 7h14m-14 7h9M65 30h43l-5-4m5 4-5 4" />
        <path d="M134 16q0 24 27 24l-27-24 25 5m-13 12-3 16m-8 0h23" /><path d="M163 15q9 1 10 10m-9-17q15 1 16 16M193 30h40l-5-4m5 4-5 4" stroke="var(--color-earth)" />
        <g stroke="var(--color-earth)"><circle cx="270" cy="30" r="17" /><ellipse cx="270" cy="30" rx="7" ry="17" /><path d="M253 30h34m-31-9h28m-28 18h28" /></g>
      </svg>
      <figcaption>
        <div className="grid grid-cols-3 text-center text-xs font-bold text-ink"><span>Mediciones</span><span>Antena</span><span>Tierra</span></div>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">Las mediciones viajan por radio a la Tierra. Si una montaña bloquea la señal, se guardan a bordo para enviarlas después. La nave puede seguir trabajando mientras espera.</p>
      </figcaption>
    </figure>
  </section>
}
