import type { Api, AuditLog, Balance, Employee, Leave, LeaveRow, LeaveType, Signatory, Status } from '../../shared/types'
import { accrued, carryOver, entitlement, weekdays } from '../../shared/rules'

// Fallback when running in browser without Electron main process
const get = <T>(k: string, d: T): T => {
  try {
    const s = localStorage.getItem(k)
    return s ? JSON.parse(s) : d
  } catch {
    return d
  }
}
const set = (k: string, v: unknown): void => localStorage.setItem(k, JSON.stringify(v))

const defaultTypes: LeaveType[] = [
  { id: 1, name: 'Vacation Leave', annual_days: 15, accrues_monthly: 1, carry_over_cap: 100, prorate_new_hires: 1 },
  { id: 2, name: 'Mandatory/Forced Leave', annual_days: 5, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 3, name: 'Sick Leave', annual_days: 15, accrues_monthly: 1, carry_over_cap: 100, prorate_new_hires: 1 },
  { id: 4, name: 'Maternity Leave', annual_days: 105, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 5, name: 'Paternity Leave', annual_days: 7, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 6, name: 'Special Privilege Leave', annual_days: 3, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 7, name: 'Solo Parent Leave', annual_days: 7, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 8, name: 'Study Leave', annual_days: 180, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 9, name: '10-Day VAWC Leave', annual_days: 10, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 10, name: 'Rehabilitation Privilege', annual_days: 180, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 11, name: 'Special Leave Benefits for Women', annual_days: 60, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 12, name: 'Special Emergency (Calamity) Leave', annual_days: 3, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 },
  { id: 13, name: 'Adoption Leave', annual_days: 60, accrues_monthly: 0, carry_over_cap: 0, prorate_new_hires: 0 }
]

const defaultEmps: Employee[] = [
  { id: 1, name: 'Alice Smith', position: 'Software Engineer', department: 'Engineering', hire_date: '2025-01-15', active: 1 },
  { id: 2, name: 'Bob Jones', position: 'Product Designer', department: 'Design', hire_date: '2025-06-01', active: 1 }
]

function getEmployees(): Employee[] {
  const emps = get('lm_employees', defaultEmps)
  let changed = false
  for (const e of emps) {
    if (e.name !== e.name.toUpperCase()) {
      e.name = e.name.toUpperCase()
      changed = true
    }
    if (e.department === 'PHRMO') {
      e.department = 'Provincial Human Resource Management Officer'
      changed = true
    } else if (e.department === 'PDRRMO') {
      e.department = "Prov'l Disaster Risk Reduction and Mngt. Office"
      changed = true
    } else if (e.department === 'General Services Office') {
      e.department = "Provincial General Services Office"
      changed = true
    }
  }

  if (changed) set('lm_employees', emps)

  return emps
}

function getTypes(): LeaveType[] {
  return get('lm_types', defaultTypes)
}

function getLeaves(): (Leave & { id: number; days: number; created_at: string })[] {
  return get('lm_leaves', [])
}

function getStartingBalanceMap(): Record<string, number> {
  return get('lm_starting_balances', {})
}

function getLogs(): AuditLog[] {
  return get('lm_logs', [])
}

const defaultSignatories: Signatory[] = [
  { id: 1, name: 'DATU TUCAO O. MASTURA, CPA', position: 'Provincial Governor', office: 'Office of the Provincial Governor', role: 'approver' },
  { id: 2, name: 'DATU SHARIFUDIN TUCAO P. MASTURA, CPA', position: 'Provincial Administrator', office: 'Office of the Provincial Administrator', role: 'supervisor' },
  { id: 3, name: 'RAIHANNA MANDUYOG-TIANG, CPA', position: 'Provincial Internal Auditor', office: 'Internal Audit Office', role: 'supervisor' },
  { id: 4, name: 'ATTY. JOHN RANGAL D. NADUA', position: 'Provincial Legal Officer', office: 'Legal Office', role: 'supervisor' },
  { id: 5, name: 'SHIELA T. ABDULGANI, MSFS', position: 'Provincial Agriculturist', office: 'Office of the Provincial Agriculturist', role: 'supervisor' },
  { id: 6, name: 'ARLENE P. DILLO', position: 'Acting Secretary to the Sangguniang Panlalawigan', office: 'Office of the Secretary of the Sangguniang Panlalawigan', role: 'supervisor' },
  { id: 7, name: 'SAPIA S. LUMINOG, CPA', position: 'Provincial Accountant', office: 'Provincial Accounting Office', role: 'supervisor' },
  { id: 8, name: 'EDWIN B. VILLADOLID', position: 'Provincial Assessor', office: 'Provincial Assessor Office', role: 'supervisor' },
  { id: 9, name: 'RAMIL ROY D. TIOLO', position: 'Provincial Budget Officer', office: 'Provincial Budget Office', role: 'supervisor' },
  { id: 10, name: 'MUSLIMIN Z. PAGLALA', position: "Acting Prov'l Disaster Risk Reduction & Mngt. Officer", office: 'Provincial Disaster Risk Reduction & Management', role: 'supervisor' },
  { id: 11, name: 'ENGR. MOHAMMED D. SAMPULNA', position: 'Provincial Engineer', office: 'Provincial Engineer Office', role: 'supervisor' },
  { id: 12, name: 'MUSTAPHA S. NUR', position: 'Provincial General Services Officer', office: 'Provincial General Services Office', role: 'supervisor' },
  { id: 13, name: 'MONINA K. MACARONGON, MPA', position: "Prov'l Human Resource Mngt. Officer", office: 'Provincial Human Resource Management Office', role: 'certifier' },
  { id: 14, name: 'ENGR. FATIMA U. BANSUAN, EnP', position: "Prov'l Planning and Devt. Coordinator", office: 'Provincial Planning and Development Office', role: 'supervisor' },
  { id: 15, name: 'AMRAIDA P. MAMALUBA', position: 'Provincial Treasurer', office: 'Provincial Treasurer Office', role: 'supervisor' },
  { id: 16, name: 'HADDAH M. GAYAK', position: 'Acting Provincial Tourism Officer', office: 'Provincial Tourism Office', role: 'supervisor' },
  { id: 17, name: 'DR. YUSOFF ADRIAN C. ABAS, MPA', position: 'Provincial Veterinarian', office: 'Provincial Veterinarian Office', role: 'supervisor' }
]

function getSignatories(): Signatory[] {
  return get('lm_signatories', defaultSignatories)
}

function logAction(action: string, details: string): void {
  const logs = getLogs()
  const id = logs.reduce((m, x) => Math.max(m, x.id), 0) + 1
  logs.unshift({
    id,
    action,
    details,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
  })
  if (logs.length > 500) logs.length = 500
  set('lm_logs', logs)
}

export const browserApi: Api = {
  async listEmployees() {
    return getEmployees().sort((a, b) => (b.active - a.active) || a.name.localeCompare(b.name))
  },
  async getStartingBalances(employeeId: number) {
    const map = getStartingBalanceMap()
    const res: Record<number, number> = {}
    for (const [k, v] of Object.entries(map)) {
      const [eId, tId] = k.split(':')
      if (+eId === employeeId) {
        res[+tId] = v
      }
    }
    return res
  },
  async saveStartingBalances(employeeId: number, startingBalances: Record<number, number>) {
    const map = getStartingBalanceMap()
    for (const [tId, days] of Object.entries(startingBalances)) {
      map[`${employeeId}:${tId}`] = +days || 0
    }
    set('lm_starting_balances', map)
    const emp = getEmployees().find((x) => x.id === employeeId)
    logAction('Starting Balances', `Saved starting balances for ${emp?.name ?? employeeId}`)
  },
  async saveEmployee(e, startingBalances) {
    if (!e.name?.trim() || !e.hire_date) throw new Error('Name and hire date are required.')
    const emps = getEmployees()
    let empId = e.id
    if (e.id) {
      const idx = emps.findIndex((x) => x.id === e.id)
      if (idx !== -1) emps[idx] = { ...e, name: e.name.trim().toUpperCase(), active: e.active ? 1 : 0 }
      logAction('Update Employee', `Updated employee ${e.name.trim().toUpperCase()} (${e.department || 'General'}, ${e.position || 'Staff'})`)
    } else {
      empId = emps.reduce((m, x) => Math.max(m, x.id ?? 0), 0) + 1
      emps.push({ ...e, id: empId, name: e.name.trim().toUpperCase(), active: e.active ? 1 : 0 })
      logAction('Create Employee', `Added new employee ${e.name.trim().toUpperCase()} (${e.department || 'General'}, Hired ${e.hire_date})`)
    }
    set('lm_employees', emps)

    if (empId && startingBalances) {
      const map = getStartingBalanceMap()
      for (const [tId, days] of Object.entries(startingBalances)) {
        map[`${empId}:${tId}`] = +days || 0
      }
      set('lm_starting_balances', map)
      logAction('Starting Balances', `Saved starting balances for ${e.name}`)
    }
  },
  async listTypes() {
    return getTypes()
  },
  async saveType(t) {
    if (!t.name?.trim()) throw new Error('Name is required.')
    const types = getTypes()
    const p: LeaveType = {
      ...t,
      name: t.name.trim(),
      annual_days: +t.annual_days,
      carry_over_cap: +t.carry_over_cap,
      accrues_monthly: t.accrues_monthly ? 1 : 0,
      prorate_new_hires: t.prorate_new_hires ? 1 : 0
    }
    if (t.id) {
      const idx = types.findIndex((x) => x.id === t.id)
      if (idx !== -1) types[idx] = p
      logAction('Update Leave Type', `Updated leave type ${p.name} (${p.annual_days} days/yr)`)
    } else {
      p.id = types.reduce((m, x) => Math.max(m, x.id ?? 0), 0) + 1
      types.push(p)
      logAction('Create Leave Type', `Added leave type ${p.name} (${p.annual_days} days/yr)`)
    }
    set('lm_types', types)
  },
  async deleteType(id) {
    const leaves = getLeaves()
    const t = getTypes().find((x) => x.id === id)
    if (leaves.some((l) => l.leave_type_id === id)) {
      throw new Error('This leave type is used by existing leave records.')
    }
    set('lm_types', getTypes().filter((x) => x.id !== id))
    if (t) logAction('Delete Leave Type', `Deleted leave type ${t.name}`)
  },
  async listLeaves() {
    const emps = getEmployees()
    const types = getTypes()
    return getLeaves()
      .map((l) => {
        const e = emps.find((x) => x.id === l.employee_id)
        const t = types.find((x) => x.id === l.leave_type_id)
        return {
          ...l,
          employee_name: e?.name ?? 'Unknown',
          department: e?.department ?? '',
          type_name: t?.name ?? 'Unknown'
        } as LeaveRow
      })
      .sort((a, b) => b.start_date.localeCompare(a.start_date))
  },
  async saveLeave(l) {
    const emps = getEmployees()
    const types = getTypes()
    const leaves = getLeaves()
    const e = emps.find((x) => x.id === l.employee_id)
    const t = types.find((x) => x.id === l.leave_type_id)
    if (!e || !t) throw new Error('Unknown employee or leave type.')
    if (l.end_date < l.start_date) throw new Error('End date is before start date.')
    if (l.start_date.slice(0, 4) !== l.end_date.slice(0, 4))
      throw new Error('Leave cannot cross into a new year. Split it at Dec 31.')
    if (!e.active) throw new Error(`${e.name} is inactive.`)
    if (l.start_date < e.hire_date) throw new Error(`Leave starts before hire date (${e.hire_date}).`)
    const days = weekdays(l.start_date, l.end_date)
    if (!days) throw new Error('Selected range has no weekdays.')

    const clash = leaves.find(
      (x) =>
        x.employee_id === l.employee_id &&
        x.id !== (l.id ?? 0) &&
        (x.status === 'pending' || x.status === 'approved') &&
        x.start_date <= l.end_date &&
        x.end_date >= l.start_date
    )
    if (clash) throw new Error(`Overlaps existing leave ${clash.start_date} → ${clash.end_date}.`)

    const status: Status = l.id
      ? (leaves.find((x) => x.id === l.id)?.status ?? 'pending')
      : l.status === 'approved'
        ? 'approved'
        : 'pending'

    if (l.id) {
      const idx = leaves.findIndex((x) => x.id === l.id)
      if (idx !== -1) leaves[idx] = { ...leaves[idx], ...l, days, status, reason: l.reason ?? '' }
      logAction('Update Leave', `Updated leave #${l.id} for ${e.name}: ${l.start_date} → ${l.end_date} (${days}d)`)
    } else {
      const id = leaves.reduce((m, x) => Math.max(m, x.id), 0) + 1
      leaves.push({
        ...l,
        id,
        days,
        status,
        reason: l.reason ?? '',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      })
      logAction('Create Leave', `Created ${status} leave for ${e.name}: ${t.name} (${l.start_date} → ${l.end_date}, ${days}d)`)
    }
    set('lm_leaves', leaves)
  },
  async setLeaveStatus(id, status) {
    const leaves = getLeaves()
    const l = leaves.find((x) => x.id === id)
    if (!l) throw new Error('Leave not found.')
    const oldStatus = l.status
    l.status = status
    set('lm_leaves', leaves)
    const emp = getEmployees().find((e) => e.id === l.employee_id)
    logAction('Leave Status Change', `Changed leave #${id} for ${emp?.name} from ${oldStatus} to ${status}`)
  },
  async deleteLeave(id, pin) {
    if (pin !== '9696') throw new Error('Invalid PIN')
    const leaves = getLeaves()
    const l = leaves.find((x) => x.id === id)
    set('lm_leaves', leaves.filter((x) => x.id !== id))
    if (l) {
      const emp = getEmployees().find((e) => e.id === l.employee_id)
      logAction('Delete Leave', `Deleted leave #${id} for ${emp?.name ?? 'Employee #' + l.employee_id}`)
    }
  },
  async balances(year) {
    const emps = getEmployees()
    const types = getTypes()
    const leaves = getLeaves()
    const startMap = getStartingBalanceMap()
    const now = new Date()
    const month = year < now.getFullYear() ? 12 : year > now.getFullYear() ? 0 : now.getMonth() + 1

    return emps.flatMap((e) =>
      types.map((t) => {
        const empLeaves = leaves.filter((l) => l.employee_id === e.id && l.leave_type_id === t.id)
        const sum = (y: number, s: Status): number =>
          empLeaves.filter((l) => +l.start_date.slice(0, 4) === y && l.status === s).reduce((acc, l) => acc + l.days, 0)
        const start = startMap[`${e.id}:${t.id}`] ?? 0
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
        } as Balance
      })
    )
  },
  async listLogs() {
    return getLogs()
  },
  async deleteLogs(pin: string, id?: number) {
    if (pin !== '9696') throw new Error('Invalid PIN')
    if (id) {
      set('lm_logs', getLogs().filter((l) => l.id !== id))
    } else {
      set('lm_logs', [])
    }
  },
  async listSignatories() {
    return getSignatories()
  },
  async saveSignatory(s) {
    const list = getSignatories()
    if (s.id) {
      const idx = list.findIndex((x) => x.id === s.id)
      if (idx !== -1) list[idx] = s as Signatory
    } else {
      const id = list.reduce((m, x) => Math.max(m, x.id ?? 0), 0) + 1
      list.push({ ...s, id })
    }
    set('lm_signatories', list)
  },
  async deleteSignatory(id) {
    set('lm_signatories', getSignatories().filter((x) => x.id !== id))
  },
  async printToPdf() {
    window.print()
  }
}
