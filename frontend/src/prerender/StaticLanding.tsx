// Versión estática de la portada. Se genera al compilar (scripts/prerender.mjs) y va dentro de #root en
// dist/index.html: es lo que leen los buscadores y lo que se ve antes de que cargue JavaScript, o si no carga.
// React la reemplaza al arrancar. No depende de ninguna imagen: todo es texto con los datos reales.

import { buildScenes } from '../components/Story'
import { formatLat, formatLon } from '../lib/format'
import type { StoryFacts } from '../lib/storyFacts'
import { formatDate, sampleTime } from '../lib/time'

export interface StaticSite {
  id: string
  name: string
  description: string
  lat: number
  lon: number
  lightPct: number
  contactPct: number
  slopeDeg: number
}

const link = 'font-bold text-ink underline decoration-seam-strong underline-offset-4 hover:decoration-ink'

export function StaticLanding({ facts, sites }: { facts: StoryFacts | null; sites: StaticSite[] }) {
  const scenes = buildScenes(facts)
  const period = facts
    ? `${formatDate(sampleTime(facts.period, 0))} – ${formatDate(sampleTime(facts.period, (facts.periodDays * 24) / facts.period.stepHours - 1))}`
    : null
  return (
    <div className="static-landing min-h-svh bg-void text-ink">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-seam px-5 py-5 sm:px-10 lg:px-16">
        <a href="/" className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink">GEOATHECMOON</a>
        <nav aria-label="Principal" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href="#sitios" className="text-ink-muted hover:text-ink">Sitios</a>
          <a href="#como-funciona" className="text-ink-muted hover:text-ink">Cómo funciona</a>
          <a href="/#planificador" className={link}>Abrir el planificador</a>
        </nav>
      </header>

      <main>
        <section aria-labelledby="titulo" className="px-5 pb-16 pt-16 sm:px-10 lg:px-16 lg:pt-24">
          <p className="instrument-label text-ink-muted">Planificador de alunizaje · Polo sur lunar</p>
          <h1 id="titulo" className="mt-4 max-w-5xl font-display text-5xl font-extrabold uppercase leading-[0.9] text-balance sm:text-7xl lg:text-8xl">
            ¿Tu misión sobrevive en el polo sur lunar?
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Elige un sitio y una fecha de alunizaje. GEOATHECMOON calcula, hora por hora, cuánta luz solar recibe tu módulo,
            cuándo puede hablar con la Tierra y qué tan inclinado es el terreno, con datos de JPL Horizons y LOLA (NASA).
          </p>
          <p className="mt-8"><a href="/#planificador" className={link}>Planificar mi misión →</a></p>
        </section>

        {scenes.map(scene => (
          <section key={scene.id} aria-labelledby={`static-${scene.id}`} className="border-t border-seam px-5 py-14 sm:px-10 lg:px-16">
            <p className="instrument-label text-ink-muted">{scene.chapter}</p>
            <h2 id={`static-${scene.id}`} className="mt-3 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.92] text-balance sm:text-6xl">
              {scene.title}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">{scene.body}</p>
            {scene.readout && (
              <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-5xl font-black leading-none">{scene.readout.value.toFixed(scene.readout.decimals)}</span>
                <span className="font-display text-2xl font-bold text-ink-muted">{scene.readout.unit}</span>
                <span className="text-sm text-ink-muted">{scene.readout.label} · Fuente: {scene.readout.source}</span>
              </p>
            )}
          </section>
        ))}

        <section id="sitios" aria-labelledby="sitios-titulo" className="border-t border-seam px-5 py-14 sm:px-10 lg:px-16">
          <h2 id="sitios-titulo" className="font-display text-4xl font-extrabold uppercase leading-[0.92] sm:text-6xl">Sitios de alunizaje</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
            {sites.length} sitios conocidos del polo sur. Porcentajes de todo el periodo de datos{period ? ` (${period}, UTC)` : ''}.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map(s => (
              <li key={s.id} className="border border-seam p-5" style={{ borderRadius: 16 }}>
                <h3 className="text-lg font-bold">{s.name}</h3>
                <p className="mt-1 text-xs text-ink-faint">{formatLat(s.lat)} · {formatLon(s.lon)}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{s.description}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-xs text-ink-faint">Luz solar</dt><dd className="font-bold text-sun">{Math.round(s.lightPct)} %</dd></div>
                  <div><dt className="text-xs text-ink-faint">Tierra visible</dt><dd className="font-bold text-earth">{Math.round(s.contactPct)} %</dd></div>
                  <div><dt className="text-xs text-ink-faint">Pendiente</dt><dd className="font-bold">{s.slopeDeg.toFixed(1)}°</dd></div>
                </dl>
                <p className="mt-4 text-sm"><a href={`/?sitio=${s.id}#planificador`} className={link}>Planificar en {s.name}</a></p>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" aria-labelledby="como-titulo" className="border-t border-seam px-5 py-14 sm:px-10 lg:px-16">
          <h2 id="como-titulo" className="font-display text-4xl font-extrabold uppercase leading-[0.92] sm:text-6xl">Cómo funciona</h2>
          <ol className="mt-6 grid max-w-4xl gap-5 text-base leading-relaxed text-ink-muted sm:grid-cols-3">
            <li><strong className="block text-ink">1. Elige el sitio</strong>Seis lugares estudiados para las misiones Artemis y CLPS.</li>
            <li><strong className="block text-ink">2. Elige la fecha</strong>La fecha decide qué montañas tapan el Sol y la Tierra.</li>
            <li><strong className="block text-ink">3. Comprueba el plan</strong>Ves la viabilidad, si la batería aguanta y qué fecha o sitio funciona mejor.</li>
          </ol>
        </section>
      </main>

      <footer className="border-t border-seam px-5 py-10 text-sm leading-relaxed text-ink-muted sm:px-10 lg:px-16">
        <p>Fuentes: JPL Horizons (NASA/JPL), altimetría LOLA e imágenes LROC (Lunar Reconnaissance Orbiter).</p>
        <p className="mt-2 text-xs text-ink-faint">NASA Space Apps Challenge 2026 · Reto «Lunar Landing Site Navigator»</p>
      </footer>
    </div>
  )
}
