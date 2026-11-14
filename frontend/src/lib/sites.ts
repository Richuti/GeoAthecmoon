import type { Site, SiteCategory } from '../types'

/** Orden y nombre de cada categoría en la interfaz. */
export const CATEGORY_LABEL: Record<SiteCategory, string> = {
  artemis: 'Artemis',
  clps: 'CLPS',
  apollo: 'Apolo',
  international: 'Internacional',
  custom: 'Personalizados',
}

/** Qué significa cada categoría, en lenguaje simple. */
export const CATEGORY_HINT: Record<SiteCategory, string> = {
  artemis: 'Zonas del polo sur que la NASA estudia para los alunizajes con astronautas del programa Artemis.',
  clps: 'Zonas de misiones robóticas que empresas privadas llevan a la Luna para la NASA (programa CLPS).',
  apollo: 'Sitios de las misiones Apolo, como referencia histórica.',
  international: 'Sitios de misiones de otras agencias espaciales.',
  custom: 'Sitios agregados por el equipo.',
}

/** Agrupa los sitios por categoría, en el orden de CATEGORY_LABEL y respetando el orden de la lista. */
export function groupByCategory(sites: Site[]): Array<{ category: SiteCategory; sites: Site[] }> {
  return (Object.keys(CATEGORY_LABEL) as SiteCategory[])
    .map((category) => ({ category, sites: sites.filter((s) => s.category === category) }))
    .filter((g) => g.sites.length > 0)
}
