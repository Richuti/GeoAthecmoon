import { Component, type ReactNode } from 'react'
import { Button } from './ui'

/** Red de seguridad global: si una pantalla falla al dibujarse, la app no queda en blanco. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('GEOATHECMOON', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="grid min-h-dvh place-items-center bg-void p-4">
        <div role="alert" className="glass-surface max-w-md p-6 text-center sm:p-8">
          <h1 className="text-xl font-bold text-ink">Algo falló al mostrar esta pantalla.</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">Recarga para volver a empezar desde la portada.</p>
          <Button variant="primary" size="lg" className="mt-6 min-h-12" onClick={() => window.location.reload()}>Recargar</Button>
        </div>
      </main>
    )
  }
}
