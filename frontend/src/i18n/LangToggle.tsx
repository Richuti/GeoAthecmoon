import { useSyncExternalStore } from 'react'
import { Segmented } from '../components/ui'
import { getLang, onLangChange, setLang, type Lang } from './index.ts'

const OPTIONS = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
] as const

/** Selector EN / ES de la cabecera. `translate="no"`: la capa de traducción no lo toca. */
export function LangToggle({ className }: { className?: string }) {
  const lang = useSyncExternalStore(onLangChange, getLang, () => 'en' as Lang)
  return (
    <div translate="no" className={className}>
      <Segmented label="Language / Idioma" size="sm" options={OPTIONS} value={lang} onChange={setLang} />
    </div>
  )
}
