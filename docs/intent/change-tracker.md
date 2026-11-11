# Intent: System Change Tracker

- **Topic:** System Change Tracker for Leave Management
- **Date:** 2026-11-11
- **Status:** Confirmed

## Statement of Intent

- **Outcome:** A structured `CHANGE_TRACKER.md` document in `leave-management` with two explicit, segregated sections:
  1. **Included in Update Patch** (compiled into the next system patch for existing installations).
  2. **Internal Dev & Refactors** (internal code cleanup, tooling, or non-shipping maintenance).
- **User:** Maintainer managing patch releases and internal codebase health.
- **Why now:** Need a single source of truth separating release-bound functional changes (such as leave sub-types) from internal refactors so non-shipping work never leaks into patch releases.
- **Success:** A clean, standardized Markdown file with categorized change entries, affected components/files, and readiness status for both shipping and non-shipping work.
- **Constraint:** Zero additional dependencies or complex tooling (/ponytail) — a lightweight, maintainable Markdown document living directly in the repository root.
- **Out of scope:** Automated diff/patch packaging scripts, Git hook automation, or external issue tracker integrations.

