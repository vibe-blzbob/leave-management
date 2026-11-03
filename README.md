# LeaveDesk — Leave Management System

> **Provincial Government of Maguindanao del Norte**  
> Desktop Leave Management & CSC Form No. 6 Automation System

An offline-first desktop application engineered for government human resource offices to manage employee records, track leave balances with automated statutory accruals, review and approve applications, and generate exact 8.5" × 13" duplex Civil Service Form No. 6 (Revised 2020) PDFs.

---

## 🌟 Key Features

### 1. Employee & Department Management
* Complete employee directory with positions, department/office assignments, and hire dates.
* Automatic leave balance initialization and customized starting credit configuration.
* Active/inactive employee archiving.

### 2. Comprehensive Leave Engine
* **Statutory Compliance**: Full support for official Philippine Civil Service Commission (CSC) leave types:
  * Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules)
  * Mandatory / Forced Leave (Sec. 25, Rule XVI)
  * Sick Leave (Sec. 43, Rule XVI)
  * Maternity Leave (R.A. 11210) & Paternity Leave (R.A. 8187)
  * Special Privilege Leave (Sec. 21, Rule XVI)
  * Solo Parent Leave (R.A. 8972 / R.A. 11861)
  * Study Leave, 10-Day VAWC Leave (R.A. 9262), Rehabilitation Privilege
  * Special Leave Benefits for Women (R.A. 9710)
  * Special Emergency (Calamity) Leave, Adoption Leave (R.A. 8552)
* **Automated Accrual & Proration**: Built-in monthly credit accrual, carry-over caps, new-hire proration, and working-day calculations excluding weekends.
* **Balance Safeguards**: Real-time balance deduction and balance validation before approval.

### 3. Civil Service Form No. 6 (Revised 2020) Print Module
* **Pixel-Perfect Folio (8.5" × 13")**: Generates authentic 2-page duplex Philippine Legal/Folio PDFs directly from on-screen preview.
* **Zero-Margin Layout**: Configured with Electron `webContents.printToPDF` zero-margin capture (`marginType: 'none'`) to eliminate blank spillover pages and clipping.
* **Signatory Directory**: Built-in executive directory for the Provincial Governor, Provincial Administrator, HRMO Certifier, and Department Heads.
* **Signature Clearance**: Formally budgeted clearance above signature lines for physical ink endorsements and dry seals.
* **Back Page Instructions**: Authentic Sheet 2 containing CSC Form 6 procedural rules, requirements, and documentary provisions.

### 4. Interactive Schedule Calendar
* Visual timeline powered by FullCalendar showing pending, approved, and active leaves by department.

### 5. Enterprise Security & Audit
* **Salted Password Hashing**: Sensitive administrative operations (e.g. system resets, log wipes) protected by `crypto.scryptSync` with random salt and constant-time `crypto.timingSafeEqual` comparison.
* **Brute-Force Rate Limiting**: In-memory lockout mechanism (5 failed attempts locks authentication for 5 minutes).
* **Immutable Audit Trail**: Chronological logging of all administrative and leave actions with timestamps.
* **Temp File Cleanup**: Automatic cleanup on startup of orphaned temporary export PDFs older than 24 hours.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/) |
| **Frontend** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Database** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (WAL Mode enabled, Foreign Keys enforced) |
| **Calendar** | [FullCalendar](https://fullcalendar.io/) (DayGrid, Interaction) |
| **Routing** | [React Router v7](https://reactrouter.com/) |
| **Packaging** | [electron-builder](https://www.electron.build/) (NSIS Windows Installer) |

---

## 📁 Project Structure

```
leave-management/
├── resources/              # Seed SQLite database and static assets
│   ├── icon.ico            # Windows application icon
│   ├── icon.png            # Application logo
│   └── leave.db            # Seed database template
├── scripts/
│   └── package.js          # Pre-packaging script (syncs active DB from AppData)
├── src/
│   ├── main/               # Electron Main Process
│   │   ├── index.ts        # App lifecycle, window creation, IPC routing
│   │   └── db.ts           # SQLite schemas, secure IPC handlers, PDF generator
│   ├── preload/            # Electron Preload Scripts
│   │   ├── index.ts        # Context bridge exposing safe IPC API to renderer
│   │   └── index.d.ts      # TypeScript IPC declarations
│   ├── renderer/           # React Web Application
│   │   ├── src/
│   │   │   ├── assets/     # Logos, styling, CSS print stylesheets
│   │   │   ├── pages/      # Dashboard, Employees, Leave, Calendar, Reports, Print
│   │   │   ├── lib.ts      # Data fetching helpers & report caching
│   │   │   └── App.tsx     # Layout wrapper and navigation sidebar
│   │   └── index.html      # HTML entry point
│   └── shared/             # Shared Types & Business Rules
│       ├── types.ts        # Schema interfaces, IPC method definitions
│       └── rules.ts        # Leave accrual math, proration, and working day logic
├── build.bat               # One-click Windows build script
├── electron.vite.config.ts  # Vite build configuration
└── package.json            # Scripts, build settings, and dependencies
```

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) LTS (v20 or v22 recommended)
* C++ Build Tools (required for compiling native `better-sqlite3` bindings on Windows: `npm install --global windows-build-tools` or Visual Studio C++ workload)
* Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_ORGANIZATION/leave-management.git
   cd leave-management
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running in Development

Start the Vite development server with Electron hot reload:
```bash
npm run dev
```

### Type Checking & Code Quality

```bash
# Typecheck both Node main process and React renderer
npm run typecheck

# Lint codebase
npm run lint

# Format with Prettier
npm run format
```

---

## 📦 Building & Packaging for Production

### Method 1: Automated Production Build (Recommended)
This command automatically syncs your live working database from `%APPDATA%\leave-management\leave.db` into `resources/leave.db` so the installer packages your latest records:

```bash
npm run dist
```
*Or double-click `build.bat` in the project root.*

### Method 2: Manual Windows Build
```bash
npm run build:win
```

### Build Artifacts
Outputs are placed in the `dist/` directory:
* `LeaveDesk Setup 1.0.2.exe` — Standalone Windows NSIS installer.

---

## 🗄️ Database & Storage

The application uses an embedded **SQLite** database via `better-sqlite3`:
* **Development Path:** `leave-management/resources/leave.db`
* **Production Runtime Path:** `%APPDATA%\leave-management\leave.db`
* **Database Optimization:**
  * Write-Ahead Logging (`WAL`) mode enabled for concurrent reads and writes.
  * Foreign key constraints enforced.
  * Indexed on `(employee_id, leave_type_id, status)` and `(start_date, end_date)`.

---

## 📄 License

Proprietary software developed for the **Provincial Government of Maguindanao del Norte**.  
All rights reserved.
