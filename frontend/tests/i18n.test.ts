import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { translate } from '../src/i18n/translate.ts'

describe('translate: español → inglés', () => {
  test('comparación de atrasos: resultado claro y fechas de falla', () => {
    assert.equal(translate('Con la nueva fecha, la misión completa los 14 días.'), 'With the new date, the mission completes all 14 days.')
    assert.equal(translate('Con la nueva fecha, la misión se queda sin energía el día 14.'), 'With the new date, the mission runs out of power on day 14.')
    assert.equal(translate('Tiempo para enviar datos'), 'Time to send data')
    assert.equal(translate('Tu plan actual no llega al final. Con esta fecha, la batería sí alcanza.'), 'Your current plan does not reach the end. With this date, the battery lasts.')
  })
  test('textos fijos, con los espacios de los bordes', () => {
    assert.equal(translate('¿Y si la misión se atrasa?'), 'What if the mission is delayed?')
    assert.equal(translate(' Tu plan tolera atrasos de hasta '), ' Your plan tolerates delays of up to ')
    assert.equal(translate('Macizo Malapert'), 'Malapert Massif')
  })

  test('frases con partes variables, que también se traducen', () => {
    assert.equal(translate('No. Con 7 días de atraso, la batería se agota.'), 'No. With 7 days of delay, the battery runs out.')
    assert.equal(translate('Tolera hasta 4 días y 6 horas de atraso. Después, la batería no alcanza.'),
      'Tolerates up to 4 days and 6 hours of delay. After that, the battery is not enough.')
    assert.equal(translate('Alunizaje en Macizo Malapert'), 'Landing at Malapert Massif')
  })

  test('fechas, días y números', () => {
    assert.equal(translate('Día 4 · 4 ene, 13:00 UTC'), 'Day 4 · 4 Jan, 13:00 UTC')
    assert.equal(translate('miércoles 15 de enero de 2027'), 'Wednesday, January 15, 2027')
    assert.equal(translate('384.400 km'), '384,400 km')
    assert.equal(translate('95 %'), '95%')
  })

  test('lo que no está en el diccionario queda igual', () => {
    assert.equal(translate('GEOATHECMOON'), 'GEOATHECMOON')
    assert.equal(translate('12:00'), '12:00')
  })
})
