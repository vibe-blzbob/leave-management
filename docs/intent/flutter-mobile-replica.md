# Confirmed Statement of Intent: Flutter Mobile Replica of LeaveDesk

- **Outcome:** A comprehensive, end-to-end specification to recreate the entire LeaveDesk system as an offline-first Flutter mobile/tablet app.
- **User:** HR officers and administrative staff managing civil service leave records on mobile devices or tablets in the field.
- **Why now:** To have full mobility while ensuring complete data interoperability with the existing desktop Electron application.
- **Success:** The Flutter app faithfully implements all modules, business rules (CSC credit computations, calendar holiday exclusions), PDF generation for CSC Form No. 6, and can directly open, modify, and export the exact same SQLite `.db` file used by the desktop app with zero schema conflicts.
- **Constraint:** Must use the identical raw SQLite database schema and file format as the desktop app (`better-sqlite3` compatible via `sqflite`/`drift`); no cloud or intermediate conversion layers.
- **Out of scope:** Central cloud backend/server infrastructure, real-time multi-device sync, and mobile physical printer hardware integration (PDF generation/export only; physical printing stays on desktop).

## Confirmed Decisions
1. **Database Interchange:** Direct SQLite `.db` file export/import via mobile file picker / system share sheet. The database file (`leave.db`) can be copied directly between desktop and mobile.
2. **Document Printing:** Flutter app will generate high-fidelity, exportable/shareable PDF files of official Civil Service Commission forms (CSC Form No. 6 and Employee Leave Cards), while physical printing is left to the desktop app or external PDF viewers.
3. **Platform Target & Minimum OS:** Android 8.0+ (`minSdkVersion 26`) and iOS 14.0+, responsive for portrait phone use and landscape tablet use.
4. **State Management:** Riverpod 2.x (`flutter_riverpod`) for compile-safe async query caching and instant cache invalidation on database switch.

