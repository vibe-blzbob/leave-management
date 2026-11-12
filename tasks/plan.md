# Implementation Plan: Flutter Mobile Replica of LeaveDesk

## Overview

Recreate the complete **LeaveDesk** (Civil Service Leave Management System for Maguindanao del Norte) as a standalone, offline-first Flutter application for Android (API 26+) and iOS (14.0+). The mobile app achieves 100% binary database interoperability with the desktop Electron application by reading and writing the exact same SQLite `leave.db` database schema without any intermediate cloud server or format conversion. It incorporates the official Philippine Civil Service Commission (CSC) leave accrual logic (1.250 days/month), interactive calendar view, and vector PDF generation for CSC Form No. 6 and Employee Leave Card ledgers.

---

## Architecture & Design Decisions

1. **Local Database & Interchange:**
   - Database engine: `sqflite` on mobile devices with `sqflite_common_ffi` for unit/integration testing on PC.
   - Database file: Raw SQLite file `leave.db` with identical table names, columns, constraints, and WAL mode.
   - Interchange: Direct file-based export and import via `file_picker` and `share_plus`. `PRAGMA wal_checkpoint(FULL)` is executed prior to export. On import, `PRAGMA quick_check` validates file health before replacing the active database.

2. **State Management & Caching:**
   - Framework: `flutter_riverpod` (v2.x).
   - Async state is managed using `AsyncNotifier` / `FutureProvider`, enabling clean `.when(data:, loading:, error:)` handling for all SQLite queries.
   - Database switches or restores trigger a centralized `invalidateAllProviders()` call to re-query the new database across all active screens.

3. **Core Calculation Engine:**
   - Pure Dart implementation of CSC Omnibus Leave Rules: 1.250 days/month accrual for Vacation Leave and Sick Leave, pro-rated new-hire entitlement, recursive carry-over caps, weekday (Mon–Fri) counting, and leave clash prevention.

4. **Document Generation:**
   - High-fidelity PDF generation via the `pdf` package (`pdf/widgets.dart`).
   - Official CSC Form No. 6 (Revised 2020) rendered to Philippine Folio ($8.5 \times 13\text{ inches}$) or A4.
   - Civil Service Employee Leave Card Ledger rendered in landscape format ($13 \times 8.5\text{ inches}$).

5. **Target Platforms & Responsive UI:**
   - Android 8.0+ (`minSdkVersion 26`) & iOS 14.0+.
   - Dark theme styling adhering to LeaveDesk's slate/indigo palette (`#020617`, `#0f172a`, `#6366f1`).
   - Responsive layout adapting to phone portrait (Top bar + Drawer) and tablet landscape (Navigation Rail).

---

## Phase Breakdown & Checkpoints

```
Phase 1: Project Setup & SQLite Schema
   │
   ▼
Phase 2: CSC Calculation Engine & Security
   │
   ▼  [Checkpoint 1: Core Engine Tests Pass]
Phase 3: Repositories & Riverpod Providers
   │
   ▼
Phase 4: Navigation Shell & Employee Management
   │
   ▼  [Checkpoint 2: Employee CRUD & Profile Flow]
Phase 5: Leave Applications & Calendar Flow
   │
   ▼
Phase 6: PDF Generation (CSC Form 6 & Leave Card)
   │
   ▼  [Checkpoint 3: End-to-End Filing & PDF Generation]
Phase 7: Settings, Database Export/Import, & Logs
   │
   ▼
Phase 8: End-to-End Desktop Interoperability Verification
   │
   ▼  [Final Checkpoint: Complete Interoperability & Audit]
```

### Phase 1: Project Setup & SQLite Interoperability Layer
- **Task 1:** Flutter project scaffolding, dependency configuration, and assets setup (`minSdkVersion 26`, iOS 14).
- **Task 2:** SQLite `DatabaseHelper` with identical DDL, PRAGMAs, and default seed data.

### Phase 2: Domain Math & Security Engine
- **Task 3:** Pure Dart Civil Service Leave calculation engine (`leave_rules.dart`) with comprehensive unit tests.
- **Task 4:** Scrypt PIN verification (`9696`) and lockout logic (`pin_validator.dart`).
- **Checkpoint 1:** Unit tests pass 100% for all calculation and crypto functions.

### Phase 3: Data Repositories & Riverpod Providers
- **Task 5:** Domain models & SQLite repository classes with audit logging.
- **Task 6:** Riverpod async providers and centralized cache invalidation logic.

### Phase 4: Navigation Shell & Employee Management
- **Task 7:** Responsive navigation shell (drawer for phone, rail for tablet) and dark theme.
- **Task 8:** Dashboard screen with real-time metric cards, pending approvals, and upcoming leaves.
- **Task 9:** Employee management screen (search, filter, add/edit modal, starting balances) and profile view.
- **Checkpoint 2:** Employee creation, starting balance setup, and profile inspection verified on mobile device/simulator.

### Phase 5: Leave Applications & Interactive Calendar
- **Task 10:** Leave applications screen (status tabs, filing dialog with live balance and clash validation, approval/rejection transitions).
- **Task 11:** Interactive calendar view (`table_calendar`) with leave badges and day bottom-sheet.

### Phase 6: PDF Generation Engine
- **Task 12:** Official CSC Form No. 6 (Revised 2020) vector PDF generator.
- **Task 13:** Civil Service Employee Leave Card Ledger PDF generator ($13 \times 8.5\text{ inches}$).
- **Checkpoint 3:** Complete leave application filing, balance debiting, and PDF generation verified.

### Phase 7: Settings, Database Interchange & Audit Trail
- **Task 14:** Database export (`PRAGMA wal_checkpoint` + share sheet) and import (integrity check + replace) workflows.
- **Task 15:** Settings modules (leave types, signatories, PIN change) and audit logs screen.

### Phase 8: Integration Verification & Cross-Platform Interoperability
- **Task 16:** Database round-trip integration test: load actual desktop `leave.db` into Flutter, perform transactions, export back to desktop Electron app, and verify zero data corruption.
- **Final Checkpoint:** System fully verified and ready for production deployment.

