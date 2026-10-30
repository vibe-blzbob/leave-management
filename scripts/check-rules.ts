// Run: npm run check  (plain node, type stripping, no test framework)
import assert from 'node:assert/strict'
import { accrued, carryOver, entitlement, weekdays } from '../src/shared/rules.ts'

const vac = { annual_days: 15, accrues_monthly: 1, carry_over_cap: 5, prorate_new_hires: 1 }
const hire = '2025-07-15'

assert.equal(weekdays('2026-10-12', '2026-10-18'), 5) // Mon–Sun
assert.equal(weekdays('2026-10-17', '2026-10-18'), 0) // weekend only
assert.equal(entitlement(vac, hire, 2025), 7.5) // Jul–Dec = 6/12
assert.equal(entitlement(vac, hire, 2026), 15)
assert.equal(entitlement(vac, hire, 2024), 0) // before hire
assert.equal(entitlement({ ...vac, prorate_new_hires: 0 }, hire, 2025), 15)
assert.equal(accrued(vac, hire, 2025, 9), 3.75) // Jul, Aug, Sep
assert.equal(accrued(vac, hire, 2025, 6), 0) // before hire month
assert.equal(accrued({ ...vac, accrues_monthly: 0 }, hire, 2026, 1), 15) // lump sum
const used = (y: number): number => ({ 2025: 2, 2026: 0 })[y] ?? 0
assert.equal(carryOver(vac, hire, 2025, used), 0)
assert.equal(carryOver(vac, hire, 2026, used), 5) // 5.5 left, capped at 5
assert.equal(carryOver(vac, hire, 2027, used), 5)
assert.equal(carryOver({ ...vac, carry_over_cap: 10 }, hire, 2026, used), 5.5)
// Starting balance tests:
assert.equal(carryOver(vac, hire, 2025, used, 3), 3) // hire year carries starting balance
assert.equal(carryOver(vac, hire, 2026, used, 3), 5) // (3 + 7.5 - 2 = 8.5) capped at 5
console.log('rules ok')
