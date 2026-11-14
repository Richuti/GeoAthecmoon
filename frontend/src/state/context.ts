import { createContext, useContext } from 'react'
import type { AppState, Mode, Speed } from './appState'

export interface AppActions {
  /** Elige un sitio. Se mantiene la fecha actual y se pausa la reproducción. */
  select: (id: string) => void
  /** Salta a una muestra de tiempo (se ajusta al rango válido). */
  setIndex: (index: number) => void
  setPlaying: (playing: boolean) => void
  togglePlay: () => void
  setSpeed: (speed: Speed) => void
  setMode: (mode: Mode) => void
  /** Duración de la misión en días (se ajusta a 1 … duración del periodo). */
  setMissionDays: (days: number) => void
  /** Vuelve a cargar todo desde cero (botón "Reintentar"). */
  reload: () => void
}

export const AppStateContext = createContext<{ state: AppState; actions: AppActions } | null>(null)

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState debe usarse dentro de <AppStateProvider>.')
  return ctx
}
