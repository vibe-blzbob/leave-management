import { useState } from 'react'
import { api, downloadCsv, errMsg, Modal, useLoad } from '../lib'
import type { AuditLog } from '../../../shared/types'

export default function Logs(): React.JSX.Element {
  const [logs, reload] = useLoad(api.listLogs, [] as AuditLog[])
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('all')

  // PIN modal state
  const [pinModal, setPinModal] = useState<{ open: boolean; targetId?: number } | null>(null)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const actions = Array.from(new Set(logs.map((l) => l.action))).sort()

  const filtered = logs.filter((l) => {
    const matchesAction = filterAction === 'all' || l.action === filterAction
    const matchesSearch = `${l.action} ${l.details}`.toLowerCase().includes(search.toLowerCase())
    return matchesAction && matchesSearch
  })

  const exportCsv = (): void => {
    downloadCsv(`activity-logs-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['ID', 'Timestamp', 'Action', 'Details'],
      ...filtered.map((l) => [l.id, l.created_at, l.action, l.details])
    ])
  }

  const handleDelete = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (pin !== '9696') {
      setPinErr('Incorrect PIN')
      return
    }
    setSubmitting(true)
    try {
      await api.deleteLogs(pin, pinModal?.targetId)
      setPinModal(null)
      setPin('')
      setPinErr('')
      reload()
    } catch (err) {
      setPinErr(errMsg(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Activity Logs</h1>
          <p className="text-sm text-slate-400">Audit trail of all changes made across employees, leaves, and configurations.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={reload}>
            Refresh
          </button>
          <button className="btn" onClick={exportCsv}>
            Export CSV
          </button>
          {logs.length > 0 && (
            <button
              className="btn bg-rose-600/80 hover:bg-rose-600 text-white"
              onClick={() => {
                setPinModal({ open: true })
                setPin('')
                setPinErr('')
              }}
            >
              Delete Logs
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input w-48"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          aria-label="Filter by action"
        >
          <option value="all">All Actions ({logs.length})</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a} ({logs.filter((l) => l.action === a).length})
            </option>
          ))}
        </select>
        <input
          className="input w-64"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search logs"
        />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th className="w-40">Timestamp</th>
              <th className="w-44">Action</th>
              <th>Details</th>
              <th className="w-12 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td className="text-xs text-slate-400 font-mono">{l.created_at}</td>
                <td>
                  <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300">
                    {l.action}
                  </span>
                </td>
                <td className="text-slate-200">{l.details}</td>
                <td className="text-right">
                  <button
                    type="button"
                    title="Delete log entry"
                    aria-label={`Delete log ${l.id}`}
                    onClick={() => {
                      setPinModal({ open: true, targetId: l.id })
                      setPin('')
                      setPinErr('')
                    }}
                    className="text-slate-500 hover:text-rose-400 transition p-1"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No activity logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pinModal && (
        <Modal
          title={pinModal.targetId ? 'Delete Log Entry' : 'Delete All Logs'}
          maxWidth="max-w-sm"
          onClose={() => {
            setPinModal(null)
            setPin('')
            setPinErr('')
          }}
        >
          <form onSubmit={handleDelete} className="space-y-4">
            <p className="text-xs text-slate-300">
              {pinModal.targetId
                ? 'Enter PIN to delete this activity log entry.'
                : 'Enter PIN to permanently clear all activity logs.'}
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
                  setPinModal(null)
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
