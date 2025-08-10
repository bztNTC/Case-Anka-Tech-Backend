import { simulateWealthWithEvents } from '../utils/simulateWealthWithEvents'

describe('simulateWealthWithEvents (unit)', () => {
  const Y = new Date().getFullYear()

  it('cresce com juros compostos sem eventos', () => {
    const r = simulateWealthWithEvents(1000, 0.12, [], Y + 2)
    expect(r.length).toBeGreaterThan(0)
    const first = r[0].projectedValue
    const last = r[r.length - 1].projectedValue
    expect(last).toBeGreaterThan(first)
    expect(first).toBeGreaterThan(1100) 
  })

  it('evento ONCE (depósito único) aumenta o valor vs baseline', () => {
    const baseline = simulateWealthWithEvents(5000, 0.04, [], Y + 1)
    const withOnce = simulateWealthWithEvents(5000, 0.04, [{
      type: 'DEPOSIT',
      value: 2000,
      frequency: 'ONCE',
      startDate: `${Y}-06-15T12:00:00.000Z`,
    }], Y + 1)
    expect(withOnce[0].projectedValue).toBeGreaterThan(baseline[0].projectedValue)
  })

  it('evento MONTHLY (saque) não deixa patrimônio negativo (clamp em zero)', () => {
    const r = simulateWealthWithEvents(1000, 0.04, [{
      type: 'WITHDRAWAL',
      value: 5000,            
      frequency: 'MONTHLY',
      startDate: `${Y}-01-01T00:00:00.000Z`,
    }], Y + 1)
    expect(r[0].projectedValue).toBe(0)
    expect(r[r.length - 1].projectedValue).toBe(0)
  })

  it('evento ANNUAL dispara 1x por ano no mês inicial', () => {
    const rA = simulateWealthWithEvents(10000, 0.04, [{
      type: 'DEPOSIT',
      value: 1000,
      frequency: 'ANNUAL',
      startDate: `${Y}-03-01T00:00:00.000Z`, 
    }], Y + 3)

    const rB = simulateWealthWithEvents(10000, 0.04, [{
      type: 'DEPOSIT',
      value: 1000,
      frequency: 'ANNUAL',
      startDate: `${Y}-07-01T00:00:00.000Z`, 
    }], Y + 3)

    expect(rA[0].projectedValue).not.toBe(rB[0].projectedValue)
  })

  it('evento futuro (fora da janela inicial) não altera anos anteriores ao start', () => {
    const futureStart = Y + 5
    const base = simulateWealthWithEvents(8000, 0.04, [], Y + 6)
    const withFuture = simulateWealthWithEvents(8000, 0.04, [{
      type: 'DEPOSIT',
      value: 500,
      frequency: 'MONTHLY',
      startDate: `${futureStart}-06-15T12:00:00.000Z`,
    }], Y + 6)

    const idxPrev = futureStart - Y - 1
    if (idxPrev >= 0) {
      expect(withFuture[idxPrev].projectedValue).toBeCloseTo(base[idxPrev].projectedValue, 2)
    }
    const idxStart = futureStart - Y
    expect(withFuture[idxStart].projectedValue).toBeGreaterThan(base[idxStart].projectedValue)
  })

})
