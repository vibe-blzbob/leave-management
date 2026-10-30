import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import maguindanaoLogo from './assets/maguindanao_del_norte.jpg'
import { prefetchReports } from './lib'

const nav = [
  ['/', 'Dashboard'],
  ['/employees', 'Employees'],
  ['/leave', 'Leave'],
  ['/calendar', 'Calendar'],
  ['/reports', 'Reports'],
  ['/logs', 'Activity Logs'],
  ['/settings', 'Settings']
] as const

export default function Layout(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const isPrintPage = location.pathname.endsWith('/print')

  useEffect(() => {
    prefetchReports()
  }, [])

  return (
    <div className="flex h-screen">
      {!isPrintPage && (
        <aside className="no-print flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-6 flex items-center gap-2.5 px-1">
            <img
              src={maguindanaoLogo}
              alt="Maguindanao del Norte Seal"
              className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
            />
            <div className="text-base font-semibold leading-tight text-white">
              Leave<span className="text-indigo-400">Desk</span>
            </div>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Main">
            {nav.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onMouseEnter={() => {
                  if (to === '/reports') prefetchReports()
                }}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-indigo-500/15 font-medium text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex gap-2">
            <button className="btn btn-ghost" onClick={() => navigate(-1)} aria-label="Back">
              ←
            </button>
            <button className="btn btn-ghost" onClick={() => navigate(1)} aria-label="Forward">
              →
            </button>
          </div>
        </aside>
      )}
      <main className={isPrintPage ? 'flex-1 overflow-auto p-0 bg-slate-950' : 'flex-1 overflow-auto p-8'}>
        <Outlet />
      </main>
    </div>
  )
}
