import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { warmBackend } from './api'
import { AppStateProvider } from './state'

warmBackend()

// Recargar reinicia la visita en la portada, conservando el sitio elegido para después.
// Los enlaces compartidos al planificador siguen funcionando al abrirlos por primera vez.
if ((performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload') {
  const url = new URL(window.location.href)
  url.hash = 'inicio'
  window.history.replaceState(window.history.state, '', url)
}
window.history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      <App />
    </AppStateProvider>
  </StrictMode>,
)
