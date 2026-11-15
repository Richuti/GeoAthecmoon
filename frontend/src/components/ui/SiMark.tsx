import { cx } from './cx'

/**
 * Marca visible para las ilustraciones generadas con IA (ChatGPT).
 * NASA Space Apps exige que toda imagen hecha con SI lleve una marca visible.
 * Va encima de la imagen, no dentro del archivo, para que ningún recorte la oculte.
 * `place` reemplaza la posición por defecto (esquina inferior derecha del contenedor).
 */
export function SiMark({ place = 'absolute bottom-2 right-2 z-10' }: { place?: string }) {
  return (
    <span className={cx('pointer-events-none rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold leading-none tracking-wide text-white/85', place)}>
      Ilustración generada con IA · ChatGPT
    </span>
  )
}
