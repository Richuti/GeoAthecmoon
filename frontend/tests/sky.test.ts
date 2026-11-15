import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import {
  angularRadiusDeg,
  blockerAt,
  compareWithReference,
  compassPoint,
  discAboveHorizon,
  discCoverage,
  dsnLinkSeries,
  dsnSeries,
  dsnStationsAt,
  earthDiscFraction,
  eclipseFraction,
  eclipses,
  EARTH_RADIUS_KM,
  separationDeg,
  solarFraction,
  sunRadiusDeg,
  SUN_RADIUS_KM,
} from '../src/lib/sky.ts'
import { sunFraction, SUN_RADIUS_DEG } from '../src/sim/simulate.ts'
import type { SiteData } from '../src/types.ts'

const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} y ${b} difieren más de ${tol}`)

/** Sitio mínimo con horizonte plano a `h` grados. El Sol y la Tierra se dan por muestra. */
function fakeSite(sun: { az: number[]; el: number[]; distKm?: number[] }, earth: { az: number[]; el: number[]; distKm?: number[] }, h = 0): SiteData {
  return {
    site: { id: 'x', name: 'x', lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: { azimuthStepDeg: 1, elevationDeg: Array.from({ length: 360 }, () => h) },
    slope: { atSiteDeg: 0, max100mDeg: 0 },
    sun,
    earth,
  }
}

describe('tamaño aparente', () => {
  test('el Sol a 1 UA mide 0.2665° de radio (el valor que usaba el simulador)', () => near(angularRadiusDeg(SUN_RADIUS_KM, 149_597_870.7), SUN_RADIUS_DEG, 0.0005))
  test('la Tierra desde la Luna mide cerca de 0.95° de radio a la distancia media', () => near(angularRadiusDeg(EARTH_RADIUS_KM, 384_400), 0.9507, 0.001))
  test('sin distKm se usa la distancia media', () => {
    const d = fakeSite({ az: [0], el: [10] }, { az: [180], el: [10] })
    near(sunRadiusDeg(d, 0), SUN_RADIUS_DEG, 0.0005)
  })
  test('con distKm el radio cambia con la distancia', () => {
    const d = fakeSite({ az: [0, 0], el: [10, 10], distKm: [147_100_000, 152_100_000] }, { az: [180, 180], el: [10, 10] })
    assert.ok(sunRadiusDeg(d, 0) > sunRadiusDeg(d, 1))
  })
})

describe('separación angular', () => {
  test('misma dirección: 0°', () => near(separationDeg(30, 5, 30, 5), 0, 1e-9))
  test('azimuts opuestos sobre el horizonte: 180°', () => near(separationDeg(0, 0, 180, 0), 180, 1e-9))
  test('a lo largo de la vertical', () => near(separationDeg(90, 10, 90, 25), 15, 1e-9))
})

describe('superposición de discos', () => {
  test('separados: 0', () => assert.equal(discCoverage(0.27, 0.95, 1.3), 0))
  test('el disco grande tapa al chico: 1', () => assert.equal(discCoverage(0.27, 0.95, 0.5), 1))
  test('un disco chico delante de uno grande: razón de áreas', () => near(discCoverage(1, 0.5, 0.2), 0.25, 1e-12))
  test('dos discos iguales con los centros a un radio: 39.1 %', () => near(discCoverage(1, 1, 1), (2 * Math.PI / 3 - Math.sqrt(3) / 2) / Math.PI, 1e-9))
  test('crece al acercarse', () => assert.ok(discCoverage(0.27, 0.95, 1.0) < discCoverage(0.27, 0.95, 0.9)))
})

describe('fracción del disco sobre el relieve', () => {
  test('igual a la del simulador con el radio medio', () => {
    for (const c of [-1, -0.2665, -0.1, 0, 0.1, 0.2665, 1]) near(discAboveHorizon(c, SUN_RADIUS_DEG), sunFraction(c), 1e-12)
  })
  test('sin eclipse ni distancias, solarFraction es la de antes', () => {
    const d = fakeSite({ az: [0, 0, 0], el: [-1, 0.1, 5] }, { az: [180, 180, 180], el: [5, 5, 5] })
    for (let i = 0; i < 3; i++) near(solarFraction(d, i), sunFraction(d.sun.el[i]), 1e-4)
  })
  test('la Tierra a medio salir: la mitad del disco', () => {
    const d = fakeSite({ az: [0], el: [10] }, { az: [180], el: [0] })
    near(earthDiscFraction(d, 0), 0.5, 1e-9)
  })
})

describe('eclipses', () => {
  // El Sol y la Tierra en el mismo azimut, la Tierra bajando sobre el Sol.
  const d = fakeSite({ az: [0, 0, 0, 0, 0], el: [10, 10, 10, 10, 10] }, { az: [0, 0, 0, 0, 0], el: [13, 11, 10.5, 10, 13] })
  test('fracción tapada por muestra', () => {
    assert.equal(eclipseFraction(d, 0), 0)
    assert.ok(eclipseFraction(d, 1) > 0 && eclipseFraction(d, 1) < 1)
    assert.equal(eclipseFraction(d, 2), 1)
  })
  test('la energía baja durante el eclipse', () => {
    assert.equal(solarFraction(d, 3), 0)
    assert.ok(solarFraction(d, 1) < solarFraction(d, 0))
  })
  test('lista de eclipses con su máximo', () => {
    const e = eclipses(d)
    assert.equal(e.length, 1)
    assert.deepEqual([e[0].start, e[0].end], [1, 4])
    assert.equal(e[0].total, true)
  })
})

describe('relieve que tapa', () => {
  const d = fakeSite({ az: [91.4], el: [0] }, { az: [0], el: [0] })
  d.horizon.distanceKm = Array.from({ length: 360 }, (_, i) => i / 10)
  d.horizon.obstacleHeightM = Array.from({ length: 360 }, (_, i) => i)
  test('toma la muestra más cercana', () => assert.deepEqual(blockerAt(d.horizon, 91.4), { azimuthDeg: 91, elevationDeg: 0, distanceKm: 9.1, heightM: 91 }))
  test('da la vuelta en 359.6°', () => assert.equal(blockerAt(d.horizon, 359.6).azimuthDeg, 0))
  test('sin distancias devuelve null', () => assert.equal(blockerAt({ azimuthStepDeg: 1, elevationDeg: [1, 2] }, 0).distanceKm, null))
  test('rumbos', () => assert.deepEqual([0, 44, 46, 180, 225, 315, 359].map(compassPoint), ['N', 'NE', 'NE', 'S', 'SO', 'NO', 'N']))
})

describe('DSN', () => {
  const d = fakeSite({ az: [0, 0, 0], el: [5, 5, 5] }, { az: [0, 0, 0], el: [5, 5, 5] })
  test('sin datos de la DSN: null', () => {
    assert.equal(dsnSeries(d), null)
    assert.deepEqual(dsnStationsAt(d, 0), [])
  })
  test('alguna estación sobre la elevación mínima', () => {
    const x: SiteData = {
      ...d,
      dsn: {
        minElevationDeg: 10,
        stations: [
          { id: 'a', name: 'A', antenna: 'DSS-1', el: [20, 5, -3] },
          { id: 'b', name: 'B', antenna: 'DSS-2', el: [-5, 12, -1] },
        ],
      },
    }
    assert.deepEqual(dsnSeries(x), [true, true, false])
    assert.deepEqual(dsnStationsAt(x, 1), ['b'])
    assert.deepEqual(dsnLinkSeries(x, [false, true, true]), [false, true, false])
  })
})

describe('con los datos de JPL Horizons y LOLA (2027)', () => {
  const dir = join(import.meta.dirname, '..', 'public', 'data', 'sites')
  const sites: SiteData[] = readdirSync(dir).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  const malapert = sites.find((s) => s.site.id === 'malapert-massif')!

  test('traen distancias, crestas, DSN y la referencia de NASA', () => {
    for (const s of sites) {
      assert.equal(s.sun.distKm?.length, s.sun.el.length)
      assert.equal(s.earth.distKm?.length, s.earth.el.length)
      assert.equal(s.horizon.distanceKm?.length, 360)
      assert.equal(s.dsn?.stations.length, 3)
      assert.ok(s.reference)
    }
  })
  test('la Tierra está a 356 000–407 000 km', () => {
    for (const s of sites) {
      assert.ok(Math.min(...s.earth.distKm!) > 356_000)
      assert.ok(Math.max(...s.earth.distKm!) < 407_000)
    }
  })
  test('Malapert ve el eclipse penumbral de Luna del 17 de agosto de 2027 como un eclipse parcial de Sol', () => {
    const e = eclipses(malapert)
    assert.equal(e.length, 1)
    const peak = new Date(Date.parse(malapert.start) + e[0].peakIndex * 3600_000).toISOString()
    assert.ok(peak.startsWith('2027-08-17'), peak)
    assert.ok(e[0].maxFraction > 0.3 && !e[0].total)
  })
  test('cada antena ve la Luna sobre 10° cerca del 40 % del tiempo', () => {
    for (const st of malapert.dsn!.stations) {
      const pct = (100 * st.el.filter((e) => e >= malapert.dsn!.minElevationDeg).length) / st.el.length
      assert.ok(pct > 35 && pct < 48, `${st.id}: ${pct}`)
    }
  })
  test('validación: a ras de suelo, la luz y la Tierra quedan a menos de 6 puntos del mapa de NASA', () => {
    const sunDiff: number[] = []
    for (const s of sites) {
      const c = compareWithReference(s)!
      assert.equal(c.groundLevel, true)
      assert.ok(Math.abs(c.ourSunPct - c.nasaSunPct) < 6, `${s.site.id} Sol: ${c.ourSunPct} vs ${c.nasaSunPct}`)
      assert.ok(Math.abs(c.ourEarthPct - c.nasaEarthPct) < 6, `${s.site.id} Tierra: ${c.ourEarthPct} vs ${c.nasaEarthPct}`)
      sunDiff.push(Math.abs(c.ourSunPct - c.nasaSunPct))
    }
    sunDiff.sort((a, b) => a - b)
    assert.ok((sunDiff[2] + sunDiff[3]) / 2 < 3.5, `mediana ${sunDiff}`)
  })
})
