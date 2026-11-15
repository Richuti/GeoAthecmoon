// Panel "Fuentes" (tarea 11.2): de dónde sale cada dato y quién hizo cada modelo.
// La fuente única de los créditos es docs/CREDITOS.md: si cambia, se actualiza esta lista.
// El crédito de Solar System Scope (CC BY 4.0) es obligatorio mientras se usen moon.glb y sun.glb.
import { useMemo, useRef, type ReactNode } from 'react'
import { formatLat, formatLon } from '../lib/format'
import { compareWithReference } from '../lib/sky'
import type { SiteData } from '../types'
import { Button } from './ui'

interface Source {
  name: string
  href?: string
  use: string
}

const DATA: Source[] = [
  { name: 'JPL Horizons · NASA/JPL', href: 'https://ssd.jpl.nasa.gov/horizons/', use: 'Posición del Sol y de la Tierra vista desde cada sitio, hora por hora.' },
  { name: 'LOLA · Lunar Reconnaissance Orbiter (NASA)', href: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm', use: 'Relieve del polo sur (DEM LDEM_80S_80M, 80 m por píxel): horizonte, pendiente y terreno 3D.' },
  { name: 'Mapas de iluminación del equipo LOLA · NASA/GSFC', use: 'Validación de la luz y de la Tierra visible (Mazarico et al. 2011, Icarus 211, 1066–1081).' },
  { name: 'Deep Space Network · NASA/JPL', href: 'https://deepspace.jpl.nasa.gov/dsndocs/810-005/301/301K.pdf', use: 'Ubicación de las antenas DSS-14, DSS-63 y DSS-43 (documento 810-005, módulo 301).' },
  { name: 'JPL DE440 y NASA Moon Fact Sheet', href: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html', use: 'Constantes del viaje Tierra–Luna idealizado.' },
]

const EXPLORE: Source[] = [
  { name: 'Moon Trek · NASA', href: 'https://trek.nasa.gov/moon/', use: 'Visor 3D, topografía e imágenes del LRO.' },
  { name: 'LRO QuickMap · Arizona State University', href: 'https://quickmap.lroc.asu.edu/', use: 'Donde el equipo confirmó cada sitio con un marcador. Es de ASU, no del gobierno de EE. UU.; se usa según sus condiciones.' },
  { name: 'Agencia Espacial Canadiense · Exploración lunar', href: 'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/', use: 'Contexto de las misiones y del papel de Canadá en Artemis.' },
]

const MODELS: Source[] = [
  { name: 'NASA 3D Resources · dominio público', href: 'https://github.com/nasa/NASA-3D-Resources', use: 'Módulo Apolo (adaptado con panel solar y antena), rover, astronauta, LRO, Gateway, antena DSN de 34 m, Saturn V y mapa de estrellas Tycho.' },
  { name: 'NASA Visible Earth y Earth Observatory · dominio público', use: 'Tierra de día (Blue Marble Next Generation) y de noche (Black Marble).' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-seam pt-5">
      <h3 className="instrument-label">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function SourceList({ items }: { items: Source[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((s) => (
        <li key={s.name} className="text-sm leading-relaxed">
          {s.href ? (
            <a href={s.href} target="_blank" rel="noreferrer" className="font-bold text-ink underline decoration-seam-strong underline-offset-4 hover:decoration-ink">
              {s.name}
            </a>
          ) : (
            <span className="font-bold text-ink">{s.name}</span>
          )}
          <span className="block text-ink-muted">{s.use}</span>
        </li>
      ))}
    </ul>
  )
}

/** Botón "Fuentes" que abre el panel como diálogo modal (Esc y el botón lo cierran). */
export function Sources({ data }: { data?: SiteData }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const site = data?.site
  const check = useMemo(() => (data ? compareWithReference(data) : null), [data])
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => dialog.current?.showModal()}>
        Fuentes
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="sources-title"
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close() }}
        className="m-auto max-h-[min(52rem,calc(100dvh-2rem))] w-[min(46rem,calc(100vw-2rem))] border border-seam-strong bg-void p-0 text-ink backdrop:bg-void/80"
      >
        <div className="flex flex-col gap-5 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="sources-title" className="font-display text-3xl font-bold uppercase leading-none">Fuentes</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">De dónde sale cada dato de la app y quién hizo cada modelo.</p>
            </div>
            <Button size="sm" onClick={() => dialog.current?.close()} autoFocus>Cerrar</Button>
          </div>

          <Section title="Datos">
            <SourceList items={DATA} />
            {data?.sources && (
              <p className="mt-4 text-xs leading-relaxed text-ink-faint">
                Este sitio usa efemérides {data.sources.ephemeris === 'jpl-horizons' ? 'de JPL Horizons' : 'de un modelo (no reales)'} y relieve{' '}
                {data.sources.terrain === 'lola' ? 'de LOLA' : 'sintético (de prueba)'}.
              </p>
            )}
          </Section>

          {check && (
            <Section title="Validación con NASA">
              <p className="text-sm leading-relaxed text-ink-muted">
                {check.groundLevel ? 'A ras de suelo, calculamos' : 'Calculamos'} luz solar el{' '}
                <span className="font-mono text-sun">{check.ourSunPct.toFixed(0)} %</span> del tiempo en este sitio; el mapa de
                iluminación del equipo LOLA da <span className="font-mono text-sun">{check.nasaSunPct.toFixed(0)} %</span>. Tierra
                visible: <span className="font-mono text-earth">{check.ourEarthPct.toFixed(0)} %</span> frente a{' '}
                <span className="font-mono text-earth">{check.nasaEarthPct.toFixed(0)} %</span>.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                NASA promedia 2009–2013 y nosotros 2027, así que se espera cercanía, no igualdad. Con el panel a 2 m, el sitio ve más Sol.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                Mapas de iluminación AVGVISIB_75S_120M_201608 (NASA/GSFC, equipo LOLA; Mazarico et al. 2011, Icarus 211, 1066–1081).
              </p>
            </Section>
          )}

          {site && (
            <Section title={`Sitio · ${site.name}`}>
              <p className="font-mono text-sm text-ink">{formatLat(site.lat)}, {formatLon(site.lon)}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Para verlo con tus propios ojos, busca estas coordenadas en{' '}
                <a href="https://quickmap.lroc.asu.edu/" target="_blank" rel="noreferrer" className="text-ink underline decoration-seam-strong underline-offset-4 hover:decoration-ink">QuickMap</a>{' '}
                o en{' '}
                <a href="https://trek.nasa.gov/moon/" target="_blank" rel="noreferrer" className="text-ink underline decoration-seam-strong underline-offset-4 hover:decoration-ink">Moon Trek</a>.
              </p>
            </Section>
          )}

          <Section title="Para explorar el polo sur">
            <SourceList items={EXPLORE} />
          </Section>

          <Section title="Modelos 3D y texturas">
            <SourceList items={MODELS} />
            <p className="mt-4 text-sm leading-relaxed text-ink">
              Texturas de la Luna y el Sol:{' '}
              <a href="https://www.solarsystemscope.com/" target="_blank" rel="noreferrer" className="font-bold underline decoration-seam-strong underline-offset-4 hover:decoration-ink">Solar System Scope</a>{' '}
              (solarsystemscope.com),{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline decoration-seam-strong underline-offset-4 hover:decoration-ink">CC BY 4.0</a>.
            </p>
          </Section>

          <Section title="Sobre el proyecto">
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-ink-muted">
              <li>Proyecto creado por nuestro equipo para el NASA Space Apps Challenge 2026. Usa datos y modelos públicos de NASA según sus normas de uso de imágenes y medios.</li>
              <li>Las imágenes y videos de la portada son ilustraciones generadas con IA. Ningún dato sale de ellas.</li>
              <li>Los módulos del simulador son configuraciones de referencia, no naves reales.</li>
            </ul>
          </Section>
        </div>
      </dialog>
    </>
  )
}
