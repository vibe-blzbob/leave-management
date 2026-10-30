import { useState } from 'react'
import { api, errMsg, formData, Modal, useLoad } from '../../lib'
import type { LeaveType } from '../../../../shared/types'

export function LeaveTypesModule(): React.JSX.Element {
  const [types, reloadTypes] = useLoad(api.listTypes, [] as LeaveType[])
  const [editing, setEditing] = useState<Partial<LeaveType> | null>(null)
  const [err, setErr] = useState('')

  const close = (): void => {
    setEditing(null)
    setErr('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Leave Types</h2>
          <p className="text-sm text-slate-400">
            Leave year is Jan–Dec. Accrual is credited on the 1st of each month. Carry-over applies on Jan 1.
          </p>
        </div>
        <button className="btn" onClick={() => setEditing({ accrues_monthly: 1, prorate_new_hires: 1, carry_over_cap: 0 })}>
          + Add type
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Days / year</th>
              <th>Monthly accrual</th>
              <th>Carry-over cap</th>
              <th>Pro-rate new hires</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td className="font-medium text-white">{t.name}</td>
                <td>{t.annual_days}</td>
                <td>{t.accrues_monthly ? `Yes (${+(t.annual_days / 12).toFixed(2)}/mo)` : 'No (all on Jan 1)'}</td>
                <td>{t.carry_over_cap}</td>
                <td>{t.prorate_new_hires ? 'Yes' : 'No'}</td>
                <td className="space-x-1 text-right">
                  <button className="btn btn-ghost" onClick={() => setEditing(t)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() =>
                      confirm(`Delete "${t.name}"?`) && api.deleteType(t.id!).then(reloadTypes, (e) => alert(errMsg(e)))
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No leave types configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit leave type' : 'Add leave type'} onClose={close}>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const f = formData(e)
              api
                .saveType({
                  id: editing.id,
                  name: f.name,
                  annual_days: +f.annual_days,
                  carry_over_cap: +f.carry_over_cap,
                  accrues_monthly: f.accrues_monthly ? 1 : 0,
                  prorate_new_hires: f.prorate_new_hires ? 1 : 0
                })
                .then(() => {
                  close()
                  reloadTypes()
                }, (x) => setErr(errMsg(x)))
            }}
          >
            <label className="label">
              Name
              <input className="input" name="name" defaultValue={editing.name} required autoFocus />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="label">
                Days per year
                <input className="input" type="number" step="0.5" min="0" name="annual_days" defaultValue={editing.annual_days} required />
              </label>
              <label className="label">
                Carry-over cap (days)
                <input className="input" type="number" step="0.5" min="0" name="carry_over_cap" defaultValue={editing.carry_over_cap} required />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="accrues_monthly" defaultChecked={!!editing.accrues_monthly} /> Accrue monthly
              (otherwise the full amount is credited on Jan 1)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="prorate_new_hires" defaultChecked={!!editing.prorate_new_hires} /> Pro-rate by
              hire month in the first year
            </label>
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={close}>
                Cancel
              </button>
              <button className="btn">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
