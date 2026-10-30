import { useState } from 'react'
import { api, errMsg, formData, Modal, useLoad } from '../../lib'
import type { Signatory } from '../../../../shared/types'

const roleLabels: Record<string, string> = {
  certifier: '7.A HR / Certifying Officer',
  supervisor: '7.B Immediate Supervisor',
  approver: '7.C Approving Authority / Governor',
  other: 'Other'
}

export function SignatoriesModule(): React.JSX.Element {
  const [signatories, reloadSig] = useLoad(api.listSignatories, [] as Signatory[])
  const [editingSig, setEditingSig] = useState<Partial<Signatory> | null>(null)
  const [err, setErr] = useState('')

  const closeSig = (): void => {
    setEditingSig(null)
    setErr('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Application Signatories</h2>
          <p className="text-sm text-slate-400">
            Authorized signatories for CS Form No. 6 (HR Certification, Supervisor Recommendation, and Final Approval).
          </p>
        </div>
        <button className="btn" onClick={() => setEditingSig({ role: 'supervisor' })}>
          + Add signatory
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Office / Department</th>
              <th>CS Form 6 Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {signatories.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-white">{s.name || <span className="text-slate-500 italic">(Blank for manual signing)</span>}</td>
                <td>{s.position}</td>
                <td className="text-slate-300 text-xs">{s.office}</td>
                <td>
                  <span className="inline-block rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
                    {(s.role && roleLabels[s.role]) || s.role || 'Other'}
                  </span>
                </td>
                <td className="space-x-1 text-right">
                  <button className="btn btn-ghost" onClick={() => setEditingSig(s)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() =>
                      confirm(`Delete signatory "${s.name || s.position}"?`) && api.deleteSignatory(s.id!).then(reloadSig, (e) => alert(errMsg(e)))
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {signatories.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No signatories configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingSig && (
        <Modal title={editingSig.id ? 'Edit signatory' : 'Add signatory'} onClose={closeSig}>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const f = formData(e)
              api
                .saveSignatory({
                  id: editingSig.id,
                  name: (f.name ?? '').trim().toUpperCase(),
                  position: (f.position ?? '').trim(),
                  office: (f.office ?? '').trim(),
                  role: (f.role as Signatory['role']) || 'other'
                })
                .then(() => {
                  closeSig()
                  reloadSig()
                }, (x) => setErr(errMsg(x)))
            }}
          >
            <label className="label">
              Official Name
              <input className="input uppercase" name="name" placeholder="e.g. DATU TUCAO O. MASTURA, CPA" defaultValue={editingSig.name} autoFocus />
            </label>
            <label className="label">
              Position
              <input className="input" name="position" placeholder="e.g. Provincial Governor" defaultValue={editingSig.position} required />
            </label>
            <label className="label">
              Office / Department
              <input className="input" name="office" placeholder="e.g. Office of the Provincial Governor" defaultValue={editingSig.office} required />
            </label>
            <label className="label">
              Role in Application Form
              <select className="input" name="role" defaultValue={editingSig.role || 'supervisor'}>
                <option value="certifier">7.A HR / Certifying Officer (PHRMO)</option>
                <option value="supervisor">7.B Immediate Supervisor</option>
                <option value="approver">7.C Approving Authority / Governor</option>
                <option value="other">Other</option>
              </select>
            </label>
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={closeSig}>
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
