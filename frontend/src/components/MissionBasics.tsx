/** Explicación directa de energía y comunicación, sin iconos ni códigos de color. */
export function MissionBasics() {
  return <section aria-label="Cómo obtiene energía y envía mediciones la nave" className="mission-basics mt-6 grid gap-7 border-t border-seam pt-5 md:grid-cols-2 md:gap-8">
    <div>
      <h3 className="text-base font-bold text-ink">Para mantener la nave encendida</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">El panel transforma la luz del Sol en electricidad. Si no produce suficiente, la nave usa la batería. Cuando esa reserva llega al mínimo, la misión se detiene.</p>
    </div>
    <div>
      <h3 className="text-base font-bold text-ink">Para recibir las mediciones de la misión</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">Las mediciones viajan por radio a la Tierra. Si una montaña bloquea la señal, se guardan a bordo para enviarlas después. La nave puede seguir trabajando mientras espera.</p>
    </div>
  </section>
}
