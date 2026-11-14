// Estado global de la app: sitios, datos cargados, sitio elegido, instante actual y reproducción.
// Es un reductor puro (sin React) para poder probarlo aparte. El proveedor está en AppStateProvider.tsx.

import type { Site, SiteData } from '../types'

export type Mode = 'explore' | 'simulate'

/** Velocidad de reproducción en horas simuladas por segundo. */
export type Speed = 1 | 6 | 24

export type ListStatus = 'loading' | 'ready' | 'error'

export interface AppState {
  /** Lista de sitios (null mientras carga) */
  sites: Site[] | null
  listStatus: ListStatus
  listError: string | null
  /** Datos completos ya cargados, por id */
  data: Record<string, SiteData>
  /** Error de carga de cada sitio, por id */
  dataErrors: Record<string, string>
  selectedId: string | null
  /** Muestra de tiempo actual. Es la misma para todos los sitios: comparten periodo. */
  index: number
  playing: boolean
  speed: Speed
  mode: Mode
  /** Duración de la misión en días: la viabilidad y la recomendación se calculan para esa ventana */
  missionDays: number
}

/** Sitio que se abre primero si existe en la lista. */
export const DEFAULT_SITE_ID = 'shackleton-rim'

export const initialState: AppState = {
  sites: null,
  listStatus: 'loading',
  listError: null,
  data: {},
  dataErrors: {},
  selectedId: null,
  index: 0,
  playing: false,
  speed: 6,
  mode: 'explore',
  missionDays: 14,
}

export type Action =
  | { type: 'list/loading' }
  | { type: 'list/loaded'; sites: Site[]; preferredId?: string | null }
  | { type: 'list/failed'; error: string }
  | { type: 'site/loaded'; data: SiteData }
  | { type: 'site/failed'; id: string; error: string }
  | { type: 'select'; id: string }
  | { type: 'time/set'; index: number }
  | { type: 'time/step'; by: number }
  | { type: 'play'; playing: boolean }
  | { type: 'play/toggle' }
  | { type: 'speed'; speed: Speed }
  | { type: 'mode'; mode: Mode }
  | { type: 'missionDays'; days: number }

/** Datos del sitio elegido, si ya llegaron. */
export function selectedData(state: AppState): SiteData | null {
  return (state.selectedId && state.data[state.selectedId]) || null
}

/** Cantidad de muestras del sitio elegido (0 si todavía no hay datos). */
export function sampleCount(state: AppState): number {
  return selectedData(state)?.sun.el.length ?? 0
}

function clampIndex(state: AppState, index: number): number {
  const n = sampleCount(state)
  const i = Math.round(index)
  if (n === 0) return Math.max(0, i)
  return Math.min(Math.max(0, i), n - 1)
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'list/loading':
      return { ...state, listStatus: 'loading', listError: null, dataErrors: {} }

    case 'list/loaded': {
      const ids = action.sites.map((s) => s.id)
      // Prioridad: el sitio ya elegido, el pedido en la URL (?sitio=), el de por defecto y el primero.
      const candidates = [state.selectedId, action.preferredId, DEFAULT_SITE_ID, ids[0]]
      const selectedId = candidates.find((id): id is string => !!id && ids.includes(id)) ?? null
      return { ...state, sites: action.sites, listStatus: 'ready', listError: null, selectedId }
    }

    case 'list/failed':
      return { ...state, listStatus: 'error', listError: action.error, playing: false }

    case 'site/loaded': {
      const id = action.data.site.id
      const dataErrors = { ...state.dataErrors }
      delete dataErrors[id]
      const next = { ...state, data: { ...state.data, [id]: action.data }, dataErrors }
      // Si es el sitio elegido, el índice ya puede ajustarse a su cantidad de muestras.
      return id === state.selectedId ? { ...next, index: clampIndex(next, next.index) } : next
    }

    case 'site/failed':
      return {
        ...state,
        dataErrors: { ...state.dataErrors, [action.id]: action.error },
        playing: action.id === state.selectedId ? false : state.playing,
      }

    case 'select': {
      if (action.id === state.selectedId) return state
      const next = { ...state, selectedId: action.id, playing: false }
      return { ...next, index: clampIndex(next, state.index) }
    }

    case 'time/set':
      return { ...state, index: clampIndex(state, action.index) }

    case 'time/step': {
      const n = sampleCount(state)
      if (n === 0) return state
      const index = clampIndex(state, state.index + action.by)
      const atEnd = index >= n - 1
      return { ...state, index, playing: atEnd ? false : state.playing }
    }

    case 'play': {
      if (!action.playing) return { ...state, playing: false }
      const n = sampleCount(state)
      if (n === 0) return state
      // Si está al final, vuelve a empezar.
      return { ...state, playing: true, index: state.index >= n - 1 ? 0 : state.index }
    }

    case 'play/toggle':
      return reducer(state, { type: 'play', playing: !state.playing })

    case 'speed':
      return { ...state, speed: action.speed }

    case 'mode':
      return { ...state, mode: action.mode }

    case 'missionDays': {
      // Entre 1 día y la duración del periodo (si ya se conoce).
      const data = selectedData(state)
      const maxDays = data ? Math.max(1, Math.floor((data.sun.el.length * data.stepHours) / 24)) : 365
      const days = Math.min(maxDays, Math.max(1, Math.round(action.days)))
      return days === state.missionDays ? state : { ...state, missionDays: days }
    }
  }
}
