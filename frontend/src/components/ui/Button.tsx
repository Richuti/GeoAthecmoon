import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  // La acción principal es clara y neutra: el ámbar y el azul quedan para los datos.
  primary: 'bg-ink text-void hover:bg-white',
  secondary: 'border border-seam-strong bg-hull-raised text-ink hover:border-ink-faint',
  ghost: 'text-ink-muted hover:bg-hull-raised hover:text-ink',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-variant={variant}
      className={cx(
        'flight-button inline-flex shrink-0 items-center justify-center gap-2 rounded-hw font-bold transition-colors duration-150 ease-console',
        'disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
