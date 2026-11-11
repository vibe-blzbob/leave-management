# System Change Tracker

Track changes to the system. Entries are strictly partitioned into what ships in the next update patch versus internal non-shipping maintenance.

---

## 1. Included in Update Patch (Target: Next Patch Release)
> Only changes listed here will be compiled into the update patch for existing deployed systems.

| ID | Date | Area / Feature | Description | Affected Files / Tables | Status |
|---|---|---|---|---|---|
| PATCH-001 | 2026-11-11 | Leave Types | Consolidated into 2 primary types (Vacation & Sick). Sub-types selectable via dropdown when Vacation Leave chosen. Unified VL balance deduction and CS Form 6 mapping. | `src/shared/types.ts`, `src/main/db.ts`, `src/renderer/src/pages/Leave.tsx`, `Calendar.tsx`, `PrintLeave.tsx` | Ready for Patch |

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

---

## Workflow Guide
1. **Adding an item:** Choose Section 1 (Update Patch) or Section 2 (Internal).
2. **Status transitions:** `Pending` → `In Progress` → `Ready for Patch` → `Shipped`.
3. **Compiling Patch:** Only bundle code and migrations tied to rows marked `Ready for Patch` in Section 1.

