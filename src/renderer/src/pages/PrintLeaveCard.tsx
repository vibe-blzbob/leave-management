import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, errMsg, useLoad } from '../lib'
import type { Balance, Employee, LeaveRow } from '../../../shared/types'

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
    <div className="leave-card-sheet bg-white text-black p-4 font-sans text-[9px] leading-tight select-text">
      {/* Header */}
      <div className="text-center space-y-0.5 mb-2">
        <div className="text-[11px] font-bold tracking-wider uppercase text-slate-800">
          PROVINCE OF MAGUINDANAO DEL NORTE
        </div>
        <div className="text-[11px] font-bold tracking-wider uppercase text-slate-900">
          {deptUpper}
        </div>
        <div className="inline-block border-b-2 border-black font-extrabold text-[12px] tracking-widest uppercase pt-1 pb-0.5">
          EMPLOYEE&apos;S LEAVE CARD
        </div>
      </div>

      {/* Employee Meta */}
      <div className="flex justify-between items-end text-[10px] font-semibold mb-1 px-1">
        <div className="space-y-0.5">
          <div>
            NAME: <span className="font-bold uppercase text-[11px]">{employee.name}</span>
          </div>
          <div>
            POSITION: <span className="font-semibold text-slate-800">{employee.position || '—'}</span>
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <div>
            SALARY: <span className="border-b border-black inline-block w-28 text-center font-normal">_______</span>
          </div>
        </div>
      </div>

      {/* CSC Grid Table */}
      <table className="w-full border-collapse border-2 border-black text-[8.5px] text-center">
        <thead>
          <tr className="border-b border-black font-bold">
            <th rowSpan={4} className="border border-black p-0.5 w-6 bg-slate-100">
              #
            </th>
            <th colSpan={8} className="border border-black p-1 bg-slate-50 font-extrabold text-[9.5px]">
              VACATION LEAVE
            </th>
            <th colSpan={8} className="border border-black p-1 bg-slate-50 font-extrabold text-[9.5px]">
              SICK LEAVE
            </th>
            <th rowSpan={4} className="border border-black p-1 w-44 bg-slate-100">
              DATE &amp; ACTION TAKEN ON APPLICATION FOR LEAVE
            </th>
          </tr>
          <tr className="border-b border-black font-semibold">
            <th rowSpan={3} className="border border-black p-0.5 w-32">
              PARTICULARS
            </th>
            <th colSpan={3} className="border border-black p-0.5">
              PERIOD
            </th>
            <th rowSpan={3} className="border border-black p-0.5 w-12">
              EARNED
            </th>
            <th rowSpan={2} className="border border-black p-0.5 w-14">
              ABSENCE<br />UNDERTIME
            </th>
            <th rowSpan={3} className="border border-black p-0.5 w-14">
              BALANCE
            </th>
            <th rowSpan={2} className="border border-black p-0.5 w-14">
              ABSENCE<br />UNDERTIME
            </th>
            <th rowSpan={3} className="border border-black p-0.5 w-32">
              PARTICULARS
            </th>
            <th colSpan={3} className="border border-black p-0.5">
              PERIOD
            </th>
            <th rowSpan={3} className="border border-black p-0.5 w-12">
              EARNED
            </th>
            <th rowSpan={2} className="border border-black p-0.5 w-14">
              ABSENCE<br />UNDERTIME
            </th>
            <th rowSpan={3} className="border border-black p-0.5 w-14">
              BALANCE
            </th>
            <th rowSpan={2} className="border border-black p-0.5 w-14">
              ABSENCE<br />UNDERTIME
            </th>
          </tr>
          <tr className="border-b border-black font-bold text-[8px]">
            <th className="border border-black p-0.5 w-5">D</th>
            <th className="border border-black p-0.5 w-5">H</th>
            <th className="border border-black p-0.5 w-5">M</th>
            <th className="border border-black p-0.5 w-5">D</th>
            <th className="border border-black p-0.5 w-5">H</th>
            <th className="border border-black p-0.5 w-5">M</th>
          </tr>
          <tr className="border-b-2 border-black font-semibold text-[8px]">
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
            <tr key={r.num} className="border-b border-black h-[18px]">
              <td className="border border-black p-0.5 font-semibold bg-slate-50/50">{r.num}</td>
              <td className="border border-black p-0.5 text-left px-1 truncate max-w-36">{r.vlParticulars}</td>
              <td className="border border-black p-0.5">{r.vlD}</td>
              <td className="border border-black p-0.5">{r.vlH}</td>
              <td className="border border-black p-0.5">{r.vlM}</td>
              <td className="border border-black p-0.5 font-medium">{r.vlEarned}</td>
              <td className="border border-black p-0.5 font-medium">{r.vlAbsencePay}</td>
              <td className="border border-black p-0.5 font-bold bg-slate-50/30">{r.vlBalance}</td>
              <td className="border border-black p-0.5">{r.vlAbsenceNoPay}</td>
              <td className="border border-black p-0.5 text-left px-1 truncate max-w-36">{r.slParticulars}</td>
              <td className="border border-black p-0.5">{r.slD}</td>
              <td className="border border-black p-0.5">{r.slH}</td>
              <td className="border border-black p-0.5">{r.slM}</td>
              <td className="border border-black p-0.5 font-medium">{r.slEarned}</td>
              <td className="border border-black p-0.5 font-medium">{r.slAbsencePay}</td>
              <td className="border border-black p-0.5 font-bold bg-slate-50/30">{r.slBalance}</td>
              <td className="border border-black p-0.5">{r.slAbsenceNoPay}</td>
              <td className="border border-black p-0.5 text-left px-1 text-[8px] truncate max-w-44">{r.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [exporting, setExporting] = useState<boolean>(false)

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
    setExporting(true)
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
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in !important;
            margin: 0.25in !important;
          }
          html, body, #root, main {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .leave-card-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            break-after: page !important;
            page-break-after: always !important;
          }
          .leave-card-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }
        }
      `}</style>
      {/* Top action toolbar (hidden on print) */}
      <header className="no-print sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-6 py-3 backdrop-blur shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost text-xs flex items-center gap-1.5"
          >
            ← Back
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <span>📑 Employee&apos;s Leave Card</span>
            <span className="text-xs font-normal text-indigo-300">({filteredEmployees.length} cards)</span>
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-slate-300">
            Year:
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

          <label className="flex items-center gap-1.5 text-slate-300">
            Department:
            <select
              className="input text-xs py-1 w-48"
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

          <label className="flex items-center gap-1.5 text-slate-300">
            Employee:
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
        </div>

        {/* Print Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn btn-ghost text-xs flex items-center gap-1.5"
          >
            🖨️ Browser Print
          </button>
          <button
            onClick={handlePrintPdf}
            disabled={exporting || filteredEmployees.length === 0}
            className="btn text-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {exporting ? 'Generating PDF…' : '📄 Export Folio PDF'}
          </button>
        </div>
      </header>

      {/* Printable Sheet View */}
      <main className="p-4 flex flex-col items-center">
        {filteredEmployees.length === 0 ? (
          <div className="card text-center p-8 mt-12 max-w-md text-slate-400">
            No active employees found matching the selected filters.
          </div>
        ) : (
          <div className="w-full max-w-[13in] space-y-6">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="leave-card-page shadow-2xl rounded-sm border border-slate-300 bg-white"
                style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
              >
                <SingleEmployeeLeaveCard
                  employee={emp}
                  year={year}
                  balances={balances}
                  leaves={leaves}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
