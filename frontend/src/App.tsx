// Layout base de GeoAthectum. Cada bloque se llena en las siguientes tareas.
function Placeholder({ title, task }: { title: string; task: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/2 p-4 text-center">
      <p className="text-sm font-medium text-gray-300">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{task}</p>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            GeoAthectum <span className="text-gray-400">· Lunar Landing Site Navigator</span>
          </h1>
          <p className="text-xs text-gray-500">
            Compara sitios y fechas de alunizaje en el polo sur de la Luna: luz solar, contacto con la Tierra y pendiente.
          </p>
        </div>
        <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">NASA Space Apps 2026</span>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[260px_1fr_320px]">
        <aside className="min-h-40">
          <Placeholder title="Sitios de alunizaje" task="Tarea 4 · selector de sitios" />
        </aside>
        <section className="grid min-h-0 grid-rows-[1fr_auto] gap-3">
          <Placeholder title="Mapa 3D del terreno" task="Tarea 9 · vista 3D" />
          <div className="h-28">
            <Placeholder title="Línea de tiempo" task="Tarea 6 · fecha, hora y ventanas" />
          </div>
        </section>
        <aside className="grid min-h-0 grid-rows-[auto_1fr] gap-3">
          <div className="h-64">
            <Placeholder title="Cielo: Sol y Tierra sobre el horizonte" task="Tarea 7 · gráfico polar" />
          </div>
          <Placeholder title="Viabilidad de la misión" task="Tarea 8 · métricas y % de viabilidad" />
        </aside>
      </main>
    </div>
  )
}
