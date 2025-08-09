export function simulateWealthCurve(
  initialValue: number,
  rateAnnual = 0.04,
  endYear = 2060
): { year: number; projectedValue: number }[] {
  const result: { year: number; projectedValue: number }[] = []
  const startYear = new Date().getFullYear()
  if (initialValue <= 0) return result
  if (startYear > endYear) return result

  const monthlyRate = Math.pow(1 + rateAnnual, 1 / 12) - 1

  let value = initialValue
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 0; m < 12; m++) {
      value *= 1 + monthlyRate
    }
    result.push({ year: y, projectedValue: Number(value.toFixed(2)) })
  }

  return result
}
