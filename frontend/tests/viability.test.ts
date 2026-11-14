import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import {
  DEFAULT_WEIGHTS,
  MAX_SCORE_IF_MISSION_FAILS,
  normalizeWeights,
  siteViability,
  slopeScore,
  verdictOf,
  viability,
} from '../src/lib/viability.ts'
import { visibility } from '../src/lib/visibility.ts'
import type { SiteData } from '../src/types.ts'

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `esperaba ${b} y dio ${a}`)

describe('slopeScore', () => {
  test('hasta 5° es 100', () => {
    assert.equal(slopeScore(0), 100)
    assert.equal(slopeScore(5), 100)
  })
  test('a 7.5° es 50', () => close(slopeScore(7.5), 50))
  test('desde 10° es 0', () => {
    assert.equal(slopeScore(10), 0)
    assert.equal(slopeScore(25), 0)
  })
})

describe('normalizeWeights', () => {
  test('los de por defecto ya suman 1', () => {
    const w = normalizeWeights(DEFAULT_WEIGHTS)
    close(w.light + w.contact + w.slope, 1)
  })
  test('pesos cualquiera se escalan para sumar 1', () =>
    assert.deepEqual(normalizeWeights({ light: 2, contact: 1, slope: 1 }), { light: 0.5, contact: 0.25, slope: 0.25 }))
  test('negativos y NaN cuentan como 0', () =>
    assert.deepEqual(normalizeWeights({ light: 1, contact: -3, slope: Number.NaN }), { light: 1, contact: 0, slope: 0 }))
  test('todo en 0 vuelve a los de por defecto', () =>
    assert.deepEqual(normalizeWeights({ light: 0, contact: 0, slope: 0 }), DEFAULT_WEIGHTS))
})

describe('viability', () => {
  test('puntaje con los pesos de por defecto', () => {
    // 0.45·80 + 0.35·60 + 0.20·100 = 36 + 21 + 20 = 77
    const r = viability({ lightPct: 80, contactPct: 60, maxSlopeDeg: 3 })
    close(r.score, 77)
    assert.equal(r.verdict, 'good')
  })
  test('los puntos de los factores suman el total', () => {
    const r = viability({ lightPct: 63, contactPct: 41, maxSlopeDeg: 6.2 })
    close(r.factors.light.points + r.factors.contact.points + r.factors.slope.points, r.score)
  })
  test('solo luz: el puntaje es el % de luz', () =>
    close(viability({ lightPct: 63, contactPct: 10, maxSlopeDeg: 20 }, { light: 1, contact: 0, slope: 0 }).score, 63))
  test('todo perfecto es 100', () => close(viability({ lightPct: 100, contactPct: 100, maxSlopeDeg: 0 }).score, 100))
  test('valores fuera de rango se recortan', () => {
    const r = viability({ lightPct: 140, contactPct: -5, maxSlopeDeg: 2 })
    assert.equal(r.factors.light.score, 100)
    assert.equal(r.factors.contact.score, 0)
  })

  test('el factor limitante es el que más puntos quita', () => {
    // Pierde 0.45·20 = 9 por luz y 0.35·70 = 24.5 por contacto: limita el contacto.
    const r = viability({ lightPct: 80, contactPct: 30, maxSlopeDeg: 2 })
    assert.equal(r.limiting, 'contact')
    assert.match(r.summary, /Lo que más baja el puntaje es el contacto con la Tierra\./)
  })
  test('si nada resta mucho, no se nombra un limitante', () =>
    assert.doesNotMatch(viability({ lightPct: 99, contactPct: 99, maxSlopeDeg: 1 }).summary, /Lo que más baja/))

  test('resumen en lenguaje simple', () =>
    assert.equal(
      viability({ lightPct: 73.3, contactPct: 39.7, maxSlopeDeg: 2.24 }).summary,
      'Mucha luz (73 % del tiempo), contacto parcial con la Tierra (40 %) y terreno suave (2.2° como máximo). Lo que más baja el puntaje es el contacto con la Tierra.',
    ))
  test('la frase usa el mismo número redondeado que se muestra', () => {
    assert.match(viability({ lightPct: 69.6, contactPct: 59.5, maxSlopeDeg: 5.04 }).summary, /^Mucha luz \(70 %.*buen contacto.*\(60 %\).*terreno suave \(5\.0°/)
  })

  test('advertencias de pendiente', () => {
    assert.match(viability({ lightPct: 90, contactPct: 90, maxSlopeDeg: 12 }).warnings.join(' '), /no pueden alunizar/)
    assert.match(viability({ lightPct: 90, contactPct: 90, maxSlopeDeg: 8 }).warnings.join(' '), /podrían tener problemas/)
    assert.deepEqual(viability({ lightPct: 90, contactPct: 90, maxSlopeDeg: 3 }).warnings, [])
  })
  test('advertencias de luz y contacto', () => {
    const w = viability({ lightPct: 40, contactPct: 20, maxSlopeDeg: 3 }).warnings.join(' ')
    assert.match(w, /sin Sol/)
    assert.match(w, /Poco contacto directo/)
  })

  test('si la misión no sobrevive, el puntaje queda en 40 como máximo', () => {
    const r = viability({ lightPct: 95, contactPct: 90, maxSlopeDeg: 2 }, DEFAULT_WEIGHTS, { missionSurvives: false })
    assert.equal(r.score, MAX_SCORE_IF_MISSION_FAILS)
    assert.equal(r.cappedByMission, true)
    assert.equal(r.verdict, 'poor')
    assert.match(r.warnings[0], /no sobrevive/)
  })
  test('el tope no sube un puntaje que ya era bajo', () => {
    const r = viability({ lightPct: 20, contactPct: 20, maxSlopeDeg: 12 }, DEFAULT_WEIGHTS, { missionSurvives: false })
    assert.ok(r.score < MAX_SCORE_IF_MISSION_FAILS)
    assert.equal(r.cappedByMission, false)
  })
  test('si sobrevive, no hay tope', () =>
    close(viability({ lightPct: 95, contactPct: 90, maxSlopeDeg: 2 }, DEFAULT_WEIGHTS, { missionSurvives: true }).score, 0.45 * 95 + 0.35 * 90 + 20))
})

describe('verdictOf', () => {
  test('umbrales', () => {
    assert.equal(verdictOf(70), 'good')
    assert.equal(verdictOf(69.9), 'fair')
    assert.equal(verdictOf(50), 'fair')
    assert.equal(verdictOf(49.9), 'poor')
  })
})

describe('con los datos de prueba', () => {
  const dir = join(import.meta.dirname, '..', 'public', 'data', 'sites')
  const sites: SiteData[] = readdirSync(dir).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  const byId = Object.fromEntries(sites.map((d) => [d.site.id, siteViability(d, visibility(d))]))

  test('el orden de los sitios es el esperado (Connecting Ridge primero, Nobile último)', () => {
    const order = Object.entries(byId)
      .sort((a, b) => b[1].score - a[1].score)
      .map(([id]) => id)
    assert.equal(order[0], 'connecting-ridge')
    assert.equal(order.at(-1), 'nobile-rim')
  })
  test('Nobile avisa por su pendiente', () => assert.ok(byId['nobile-rim'].warnings.some((w) => w.includes('pendiente'))))
  test('un rango de la misión usa solo esas muestras', () => {
    const d = sites.find((s) => s.site.id === 'mons-mouton')!
    const v = visibility(d)
    const full = siteViability(d, v)
    const firstWeek = siteViability(d, v, DEFAULT_WEIGHTS, { from: 0, to: 168 })
    assert.notEqual(Math.round(full.score), Math.round(firstWeek.score))
  })
})
