# Intent: Employee's Leave Card (CSC Form)

- **Topic:** Official Employee's Leave Card Print Report
- **Date:** 2026-11-11
- **Status:** Confirmed

## Statement of Intent

- **Outcome:** A dedicated, printable **Employee's Leave Card** matching the official CSC 26-row layout, accessible individually from **Employee Detail** and with **Single Employee or Entire Department batch-printing** from **Reports**.
- **User:** HR personnel and administrators preparing personnel files, clearances, or submitting entire office batches for CSC/COA audit.
- **Why now:** Need to produce official Civil Service Employee Leave Cards on demand—both for individual inquiries and in bulk for whole departments across Maguindanao del Norte.
- **Success Criteria:**
  1. **Employee Detail:** A **"🖨️ Print Leave Card"** button for the viewed employee for the selected year.
  2. **Reports Page:** A **"🖨️ Print Leave Card"** dialog/button allowing the user to select either **Single Employee** or **Whole Department** (batch-printing all department employees with clean CSS page breaks between cards).
  3. **Header Information:** Displays Province of Maguindanao del Norte, specific Office/Department, Name (`LAST, FIRST M.`), Position, and Salary.
  4. **CSC 26-Row Grid:** Renders the dual Vacation Leave & Sick Leave ledger (Particulars, D/H/M, Earned 1.25, Absence W/Pay, Running Balance, Absence W/O Pay, and Date & Action Taken on Application).
  5. **Dynamic Data:** Pre-populates carry-over balance, monthly credit earnings, approved leaves taken, running balances, and remaining blank rows up to row 26.
  6. **Print & PDF Support:** Formatted with `@media print` page breaks and Electron `printToPdf` export for standard printing without clipping.
- **Constraint:** Zero external reporting packages (/ponytail) — clean native HTML/CSS table layout and CSS print breaks; update `CHANGE_TRACKER.md`.
- **Out of scope:** Manual spreadsheet grid editor; modifications to the CS Form No. 6 leave application.

