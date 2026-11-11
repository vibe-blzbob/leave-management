import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, errMsg, useLoad } from '../lib'
import type { Balance, Employee, LeaveRow } from '../../../shared/types'
import maguindanaoLogo from '../assets/maguindanao_del_norte.jpg'
import bangsamoroLogo from '../assets/bangsamoro.png'

export interface LeaveCardRow {
  num: number
  vlParticulars: string
  vlD: string
  vlH: string
  vlM: string
  vlEarned: string
  vlAbsencePay: string
  vlBalance: string
  vlAbsenceNoPay: string
  slParticulars: string
  slD: string
  slH: string
  slM: string
  slEarned: string
  slAbsencePay: string
  slBalance: string
  slAbsenceNoPay: string
  action: string
}

function formatDateShort(val?: string): string {
  if (!val) return ''
  const d = new Date(val.length === 10 ? val + 'T00:00:00' : val)
  if (isNaN(d.getTime())) return val
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${m[d.getMonth()]} ${d.getDate()}`
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function computeLeaveCardRows(
  emp: Employee,
  year: number,
  balances: Balance[],
  leaves: LeaveRow[]
): LeaveCardRow[] {
  const rows: LeaveCardRow[] = []

  // 1. Starting carry-over / beginning balances
  const empBals = balances.filter((b) => b.employee_id === emp.id)
  const vlCarry = empBals.find((b) => b.leave_type_id === 1)?.carry ?? 0
  const slCarry = empBals.find((b) => b.leave_type_id === 2 || b.leave_type_id === 3)?.carry ?? 0

  let runningVl = Math.max(0, vlCarry)
  let runningSl = Math.max(0, slCarry)

  // Row 1: Balance brought forward
  rows.push({
    num: 1,
    vlParticulars: `Brought Forward (Jan 1, ${year})`,
    vlD: '',
    vlH: '',
    vlM: '',
    vlEarned: '',
    vlAbsencePay: '',
    vlBalance: runningVl.toFixed(3),
    vlAbsenceNoPay: '',
    slParticulars: `Brought Forward (Jan 1, ${year})`,
    slD: '',
    slH: '',
    slM: '',
    slEarned: '',
    slAbsencePay: '',
    slBalance: runningSl.toFixed(3),
    slAbsenceNoPay: '',
    action: 'Balance Forwarded'
  })

  // 2. Month-by-month accruals and approved leaves taken
  const now = new Date()
  const maxMonth = year < now.getFullYear() ? 12 : Math.min(12, now.getMonth() + 1)
  const hireYear = +emp.hire_date.slice(0, 4)
  const hireMonth = +emp.hire_date.slice(5, 7)

  // Filter approved leaves for this employee in this year
  const empLeaves = leaves
    .filter(
      (l) =>
        l.employee_id === emp.id &&
        l.status === 'approved' &&
        l.start_date.startsWith(`${year}-`)
    )
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  for (let m = 1; m <= maxMonth; m++) {
    // If hired after this month, skip
    if (year < hireYear || (year === hireYear && m < hireMonth)) {
      continue
    }

    // Monthly credit: 1.250 days for VL and SL
    runningVl += 1.25
    runningSl += 1.25

    rows.push({
      num: rows.length + 1,
      vlParticulars: `${MONTH_NAMES[m - 1]} ${year}`,
      vlD: '',
      vlH: '',
      vlM: '',
      vlEarned: '1.250',
      vlAbsencePay: '',
      vlBalance: runningVl.toFixed(3),
      vlAbsenceNoPay: '',
      slParticulars: `${MONTH_NAMES[m - 1]} ${year}`,
      slD: '',
      slH: '',
      slM: '',
      slEarned: '1.250',
      slAbsencePay: '',
      slBalance: runningSl.toFixed(3),
      slAbsenceNoPay: '',
      action: 'Monthly Accrual'
    })

    // Approved leaves in month m
    const monthPrefix = `${year}-${String(m).padStart(2, '0')}`
    const inMonthLeaves = empLeaves.filter((l) => l.start_date.startsWith(monthPrefix))

    for (const l of inMonthLeaves) {
      const isSick = l.type_name?.toLowerCase().includes('sick')
      if (isSick) {
        const withPay = Math.min(runningSl, l.days)
        const withoutPay = Math.max(0, l.days - withPay)
        runningSl = Math.max(0, runningSl - withPay)

        rows.push({
          num: rows.length + 1,
          vlParticulars: '',
          vlD: '',
          vlH: '',
          vlM: '',
          vlEarned: '',
          vlAbsencePay: '',
          vlBalance: '',
          vlAbsenceNoPay: '',
          slParticulars: `${formatDateShort(l.start_date)} - ${formatDateShort(l.end_date)}`,
          slD: String(l.days),
          slH: '0',
          slM: '0',
          slEarned: '',
          slAbsencePay: withPay > 0 ? withPay.toFixed(3) : '',
          slBalance: runningSl.toFixed(3),
          slAbsenceNoPay: withoutPay > 0 ? withoutPay.toFixed(3) : '',
          action: `Approved ${l.created_at ? l.created_at.slice(0, 10) : ''} (Sick)`
        })
      } else {
        const withPay = Math.min(runningVl, l.days)
        const withoutPay = Math.max(0, l.days - withPay)
        runningVl = Math.max(0, runningVl - withPay)

        rows.push({
          num: rows.length + 1,
          vlParticulars: `${formatDateShort(l.start_date)} - ${formatDateShort(l.end_date)} (${l.sub_type || 'VL'})`,
          vlD: String(l.days),
          vlH: '0',
          vlM: '0',
          vlEarned: '',
          vlAbsencePay: withPay > 0 ? withPay.toFixed(3) : '',
          vlBalance: runningVl.toFixed(3),
          vlAbsenceNoPay: withoutPay > 0 ? withoutPay.toFixed(3) : '',
          slParticulars: '',
          slD: '',
          slH: '',
          slM: '',
          slEarned: '',
          slAbsencePay: '',
          slBalance: '',
          slAbsenceNoPay: '',
          action: `Approved ${l.created_at ? l.created_at.slice(0, 10) : ''} (${l.sub_type || 'VL'})`
        })
      }
    }
  }

  // 3. Pad up to 26 rows to match the official sheet
  const targetRows = Math.max(26, rows.length)
  for (let i = rows.length + 1; i <= targetRows; i++) {
    rows.push({
      num: i,
      vlParticulars: '',
      vlD: '',
      vlH: '',
      vlM: '',
      vlEarned: '',
      vlAbsencePay: '',
      vlBalance: '',
      vlAbsenceNoPay: '',
      slParticulars: '',
      slD: '',
      slH: '',
      slM: '',
      slEarned: '',
      slAbsencePay: '',
      slBalance: '',
      slAbsenceNoPay: '',
      action: ''
    })
  }

  return rows
}

export function SingleEmployeeLeaveCard({
  employee,
  year,
  balances,
  leaves
}: {
  employee: Employee
  year: number
  balances: Balance[]
  leaves: LeaveRow[]
}): React.JSX.Element {
  const rows = useMemo(
    () => computeLeaveCardRows(employee, year, balances, leaves),
    [employee, year, balances, leaves]
  )

  const deptUpper = (employee.department || 'Office of the Provincial Governor').toUpperCase()

  return (
    <div
      className="cs-page p-5 text-[8.5px] leading-tight text-black bg-white shadow-2xl flex flex-col justify-between select-text"
      style={{ width: '13in', height: '8.5in', boxSizing: 'border-box' }}
    >
      <div>
        {/* Official Header */}
        <div className="relative flex items-center justify-between mb-1.5 pb-1 border-b border-black">
          <img
            src={maguindanaoLogo}
            alt="Province of Maguindanao del Norte"
            className="w-12 h-12 object-contain shrink-0"
          />
          <div className="text-center flex-1 px-4">
            <div className="text-[8.5px] font-medium uppercase tracking-wider text-slate-700">
              Republic of the Philippines
            </div>
            <div className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900">
              PROVINCE OF MAGUINDANAO DEL NORTE
            </div>
            <div className="text-[9.5px] font-bold uppercase tracking-wide text-slate-800">
              {deptUpper}
            </div>
            <div className="inline-block border-b-2 border-black font-extrabold text-[12px] tracking-widest uppercase mt-0.5 px-3 pb-0.5">
              EMPLOYEE&apos;S LEAVE CARD
            </div>
          </div>
          <img
            src={bangsamoroLogo}
            alt="Bangsamoro Autonomous Region in Muslim Mindanao"
            className="w-12 h-12 object-contain shrink-0"
          />
        </div>

        {/* Employee Metadata */}
        <div className="flex justify-between items-end text-[9.5px] font-semibold mb-1 px-1">
          <div className="flex items-center gap-6">
            <div>
              NAME: <span className="font-bold uppercase text-[10.5px]">{employee.name}</span>
            </div>
            <div>
              POSITION: <span className="font-semibold text-slate-800">{employee.position || '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              OFFICE: <span className="font-semibold text-slate-800">{employee.department || 'General'}</span>
            </div>
            <div>
              SALARY: <span className="border-b border-black inline-block w-24 text-center font-normal">_______</span>
            </div>
          </div>
        </div>

        {/* CSC Grid Table */}
        <table className="w-full border-collapse border-2 border-black text-[8px] text-center">
          <thead>
            <tr className="border-b border-black font-bold">
              <th rowSpan={4} className="border border-black p-0.5 w-[28px] bg-slate-100">
                #
              </th>
              <th colSpan={8} className="border border-black p-0.5 bg-slate-50 font-extrabold text-[9px]">
                VACATION LEAVE
              </th>
              <th colSpan={8} className="border border-black p-0.5 bg-slate-50 font-extrabold text-[9px]">
                SICK LEAVE
              </th>
              <th rowSpan={4} className="border border-black p-0.5 w-[130px] bg-slate-100">
                DATE &amp; ACTION TAKEN ON APPLICATION FOR LEAVE
              </th>
            </tr>
            <tr className="border-b border-black font-semibold">
              <th rowSpan={3} className="border border-black p-0.5 w-[180px]">
                PARTICULARS
              </th>
              <th colSpan={3} className="border border-black p-0.5">
                PERIOD
              </th>
              <th rowSpan={3} className="border border-black p-0.5 w-[50px]">
                EARNED
              </th>
              <th rowSpan={2} className="border border-black p-0.5 w-[56px]">
                ABSENCE<br />UNDERTIME
              </th>
              <th rowSpan={3} className="border border-black p-0.5 w-[60px]">
                BALANCE
              </th>
              <th rowSpan={2} className="border border-black p-0.5 w-[56px]">
                ABSENCE<br />UNDERTIME
              </th>
              <th rowSpan={3} className="border border-black p-0.5 w-[180px]">
                PARTICULARS
              </th>
              <th colSpan={3} className="border border-black p-0.5">
                PERIOD
              </th>
              <th rowSpan={3} className="border border-black p-0.5 w-[50px]">
                EARNED
              </th>
              <th rowSpan={2} className="border border-black p-0.5 w-[56px]">
                ABSENCE<br />UNDERTIME
              </th>
              <th rowSpan={3} className="border border-black p-0.5 w-[60px]">
                BALANCE
              </th>
              <th rowSpan={2} className="border border-black p-0.5 w-[56px]">
                ABSENCE<br />UNDERTIME
              </th>
            </tr>
            <tr className="border-b border-black font-bold text-[7.5px]">
              <th className="border border-black p-0.5 w-[24px]">D</th>
              <th className="border border-black p-0.5 w-[24px]">H</th>
              <th className="border border-black p-0.5 w-[24px]">M</th>
              <th className="border border-black p-0.5 w-[24px]">D</th>
              <th className="border border-black p-0.5 w-[24px]">H</th>
              <th className="border border-black p-0.5 w-[24px]">M</th>
            </tr>
            <tr className="border-b-2 border-black font-semibold text-[7.5px]">
              <th colSpan={3} className="border border-black p-0.5">
                D / H / M
              </th>
              <th className="border border-black p-0.5">W/PAY</th>
              <th className="border border-black p-0.5">W/O PAY</th>
              <th colSpan={3} className="border border-black p-0.5">
                D / H / M
              </th>
              <th className="border border-black p-0.5">W/PAY</th>
              <th className="border border-black p-0.5">W/O PAY</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.num} className="border-b border-black h-[20px]">
                <td className="border border-black p-0.5 font-semibold bg-slate-50/50">{r.num}</td>
                <td className="border border-black p-0.5 text-left px-1.5 truncate max-w-[180px]">{r.vlParticulars}</td>
                <td className="border border-black p-0.5">{r.vlD}</td>
                <td className="border border-black p-0.5">{r.vlH}</td>
                <td className="border border-black p-0.5">{r.vlM}</td>
                <td className="border border-black p-0.5 font-medium">{r.vlEarned}</td>
                <td className="border border-black p-0.5 font-medium">{r.vlAbsencePay}</td>
                <td className="border border-black p-0.5 font-bold bg-slate-50/30">{r.vlBalance}</td>
                <td className="border border-black p-0.5">{r.vlAbsenceNoPay}</td>
                <td className="border border-black p-0.5 text-left px-1.5 truncate max-w-[180px]">{r.slParticulars}</td>
                <td className="border border-black p-0.5">{r.slD}</td>
                <td className="border border-black p-0.5">{r.slH}</td>
                <td className="border border-black p-0.5">{r.slM}</td>
                <td className="border border-black p-0.5 font-medium">{r.slEarned}</td>
                <td className="border border-black p-0.5 font-medium">{r.slAbsencePay}</td>
                <td className="border border-black p-0.5 font-bold bg-slate-50/30">{r.slBalance}</td>
                <td className="border border-black p-0.5">{r.slAbsenceNoPay}</td>
                <td className="border border-black p-0.5 text-left px-1.5 text-[7.5px] truncate max-w-[130px]">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PrintLeaveCard(): React.JSX.Element {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const yearParam = Number(params.get('year')) || new Date().getFullYear()
  const empIdParam = params.get('employeeId') ? Number(params.get('employeeId')) : null
  const deptParam = params.get('department') || ''

  const [year, setYear] = useState<number>(yearParam)
  const [department, setDepartment] = useState<string>(deptParam)
  const [selectedEmpId, setSelectedEmpId] = useState<number | 'all'>(empIdParam ?? 'all')
  const [generating, setGenerating] = useState<boolean>(false)

  const [employees] = useLoad(api.listEmployees, [] as Employee[])
  const [leaves] = useLoad(api.listLeaves, [] as LeaveRow[])
  const [balances, setBalances] = useState<Balance[]>([])

  useEffect(() => {
    api.balances(year).then(setBalances).catch(() => setBalances([]))
  }, [year])

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department.trim() || 'General').filter(Boolean))].sort(),
    [employees]
  )

  const filteredEmployees = useMemo(() => {
    let list = employees.filter((e) => e.active)
    if (department) {
      list = list.filter((e) => (e.department.trim() || 'General') === department)
    }
    if (selectedEmpId !== 'all') {
      list = list.filter((e) => e.id === Number(selectedEmpId))
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [employees, department, selectedEmpId])

  const handlePrintPdf = async (): Promise<void> => {
    setGenerating(true)
    try {
      const targetName =
        selectedEmpId !== 'all'
          ? employees.find((e) => e.id === Number(selectedEmpId))?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'employee'
          : department
            ? department.replace(/[^a-zA-Z0-9]/g, '_')
            : 'leave-cards'
      await api.printToPdf(`leave-card-${targetName}-${year}`, { landscape: true })
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center print:min-h-0 print:bg-white print:block">
      {/* Top action toolbar (Hidden during print) matching PrintLeave */}
      <header className="no-print sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-xl px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              ← Back
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">
                EMPLOYEE&apos;S LEAVE CARD (CSC Form)
              </h1>
              <p className="text-[11px] text-slate-400">
                {selectedEmpId !== 'all'
                  ? employees.find((e) => e.id === Number(selectedEmpId))?.name || '1 Employee'
                  : department
                    ? `${department} (${filteredEmployees.length} employees)`
                    : `All Departments (${filteredEmployees.length} employees)`} · Year {year}
              </p>
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="font-semibold text-slate-400">Year:</span>
              <input
                type="number"
                className="input text-xs w-20 py-1"
                value={year}
                onChange={(e) => {
                  const y = Number(e.target.value)
                  setYear(y)
                  setParams({ year: String(y), department, employeeId: String(selectedEmpId) })
                }}
              />
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="font-semibold text-slate-400">Dept:</span>
              <select
                className="input text-xs py-1 w-44"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value)
                  setSelectedEmpId('all')
                  setParams({ year: String(year), department: e.target.value, employeeId: 'all' })
                }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="font-semibold text-slate-400">Employee:</span>
              <select
                className="input text-xs py-1 w-48"
                value={selectedEmpId}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value)
                  setSelectedEmpId(val)
                  setParams({ year: String(year), department, employeeId: String(val) })
                }}
              >
                <option value="all">Whole Department ({filteredEmployees.length})</option>
                {employees
                  .filter((e) => !department || (e.department.trim() || 'General') === department)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            </label>

            <button
              className="btn text-xs py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30"
              onClick={handlePrintPdf}
              disabled={generating || filteredEmployees.length === 0}
            >
              {generating ? '⏳ Generating PDF…' : '📄 Generate PDF (13 × 8.5)'}
            </button>
          </div>
        </div>
      </header>

      <style>{`
        @page {
          size: 13in 8.5in;
          margin: 0;
        }
      `}</style>

      {/* ================= PRINT CANVAS CONTAINER (13 × 8.5 INCHES LANDSCAPE) ================= */}
      <div className="w-full py-8 px-2 flex justify-center overflow-auto print:p-0 print:overflow-visible print:block">
        <div className="cs-form-printable flex flex-col gap-10 items-center print:block" style={{ width: '13in' }}>
          {filteredEmployees.length === 0 ? (
            <div className="card text-center p-8 text-slate-400">
              No active employees found matching the selected filters.
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <SingleEmployeeLeaveCard
                key={emp.id}
                employee={emp}
                year={year}
                balances={balances}
                leaves={leaves}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
