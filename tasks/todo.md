# Task List: Flutter Mobile Replica of LeaveDesk

## Phase 1: Project Setup & SQLite Interoperability Layer

### Task 1: Flutter Project Initialization & Dependencies
**Description:** Initialize the Flutter mobile application workspace, configure core package dependencies in `pubspec.yaml`, configure Android `minSdkVersion 26` and iOS 14.0 target deployment, and embed official provincial branding assets.

**Acceptance criteria:**
- [ ] `pubspec.yaml` configured with `flutter_riverpod`, `sqflite`, `sqflite_common_ffi`, `path_provider`, `file_picker`, `share_plus`, `pdf`, `table_calendar`, `cryptography`, and `intl`.
- [ ] Android `minSdkVersion` set to `26` in `android/app/build.gradle`.
- [ ] iOS target set to `14.0` in `ios/Podfile`.
- [ ] Assets directory populated with `maguindanao_del_norte.jpg` and `bangsamoro.png`.

**Verification:**
- [ ] `flutter pub get` completes with 0 errors.
- [ ] `flutter analyze` reports 0 issues.

**Dependencies:** None  
**Files likely touched:**
- `pubspec.yaml`
- `android/app/build.gradle`
- `ios/Podfile`
- `assets/images/*`  
**Estimated scope:** Medium (3-5 files)

---

### Task 2: SQLite Database Helper & Exact Schema DDL
**Description:** Implement `DatabaseHelper` to initialize the SQLite database (`leave.db`) with identical DDL, column types, table constraints, indexes, and PRAGMAs (`WAL` mode, `foreign_keys = ON`) matching the desktop Electron app.

**Acceptance criteria:**
- [ ] Creates tables: `employees`, `leave_types`, `leaves`, `starting_balances`, `audit_logs`, `signatories`, and `settings`.
- [ ] Creates performance indexes: `idx_leaves_emp_type` and `idx_leaves_dates`.
- [ ] Executes `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`.
- [ ] Seeds default leave types (`Vacation Leave` & `Sick Leave` with 15 annual days) and default PIN hash (`9696` with `leave_salt`).
- [ ] Seeds provincial signatories (Governor, Administrator, HRMO, Supervisors).

**Verification:**
- [ ] Integration test creates database in temporary directory and runs `PRAGMA integrity_check`.
- [ ] Schema table and column names match desktop `src/main/db.ts` exactly.

**Dependencies:** Task 1  
**Files likely touched:**
- `lib/core/database/database_helper.dart`
- `test/integration/database_schema_test.dart`  
**Estimated scope:** Small (2 files)

---

## Checkpoint 1: Foundation & Database Layer
- [ ] `flutter pub get` runs cleanly.
- [ ] SQLite database initializes with all tables, constraints, indexes, and seed data.
- [ ] Schema matches desktop Electron schema 100%.

---

## Phase 2: Domain Math & Security Engine

### Task 3: Pure Dart Civil Service Leave Calculation Engine
**Description:** Port all leave entitlement and accrual mathematics from `rules.ts` to pure Dart functions without external dependencies.

**Acceptance criteria:**
- [ ] `countWeekdays(DateTime start, DateTime end)` accurately counts Mon–Fri days inclusive.
- [ ] `entitlement(LeaveType, hireDate, year)` calculates pro-rated annual days based on hire month.
- [ ] `accrued(LeaveType, hireDate, year, month)` calculates monthly accrual (1.250 days/month for accruing types).
- [ ] `carryOver(LeaveType, hireDate, year, usedFn, startBalance)` recursively computes carry-over capped at `carry_over_cap`.

**Verification:**
- [ ] Unit tests pass: `flutter test test/unit/leave_rules_test.dart`.
- [ ] Outputs match desktop TypeScript results for 10+ edge cases (new hires, December carry-overs, leap years).

**Dependencies:** Task 1  
**Files likely touched:**
- `lib/core/rules/leave_rules.dart`
- `test/unit/leave_rules_test.dart`  
**Estimated scope:** Small (2 files)

---

### Task 4: PIN Security & Lockout Validator
**Description:** Implement Scrypt password hashing and lockout logic matching desktop `verifyPin` in `src/main/db.ts`.

**Acceptance criteria:**
- [ ] Uses Scrypt with salt `'leave_salt'`, key length 32, N=16384, r=8, p=1.
- [ ] Verifies `'9696'` against default hash stored in `settings`.
- [ ] Enforces 5 failed attempts $\rightarrow$ 5-minute lockout policy.
- [ ] Throws human-readable error messages on lockout or invalid PIN.

**Verification:**
- [ ] Unit tests pass: `flutter test test/unit/pin_validator_test.dart`.
- [ ] Generates identical hex hash string to Node.js `crypto.scryptSync('9696', 'leave_salt', 32)`.

**Dependencies:** Task 1  
**Files likely touched:**
- `lib/core/rules/pin_validator.dart`
- `test/unit/pin_validator_test.dart`  
**Estimated scope:** Small (2 files)

---

## Checkpoint 2: Domain Math & Security Verification
- [ ] All unit tests pass (`flutter test`).
- [ ] 1.250 days/month accrual and carry-over logic mathematically verified.
- [ ] Scrypt PIN verification generates identical hashes to desktop app.

---

## Phase 3: Repositories & Riverpod State Management

### Task 5: Domain Models & SQLite Repositories
**Description:** Implement data models (`Employee`, `LeaveType`, `Leave`, `Signatory`, `AuditLog`, `Balance`) and repository classes executing raw SQLite queries with automatic audit log tracking.

**Acceptance criteria:**
- [ ] Models provide `toMap()` and `fromMap()` matching SQLite column definitions.
- [ ] `EmployeeRepository`: CRUD operations, starting balance upserts, auto-uppercasing names.
- [ ] `LeaveRepository`: CRUD operations, status transitions, balance checks, leave overlap checks.
- [ ] `BalanceRepository`: computes balances matrix by employee and year.
- [ ] Every mutation (create/update/delete) records an entry in `audit_logs`.

**Verification:**
- [ ] Integration tests pass for repository CRUD operations.

**Dependencies:** Tasks 2, 3, 4  
**Files likely touched:**
- `lib/models/*.dart`
- `lib/repositories/*.dart`
- `test/integration/repository_test.dart`  
**Estimated scope:** Medium (4-5 files)

---

### Task 6: Riverpod Async Providers & Cache Invalidation
**Description:** Build Riverpod providers for all core data entities using `AsyncNotifier` and `FutureProvider`, plus a global invalidation mechanism for database import/restore.

**Acceptance criteria:**
- [ ] Exposes `employeesProvider`, `leavesProvider`, `leaveTypesProvider`, `signatoriesProvider`, `balancesProvider(year)`, and `auditLogsProvider`.
- [ ] UI states automatically provide `data`, `loading`, and `error` states.
- [ ] Centralized function `invalidateAllDataProviders(WidgetRef ref)` refreshes all providers on database changes.

**Verification:**
- [ ] Provider unit tests pass: state updates immediately upon repository mutation.

**Dependencies:** Task 5  
**Files likely touched:**
- `lib/providers/data_providers.dart`
- `test/unit/providers_test.dart`  
**Estimated scope:** Small (2 files)

---

## Phase 4: UI Navigation Shell & Employee Management

### Task 7: Responsive Navigation Shell & Dark Theme
**Description:** Create the core app layout adapting to phone and tablet viewports, styled with LeaveDesk's slate/indigo dark theme.

**Acceptance criteria:**
- [ ] Dark theme matching desktop: background `#020617`, card surface `#0f172a`, borders `#1e293b`, accents `#6366f1`.
- [ ] Phone: Top AppBar with seal + title + hamburger toggle opening a Navigation Drawer.
- [ ] Tablet: Persistent Navigation Rail on the left with desktop-like navigation items.
- [ ] Routing setup for all 8 main sections.

**Verification:**
- [ ] App renders on phone simulator (drawer) and tablet simulator (rail) without layout overflow.

**Dependencies:** Task 1  
**Files likely touched:**
- `lib/app.dart`
- `lib/features/navigation/app_scaffold.dart`
- `lib/core/constants/theme.dart`  
**Estimated scope:** Medium (3 files)

---

### Task 8: Dashboard Screen
**Description:** Build the main dashboard featuring real-time overview metrics, pending leave approvals, and upcoming leaves.

**Acceptance criteria:**
- [ ] 4 metric cards: Total Employees, Active Leaves, Pending Requests, Approved This Month.
- [ ] Pending Leaves list with quick "Approve" and "Reject" buttons.
- [ ] Upcoming Leaves feed showing employee name, dates, and leave type.

**Verification:**
- [ ] Widget renders live SQLite data and updates instantly when a request is approved.

**Dependencies:** Tasks 6, 7  
**Files likely touched:**
- `lib/features/dashboard/dashboard_screen.dart`
- `lib/features/dashboard/widgets/metric_card.dart`  
**Estimated scope:** Small (2 files)

---

### Task 9: Employee Management Screen & Detail View
**Description:** Implement employee directory with search, department filtering, employee creation/edit dialog, starting balance setup, and individual profile view.

**Acceptance criteria:**
- [ ] Search bar filtering by name or position + Department filter dropdown.
- [ ] Employee list with active/inactive status badges.
- [ ] Add/Edit Dialog: Name (auto-uppercased), position, department, hire date, active toggle, starting balances.
- [ ] Employee Detail view showing personal info, leave balance summary cards, and past leave applications history.

**Verification:**
- [ ] Adding an employee creates records in both `employees` and `starting_balances`.
- [ ] Employee appears in search results and audit log records the addition.

**Dependencies:** Tasks 6, 7  
**Files likely touched:**
- `lib/features/employees/employees_screen.dart`
- `lib/features/employees/employee_detail_screen.dart`
- `lib/features/employees/widgets/employee_dialog.dart`  
**Estimated scope:** Medium (3 files)

---

## Checkpoint 3: Administrative UI Verified
- [ ] Dashboard displays accurate metrics.
- [ ] Adding and editing employees functions seamlessly with starting balance setup.
- [ ] Audit logs reflect employee modifications.

---

## Phase 5: Leave Applications & Interactive Calendar

### Task 10: Leave Applications Management & Filing Modal
**Description:** Build leave requests screen with status filtering, approval transitions, and filing dialog with real-time balance check and overlap clash prevention.

**Acceptance criteria:**
- [ ] Status tabs: All, Pending, Approved, Rejected, Cancelled.
- [ ] File Leave Modal:
  - Employee selector with live search.
  - Leave type (`Vacation Leave` / `Sick Leave`) and sub-type dropdowns.
  - Date range picker auto-calculating weekdays (Mon–Fri).
  - Validation: Prevents overlapping leaves, leaves crossing Dec 31, and applications exceeding available balance.
- [ ] Status change actions (Approve, Reject, Cancel) adhering to allowed status transitions.

**Verification:**
- [ ] Attempting to file leave exceeding balance triggers user-facing error message.
- [ ] Approving a leave deducts the balance from the employee's ledger.

**Dependencies:** Tasks 6, 7  
**Files likely touched:**
- `lib/features/leave/leave_screen.dart`
- `lib/features/leave/widgets/file_leave_dialog.dart`  
**Estimated scope:** Medium (3 files)

---

### Task 11: Interactive Monthly Calendar
**Description:** Implement monthly visual calendar using `table_calendar` displaying leave events with day detail bottom-sheet.

**Acceptance criteria:**
- [ ] Monthly grid view with colored event dots/badges (green for approved, amber for pending).
- [ ] Clicking a date opens a bottom-sheet displaying employees on leave that day.
- [ ] Bottom-sheet includes an "Apply on this Date" button pre-populating the leave form.

**Verification:**
- [ ] Multi-day leaves show badges across all covered weekdays.
- [ ] Navigating between months loads relevant events smoothly.

**Dependencies:** Tasks 6, 7, 10  
**Files likely touched:**
- `lib/features/calendar/calendar_screen.dart`
- `lib/features/calendar/widgets/day_detail_sheet.dart`  
**Estimated scope:** Small (2 files)

---

## Checkpoint 4: Core Leave Operations Verified
- [ ] Leave application creation validates balances and clashes accurately.
- [ ] Calendar visually reflects approved and pending leaves.
- [ ] Status transitions function correctly.

---

## Phase 6: PDF Generation Engine

### Task 12: CSC Form No. 6 (Application for Leave) PDF Generator
**Description:** Build vector PDF generator for Civil Service Form No. 6 (Revised 2020) on Philippine Folio ($8.5 \times 13\text{ inches}$) or A4.

**Acceptance criteria:**
- [ ] Exact layout matching Philippine CSC Form No. 6:
  - Embedded provincial seal and BARMM seal.
  - Section 6: Employee details, selected leave sub-type, dates, working days, commutation.
  - Section 7: Certification of Leave Credits table (VL & SL earned, less application, balance) + supervisor recommendation.
  - Section 8: Governor approval section.
- [ ] Exports PDF and triggers system share sheet or saves to device storage via `share_plus` / `path_provider`.

**Verification:**
- [ ] Generated PDF fits exact 1-page or 2-page boundary without orphan text overflow.
- [ ] Opened in Adobe Acrobat / mobile PDF viewer, layout is razor-sharp.

**Dependencies:** Tasks 5, 10  
**Files likely touched:**
- `lib/services/pdf/csc_form6_pdf.dart`
- `test/unit/pdf_generation_test.dart`  
**Estimated scope:** Medium (2 files)

---

### Task 13: Civil Service Employee Leave Card Ledger PDF Generator
**Description:** Build vector PDF generator for the official Employee Leave Card Ledger in landscape ($13 \times 8.5\text{ inches}$) format.

**Acceptance criteria:**
- [ ] Balance Brought Forward row (Jan 1).
- [ ] Month-by-month accrual rows (1.250 days VL and SL).
- [ ] Leave deduction rows with date ranges, working days, and running balances carried forward to 3 decimal places.
- [ ] Export and share support via mobile share sheet.

**Verification:**
- [ ] Balances match the numbers in the Reports table exactly.

**Dependencies:** Tasks 5, 10  
**Files likely touched:**
- `lib/services/pdf/leave_card_pdf.dart`  
**Estimated scope:** Medium (2 files)

---

## Checkpoint 5: PDF Generation Verified
- [ ] CSC Form No. 6 PDF accurately reflects filed leave details and credit balance.
- [ ] Employee Leave Card ledger PDF compiles and displays all monthly accruals and debits.

---

## Phase 7: Settings, Database Interchange & Audit Trail

### Task 14: Database Export and Import Workflows
**Description:** Implement database backup, export, and restore workflows to transfer `leave.db` between mobile devices and desktop PCs.

**Acceptance criteria:**
- [ ] **Export Database:** Runs `PRAGMA wal_checkpoint(FULL)`, copies `leave.db` to temporary share cache, and opens system share sheet to send file via USB, Drive, or messaging.
- [ ] **Import Database:** File picker selects `.db` file, executes `PRAGMA quick_check;`, verifies table schema, safely overwrites local `leave.db`, and calls `invalidateAllDataProviders()`.
- [ ] Clear user feedback (success snackbar or error alert if file is invalid).

**Verification:**
- [ ] Exporting produces a valid `.db` file openable in SQLite Viewer.
- [ ] Importing a desktop `leave.db` immediately updates all screens without app restart.

**Dependencies:** Tasks 2, 6  
**Files likely touched:**
- `lib/core/database/database_transfer.dart`
- `lib/features/settings/widgets/database_transfer_card.dart`  
**Estimated scope:** Medium (3 files)

---

### Task 15: Settings Modules & Activity Logs
**Description:** Implement settings tabs (Leave Types management, Application Signatories, PIN update) and Activity Logs view with authorized PIN clear action.

**Acceptance criteria:**
- [ ] Leave Types: view, add, edit annual days and carry-over cap.
- [ ] Signatories: view, add, edit Governor, HRMO, and Department Supervisors.
- [ ] PIN change modal requiring current PIN before setting new PIN.
- [ ] Activity Logs: scrollable audit trail table + "Clear Logs" action guarded by 4-digit PIN.

**Verification:**
- [ ] Changing signatories updates the default selections in CSC Form No. 6.
- [ ] Incorrect PIN blocks log clearing and displays remaining attempts.

**Dependencies:** Tasks 4, 6  
**Files likely touched:**
- `lib/features/settings/settings_screen.dart`
- `lib/features/logs/logs_screen.dart`  
**Estimated scope:** Medium (3 files)

---

## Phase 8: Cross-Platform Interoperability & Final Verification

### Task 16: End-to-End Desktop Interoperability Verification
**Description:** Perform complete round-trip database verification between the desktop Electron app and the Flutter mobile app.

**Acceptance criteria:**
- [ ] Step 1: Export `leave.db` from desktop Electron app.
- [ ] Step 2: Import into Flutter app $\rightarrow$ all employees, leaves, signatories, and balances render identically.
- [ ] Step 3: File a new leave application in Flutter $\rightarrow$ balance updates accurately.
- [ ] Step 4: Export `leave.db` from Flutter $\rightarrow$ import back into desktop app.
- [ ] Step 5: Desktop app displays the new leave with 0 errors and matching ledger balance.

**Verification:**
- [ ] Zero schema conflicts, zero SQLite errors, 100% data integrity verified.

**Dependencies:** All previous tasks  
**Files likely touched:**
- `test/integration/e2e_interoperability_test.dart`  
**Estimated scope:** Small (1 file)

---

## Final Checkpoint: System Ready for Production
- [ ] All 16 tasks complete and verified.
- [ ] `flutter analyze` reports 0 warnings and 0 errors.
- [ ] `flutter test` passes 100%.
- [ ] Release builds succeed: `flutter build apk --release` and `flutter build ipa --release`.

