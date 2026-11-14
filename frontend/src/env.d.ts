/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del backend, sin barra final. Vacío = usar los datos de prueba de public/data. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
