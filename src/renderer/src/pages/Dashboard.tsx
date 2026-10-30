import { Link } from 'react-router-dom'
import { api, Badge, useLoad, ymd } from '../lib'
import type { LeaveRow } from '../../../shared/types'

export default function Dashboard(): React.JSX.Element {
  const [leaves] = useLoad(api.listLeaves, [] as LeaveRow[])
  const [employees] = useLoad(api.listEmployees, [])
  const today = ymd()
  const in14 = ymd(new Date(Date.now() + 14 * 864e5))
  const approved = leaves.filter((l) => l.status === 'approved')
  const onLeave = approved.filter((l) => l.start_date <= today && l.end_date >= today)
  const upcoming = approved
    .filter((l) => l.start_date > today && l.start_date <= in14)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  const pending = leaves.filter((l) => l.status === 'pending')

  const stats = [
    ['Active employees', employees.filter((e) => e.active).length, 'text-white'],
    ['On leave today', onLeave.length, 'text-emerald-300'],
    ['Pending requests', pending.length, 'text-amber-300'],
    ['Upcoming (14 days)', upcoming.length, 'text-indigo-300']
  ] as const

  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        {stats.map(([label, n, color]) => (
          <div key={label} className="card">
            <div className="text-xs text-slate-400">{label}</div>
            <div className={`mt-1 text-3xl font-semibold ${color}`}>{n}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <List title="On leave today" rows={onLeave} />
        <List title="Pending approval" rows={pending} link />
        <List title="Upcoming" rows={upcoming} />
      </div>
    </div>
  )
}

function List({ title, rows, link }: { title: string; rows: LeaveRow[]; link?: boolean }): React.JSX.Element {
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2>{title}</h2>
        {link && (
          <Link to="/leave" className="text-sm text-indigo-300 hover:underline">
            Review →
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {rows.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2 text-sm">
              <Link to={`/employees/${l.employee_id}`} className="hover:text-indigo-300">
                {l.employee_name} <span className="text-slate-500">· {l.type_name}</span>
              </Link>
              <span className="flex items-center gap-2 text-slate-400">
                {l.start_date} → {l.end_date} <Badge status={l.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
