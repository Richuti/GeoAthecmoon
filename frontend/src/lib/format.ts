// Formato de valores para mostrar en la interfaz.

/** Latitud legible: -89.67 → "89.67° S". */
export function formatLat(lat: number): string {
  return `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'}`
}

/** Longitud este (0–360) legible: 197 → "197.0° E". */
export function formatLon(lon: number): string {
  return `${lon.toFixed(1)}° E`
}

/** Coordenadas completas: "89.67° S · 197.0° E". */
export function formatCoords(site: { lat: number; lon: number }): string {
  return `${formatLat(site.lat)} · ${formatLon(site.lon)}`
}
