// Sitios y periodo que comparten los scripts de datos (generate-mock-data.mjs y fetch-horizons.mjs).

/** Periodo de los datos: 60 días cada 1 hora (1440 muestras). */
export const START = '2027-01-01T00:00:00Z'
export const STEP_HOURS = 1
export const DAYS = 60
export const SAMPLES = (DAYS * 24) / STEP_HOURS

// Coordenadas aproximadas: se verifican con Quickmap y Moon Trek en el paso 3.3.
//
// `relief` solo lo usa el terreno sintético (generate-mock-data.mjs):
//   baseM          altura de referencia (solo cosmético)
//   targetHorizon  horizonte máximo buscado en grados; el relieve se escala hasta lograrlo
//   noiseM         amplitud del relieve aleatorio (antes de escalar)
//   craters        cuántos cráteres aleatorios agregar (nunca sobre el centro)
//   features       accidentes fijos (antes de escalar), con dirección `az` desde el sitio
//   mound          loma local donde está el sitio, en metros reales (no se escala);
//                  controla la pendiente y deja el sitio un poco más alto que su entorno

export const SITES = [
  {
    id: 'shackleton-rim',
    name: 'Borde del cráter Shackleton',
    lat: -89.67,
    lon: 197.0,
    category: 'artemis',
    description: 'Borde del cráter que está en el mismo polo. Sol casi continuo, pero la Tierra pasa muy baja.',
    relief: {
      baseM: 1900,
      targetHorizon: 0.45,
      noiseM: 90,
      craters: 4,
      features: [{ kind: 'crater', az: 180, rimDistKm: 0.3, radiusKm: 10.5, depthM: 3000 }],
      mound: { heightM: 70, radiusKm: 0.9, power: 2, offsetKm: 0.12, offsetAz: 160 },
    },
  },
  {
    id: 'connecting-ridge',
    name: 'Connecting Ridge',
    lat: -89.45,
    lon: 222.0,
    category: 'artemis',
    description: 'Cresta que une Shackleton con de Gerlache. Muy iluminada y alta sobre su entorno.',
    relief: {
      baseM: 1950,
      targetHorizon: 0.5,
      noiseM: 80,
      craters: 6,
      features: [
        { kind: 'ridge', az: 40, lengthKm: 40, widthKm: 2.2, heightM: 700 },
        { kind: 'massif', az: 130, distKm: 7.5, radiusKm: 3.5, heightM: 800 },
      ],
      mound: { heightM: 80, radiusKm: 0.8, power: 2, offsetKm: 0.12, offsetAz: 130 },
    },
  },
  {
    id: 'de-gerlache-rim',
    name: 'Borde del cráter de Gerlache',
    lat: -88.67,
    lon: 292.0,
    category: 'artemis',
    description: 'Borde de un cráter de 32 km. Buena luz con algunas sombras largas del relieve vecino.',
    relief: {
      baseM: 1600,
      targetHorizon: 1.6,
      noiseM: 150,
      craters: 7,
      features: [
        { kind: 'crater', az: 250, rimDistKm: 0.3, radiusKm: 16, depthM: 2500 },
        { kind: 'massif', az: 20, distKm: 8, radiusKm: 2.5, heightM: 900 },
      ],
      mound: { heightM: 35, radiusKm: 0.45, power: 2, offsetKm: 0.12, offsetAz: 70 },
    },
  },
  {
    id: 'mons-mouton',
    name: 'Mons Mouton',
    lat: -84.8,
    lon: 29.2,
    category: 'clps',
    description: 'Meseta de cima plana, cerca de donde alunizó IM-2 (2025). Terreno suave y Tierra visible.',
    relief: {
      baseM: 5900,
      targetHorizon: 2.2,
      noiseM: 160,
      craters: 8,
      features: [{ kind: 'massif', az: 300, distKm: 9, radiusKm: 3, heightM: 600 }],
      mound: { heightM: 120, radiusKm: 3, power: 4, offsetKm: 0.3, offsetAz: 0 },
    },
  },
  {
    id: 'malapert-massif',
    name: 'Macizo Malapert',
    lat: -86.0,
    lon: 2.9,
    category: 'artemis',
    description: 'Montaña cara a la Tierra: buen contacto directo. Ladera con más pendiente.',
    relief: {
      baseM: 4900,
      targetHorizon: 2.0,
      noiseM: 140,
      craters: 6,
      features: [{ kind: 'massif', az: 150, distKm: 7, radiusKm: 2.5, heightM: 700 }],
      mound: { heightM: 220, radiusKm: 1.0, power: 2, offsetKm: 0.05, offsetAz: 225 },
    },
  },
  {
    id: 'nobile-rim',
    name: 'Borde del cráter Nobile',
    lat: -85.4,
    lon: 37.0,
    category: 'clps',
    description: 'Zona que exploraría VIPER. Relieve alto alrededor: menos horas de sol y pendientes fuertes.',
    relief: {
      baseM: 2200,
      targetHorizon: 4.2,
      noiseM: 220,
      craters: 9,
      features: [
        { kind: 'crater', az: 200, rimDistKm: 0.4, radiusKm: 36, depthM: 3500 },
        { kind: 'ridge', az: 100, lengthKm: 30, widthKm: 2.5, heightM: 1200, offsetKm: 6, offsetAz: 10 },
        { kind: 'massif', az: 280, distKm: 6, radiusKm: 2, heightM: 1100 },
      ],
      mound: { heightM: 60, radiusKm: 0.33, power: 2, offsetKm: 0.06, offsetAz: 300 },
    },
  },
]
