import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { DataError, clearDataCache, getSiteData, getSites } from '../api'
import { DEFAULT_SITE_ID, initialState, reducer, selectedData } from './appState'
import { AppStateContext, type AppActions } from './context'

function message(err: unknown, fallback: string): string {
  return err instanceof DataError ? err.message : fallback
}

/** Parámetro de la URL que guarda el sitio elegido: /?sitio=nobile-rim */
const URL_PARAM = 'sitio'

function siteFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(URL_PARAM)
  } catch {
    return null
  }
}

/** Carga los datos, guarda el estado global y mueve el tiempo cuando se reproduce. */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [reloadKey, setReloadKey] = useState(0)

  // Carga: primero la lista, después el sitio elegido y luego el resto (para recomendar y comparar).
  // Solo se repite con "Reintentar" (reloadKey). El sitio elegido se lee del render que la disparó.
  const preferredId = state.selectedId ?? siteFromUrl()
  useEffect(() => {
    let cancelled = false
    dispatch({ type: 'list/loading' })

    const loadSite = (id: string, name: string) =>
      getSiteData(id)
        .then((data) => {
          if (!cancelled) dispatch({ type: 'site/loaded', data })
        })
        .catch((err: unknown) => {
          if (!cancelled) dispatch({ type: 'site/failed', id, error: message(err, `No se pudieron cargar los datos de ${name}.`) })
        })

    ;(async () => {
      let sites
      try {
        sites = (await getSites()).sites
      } catch (err) {
        if (!cancelled) dispatch({ type: 'list/failed', error: message(err, 'No se pudo cargar la lista de sitios.') })
        return
      }
      if (cancelled) return
      dispatch({ type: 'list/loaded', sites, preferredId })

      const first = sites.find((s) => s.id === preferredId) ?? sites.find((s) => s.id === DEFAULT_SITE_ID) ?? sites[0]
      if (first) await loadSite(first.id, first.name)
      if (cancelled) return
      for (const s of sites) if (s !== first) void loadSite(s.id, s.name)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a propósito: solo al montar y al reintentar
  }, [reloadKey])

  // La URL refleja el sitio elegido, para compartir un enlace directo. replaceState no llena el historial.
  useEffect(() => {
    if (!state.selectedId || state.listStatus !== 'ready') return
    const url = new URL(window.location.href)
    if (url.searchParams.get(URL_PARAM) === state.selectedId) return
    url.searchParams.set(URL_PARAM, state.selectedId)
    window.history.replaceState(window.history.state, '', url)
  }, [state.selectedId, state.listStatus])

  // Reproducción: avanza una muestra cada (stepHours / speed) segundos.
  const stepHours = selectedData(state)?.stepHours ?? 1
  useEffect(() => {
    if (!state.playing) return
    const id = window.setInterval(() => dispatch({ type: 'time/step', by: 1 }), (1000 * stepHours) / state.speed)
    return () => window.clearInterval(id)
  }, [state.playing, state.speed, stepHours])

  const actions = useMemo<AppActions>(
    () => ({
      select: (id) => dispatch({ type: 'select', id }),
      setIndex: (index) => dispatch({ type: 'time/set', index }),
      setPlaying: (playing) => dispatch({ type: 'play', playing }),
      togglePlay: () => dispatch({ type: 'play/toggle' }),
      setSpeed: (speed) => dispatch({ type: 'speed', speed }),
      setMode: (mode) => dispatch({ type: 'mode', mode }),
      setMissionDays: (days) => dispatch({ type: 'missionDays', days }),
      reload: () => {
        clearDataCache()
        setReloadKey((k) => k + 1)
      },
    }),
    [],
  )

  const value = useMemo(() => ({ state, actions }), [state, actions])
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
