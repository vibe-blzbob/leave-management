import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, DateInput, errMsg, formData, Modal, num, useLoad } from '../lib'
import type { Balance, Employee, LeaveType } from '../../../shared/types'

const DEFAULT_DEPTS = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations'
]

export default function Employees(): React.JSX.Element {
  const [employees, reload] = useLoad(api.listEmployees, [] as Employee[])
  const [types] = useLoad(api.listTypes, [] as LeaveType[])
  const [balances, reloadBal] = useLoad(
    () => api.balances(new Date().getFullYear()),
    [] as Balance[]
  )
  const [editing, setEditing] = useState<Partial<Employee> | null>(null)
  const [deptFilter, setDeptFilter] = useState('all')
  const [q, setQ] = useState('')

  // O(N) single-pass department counts
  const deptCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of employees) {
      const dept = e.department.trim() || 'General'
      counts.set(dept, (counts.get(dept) ?? 0) + 1)
    }
    return counts
  }, [employees])

  const allDepts = useMemo(() => Array.from(deptCounts.keys()).sort(), [deptCounts])

  // Filtered employees memoized to prevent recomputing on unrelated state changes
  const filteredEmployees = useMemo(() => {
    const query = q.trim().toLowerCase()
    return employees.filter((e) => {
      const dept = e.department.trim() || 'General'
      const matchesDept = deptFilter === 'all' || dept === deptFilter
      const matchesSearch =
        !query || `${e.name} ${e.position} ${e.department}`.toLowerCase().includes(query)
      return matchesDept && matchesSearch
    })
  }, [employees, deptFilter, q])

  // Group filtered employees by department in a single pass
  const groupedByDept = useMemo(() => {
    const groups = new Map<string, Employee[]>()
    for (const e of filteredEmployees) {
      const dept = e.department.trim() || 'General'
      const list = groups.get(dept)
      if (list) {
        list.push(e)
      } else {
        groups.set(dept, [e])
      }
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredEmployees])

  // O(1) balance lookup map indexed by `employeeId:leaveTypeId`
  const balanceMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of balances) {
      map.set(`${b.employee_id}:${b.leave_type_id}`, b.remaining)
    }
    return map
  }, [balances])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Employees</h1>
        <div className="flex flex-wrap gap-2">
          <select
            className="input w-44"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Department classification"
          >
            <option value="all">All Departments ({employees.length})</option>
            {allDepts.map((d) => (
              <option key={d} value={d}>
                {d} ({deptCounts.get(d) ?? 0})
              </option>
            ))}
          </select>
          <input
            className="input w-52"
            placeholder="Search…"
            aria-label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" onClick={() => setEditing({ active: 1 })}>
            + Add employee
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-slate-900 shadow-[1px_0_0_0_rgba(51,65,85,0.5)]">Name</th>
              <th>Position</th>
              <th>Department</th>
              <th>Hired</th>
              {types.map((t) => (
                <th key={t.id} title="Remaining (accrued − used) this year">
                  {t.name}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {groupedByDept.map(([dept, emps]) => (
              <Fragment key={dept}>
                <tr className="bg-slate-800/80 font-semibold text-slate-300">
                  <td colSpan={5 + types.length} className="px-3 py-2 sticky left-0">
                    <div className="flex items-center justify-between sticky left-3 max-w-md">
                      <span className="text-indigo-300">{dept}</span>
                      <span className="text-xs font-normal text-slate-400">
                        {emps.length} employee{emps.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </td>
                </tr>
                {emps.map((e) => (
                  <tr key={e.id} className={e.active ? '' : 'opacity-50'}>
                    <td className="sticky left-0 z-10 bg-slate-900/95 shadow-[1px_0_0_0_rgba(51,65,85,0.5)]">
                      <Link
                        to={`/employees/${e.id}`}
                        className="font-medium text-white hover:text-indigo-300"
                      >
                        {e.name}
                      </Link>
                      {!e.active && <span className="ml-2 text-xs text-slate-500">inactive</span>}
                    </td>
                    <td>{e.position}</td>
                    <td>{e.department}</td>
                    <td>{e.hire_date}</td>
                    {types.map((t) => {
                      const rem = t.id ? balanceMap.get(`${e.id}:${t.id}`) : undefined
                      return <td key={t.id}>{rem !== undefined ? num(rem) : '–'}</td>
                    })}
                    <td className="text-right">
                      <button className="btn btn-ghost" onClick={() => setEditing(e)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={5 + types.length} className="py-8 text-center text-slate-500">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EmployeeForm
          employee={editing}
          departments={allDepts}
          types={types}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
            reloadBal()
          }}
        />
      )}
    </div>
  )
}

export function EmployeeForm(props: {
  employee: Partial<Employee>
  departments?: string[]
  types?: LeaveType[]
  onClose: () => void
  onSaved: () => void
}): React.JSX.Element {
  const e = props.employee
  const [err, setErr] = useState('')
  const [types, setTypes] = useState<LeaveType[]>(props.types ?? [])
  const [startBalances, setStartBalances] = useState<Record<number, number>>({})
  const [isNewDept, setIsNewDept] = useState(false)

  // Load types if not provided via props
  useEffect(() => {
    if (!props.types) {
      api.listTypes().then(setTypes)
    }
  }, [props.types])

  useEffect(() => {
    if (e.id) {
      api.getStartingBalances(e.id).then(setStartBalances)
    }
  }, [e.id])

  const deptList = useMemo(
    () =>
      Array.from(
        new Set(
          [...(props.departments || []), ...DEFAULT_DEPTS, e.department].filter(Boolean) as string[]
        )
      ).sort(),
    [props.departments, e.department]
  )

  return (
    <Modal title={e.id ? 'Edit employee' : 'Add employee'} onClose={props.onClose} maxWidth="max-w-lg">
      <form
        className="grid gap-3"
        onSubmit={(ev) => {
          ev.preventDefault()
          const f = formData(ev)
          const startingBalances: Record<number, number> = {}
          for (const t of types) {
            if (t.id) {
              startingBalances[t.id] = parseFloat(f[`start_bal_${t.id}`] || '0') || 0
            }
          }

          const employeeData: Employee = {
            id: e.id,
            name: (f.name ?? '').trim().toUpperCase(),
            position: (f.position ?? '').trim(),
            department: (f.department ?? '').trim() || 'General',
            hire_date: f.hire_date ?? '',
            active: f.active ? 1 : 0
          }

          api
            .saveEmployee(employeeData, startingBalances)
            .then(props.onSaved, (x) => setErr(errMsg(x)))
        }}
      >
        <label className="label">
          Name
          <input className="input" name="name" defaultValue={e.name} required autoFocus />
        </label>
        <label className="label">
          Position
          <input className="input" name="position" defaultValue={e.position} />
        </label>
        <label className="label">
          <div className="flex items-center justify-between">
            <span>Department</span>
            {isNewDept ? (
              <button
                type="button"
                onClick={() => setIsNewDept(false)}
                className="text-xs text-indigo-400 hover:underline"
              >
                Choose from list
              </button>
            ) : null}
          </div>
          {isNewDept ? (
            <input
              className="input"
              name="department"
              placeholder="Enter department name"
              required
              autoFocus
            />
          ) : (
            <select
              className="input"
              name="department"
              defaultValue={e.department || deptList[0] || 'General'}
              onChange={(ev) => {
                if (ev.target.value === '__NEW__') {
                  setIsNewDept(true)
                }
              }}
            >
              {deptList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value="__NEW__">+ Add new department…</option>
            </select>
          )}
        </label>
        <label className="label">
          Hire date
          <DateInput name="hire_date" defaultValue={e.hire_date} required />
        </label>
        {types.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              {e.id ? 'Starting Leave Balances (Days)' : 'Initial Leave Balances (Days)'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {types.map((t) => (
                <label key={t.id} className="label">
                  <span className="truncate">{t.name}</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="input text-xs py-1"
                    name={`start_bal_${t.id}`}
                    value={startBalances[t.id!] ?? 0}
                    onChange={(ev) => {
                      const val = parseFloat(ev.target.value) || 0
                      setStartBalances((prev) => ({ ...prev, [t.id!]: val }))
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={!!e.active} /> Active
        </label>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={props.onClose}>
            Cancel
          </button>
          <button className="btn">Save</button>
        </div>
      </form>
    </Modal>
  )
}
