import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EARTH_LAYERS, LAUNCH_SITE, boundsAround, earthDirection, earthEast, earthNorth, gibsUrl, latLonOf } from '../src/sim/earthImagery.ts'

test('el cuadrado de cada capa mide lo mismo en kilómetros de norte a sur y de este a oeste', () => {
  const b = boundsAround(28.6, -80.6, 100)
  const kmPerDeg = (Math.PI * 6371) / 180
  assert.ok(Math.abs((b.north - b.south) * kmPerDeg - 200) < 1e-6)
  assert.ok(Math.abs((b.east - b.west) * kmPerDeg * Math.cos((28.6 * Math.PI) / 180) - 200) < 1e-6)
  assert.throws(() => boundsAround(28.6, -80.6, 0), RangeError)
  assert.throws(() => boundsAround(89.5, 0, 10), RangeError)
})

test('las capas van de la más amplia a la más cercana y todas contienen la plataforma', () => {
  for (let i = 0; i < EARTH_LAYERS.length; i++) {
    const { bounds: b } = EARTH_LAYERS[i]
    assert.ok(b.west < LAUNCH_SITE.lonDeg && LAUNCH_SITE.lonDeg < b.east)
    assert.ok(b.south < LAUNCH_SITE.latDeg && LAUNCH_SITE.latDeg < b.north)
    if (i > 0) assert.ok(EARTH_LAYERS[i].halfKm < EARTH_LAYERS[i - 1].halfKm)
  }
  // La más cercana cubre de sobra la imagen NAIP de Kennedy (±5 km).
  assert.ok(EARTH_LAYERS[EARTH_LAYERS.length - 1].halfKm > 20)
})

test('la dirección en el modelo terrestre y su inversa coinciden', () => {
  for (const [lat, lon] of [[LAUNCH_SITE.latDeg, LAUNCH_SITE.lonDeg], [0, 0], [-45, 170], [60, -120]]) {
    const back = latLonOf(...earthDirection(lat, lon))
    assert.ok(Math.abs(back.latDeg - lat) < 1e-9)
    assert.ok(Math.abs(back.lonDeg - lon) < 1e-9)
  }
  // Longitud este 279.3957 = oeste 80.6043.
  const east = earthDirection(28.6084, 279.3957)
  const west = earthDirection(28.6084, -80.6043)
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(east[k] - west[k]) < 1e-9)
})

const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

test('la convención es de mano derecha: este × norte = vertical (la Tierra no se ve en espejo)', () => {
  for (const [lat, lon] of [[LAUNCH_SITE.latDeg, LAUNCH_SITE.lonDeg], [0, 0], [-33, 151], [64, -21]]) {
    const up = earthDirection(lat, lon)
    const c = cross(earthEast(lon), earthNorth(lat, lon))
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(c[k] - up[k]) < 1e-9, `${lat}, ${lon}`)
  }
})

test('al aumentar la longitud se avanza hacia el este', () => {
  const a = earthDirection(10, 20), b = earthDirection(10, 20.001), e = earthEast(20)
  const step = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  assert.ok(step[0] * e[0] + step[1] * e[1] + step[2] * e[2] > 0)
})

test('la petición a GIBS usa EPSG:4326 con el recuadro en longitud y latitud', () => {
  const url = new URL(gibsUrl(EARTH_LAYERS[0]))
  assert.equal(url.hostname, 'gibs.earthdata.nasa.gov')
  assert.equal(url.searchParams.get('SRS'), 'EPSG:4326')
  const [w, s, e, n] = url.searchParams.get('BBOX')!.split(',').map(Number)
  assert.ok(w < e && s < n && w < -80 && e > -81 + 0 && s < 28.6 && n > 28.6)
})
