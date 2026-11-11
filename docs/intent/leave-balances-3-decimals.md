# Intent: 3-Decimal Unrounded Leave Balances

- **Topic:** Allow float values up to 3 decimal points in balance editing with zero rounding
- **Date:** 2026-11-11
- **Status:** Confirmed

## Statement of Intent

- **Outcome:** Allow leave balance inputs to accept values with up to 3 decimal places without rounding, and display exact fractional balances (up to 3 decimal places) across the app.
- **User:** HR officers managing employee leave credits and starting balances.
- **Why now:** The "Edit Balances" modal and Employee form currently restrict inputs to `step="0.5"`, and balance summaries use 2-decimal rounding (`.toFixed(2)`), truncating or distorting authentic CSC fractional credits (e.g., `1.250`, `0.042`).
- **Success Criteria:**
  1. Balance inputs in `BalanceModal` and `Employees` accept 3 decimal places (restricting input past 3 digits).
  2. Display helpers format up to 3 decimals by truncating instead of rounding.
  3. No changes to database schema (`starting_balances.days` is already `REAL`).
- **Constraint:** Native platform inputs (`step="0.001"`), native string/number truncation, no new dependencies, minimal diff.
- **Out of scope:** Modifying leave application day counting or altering SQLite database schemas.

