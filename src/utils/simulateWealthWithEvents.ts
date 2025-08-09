type RawEvent = {
  type: 'DEPOSIT' | 'WITHDRAWAL'
  value: number
  frequency: 'ONCE' | 'MONTHLY' | 'ANNUAL'
  startDate: string // ISO
  endDate?: string | null
}

type NormalizedEvent = RawEvent & {
  sign: 1 | -1
  s: Date
  e: Date | null
}

export function simulateWealthWithEvents(
  initialValue: number,
  rateAnnual = 0.04,
  events: RawEvent[] = [],
  endYear = 2060
): { year: number; projectedValue: number }[] {
  const result: { year: number; projectedValue: number }[] = []
  const startYear = new Date().getFullYear()
  if (initialValue <= 0 || startYear > endYear) return result

  const monthlyRate = Math.pow(1 + rateAnnual, 1 / 12) - 1

  // normaliza eventos (datas → Date; calcula sinal)
  const norm: NormalizedEvent[] = events.map((ev) => {
    const sign: 1 | -1 = ev.type === 'DEPOSIT' ? 1 : -1
    const s = new Date(ev.startDate)
    const e = ev.endDate ? new Date(ev.endDate) : null
    return { ...ev, sign, s, e }
  })

  // helper: verifica se dispara neste ano/mês
  const triggersThisMonth = (ev: NormalizedEvent, y: number, m: number) => {
    const current = new Date(y, m, 1)
    if (current < new Date(ev.s.getFullYear(), ev.s.getMonth(), 1)) return false
    if (ev.e && current > new Date(ev.e.getFullYear(), ev.e.getMonth(), 1)) return false

    if (ev.frequency === 'ONCE') {
      return y === ev.s.getFullYear() && m === ev.s.getMonth()
    }
    if (ev.frequency === 'MONTHLY') {
      return true
    }
    if (ev.frequency === 'ANNUAL') {
      return m === ev.s.getMonth()
    }
    return false
  }

  let value = initialValue

  for (let y = startYear; y <= endYear; y++) {
    for (let m = 0; m < 12; m++) {
      // 1) eventos do mês
      for (const ev of norm) {
        if (triggersThisMonth(ev, y, m)) {
          value += ev.sign * ev.value
          if (value < 0) value = 0
        }
      }
      // 2) juros do mês
      value *= 1 + monthlyRate
    }
    result.push({ year: y, projectedValue: Number(value.toFixed(2)) })
  }

  return result
}
