import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, Badge, num, useLoad } from '../lib'
import { EmployeeForm } from './Employees'
import { BalanceModal } from './Reports'
import type { Balance, LeaveRow, LeaveType } from '../../../shared/types'

export default function EmployeeDetail(): React.JSX.Element {
  const id = Number(useParams().id)
  const [employees, reload] = useLoad(api.listEmployees, [])
  const [types] = useLoad(api.listTypes, [] as LeaveType[])
  const [leaves] = useLoad(api.listLeaves, [] as LeaveRow[])
  const [year, setYear] = useState(new Date().getFullYear())
  const [balances, setBalances] = useState<Balance[]>([])
  const [editing, setEditing] = useState(false)
  const [editingBal, setEditingBal] = useState(false)
  const e = employees.find((x) => x.id === id)

  useEffect(() => {
    api.balances(year).then((b) => setBalances(b.filter((x) => x.employee_id === id)))
  }, [year, id, employees])

  if (!e) return <p className="text-slate-500">Loading…</p>
  const mine = leaves.filter((l) => l.employee_id === id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1>{e.name}</h1>
          <p className="text-sm text-slate-400">
            {[e.position, e.department, `Hired ${e.hire_date}`].filter(Boolean).join(' · ')}
            {!e.active && ' · Inactive'}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2>Balances</h2>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost text-xs" onClick={() => setEditingBal(true)}>
              Edit balances
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Year
              <input className="input w-24" type="number" value={year} onChange={(x) => setYear(+x.target.value)} />
            </label>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Carry-over</th>
              <th>Accrued</th>
              <th>Used</th>
              <th>Pending</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => {
              const b = balances.find((x) => x.leave_type_id === t.id)
              return b ? (
                <tr key={t.id}>
                  <td className="font-medium text-white">{t.name}</td>
                  <td>{num(b.carry)}</td>
                  <td>{num(b.accrued)}</td>
                  <td>{num(b.used)}</td>
                  <td>{num(b.pending)}</td>
                  <td className="font-semibold text-indigo-300">{num(b.remaining)}</td>
                </tr>
              ) : null
            })}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="mb-3">Leave history</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((l) => (
              <tr key={l.id}>
                <td>{l.type_name}</td>
                <td>
                  {l.start_date} → {l.end_date}
                </td>
                <td>{l.days}</td>
                <td>
                  <Badge status={l.status} />
                </td>
                <td className="text-slate-400">{l.reason}</td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No leave yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {editing && (
        <EmployeeForm
          employee={e}
          types={types}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            reload()
            api.balances(year).then((b) => setBalances(b.filter((x) => x.employee_id === id)))
          }}
        />
      )}

      {editingBal && (
        <BalanceModal
          employee={e}
          types={types}
          onClose={() => setEditingBal(false)}
          onSaved={() => {
            setEditingBal(false)
            api.balances(year).then((b) => setBalances(b.filter((x) => x.employee_id === id)))
          }}
        />
      )}
    </div>
  )
}
