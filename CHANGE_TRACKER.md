# System Change Tracker

Track changes to the system. Entries are strictly partitioned into what ships in the next update patch versus internal non-shipping maintenance.

---

## 1. Included in Update Patch (Target: Next Patch Release)
> Only changes listed here will be compiled into the update patch for existing deployed systems.

| ID | Date | Area / Feature | Description | Affected Files / Tables | Status |
|---|---|---|---|---|---|
| PATCH-001 | 2026-11-11 | Leave Types | Consolidated into 2 primary types (Vacation & Sick). Sub-types selectable via dropdown when Vacation Leave chosen. Unified VL balance deduction and CS Form 6 mapping. | `src/shared/types.ts`, `src/main/db.ts`, `src/renderer/src/pages/Leave.tsx`, `Calendar.tsx`, `PrintLeave.tsx` | Ready for Patch |
| PATCH-002 | 2026-11-11 | Reports / Printing | Official CSC Employee's Leave Card with 26-row dual Vacation & Sick Leave ledger, monthly accruals (1.25/mo), Folio landscape printing, accessible via Employee Detail and Reports (supporting single employee or whole department batch printing). | `src/renderer/src/pages/PrintLeaveCard.tsx`, `App.tsx`, `main.tsx`, `EmployeeDetail.tsx`, `Reports.tsx`, `src/main/db.ts`, `src/shared/types.ts` | Ready for Patch |
| PATCH-003 | 2026-11-11 | Balances | Float values up to 3 decimal points with zero rounding in BalanceModal and EmployeeForm; direct balance setting independent of statutory monthly accruals; display truncation in `num()`. | `src/renderer/src/lib.tsx`, `src/renderer/src/pages/Reports.tsx`, `src/renderer/src/pages/Employees.tsx`, `src/main/db.ts`, `src/renderer/src/browserApi.ts` | Ready for Patch |

### Patch Inclusion Criteria
- [x] Direct fix or user-requested capability for existing installations.
- [x] Safe for live data / includes migration or backward-compatible schema changes (`ALTER TABLE leaves ADD COLUMN sub_type TEXT`).
- [x] Verified locally before marking `Ready for Patch` (node & web typechecks clean, build passed).

---

## 2. Internal Dev & Refactors (Non-Shipping)
> Internal improvements, developer tooling, test harnesses, or refactors that remain in repo only and are NOT bundled into deployment patches.

| ID | Date | Scope | Description | Affected Files | Status |
|---|---|---|---|---|---|
| INT-001 | 2026-11-11 | Docs / Tracking | Initialize intent documentation and system change tracker ledger. | `docs/intent/change-tracker.md`, `CHANGE_TRACKER.md` | Done |
| INT-002 | 2026-11-11 | Docs / Intent | Save confirmed statement of intent for 2 primary leave types & vacation sub-types. | `docs/intent/leave-subtypes.md` | Done |
| INT-003 | 2026-11-11 | Tooling / Release | Added standalone micro-patch installer builder (`scripts/build-patch.js`, `build-patch.bat`). Compiles only changed application code into a lightweight update executable. | `scripts/build-patch.js`, `build-patch.bat`, `package.json` | Done |
| INT-004 | 2026-11-11 | Architecture / Spec | Documented LeaveDesk standard printing and PDF generation specification for future reports and forms. | `docs/PRINTING_SPEC.md` | Done |

---

## Workflow Guide
1. **Adding an item:** Choose Section 1 (Update Patch) or Section 2 (Internal).
2. **Status transitions:** `Pending` → `In Progress` → `Ready for Patch` → `Shipped`.
3. **Compiling Patch:** Only bundle code and migrations tied to rows marked `Ready for Patch` in Section 1.

