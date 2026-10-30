import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, Badge, DateRangeInput, errMsg, formatDate, formData, invalidateBalancesCache, Modal, useLoad } from '../lib'
import type { Employee, Leave as LeaveT, LeaveRow, LeaveType, Status } from '../../../shared/types'

const tabs = ['all', 'pending', 'approved', 'rejected', 'cancelled'] as const

export default function Leave(): React.JSX.Element {
  const [leaves, reload] = useLoad(api.listLeaves, [] as LeaveRow[])
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<(typeof tabs)[number]>('all')
  const [deptFilter, setDeptFilter] = useState('')
  const [menu, setMenu] = useState<{ id: number; top: number; right: number } | null>(null)
  const [deletingLeave, setDeletingLeave] = useState<LeaveRow | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = (): void => setMenu(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menu])

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, id: number): void => {
    e.stopPropagation()
    if (menu?.id === id) {
      setMenu(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const showAbove = spaceBelow < 190 && rect.top > 190

    setMenu({
      id,
      top: showAbove ? rect.top - 165 : rect.bottom + 6,
      right: Math.max(16, window.innerWidth - rect.right)
    })
  }
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<Partial<LeaveT> | null>(
    // Calendar drag-select lands here with ?start=&end=
    params.get('start') ? { start_date: params.get('start')!, end_date: params.get('end')! } : null
  )

  const departments = useMemo(
    () => [...new Set(leaves.map((l) => l.department.trim() || 'General').filter(Boolean))].sort(),
    [leaves]
  )

  const shown = leaves
    .filter((l) => tab === 'all' || l.status === tab)
    .filter((l) => !deptFilter || (l.department.trim() || 'General') === deptFilter)

  const act = (id: number, s: Status): void => {
    api.setLeaveStatus(id, s).then(() => {
      invalidateBalancesCache()
      reload()
    }, (e) => alert(errMsg(e)))
  }
  const handleDeleteLeave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!deletingLeave) return
    setSubmitting(true)
    try {
      await api.deleteLeave(deletingLeave.id, pin)
      setDeletingLeave(null)
      setPin('')
      setPinErr('')
      invalidateBalancesCache()
      reload()
    } catch (err) {
      setPinErr(errMsg(err))
    } finally {
      setSubmitting(false)
    }
  }
  const close = (): void => {
    setEditing(null)
    setParams({})
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Leave requests</h1>
        <button className="btn" onClick={() => setEditing({})}>
          + New leave
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${tab === t ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t}
              {t !== 'all' && <span className="ml-1.5 text-xs text-slate-500">{leaves.filter((l) => l.status === t).length}</span>}
            </button>
          ))}
        </div>
        <select
          className="input w-56 text-xs"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          aria-label="Filter leaves by department"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th className="py-3 pl-4 text-center">Employee</th>
              <th className="py-3 text-center">Type</th>
              <th className="py-3 text-center">Dates</th>
              <th className="py-3 text-center">Days</th>
              <th className="py-3 text-center">Reason</th>
              <th className="py-3 text-center">Status</th>
              <th className="py-3 pr-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {shown.map((l) => (
              <tr key={l.id} className="transition hover:bg-slate-800/40">
                <td className="py-3 pl-4">
                  <div className="font-semibold text-white leading-tight">{l.employee_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{l.department.trim() || 'General'}</div>
                </td>
                <td className="py-3 text-slate-200 font-medium">
                  {l.type_name}
                </td>
                <td className="py-3 text-slate-300">
                  <div className="font-medium text-xs leading-tight">
                    {l.start_date === l.end_date ? (
                      formatDate(l.start_date)
                    ) : (
                      <span>
                        {formatDate(l.start_date)} <span className="text-slate-500">→</span> {formatDate(l.end_date)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/60">
                    {l.days} {l.days === 1 ? 'day' : 'days'}
                  </span>
                </td>
                <td className="py-3 max-w-48 text-slate-400 text-xs">
                  <span className="truncate block" title={l.reason || 'No reason provided'}>
                    {l.reason || '—'}
                  </span>
                </td>
                <td className="py-3">
                  <Badge status={l.status} />
                </td>
                <td className="py-3 pr-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    {l.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => act(l.id, 'approved')}
                          title="Approve"
                          aria-label="Approve leave"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500 hover:text-white hover:border-emerald-500 cursor-pointer"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => act(l.id, 'rejected')}
                          title="Reject"
                          aria-label="Reject leave"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 transition hover:bg-rose-500 hover:text-white hover:border-rose-500 cursor-pointer"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={(e) => openMenu(e, l.id)}
                      title="More options"
                      aria-label="More options"
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition cursor-pointer ${
                        menu?.id === l.id
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                          : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No leave records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {menu && (() => {
        const l = leaves.find((x) => x.id === menu.id)
        if (!l) return null
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
            <div
              className="fixed z-50 min-w-44 rounded-xl border border-slate-800 bg-slate-900/95 py-1.5 shadow-2xl backdrop-blur-md"
              style={{ top: menu.top, right: menu.right }}
            >
              <Link
                to={`/leave/${l.id}/print`}
                onClick={() => setMenu(null)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
              >
                <span className="text-sm">🖨️</span>
                <span>Print CS Form No. 6</span>
              </Link>
              {(l.status === 'pending' || l.status === 'approved') && (
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null)
                    setEditing(l)
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
                >
                  <span className="text-sm">✏️</span>
                  <span>Edit</span>
                </button>
              )}
              {l.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null)
                    if (confirm(`Cancel ${l.employee_name}'s leave and restore ${l.days} day(s)?`)) {
                      act(l.id, 'cancelled')
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition text-left cursor-pointer"
                >
                  <span className="text-sm">🚫</span>
                  <span>Cancel Leave</span>
                </button>
              )}
              <div className="my-1 border-t border-slate-800" />
              <button
                type="button"
                onClick={() => {
                  setMenu(null)
                  setDeletingLeave(l)
                  setPin('')
                  setPinErr('')
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition text-left cursor-pointer"
              >
                <span className="text-sm">🗑️</span>
                <span>Delete</span>
              </button>
            </div>
          </>
        )
      })()}
      {editing && (
        <LeaveForm
          leave={editing}
          onClose={close}
          onSaved={() => {
            close()
            invalidateBalancesCache()
            reload()
          }}
        />
      )}
      {deletingLeave && (
        <Modal
          title="Delete Leave Request"
          maxWidth="max-w-sm"
          onClose={() => {
            setDeletingLeave(null)
            setPin('')
            setPinErr('')
          }}
        >
          <form onSubmit={handleDeleteLeave} className="space-y-4">
            <p className="text-xs text-slate-300">
              Enter PIN to permanently delete leave #{deletingLeave.id} for{' '}
              <span className="font-semibold text-white">{deletingLeave.employee_name}</span> ({deletingLeave.days} day(s)).
            </p>
            {pinErr && <div className="rounded bg-rose-500/10 p-2 text-xs text-rose-300">{pinErr}</div>}
            <div>
              <input
                type="password"
                autoFocus
                maxLength={10}
                placeholder="Enter PIN"
                className="input w-full text-center text-lg font-mono tracking-widest"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value)
                  setPinErr('')
                }}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => {
                  setDeletingLeave(null)
                  setPin('')
                  setPinErr('')
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-rose-600 hover:bg-rose-500 text-white text-xs"
                disabled={submitting}
              >
                {submitting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export function EmployeeSearchSelect({
  employees,
  defaultValue,
  onSelect
}: {
  employees: Employee[]
  defaultValue?: number
  onSelect?: (e: Employee) => void
}): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<number | undefined>(defaultValue)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const active = employees.filter((e) => e.active || e.id === defaultValue)
  const selected = active.find((e) => e.id === selectedId)
  const filtered = active.filter((e) =>
    `${e.name} ${e.department}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <input type="hidden" name="employee_id" value={selectedId ?? ''} required />
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="input flex items-center justify-between text-left"
      >
        <span className={selected ? 'text-white' : 'text-slate-500'}>
          {selected ? `${selected.name} · ${selected.department || 'General'}` : 'Select employee…'}
        </span>
        <span className="text-xs text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 mt-1 max-h-60 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-2xl flex flex-col p-2 gap-2">
            <input
              className="input text-xs py-1"
              placeholder="Search employee or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="overflow-y-auto max-h-48 divide-y divide-slate-800">
              {filtered.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(e.id)
                    setOpen(false)
                    setSearch('')
                    onSelect?.(e)
                  }}
                  className={`w-full px-2.5 py-1.5 text-left text-sm hover:bg-slate-800 flex justify-between items-center rounded transition ${e.id === selectedId ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-slate-200'}`}
                >
                  <span>{e.name}</span>
                  <span className="text-xs text-slate-400">{e.department || 'General'}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-2 py-3 text-xs text-slate-500 text-center">No matching employees</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function LeaveForm(props: {
  leave: Partial<LeaveT>
  onClose: () => void
  onSaved: () => void
}): React.JSX.Element {
  const l = props.leave
  const [employees] = useLoad(api.listEmployees, [] as Employee[])
  const [types] = useLoad(api.listTypes, [] as LeaveType[])
  const [err, setErr] = useState('')
  const [dept, setDept] = useState('')

  useEffect(() => {
    if (l.employee_id && employees.length && !dept) {
      const emp = employees.find((e) => e.id === l.employee_id)
      if (emp?.department) setDept(emp.department.trim() || 'General')
    }
  }, [l.employee_id, employees, dept])

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department.trim() || 'General').filter(Boolean))].sort(),
    [employees]
  )

  const deptEmployees = useMemo(
    () => (!dept ? employees : employees.filter((e) => (e.department.trim() || 'General') === dept)),
    [employees, dept]
  )

  return (
    <Modal title={l.id ? 'Edit leave' : 'New leave'} onClose={props.onClose}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const f = formData(e)
          if (!f.employee_id) {
            setErr('Please select an employee.')
            return
          }
          api
            .saveLeave({
              id: l.id,
              employee_id: +f.employee_id,
              leave_type_id: +f.leave_type_id,
              start_date: f.start_date,
              end_date: f.end_date,
              reason: f.reason,
              status: f.approve ? 'approved' : 'pending'
            })
            .then(props.onSaved, (x) => setErr(errMsg(x)))
        }}
      >
        <label className="label">
          Department
          <select
            className="input"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Employee
          <EmployeeSearchSelect
            key={dept}
            employees={deptEmployees}
            defaultValue={l.employee_id}
            onSelect={(e) => {
              if (e && !dept) setDept(e.department.trim() || 'General')
            }}
          />
        </label>
        <label className="label">
          Leave type
          <select key={types.length} className="input" name="leave_type_id" defaultValue={l.leave_type_id} required>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Leave Dates
          <DateRangeInput defaultStart={l.start_date} defaultEnd={l.end_date} />
        </label>
        <label className="label">
          Reason
          <textarea className="input" name="reason" rows={2} defaultValue={l.reason} />
        </label>
        {!l.id && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="approve" /> Approve immediately
          </label>
        )}
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {l.id ? (
            <Link
              to={`/leave/${l.id}/print`}
              className="btn btn-ghost text-xs flex items-center gap-1.5"
            >
              🖨️ Print CS Form 6
            </Link>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={props.onClose}>
              Close
            </button>
            <button className="btn">Save</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
