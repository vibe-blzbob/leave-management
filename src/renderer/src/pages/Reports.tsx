import { useEffect, useState } from 'react'
import { api, DateInput, downloadCsv, errMsg, getCachedBalances, invalidateBalancesCache, Modal, num, prefetchReports, useLoad } from '../lib'
import type { Balance, Employee, LeaveRow, LeaveType } from '../../../shared/types'

export default function Reports(): React.JSX.Element {
  const [tab, setTab] = useState<'balances' | 'history'>('balances')
  const [employees] = useLoad(api.listEmployees, [] as Employee[])
  const [types] = useLoad(api.listTypes, [] as LeaveType[])
  const [leaves] = useLoad(api.listLeaves, [] as LeaveRow[])
  const [year, setYear] = useState(new Date().getFullYear())
  const [balances, setBalances] = useState<Balance[]>(() => getCachedBalances<Balance>(year) ?? [])
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null)
  const [f, setF] = useState({ from: `${year}-01-01`, to: `${year}-12-31`, employee: '', department: '', leaveTypeId: '' })
  useEffect(() => {
    prefetchReports(year).then(setBalances)
  }, [year])

  const name = (id: number): string => employees.find((e) => e.id === id)?.name ?? ''
  const typeName = (id: number): string => types.find((t) => t.id === id)?.name ?? ''
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort()
  const deptEmployees = employees
    .filter((e) => !f.department || e.department === f.department)
    .sort((a, b) => a.name.localeCompare(b.name))
  const activeTypes = types.filter((t) => !f.leaveTypeId || String(t.id) === f.leaveTypeId)

  const balRows = balances
    .filter((b) => {
      const emp = employees.find((e) => e.id === b.employee_id)
      if (!emp?.active) return false
      if (f.employee && b.employee_id !== +f.employee) return false
      if (f.department && emp.department !== f.department) return false
      if (f.leaveTypeId && b.leave_type_id !== +f.leaveTypeId) return false
      return true
    })
    .sort((a, b) => name(a.employee_id).localeCompare(name(b.employee_id)))
  const histRows = leaves.filter(
    (l) =>
      l.end_date >= f.from &&
      l.start_date <= f.to &&
      (!f.employee || l.employee_id === +f.employee) &&
      (!f.department || l.department === f.department) &&
      (!f.leaveTypeId || l.leave_type_id === +f.leaveTypeId)
  )

  const selectedType = types.find((t) => String(t.id) === f.leaveTypeId)
  const typeSuffix = selectedType ? `-${selectedType.name.toLowerCase()}` : ''

  const csv = (): void =>
    tab === 'balances'
      ? downloadCsv(`leave-balances-${year}${typeSuffix}.csv`, [
        ['Employee', 'Leave type', 'Carry-over', 'Accrued', 'Used', 'Pending', 'Remaining'],
        ...balRows.map((b) => [name(b.employee_id), typeName(b.leave_type_id), num(b.carry), num(b.accrued), num(b.used), num(b.pending), num(b.remaining)])
      ])
      : downloadCsv(`leave-history-${f.from}-to-${f.to}${typeSuffix}.csv`, [
        ['Employee', 'Department', 'Leave type', 'Start', 'End', 'Days', 'Status', 'Reason'],
        ...histRows.map((l) => [l.employee_name, l.department, l.type_name, l.start_date, l.end_date, l.days, l.status, l.reason])
      ])

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <h1>Reports</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={csv}>
            Export CSV
          </button>
          <button className="btn" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="flex gap-1" role="tablist">
          {(['balances', 'history'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${tab === t ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t === 'balances' ? 'Balance summary' : 'Leave history'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-3">
          {tab === 'balances' ? (
            <label className="label">
              Year
              <input className="input w-24" type="number" value={year} onChange={(e) => setYear(+e.target.value)} />
            </label>
          ) : (
            <>
              <label className="label">
                From
                <DateInput value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
              </label>
              <label className="label">
                To
                <DateInput value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
              </label>
            </>
          )}
          <label className="label">
            Leave type
            <select
              className="input min-w-36"
              value={f.leaveTypeId}
              onChange={(e) => setF({ ...f, leaveTypeId: e.target.value })}
            >
              <option value="">All leave types</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Department
            <select
              className="input min-w-44"
              value={f.department}
              onChange={(e) => {
                const dept = e.target.value
                const selectedEmp = employees.find((emp) => String(emp.id) === f.employee)
                const shouldClear = dept && selectedEmp && selectedEmp.department !== dept
                setF({ ...f, department: dept, employee: shouldClear ? '' : f.employee })
              }}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Employee
            <EmployeeFilter
              employees={deptEmployees}
              value={f.employee}
              onChange={(id) => setF({ ...f, employee: id })}
            />
          </label>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="hidden p-0 print:block">
          {tab === 'balances' ? `Leave balance summary — ${year}` : `Leave history — ${f.from} to ${f.to}`}
        </h2>
        {tab === 'balances'
          ? activeTypes.map((t) => {
            const rows = balRows.filter((b) => b.leave_type_id === t.id)
            return (
              <div key={t.id} className="card overflow-x-auto p-0">
                <div className="border-b border-slate-800 px-4 py-3 bg-slate-900/40 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">{t.name} Leave</h3>
                  <span className="text-xs text-slate-400">{rows.length} employee{rows.length === 1 ? '' : 's'}</span>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Carry-over</th>
                      <th>Accrued</th>
                      <th>Used</th>
                      <th>Pending</th>
                      <th>Remaining</th>
                      <th className="no-print" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400">
                          No {t.name.toLowerCase()} balance records found
                        </td>
                      </tr>
                    ) : (
                      rows.map((b) => (
                        <tr key={b.employee_id}>
                          <td className="font-medium">{name(b.employee_id)}</td>
                          <td>{num(b.carry)}</td>
                          <td>{num(b.accrued)}</td>
                          <td>{num(b.used)}</td>
                          <td>{num(b.pending)}</td>
                          <td className="font-semibold">{num(b.remaining)}</td>
                          <td className="text-right no-print">
                            <button
                              className="btn btn-ghost text-xs"
                              onClick={() => setEditingEmp(employees.find((e) => e.id === b.employee_id) ?? null)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )
          })
          : activeTypes.map((t) => {
            const rows = histRows.filter((l) => l.leave_type_id === t.id)
            return (
              <div key={t.id} className="card overflow-x-auto p-0">
                <div className="border-b border-slate-800 px-4 py-3 bg-slate-900/40 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">{t.name} Leave</h3>
                  <span className="text-xs text-slate-400">{rows.length} record{rows.length === 1 ? '' : 's'}</span>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Status</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          No {t.name.toLowerCase()} leave history found
                        </td>
                      </tr>
                    ) : (
                      rows.map((l) => (
                        <tr key={l.id}>
                          <td className="font-medium">{l.employee_name}</td>
                          <td>{l.department}</td>
                          <td>
                            {l.start_date} → {l.end_date}
                          </td>
                          <td>{l.days}</td>
                          <td className="capitalize">{l.status}</td>
                          <td>{l.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )
          })}
      </div>

      {editingEmp && (
        <BalanceModal
          employee={editingEmp}
          types={types}
          onClose={() => setEditingEmp(null)}
          onSaved={() => {
            setEditingEmp(null)
            invalidateBalancesCache()
            prefetchReports(year).then(setBalances)
          }}
        />
      )}
    </div>
  )
}

function EmployeeFilter({
  employees,
  value,
  onChange
}: {
  employees: Employee[]
  value: string
  onChange: (id: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = employees.find((e) => String(e.id) === value)
  const query = search.trim().toLowerCase()
  const filtered = employees.filter((e) => !query || e.name.toLowerCase().includes(query))

  return (
    <div className="relative min-w-48">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="input flex items-center justify-between text-left cursor-pointer"
      >
        <span className={selected ? 'text-white truncate' : 'text-slate-400'}>
          {selected ? selected.name : 'All employees'}
        </span>
        <span className="ml-2 text-xs text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => {
              setOpen(false)
              setSearch('')
            }}
          />
          <div className="absolute z-30 right-0 mt-1 max-h-64 w-64 rounded-lg border border-slate-700 bg-slate-900 shadow-2xl flex flex-col p-2 gap-1.5">
            <input
              className="input text-xs py-1"
              placeholder="Search employee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="overflow-y-auto max-h-48 divide-y divide-slate-800">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                  setSearch('')
                }}
                className={`w-full px-2.5 py-1.5 text-left text-sm hover:bg-slate-800 rounded transition cursor-pointer ${!value ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-slate-300'}`}
              >
                All employees
              </button>
              {filtered.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    onChange(String(e.id))
                    setOpen(false)
                    setSearch('')
                  }}
                  className={`w-full px-2.5 py-1.5 text-left text-sm hover:bg-slate-800 flex justify-between items-center rounded transition cursor-pointer ${String(e.id) === value ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-slate-200'}`}
                >
                  <span className="truncate">{e.name}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-2 text-center text-xs text-slate-500">No employees found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function BalanceModal({
  employee,
  types,
  onClose,
  onSaved
}: {
  employee: Employee
  types: LeaveType[]
  onClose: () => void
  onSaved: () => void
}): React.JSX.Element {
  const [bals, setBals] = useState<Record<number, number>>({})
  const [err, setErr] = useState('')

  useEffect(() => {
    if (employee.id) {
      api.getStartingBalances(employee.id).then(setBals)
    }
  }, [employee.id])

  return (
    <Modal title={`Edit Balances — ${employee.name}`} onClose={onClose} maxWidth="max-w-xl">
      <form
        className="grid gap-3"
        onSubmit={(ev) => {
          ev.preventDefault()
          if (!employee.id) return
          api
            .saveStartingBalances(employee.id, bals)
            .then(onSaved, (x) => setErr(errMsg(x)))
        }}
      >
        <p className="text-xs text-slate-400">
          Set starting leave credits. Balances update immediately.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {types.map((t) => (
            <label key={t.id} className="label">
              <span>{t.name} (Days)</span>
              <input
                type="number"
                step="0.5"
                min="0"
                className="input"
                value={bals[t.id!] ?? 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  setBals((prev) => ({ ...prev, [t.id!]: val }))
                }}
              />
            </label>
          ))}
        </div>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn">Save</button>
        </div>
      </form>
    </Modal>
  )
}

