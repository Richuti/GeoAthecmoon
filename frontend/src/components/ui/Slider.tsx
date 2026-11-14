import { useId, type CSSProperties, type ReactNode } from 'react'
import { toneVar, type Tone } from './cx'
import { InfoTip } from './InfoTip'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  /** Color del tramo recorrido: `sun` para energía, `earth` para comunicación */
  tone?: Tone
  hint?: ReactNode
  format?: (value: number) => string
  onChange: (value: number) => void
}

export function Slider({ label, value, min, max, step = 1, unit, tone = 'neutral', hint, format, onChange }: SliderProps) {
  const id = useId()
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0
  const style = { '--fill': `${fill}%`, '--tone': toneVar[tone] } as CSSProperties

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <label htmlFor={id} className="text-sm text-ink-muted">
            {label}
          </label>
          {hint && (
            <InfoTip label={label} align="start">
              {hint}
            </InfoTip>
          )}
        </span>
        <output htmlFor={id} className="font-mono text-sm text-ink">
          {format ? format(value) : value}
          {unit && <span className="ml-1 text-xs text-ink-faint">{unit}</span>}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range mt-1"
        style={style}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
