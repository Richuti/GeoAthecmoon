// Tarea 8.3: «¿Cómo leer esto?». Glosario corto, en lenguaje simple, para quien nunca usó Quickmap.
// Cada término dice qué es y por qué importa en el polo sur. No trae números: los datos están en la app.
import { useRef } from 'react'
import { Button } from './ui'

interface Term {
  term: string
  /** Color del dato al que se refiere (ámbar = Sol, azul = Tierra) */
  tone?: 'sun' | 'earth'
  what: string
  why: string
}

const TERMS: Term[] = [
  {
    term: 'Horizonte',
    what: 'La línea donde el terreno se junta con el cielo, vista desde el sitio. Arriba se dibuja como una silueta de 360°.',
    why: 'En el polo sur el Sol y la Tierra pasan muy bajos: una montaña a decenas de kilómetros basta para taparlos.',
  },
  {
    term: 'Elevación',
    what: 'Qué tan alto está algo sobre el horizonte plano, en grados. 0° es el horizonte y 90° es justo arriba.',
    why: 'Aquí el Sol casi nunca sube más de 2°. Si la elevación del Sol es menor que la del relieve en esa dirección, el sitio queda en sombra.',
  },
  {
    term: 'Azimut',
    what: 'La dirección hacia la que miras, en grados desde el norte y en el sentido de las agujas del reloj: 90° es el este y 180° el sur.',
    why: 'Sirve para saber qué parte del relieve tapa al Sol o a la Tierra en cada momento.',
  },
  {
    term: 'Luz solar',
    tone: 'sun',
    what: 'Las horas en que el Sol está por encima del relieve. Es el % de tiempo con luz.',
    why: 'Los paneles solares solo cargan la batería con luz. Una sombra larga puede agotarla.',
  },
  {
    term: 'Ventana de comunicación',
    tone: 'earth',
    what: 'Un tramo de tiempo en que la Tierra se ve desde el sitio, sin relieve en medio.',
    why: 'Sin la Tierra a la vista no hay contacto directo: los datos del módulo esperan guardados hasta la siguiente ventana.',
  },
  {
    term: 'DSN (Red de Espacio Profundo)',
    tone: 'earth',
    what: 'Las antenas gigantes de NASA en Goldstone (EE. UU.), Madrid (España) y Canberra (Australia) que hablan con las naves.',
    why: 'Para que haya enlace, además de ver la Tierra desde el sitio, alguna antena tiene que ver la Luna sobre su propio horizonte. El simulador supone que siempre hay una disponible.',
  },
  {
    term: 'Eclipse',
    tone: 'sun',
    what: 'Cuando la Tierra pasa por delante del Sol, visto desde la Luna, y tapa parte o todo su disco.',
    why: 'Durante un eclipse el panel genera menos aunque el sitio esté iluminado. Dura unas horas.',
  },
  {
    term: 'Pendiente',
    what: 'Qué tan inclinado está el suelo, en grados. Se mide con el relieve de LOLA, unos 80 m por punto, así que no ve rocas pequeñas.',
    why: 'La mayoría de los módulos necesita menos de 8 a 10° para posarse sin volcar.',
  },
  {
    term: 'Viabilidad',
    what: 'Una nota de 0 a 100 que combina la luz, el contacto con la Tierra y la pendiente durante los días de la misión.',
    why: 'Sirve para comparar sitios y fechas de un vistazo. Si la batería del módulo se agota, la nota baja aunque el sitio parezca bueno.',
  },
  {
    term: 'Tolerancia a atrasos',
    what: 'Cuántos días se puede atrasar el alunizaje y la misión sigue sobreviviendo.',
    why: 'Responde la pregunta del reto: si la misión se atrasa, ¿todavía funciona?',
  },
]

/** Botón «¿Cómo leer esto?» que abre el glosario como diálogo modal (Esc y el botón lo cierran). */
export function Help() {
  const dialog = useRef<HTMLDialogElement>(null)
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => dialog.current?.showModal()}>
        Ayuda
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="help-title"
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close() }}
        className="m-auto max-h-[min(52rem,calc(100dvh-2rem))] w-[min(46rem,calc(100vw-2rem))] border border-seam-strong bg-void p-0 text-ink backdrop:bg-void/80"
      >
        <div className="flex flex-col gap-5 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="help-title" className="text-2xl font-bold leading-tight">Cómo leer esto</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Las palabras de la app, explicadas en simple. En la app, el ámbar es siempre el Sol y el azul, siempre la Tierra.
              </p>
            </div>
            <Button size="sm" onClick={() => dialog.current?.close()} autoFocus>Cerrar</Button>
          </div>
          <dl className="flex flex-col">
            {TERMS.map((t) => (
              <div key={t.term} className="border-t border-seam py-4 sm:grid sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
                <dt className={t.tone === 'sun' ? 'font-bold text-sun' : t.tone === 'earth' ? 'font-bold text-earth' : 'font-bold text-ink'}>{t.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed sm:mt-0">
                  <span className="text-ink">{t.what}</span> <span className="text-ink-muted">{t.why}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </dialog>
    </>
  )
}
