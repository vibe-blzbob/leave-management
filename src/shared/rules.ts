// Pure leave-entitlement math. Zero dependencies so main, browser fallback, and tests share it.

export interface Rule {
  annual_days: number
  accrues_monthly: number
  carry_over_cap: number
  prorate_new_hires: number
}

const d = (s: string): Date => new Date(s + 'T00:00:00Z') // UTC avoids DST/timezone off-by-one

/** Mon–Fri days in [start, end], inclusive. */
export function weekdays(start: string, end: string): number {
  let n = 0
  for (const t = d(start); t <= d(end); t.setUTCDate(t.getUTCDate() + 1)) {
    const w = t.getUTCDay()
    if (w !== 0 && w !== 6) n++
  }
  return n
}

/** First month (1–12) the employee earns leave in `year`; 13 = not employed that year. */
function firstMonth(r: Rule, hire: string, year: number): number {
  const hy = +hire.slice(0, 4)
  if (year < hy) return 13
  if (year > hy || !r.prorate_new_hires) return 1
  return +hire.slice(5, 7)
}

/** Full entitlement for the year (pro-rated by hire month). */
export function entitlement(r: Rule, hire: string, year: number): number {
  return (r.annual_days * (13 - firstMonth(r, hire, year))) / 12
}

/** Earned through `month` (credited on the 1st). Non-accruing types get everything up front. */
export function accrued(r: Rule, hire: string, year: number, month: number): number {
  if (!r.accrues_monthly) return entitlement(r, hire, year)
  return (r.annual_days / 12) * Math.max(0, month - firstMonth(r, hire, year) + 1)
}

/** Carry-over into `year`: min(cap, last year's leftover), computed recursively from hire year. */
export function carryOver(
  r: Rule,
  hire: string,
  year: number,
  used: (y: number) => number,
  startBalance = 0
): number {
  const hy = +hire.slice(0, 4)
  if (year < hy) return 0
  if (year === hy) return startBalance
  const prev = year - 1
  const left = carryOver(r, hire, prev, used, startBalance) + entitlement(r, hire, prev) - used(prev)
  return Math.min(r.carry_over_cap, Math.max(0, left))
}
