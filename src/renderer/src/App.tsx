import { useEffect, useState } from 'react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isPrintPage = location.pathname.includes('/print')

  useEffect(() => {
    prefetchReports()
  }, [])

  // Close mobile drawer whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {!isPrintPage && (
        <>
          {/* Mobile Top Bar */}
          <header className="no-print flex md:hidden items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur shrink-0">
            <div className="flex items-center gap-2.5">
              <img
                src={maguindanaoLogo}
                alt="Maguindanao del Norte Seal"
                className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
              />
              <div className="text-base font-semibold leading-tight text-white">
                Leave<span className="text-indigo-400">Desk</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="btn btn-ghost px-2.5 py-1 text-slate-300"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </header>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div
              className="no-print fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-900 p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-6 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={maguindanaoLogo}
                      alt="Maguindanao del Norte Seal"
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                    />
                    <div className="text-base font-semibold leading-tight text-white">
                      Leave<span className="text-indigo-400">Desk</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-ghost text-slate-400 hover:text-white"
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                </div>

                <nav className="flex flex-col gap-1" aria-label="Mobile Navigation">
                  {nav.map(([to, label]) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-indigo-500/15 font-medium text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                </nav>

                <div className="mt-auto flex gap-2">
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate(-1)
                    }}
                    aria-label="Back"
                  >
                    ←
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate(1)
                    }}
                    aria-label="Forward"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Sidebar */}
          <aside className="no-print hidden md:flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40 p-4">
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
        </>
      )}
      <main className={isPrintPage ? 'flex-1 overflow-auto p-0 bg-slate-950' : 'flex-1 overflow-auto p-4 sm:p-6 md:p-8'}>
        <Outlet />
      </main>
    </div>
  )
}
