# Spec: 3-Decimal Unrounded Direct Leave Balances

- **Initiative:** LeaveDesk — Leave Management System
- **Module:** Balances & Reports
- **Status:** Approved
- **Author:** Ponytail / Spec-Driven Development
- **Date:** 2026-11-11

---

## 1. Objective

1. Enable leave balance inputs in `BalanceModal` (`Reports.tsx`) and the employee creation/edit form (`Employees.tsx`) to accept floating-point values up to 3 decimal places (matching CSC leave credit schedules, e.g. `1.250`, `0.042`, `0.083`) without mathematical rounding.
2. **Direct Balance Setting:** When a balance is set or edited for an employee, set the balance **directly** as the employee's credit pool, regardless of the automatic monthly statutory accrued sum (`accrued()`). The directly set balance serves as the authoritative baseline from which approved leaves are deducted (`remaining = balance - used`).
3. Ensure that balance calculations, input validations, error messages, and table displays preserve exact values up to 3 decimal places without rounding off.

---

## 2. Tech Stack & Commands

| Tool / Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript 5.9 |
| Styling | Tailwind CSS v4 |
| Storage | SQLite via `better-sqlite3` (`starting_balances.days REAL`) |

### Commands
- **Typecheck:** `npm run typecheck`
- **Lint:** `npm run lint`
- **Dev:** `npm run dev`

---

## 3. Project Structure & Affected Files

```
leave-management/
├── docs/
│   └── SPEC-3-decimal-balances.md          # This specification
├── src/
│   ├── main/
│   │   └── db.ts                           # Set balance directly when starting_balance exists (skip automatic accrual add-on)
│   ├── renderer/src/
│   │   ├── browserApi.ts                   # Mirror direct balance behavior for browser fallback
│   │   ├── lib.tsx                         # Update num() to truncate to 3 decimals without rounding
│   │   └── pages/
│   │       ├── Reports.tsx                 # BalanceModal: step="0.001", enforce <=3 decimal digits
│   │       └── Employees.tsx               # EmployeeForm: step="0.001", enforce <=3 decimal digits
└── CHANGE_TRACKER.md                       # Log patch entry
```

---

## 4. Implementation Details

### A. Direct Balance Setting (`db.ts` & `browserApi.ts`)
When `starting_balances` has an entry for `(employee_id, leave_type_id)`:
- Do NOT add `+ accrued(...)` on top of the directly set balance.
- Set `carry = start`, `entitled = start`, `accrued = start`.
- Compute `remaining = start - used`.
- When no starting balance is set, fallback to the automatic monthly statutory accrual formula (`carryOver + accrued`).

### B. Truncation & Number Formatting (`lib.tsx`)
Replace 2-decimal rounding (`Number.isInteger(n) ? String(n) : n.toFixed(2)`) with truncation up to 3 decimal places:

```ts
export const num = (n: number): string => {
  if (n === null || n === undefined || isNaN(n)) return '0'
  if (Number.isInteger(n)) return String(n)
  const s = String(n)
  const dot = s.indexOf('.')
  if (dot === -1) return s
  return s.slice(0, dot + 4)
}
```

### C. Input Field Handling (`Reports.tsx` & `Employees.tsx`)
- Set `step="0.001"`.
- Guard `onChange` to prevent entering more than 3 decimal digits:
```tsx
onChange={(e) => {
  const valStr = e.target.value
  const parts = valStr.split('.')
  if (parts[1] && parts[1].length > 3) return
  const val = parseFloat(valStr) || 0
  setBals((prev) => ({ ...prev, [t.id!]: val }))
}}
```

---

## 5. Success Criteria

- [ ] `BalanceModal` input allows typing float values with up to 3 decimal places.
- [ ] Typing more than 3 decimal places is rejected in `BalanceModal` and `EmployeeForm`.
- [ ] When a balance is set, the employee's balance matches the set balance directly (not inflated by `+ accrued()`).
- [ ] `num()` in `lib.tsx` displays up to 3 decimal places without rounding off.
- [ ] `npm run typecheck` passes with 0 errors.
