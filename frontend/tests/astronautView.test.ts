import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { litSeries } from '../src/lib/visibility.ts'
import { horizonProfile, nextSunEvent, skyPath } from '../src/sim/astronautView.ts'
import type { SiteData } from '../src/types.ts'

const N = 30 * 24
const site: SiteData = {
  site: { id: 'x', name: 'x', lat: -89, lon: 0, category: 'custom' },
  start: '2027-01-01T00:00:00Z',
  stepHours: 1,
  horizon: { azimuthStepDeg: 1, elevationDeg: Array.from({ length: 360 }, (_, az) => (az >= 170 && az <= 190 ? 3 : 0.5)) },
  slope: { atSiteDeg: 0, max100mDeg: 0 },
  // El Sol da la vuelta al horizonte una vez cada 30 días, a 1.5° de elevación.
  sun: { az: Array.from({ length: N }, (_, i) => (i * 0.5) % 360), el: Array(N).fill(1.5) },
  earth: { az: Array(N).fill(0), el: Array(N).fill(5) },
}

describe('vista junto al astronauta', () => {
  test('el perfil del horizonte tiene un punto por grado y se cierra en 360°', () => {
    const p = horizonProfile(site.horizon)
    assert.equal(p.length, 361)
    assert.equal(p[180].el, 3)
    assert.equal(p[360].el, p[0].el)
  })
  test('el camino del Sol marca cuándo lo tapa la cresta', () => {
    const lit = litSeries(site)
    const path = skyPath(site, 'sun', lit, 300, 2, 2)
    assert.equal(path[0].index, 300)
    assert.equal(path.at(-1)!.index, 348)
    // Azimut 170–190 (muestras 340–380): la cresta de 3° tapa el Sol de 1.5°.
    assert.equal(path.find((p) => p.index === 340)!.visible, false)
    assert.equal(path.find((p) => p.index === 330)!.visible, true)
  })
  test('el próximo cambio: se oculta tras la cresta y vuelve después', () => {
    const lit = litSeries(site)
    const hide = nextSunEvent(site, lit, 300)
    assert.equal(hide?.appears, false)
    assert.equal(hide?.index, 339) // a 169.5° el horizonte interpolado (1.75°) ya supera al Sol
    const back = nextSunEvent(site, lit, hide!.index)
    assert.equal(back?.appears, true)
    assert.ok(back!.index > 380 && back!.index <= 382)
    assert.equal(nextSunEvent(site, lit, 300, 1), null)
  })
})
