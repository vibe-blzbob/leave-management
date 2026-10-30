import Database from 'better-sqlite3'
import { app, ipcMain, shell } from 'electron'
import { join } from 'path'
import { existsSync, copyFileSync, mkdirSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs'
import crypto from 'crypto'
import type { Api, AuditLog, Balance, Employee, Leave, LeaveType, LeaveRow, Signatory, Status } from '../shared/types'
import { methods } from '../shared/types'
import { accrued, carryOver, entitlement, weekdays } from '../shared/rules'

// Clean up orphan temp export PDFs older than 24 hours
try {
  const tempDir = app.getPath('temp')
  const now = Date.now()
  for (const f of readdirSync(tempDir)) {
    if (f.startsWith('leave-app-') && f.endsWith('.pdf')) {
      const p = join(tempDir, f)
      if (now - statSync(p).mtimeMs > 24 * 3600 * 1000) unlinkSync(p)
    }
  }
} catch {}

const userDataDir = app.getPath('userData')
const dbPath = join(userDataDir, 'leave.db')

if (!existsSync(dbPath)) {
  mkdirSync(userDataDir, { recursive: true })
  const legacyPath = join(app.getPath('appData'), 'leave-management', 'leave.db')
  const bundledSeed = app.isPackaged
    ? join(process.resourcesPath, 'leave.db')
    : join(__dirname, '../../resources/leave.db')

  if (existsSync(legacyPath)) {
    try {
      copyFileSync(legacyPath, dbPath)
    } catch {}
  } else if (existsSync(bundledSeed)) {
    try {
      copyFileSync(bundledSeed, dbPath)
    } catch {}
  }
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, position TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '', hire_date TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS leave_types (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, annual_days REAL NOT NULL CHECK (annual_days >= 0),
    accrues_monthly INTEGER NOT NULL DEFAULT 1, carry_over_cap REAL NOT NULL DEFAULT 0 CHECK (carry_over_cap >= 0),
    prorate_new_hires INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY, employee_id INTEGER NOT NULL REFERENCES employees(id),
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
    start_date TEXT NOT NULL, end_date TEXT NOT NULL, days INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','cancelled')),
    reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS starting_balances (
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    days REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (employee_id, leave_type_id));
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY, action TEXT NOT NULL, details TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS signatories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    position TEXT NOT NULL DEFAULT '',
    office TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'supervisor'
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_leaves_emp_type ON leaves (employee_id, leave_type_id, status);
  CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves (start_date, end_date);
`)

try {
  db.exec(`ALTER TABLE signatories ADD COLUMN position TEXT NOT NULL DEFAULT ''`)
} catch {}
try {
  db.exec(`ALTER TABLE signatories ADD COLUMN office TEXT NOT NULL DEFAULT ''`)
} catch {}

const sigCount = (db.prepare('SELECT COUNT(*) as c FROM signatories').get() as { c: number }).c
if (sigCount === 0) {
  const insertSig = db.prepare('INSERT INTO signatories (name, position, office, role) VALUES (?, ?, ?, ?)')
  const seedSignatories = [
    ['DATU TUCAO O. MASTURA, CPA', 'Provincial Governor', 'Office of the Provincial Governor', 'approver'],
    ['DATU SHARIFUDIN TUCAO P. MASTURA, CPA', 'Provincial Administrator', 'Office of the Provincial Administrator', 'supervisor'],
    ['RAIHANNA MANDUYOG-TIANG, CPA', 'Provincial Internal Auditor', 'Internal Audit Office', 'supervisor'],
    ['ATTY. JOHN RANGAL D. NADUA', 'Provincial Legal Officer', 'Legal Office', 'supervisor'],
    ['SHIELA T. ABDULGANI, MSFS', 'Provincial Agriculturist', 'Office of the Provincial Agriculturist', 'supervisor'],
    ['ARLENE P. DILLO', 'Acting Secretary to the Sangguniang Panlalawigan', 'Office of the Secretary of the Sangguniang Panlalawigan', 'supervisor'],
    ['SAPIA S. LUMINOG, CPA', 'Provincial Accountant', 'Provincial Accounting Office', 'supervisor'],
    ['EDWIN B. VILLADOLID', 'Provincial Assessor', 'Provincial Assessor Office', 'supervisor'],
    ['RAMIL ROY D. TIOLO', 'Provincial Budget Officer', 'Provincial Budget Office', 'supervisor'],
    ['MUSLIMIN Z. PAGLALA', "Acting Prov'l Disaster Risk Reduction & Mngt. Officer", 'Provincial Disaster Risk Reduction & Management', 'supervisor'],
    ['ENGR. MOHAMMED D. SAMPULNA', 'Provincial Engineer', 'Provincial Engineer Office', 'supervisor'],
    ['MUSTAPHA S. NUR', 'Provincial General Services Officer', 'Provincial General Services Office', 'supervisor'],
    ['MONINA K. MACARONGON, MPA', "Prov'l Human Resource Mngt. Officer", 'Provincial Human Resource Management Office', 'certifier'],
    ['ENGR. FATIMA U. BANSUAN, EnP', "Prov'l Planning and Devt. Coordinator", 'Provincial Planning and Development Office', 'supervisor'],
    ['AMRAIDA P. MAMALUBA', 'Provincial Treasurer', 'Provincial Treasurer Office', 'supervisor'],
    ['HADDAH M. GAYAK', 'Acting Provincial Tourism Officer', 'Provincial Tourism Office', 'supervisor'],
    ['DR. YUSOFF ADRIAN C. ABAS, MPA', 'Provincial Veterinarian', 'Provincial Veterinarian Office', 'supervisor']
  ]
  db.transaction(() => {
    for (const [name, pos, off, role] of seedSignatories) {
      insertSig.run(name, pos, off, role)
    }
  })()
}
db.exec(`
  UPDATE leave_types SET name = 'Vacation Leave' WHERE name = 'Vacation';
  UPDATE leave_types SET name = 'Sick Leave' WHERE name = 'Sick';
  INSERT OR IGNORE INTO leave_types (name, annual_days, accrues_monthly, carry_over_cap, prorate_new_hires) VALUES
    ('Vacation Leave', 15, 1, 100, 1),
    ('Mandatory/Forced Leave', 5, 0, 0, 0),
    ('Sick Leave', 15, 1, 100, 1),
    ('Maternity Leave', 105, 0, 0, 0),
    ('Paternity Leave', 7, 0, 0, 0),
    ('Special Privilege Leave', 3, 0, 0, 0),
    ('Solo Parent Leave', 7, 0, 0, 0),
    ('Study Leave', 180, 0, 0, 0),
    ('10-Day VAWC Leave', 10, 0, 0, 0),
    ('Rehabilitation Privilege', 180, 0, 0, 0),
    ('Special Leave Benefits for Women', 60, 0, 0, 0),
    ('Special Emergency (Calamity) Leave', 3, 0, 0, 0),
    ('Adoption Leave', 60, 0, 0, 0);
`)
db.exec(`
  UPDATE employees SET department = 'Office of the Provincial Administrator' WHERE department = 'Provincial Administrator''s Office';
`)
for (const emp of db.prepare('SELECT id, name FROM employees').all() as { id: number; name: string }[]) {
  const upper = emp.name.toUpperCase()
  if (upper !== emp.name) db.prepare('UPDATE employees SET name = ? WHERE id = ?').run(upper, emp.id)
}

let failedPinAttempts = 0
let pinLockoutUntil = 0

function verifyPin(pin: string): void {
  const now = Date.now()
  if (now < pinLockoutUntil) {
    const remaining = Math.ceil((pinLockoutUntil - now) / 1000)
    throw new Error(`Too many incorrect PIN attempts. Try again in ${remaining}s.`)
  }

  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin_hash') as { value: string } | undefined
  let expectedHash = row?.value
  if (!expectedHash) {
    expectedHash = crypto.scryptSync('9696', 'leave_salt', 32).toString('hex')
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('pin_hash', expectedHash)
  }

  const inputHash = crypto.scryptSync(pin || '', 'leave_salt', 32).toString('hex')
  const isValid = crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(expectedHash, 'hex'))

  if (!isValid) {
    failedPinAttempts++
    if (failedPinAttempts >= 5) {
      pinLockoutUntil = Date.now() + 5 * 60 * 1000
      failedPinAttempts = 0
      logAction('Security Alert', '5 consecutive failed PIN attempts detected. Locked for 5 minutes.')
      throw new Error('Too many incorrect PIN attempts. Locked for 5 minutes.')
    }
    throw new Error('Invalid PIN')
  }

  failedPinAttempts = 0
}

function logAction(action: string, details: string): void {
  try {
    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(action, details)
  } catch (err) {
    console.error('Audit log failed:', err)
  }
}

const getEmployee = (id: number): Employee | undefined =>
  db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Employee | undefined
const getType = (id: number): LeaveType | undefined =>
  db.prepare('SELECT * FROM leave_types WHERE id = ?').get(id) as LeaveType | undefined
const getStartBalance = (empId: number, typeId: number): number => {
  const r = db
    .prepare('SELECT days FROM starting_balances WHERE employee_id = ? AND leave_type_id = ?')
    .get(empId, typeId) as { days: number } | undefined
  return r?.days ?? 0
}

/** Balance for one employee/type as of `month` in `year`, optionally ignoring one leave (the one being edited). */
function balance(e: Employee, t: LeaveType, year: number, month: number, skipId = 0): Balance {
  const rows = db
    .prepare(
      `SELECT CAST(substr(start_date,1,4) AS INTEGER) y, status, SUM(days) d FROM leaves
       WHERE employee_id = ? AND leave_type_id = ? AND status IN ('approved','pending') AND id != ?
       GROUP BY y, status`
    )
    .all(e.id, t.id, skipId) as { y: number; status: Status; d: number }[]
  const sum = (y: number, s: Status): number => rows.find((r) => r.y === y && r.status === s)?.d ?? 0
  const start = getStartBalance(e.id!, t.id!)
  const carry = Math.max(start, carryOver(t, e.hire_date, year, (y) => sum(y, 'approved'), start))
  const acc = carry + accrued(t, e.hire_date, year, month)
  const used = sum(year, 'approved')
  return {
    employee_id: e.id!,
    leave_type_id: t.id!,
    carry,
    entitled: carry + entitlement(t, e.hire_date, year),
    accrued: acc,
    used,
    pending: sum(year, 'pending'),
    remaining: acc - used
  }
}

/** Throws a user-readable error if the leave breaks any rule; returns the weekday count. */
function validate(l: Leave): number {
  const e = getEmployee(l.employee_id)
  const t = getType(l.leave_type_id)
  if (!e || !t) throw new Error('Unknown employee or leave type.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(l.start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(l.end_date))
    throw new Error('Invalid dates.')
  if (l.end_date < l.start_date) throw new Error('End date is before start date.')
  // ponytail: leave can't span Dec 31 so each year's balance stays exact; split into two requests.
  if (l.start_date.slice(0, 4) !== l.end_date.slice(0, 4))
    throw new Error('Leave cannot cross into a new year. Split it at Dec 31.')
  if (!e.active) throw new Error(`${e.name} is inactive.`)
  if (l.start_date < e.hire_date) throw new Error(`Leave starts before hire date (${e.hire_date}).`)
  const days = weekdays(l.start_date, l.end_date)
  if (!days) throw new Error('Selected range has no weekdays.')
  const clash = db
    .prepare(
      `SELECT start_date, end_date FROM leaves WHERE employee_id = ? AND id != ?
       AND status IN ('pending','approved') AND start_date <= ? AND end_date >= ?`
    )
    .get(l.employee_id, l.id ?? 0, l.end_date, l.start_date) as { start_date: string; end_date: string } | undefined
  if (clash) throw new Error(`Overlaps existing leave ${clash.start_date} → ${clash.end_date}.`)
  // Available counts pending too, so two pending requests can't jointly overspend.
  const now = new Date()
  const leaveYear = +l.start_date.slice(0, 4)
  const currentMonth = now.getMonth() + 1
  const effectiveMonth = leaveYear < now.getFullYear() ? 12 : Math.min(+l.end_date.slice(5, 7), currentMonth)
  const b = balance(e, t, leaveYear, effectiveMonth, l.id ?? 0)
  const available = b.remaining - b.pending
  // ponytail: later years' carry-over isn't re-validated when an older leave changes.
  if (days > available + 1e-9)
    throw new Error(`Needs ${days} day(s) but only ${available.toFixed(2)} ${t.name} available.`)
  return days
}

const handlers: Api = {
  async listEmployees() {
    return db.prepare('SELECT * FROM employees ORDER BY active DESC, name').all() as Employee[]
  },
  async getStartingBalances(employeeId: number) {
    const rows = db
      .prepare('SELECT leave_type_id, days FROM starting_balances WHERE employee_id = ?')
      .all(employeeId) as { leave_type_id: number; days: number }[]
    return Object.fromEntries(rows.map((r) => [r.leave_type_id, r.days]))
  },
  async saveStartingBalances(employeeId: number, startingBalances: Record<number, number>) {
    const upsert = db.prepare(
      `INSERT INTO starting_balances (employee_id, leave_type_id, days) VALUES (?, ?, ?)
       ON CONFLICT(employee_id, leave_type_id) DO UPDATE SET days=excluded.days`
    )
    for (const [typeId, days] of Object.entries(startingBalances)) {
      upsert.run(employeeId, +typeId, +days || 0)
    }
    const emp = getEmployee(employeeId)
    logAction('Starting Balances', `Updated starting balances for ${emp?.name ?? employeeId}`)
  },
  async saveEmployee(e, startingBalances) {
    if (!e.name?.trim() || !e.hire_date) throw new Error('Name and hire date are required.')
    const p = { ...e, name: e.name.trim().toUpperCase(), active: e.active ? 1 : 0 }
    let empId = e.id
    if (e.id) {
      db.prepare(
        'UPDATE employees SET name=@name, position=@position, department=@department, hire_date=@hire_date, active=@active WHERE id=@id'
      ).run(p)
      logAction('Update Employee', `Updated employee ${p.name} (${p.department || 'General'}, ${p.position || 'Staff'})`)
    } else {
      const res = db
        .prepare(
          'INSERT INTO employees (name, position, department, hire_date, active) VALUES (@name, @position, @department, @hire_date, @active)'
        )
        .run(p)
      empId = Number(res.lastInsertRowid)
      logAction('Create Employee', `Added new employee ${p.name} (${p.department || 'General'}, Hired ${p.hire_date})`)
    }
    if (empId && startingBalances) {
      const upsert = db.prepare(
        `INSERT INTO starting_balances (employee_id, leave_type_id, days) VALUES (?, ?, ?)
         ON CONFLICT(employee_id, leave_type_id) DO UPDATE SET days=excluded.days`
      )
      for (const [typeId, days] of Object.entries(startingBalances)) {
        upsert.run(empId, +typeId, +days || 0)
      }
      logAction('Starting Balances', `Saved starting balances for ${p.name}`)
    }
  },
  async listTypes() {
    return db.prepare('SELECT * FROM leave_types ORDER BY name').all() as LeaveType[]
  },
  async saveType(t) {
    if (!t.name?.trim()) throw new Error('Name is required.')
    const p = {
      ...t,
      name: t.name.trim(),
      annual_days: +t.annual_days,
      carry_over_cap: +t.carry_over_cap,
      accrues_monthly: t.accrues_monthly ? 1 : 0,
      prorate_new_hires: t.prorate_new_hires ? 1 : 0
    }
    if (t.id) {
      db.prepare(
        'UPDATE leave_types SET name=@name, annual_days=@annual_days, accrues_monthly=@accrues_monthly, carry_over_cap=@carry_over_cap, prorate_new_hires=@prorate_new_hires WHERE id=@id'
      ).run(p)
      logAction('Update Leave Type', `Updated leave type ${p.name} (${p.annual_days} days/yr)`)
    } else {
      db.prepare(
        'INSERT INTO leave_types (name, annual_days, accrues_monthly, carry_over_cap, prorate_new_hires) VALUES (@name, @annual_days, @accrues_monthly, @carry_over_cap, @prorate_new_hires)'
      ).run(p)
      logAction('Create Leave Type', `Added leave type ${p.name} (${p.annual_days} days/yr)`)
    }
  },
  async deleteType(id) {
    if (!Number.isInteger(id)) throw new Error('Invalid ID.')
    const t = getType(id)
    try {
      db.prepare('DELETE FROM leave_types WHERE id = ?').run(id)
      if (t) logAction('Delete Leave Type', `Deleted leave type ${t.name}`)
    } catch {
      throw new Error('This leave type is used by existing leave records.')
    }
  },
  async listLeaves() {
    return db
      .prepare(
        `SELECT l.*, e.name employee_name, e.department, t.name type_name FROM leaves l
         JOIN employees e ON e.id = l.employee_id JOIN leave_types t ON t.id = l.leave_type_id
         ORDER BY l.start_date DESC`
      )
      .all() as LeaveRow[]
  },
  async saveLeave(l) {
    const status: Status = l.id
      ? (db.prepare('SELECT status FROM leaves WHERE id = ?').get(l.id) as { status: Status }).status
      : l.status === 'approved'
        ? 'approved'
        : 'pending'
    if (status !== 'pending' && status !== 'approved') throw new Error(`Cannot edit ${status} leave.`)
    const p = { ...l, status, reason: l.reason ?? '', days: validate({ ...l, status }) }
    const emp = getEmployee(l.employee_id)
    const type = getType(l.leave_type_id)
    if (l.id) {
      db.prepare(
        'UPDATE leaves SET employee_id=@employee_id, leave_type_id=@leave_type_id, start_date=@start_date, end_date=@end_date, days=@days, reason=@reason WHERE id=@id'
      ).run(p)
      logAction('Update Leave', `Updated leave #${l.id} for ${emp?.name}: ${l.start_date} → ${l.end_date} (${p.days}d)`)
    } else {
      db.prepare(
        'INSERT INTO leaves (employee_id, leave_type_id, start_date, end_date, days, status, reason) VALUES (@employee_id, @leave_type_id, @start_date, @end_date, @days, @status, @reason)'
      ).run(p)
      logAction('Create Leave', `Created ${status} leave for ${emp?.name}: ${type?.name} (${l.start_date} → ${l.end_date}, ${p.days}d)`)
    }
  },
  async setLeaveStatus(id, status) {
    if (!Number.isInteger(id)) throw new Error('Invalid ID.')
    const l = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id) as LeaveRow | undefined
    if (!l) throw new Error('Leave not found.')
    const allowed: Record<Status, Status[]> = {
      pending: ['approved', 'rejected'],
      approved: ['cancelled'],
      rejected: [],
      cancelled: []
    }
    if (!allowed[l.status].includes(status)) throw new Error(`Cannot change ${l.status} leave to ${status}.`)
    if (status === 'approved') validate(l)
    db.prepare('UPDATE leaves SET status = ? WHERE id = ?').run(status, id)
    const emp = getEmployee(l.employee_id)
    logAction('Leave Status Change', `Changed leave #${id} for ${emp?.name} from ${l.status} to ${status}`)
  },
  async deleteLeave(id, pin) {
    verifyPin(pin)
    if (!Number.isInteger(id)) throw new Error('Invalid ID.')
    const l = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id) as LeaveRow | undefined
    db.prepare('DELETE FROM leaves WHERE id = ?').run(id)
    if (l) {
      const emp = getEmployee(l.employee_id)
      logAction('Delete Leave', `Deleted leave #${id} for ${emp?.name ?? 'Employee #' + l.employee_id} (${l.start_date} → ${l.end_date})`)
    }
  },
  async balances(year) {
    if (!Number.isInteger(year) || year < 1970 || year > 2100) throw new Error('Invalid year.')
    const now = new Date()
    const month = year < now.getFullYear() ? 12 : year > now.getFullYear() ? 0 : now.getMonth() + 1
    const emps = db.prepare('SELECT * FROM employees').all() as Employee[]
    const types = db.prepare('SELECT * FROM leave_types').all() as LeaveType[]

    const startRows = db
      .prepare('SELECT employee_id, leave_type_id, days FROM starting_balances')
      .all() as { employee_id: number; leave_type_id: number; days: number }[]
    const startMap = new Map<string, number>()
    for (const r of startRows) startMap.set(`${r.employee_id}:${r.leave_type_id}`, r.days)

    const leaveRows = db
      .prepare(
        `SELECT employee_id, leave_type_id, CAST(substr(start_date,1,4) AS INTEGER) y, status, SUM(days) d
         FROM leaves
         WHERE status IN ('approved','pending')
         GROUP BY employee_id, leave_type_id, y, status`
      )
      .all() as { employee_id: number; leave_type_id: number; y: number; status: Status; d: number }[]
    const sumMap = new Map<string, number>()
    for (const r of leaveRows) sumMap.set(`${r.employee_id}:${r.leave_type_id}:${r.y}:${r.status}`, r.d)

    return emps.flatMap((e) =>
      types.map((t) => {
        const sum = (y: number, s: Status): number => sumMap.get(`${e.id}:${t.id}:${y}:${s}`) ?? 0
        const start = startMap.get(`${e.id}:${t.id}`) ?? 0
        const carry = Math.max(start, carryOver(t, e.hire_date, year, (y) => sum(y, 'approved'), start))
        const acc = carry + accrued(t, e.hire_date, year, month)
        const used = sum(year, 'approved')
        return {
          employee_id: e.id!,
          leave_type_id: t.id!,
          carry,
          entitled: carry + entitlement(t, e.hire_date, year),
          accrued: acc,
          used,
          pending: sum(year, 'pending'),
          remaining: acc - used
        }
      })
    )
  },
  async listLogs() {
    return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500').all() as AuditLog[]
  },
  async deleteLogs(pin: string, id?: number) {
    verifyPin(pin)
    if (id) {
      db.prepare('DELETE FROM audit_logs WHERE id = ?').run(id)
    } else {
      db.prepare('DELETE FROM audit_logs').run()
      logAction('Security', 'Audit logs were cleared with authorized PIN.')
    }
  },
  async listSignatories() {
    return db.prepare('SELECT * FROM signatories ORDER BY id').all() as Signatory[]
  },
  async saveSignatory(s) {
    if (s.id) {
      db.prepare('UPDATE signatories SET name=@name, position=@position, office=@office, role=@role WHERE id=@id').run(s)
    } else {
      db.prepare('INSERT INTO signatories (name, position, office, role) VALUES (@name, @position, @office, @role)').run(s)
    }
  },
  async deleteSignatory(id) {
    db.prepare('DELETE FROM signatories WHERE id = ?').run(id)
  },
  async printToPdf() {}
}

ipcMain.handle('db', async (event, method: string, ...args: unknown[]) => {
  const url = event.senderFrame?.url ?? ''
  const isDev = Boolean(process.env['ELECTRON_RENDERER_URL'])
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  const isAllowed = isDev && devUrl ? url.startsWith(devUrl) : url.startsWith('file:')
  if (!isAllowed) throw new Error('Unauthorized IPC sender')
  if (!(methods as readonly string[]).includes(method)) throw new Error(`Unknown method ${method}`)
  if (method === 'printToPdf') {
    const buffer = await event.sender.printToPDF({
      pageSize: { width: 8.5, height: 13 },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true
    })
    const name = String(args[0] || 'leave-application').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
    const pdfPath = join(app.getPath('temp'), `${name}-${Date.now()}.pdf`)
    writeFileSync(pdfPath, buffer)
    await shell.openPath(pdfPath)
    return
  }
  return (handlers[method as keyof Api] as (...a: unknown[]) => unknown)(...args)
})
