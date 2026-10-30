export type Status = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface Employee {
  id?: number
  name: string
  position: string
  department: string
  hire_date: string // YYYY-MM-DD
  active: number // 1 | 0 (SQLite has no bool)
}

export interface LeaveType {
  id?: number
  name: string
  annual_days: number
  accrues_monthly: number
  carry_over_cap: number
  prorate_new_hires: number
}

export interface Leave {
  id?: number
  employee_id: number
  leave_type_id: number
  start_date: string
  end_date: string
  status: Status
  reason: string
}

export interface LeaveRow extends Required<Leave> {
  days: number
  created_at: string
  employee_name: string
  department: string
  type_name: string
}

export interface Balance {
  employee_id: number
  leave_type_id: number
  carry: number
  entitled: number // carry + full-year entitlement
  accrued: number // carry + accrued to date
  used: number
  pending: number
  remaining: number // accrued - used
}

export interface AuditLog {
  id: number
  action: string
  details: string
  created_at: string
}

export interface Signatory {
  id?: number
  name: string
  position: string
  office: string
  role?: 'certifier' | 'supervisor' | 'approver' | 'other'
}

// Single source of truth for the IPC surface: preload exposes exactly these.
export const methods = [
  'listEmployees',
  'saveEmployee',
  'getStartingBalances',
  'saveStartingBalances',
  'listTypes',
  'saveType',
  'deleteType',
  'listLeaves',
  'saveLeave',
  'deleteLeave',
  'setLeaveStatus',
  'balances',
  'listLogs',
  'deleteLogs',
  'listSignatories',
  'saveSignatory',
  'deleteSignatory',
  'printToPdf'
] as const

export interface Api {
  listEmployees(): Promise<Employee[]>
  saveEmployee(e: Employee, startingBalances?: Record<number, number>): Promise<void>
  getStartingBalances(employeeId: number): Promise<Record<number, number>>
  saveStartingBalances(employeeId: number, balances: Record<number, number>): Promise<void>
  listTypes(): Promise<LeaveType[]>
  saveType(t: LeaveType): Promise<void>
  deleteType(id: number): Promise<void>
  listLeaves(): Promise<LeaveRow[]>
  saveLeave(l: Leave): Promise<void>
  deleteLeave(id: number, pin: string): Promise<void>
  setLeaveStatus(id: number, status: Status): Promise<void>
  balances(year: number): Promise<Balance[]>
  listLogs(): Promise<AuditLog[]>
  deleteLogs(pin: string, id?: number): Promise<void>
  listSignatories(): Promise<Signatory[]>
  saveSignatory(s: Signatory): Promise<void>
  deleteSignatory(id: number): Promise<void>
  printToPdf(filename?: string): Promise<void>
}
