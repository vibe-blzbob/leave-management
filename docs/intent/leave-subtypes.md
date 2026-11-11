# Intent: 2 Primary Leave Types & Vacation Sub-classes

- **Topic:** Consolidate to 2 Primary Leave Types (Vacation & Sick) with Vacation Sub-types
- **Date:** 2026-11-11
- **Status:** Confirmed

## Statement of Intent

- **Outcome:** Consolidate the system into **2 primary leave types** (Vacation Leave and Sick Leave) with two balance pools (VL & SL). All other leave types become sub-classes selectable in a conditional dropdown when Vacation Leave is chosen.
- **User:** HR / Admin and employees filing and tracking leave requests.
- **Why now:** Matches standard Civil Service 2-pool credit accounting (VL and SL credits), eliminating 11 separate balance ledgers while maintaining specific categorization for compliance, reporting, and CS Form 6.
- **Success Criteria:**
  1. Leave application dialog displays only **Vacation Leave** and **Sick Leave** as primary types.
  2. Selecting **Vacation Leave** reveals a sub-class dropdown (Standard Vacation, Mandatory/Forced, Maternity, Paternity, Special Privilege, Solo Parent, Study, 10-Day VAWC, Rehabilitation, Special Leave for Women, Special Emergency, Adoption).
  3. All Vacation Leave sub-types deduct from the employee's single **Vacation Leave** credit balance.
  4. CS Form 6 printing checks the specific leave box corresponding to the selected sub-class.
- **Constraint:** Zero bloat (/ponytail) — store `sub_type` simply and cleanly without over-engineering relational hierarchies, preserving backward compatibility for existing records and updating `CHANGE_TRACKER.md`.
- **Out of scope:** Separate accrual/balance tracking for sub-types; changes to Sick Leave workflows.

