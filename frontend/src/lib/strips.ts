// Tramos seguidos de una serie de banderas (luz o contacto), para dibujar franjas.

/** Tramos seguidos en los que la bandera es verdadera, en muestras relativas a `from`. */
export function runs(flags: boolean[], from: number, to: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let start = -1
  for (let i = from; i < to; i++) {
    if (flags[i] && start < 0) start = i
    if (!flags[i] && start >= 0) { out.push([start - from, i - from]); start = -1 }
  }
  if (start >= 0) out.push([start - from, to - from])
  return out
}
