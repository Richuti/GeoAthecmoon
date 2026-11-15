import { formatDuration } from '../lib/time'
import { nextChange } from '../lib/visibility'
import type { SiteData } from '../types'

/** Una explicación visual del instante elegido; la fotografía ilustra y los datos deciden el estado. */
export function SiteConditions({ data, index, lit, contact }: { data: SiteData; index: number; lit: boolean[]; contact: boolean[] }) {
  const lightChange = nextChange(lit, index)
  const contactChange = nextChange(contact, index)
  const items = [
    { name: 'Luz solar', image: '/media/escena-2-sol.jpg', visible: lit[index], tone: 'text-sun',
      title: lit[index] ? 'El Sol está a la vista.' : 'El relieve tapa al Sol.',
      description: lit[index] ? 'El panel puede recibir luz solar.' : 'El módulo depende de la energía guardada en su batería.',
      next: lightChange === null ? 'Sin cambios hasta el final de los datos.' : `${lit[index] ? 'El Sol se oculta' : 'Vuelve la luz'} en ${formatDuration(lightChange * data.stepHours)}.` },
    { name: 'Contacto con la Tierra', image: '/media/escena-3-tierra.jpg', visible: contact[index], tone: 'text-earth',
      title: contact[index] ? 'La Tierra está a la vista.' : 'La Tierra queda oculta.',
      description: contact[index] ? 'Hay línea de vista para la comunicación directa.' : 'Los datos deben esperar a la próxima ventana de contacto.',
      next: contactChange === null ? 'Sin cambios hasta el final de los datos.' : `${contact[index] ? 'Se pierde el contacto' : 'Vuelve el contacto'} en ${formatDuration(contactChange * data.stepHours)}.` },
  ]
  return <section aria-labelledby="conditions-title">
    <div className="mb-4"><h2 id="conditions-title" className="text-xl font-bold text-ink">¿Qué ve tu módulo ahora?</h2><p className="mt-2 text-sm text-ink-muted">Así afectan el Sol y la Tierra al instante que elegiste.</p></div>
    <div className="grid gap-5 sm:grid-cols-2">
      {items.map(item => <figure key={item.name} className="glass-surface condition-figure">
        <div className="relative aspect-[16/7] overflow-hidden rounded-t-[inherit] bg-black">
          <img src={item.image} alt="" loading="lazy" className="size-full object-cover" style={{ filter: item.visible ? 'brightness(.8)' : 'brightness(.32) saturate(.35)', transform: item.name === 'Contacto con la Tierra' ? 'scale(2.5)' : 'scale(1.25)', transformOrigin: item.name === 'Contacto con la Tierra' ? '58% 60%' : '40% 55%' }} />
          <span className={`absolute left-4 top-4 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold ${item.tone}`}>{item.name}</span>
        </div>
        <figcaption className="p-5"><h3 className="text-base font-bold text-ink">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.description}</p><p className={`mt-4 text-sm ${item.tone}`}>{item.next}</p></figcaption>
      </figure>)}
    </div>
    <p className="mt-3 text-xs leading-relaxed text-ink-muted">Imágenes ilustrativas. El estado y los próximos cambios se calculan con JPL Horizons y el relieve LOLA de {data.site.name}.</p>
  </section>
}
