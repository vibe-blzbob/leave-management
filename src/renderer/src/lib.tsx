import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { browserApi } from './browserApi'
import { weekdays } from '../../shared/rules'

export const api = window.api || browserApi

/** Strip Electron's "Error invoking remote method 'db': Error:" prefix. */
export const errMsg = (e: unknown): string =>
  String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

/** Load async data on mount; returns [data, reload]. */
export function useLoad<T>(fn: () => Promise<T>, initial: T): [T, () => void] {
  const [data, setData] = useState<T>(initial)
  const reload = useCallback(() => {
    fn().then(setData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(reload, [reload])
  return [data, reload]
}

/** Local-date YYYY-MM-DD (toISOString would shift to UTC). */
export const ymd = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function formatDate(val: string | Date | undefined): string {
  if (!val) return ''
  const d = typeof val === 'string' ? new Date(val.length === 10 ? val + 'T00:00:00' : val) : val
  if (isNaN(d.getTime())) return String(val)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`
}

export function DateInput({
  value,
  defaultValue,
  onChange,
  name,
  required,
  className
}: {
  value?: string
  defaultValue?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  name?: string
  required?: boolean
  className?: string
}): ReactNode {
  const [val, setVal] = useState<string>(value ?? defaultValue ?? '')
  const [open, setOpen] = useState(false)
  const currentVal = value !== undefined ? value : val

  const initialDate = currentVal ? new Date(currentVal + 'T00:00:00Z') : new Date()
  const [viewDate, setViewDate] = useState({
    year: isNaN(initialDate.getUTCFullYear()) ? new Date().getFullYear() : initialDate.getUTCFullYear(),
    month: isNaN(initialDate.getUTCMonth()) ? new Date().getMonth() : initialDate.getUTCMonth()
  })

  useEffect(() => {
    if (value !== undefined) {
      setVal(value)
      if (value) {
        const d = new Date(value + 'T00:00:00Z')
        if (!isNaN(d.getTime())) {
          setViewDate({ year: d.getUTCFullYear(), month: d.getUTCMonth() })
        }
      }
    }
  }, [value])

  const daysInMonth = new Date(Date.UTC(viewDate.year, viewDate.month + 1, 0)).getUTCDate()
  const firstDayOfWeek = (new Date(Date.UTC(viewDate.year, viewDate.month, 1)).getUTCDay() + 6) % 7

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const selectDay = (day: number): void => {
    const y = viewDate.year
    const m = String(viewDate.month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    const newDateStr = `${y}-${m}-${d}`
    setVal(newDateStr)
    setOpen(false)
    if (onChange) {
      const syntheticEvent = {
        target: { value: newDateStr, name: name ?? '' },
        currentTarget: { value: newDateStr, name: name ?? '' }
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
    }
  }

  return (
    <div className="relative inline-block w-full">
      <input
        type="text"
        name={name}
        value={currentVal}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`input flex items-center justify-between text-left cursor-pointer ${className ?? ''}`}
      >
        <span className={currentVal ? 'text-white' : 'text-slate-500'}>
          {currentVal ? formatDate(currentVal) : 'YYYY-MM-DD'}
        </span>
        <span className="text-slate-400 text-xs">📅</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-1 right-0 w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-200">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setViewDate((prev) =>
                    prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
                  )
                }}
                className="rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ‹
              </button>
              <span>{monthNames[viewDate.month]} {viewDate.year}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setViewDate((prev) =>
                    prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
                  )
                }}
                className="rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500 mb-1">
              <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-xs">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isSelected = currentVal === dayStr
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`rounded p-1.5 transition text-center hover:bg-indigo-600/40 hover:text-white ${isSelected ? 'bg-indigo-500 font-semibold text-white' : 'text-slate-300'}`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            
            <div className="mt-2 flex justify-between border-t border-slate-800 pt-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  setViewDate({ year: today.getFullYear(), month: today.getMonth() })
                  selectDay(today.getDate())
                }}
                className="text-indigo-400 hover:underline"
              >
                Today
              </button>
              {currentVal && (
                <button
                  type="button"
                  onClick={() => {
                    setVal('')
                    setOpen(false)
                    if (onChange) {
                      onChange({
                        target: { value: '', name: name ?? '' },
                        currentTarget: { value: '', name: name ?? '' }
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  }}
                  className="text-slate-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function DateRangeInput({
  defaultStart,
  defaultEnd,
  onChange,
  className
}: {
  defaultStart?: string
  defaultEnd?: string
  onChange?: (start: string, end: string) => void
  className?: string
}): ReactNode {
  const [start, setStart] = useState<string>(defaultStart ?? '')
  const [end, setEnd] = useState<string>(defaultEnd ?? defaultStart ?? '')
  const [open, setOpen] = useState(false)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  useEffect(() => {
    if (defaultStart !== undefined) setStart(defaultStart)
    if (defaultEnd !== undefined) setEnd(defaultEnd)
  }, [defaultStart, defaultEnd])

  const initialDate = start ? new Date(start + 'T00:00:00Z') : new Date()
  const [viewDate, setViewDate] = useState({
    year: isNaN(initialDate.getUTCFullYear()) ? new Date().getFullYear() : initialDate.getUTCFullYear(),
    month: isNaN(initialDate.getUTCMonth()) ? new Date().getMonth() : initialDate.getUTCMonth()
  })

  const daysInMonth = new Date(Date.UTC(viewDate.year, viewDate.month + 1, 0)).getUTCDate()
  const firstDayOfWeek = (new Date(Date.UTC(viewDate.year, viewDate.month, 1)).getUTCDay() + 6) % 7

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const selectDay = (dayStr: string): void => {
    if (!start || (start && end)) {
      setStart(dayStr)
      setEnd('')
    } else {
      let finalStart = start
      let finalEnd = dayStr
      if (dayStr < start) {
        finalStart = dayStr
        finalEnd = start
      }
      setStart(finalStart)
      setEnd(finalEnd)
      onChange?.(finalStart, finalEnd)
    }
  }

  const handleDone = (): void => {
    if (start && !end) {
      setEnd(start)
      onChange?.(start, start)
    }
    setOpen(false)
  }

  const effectiveEnd = end || (open && hoverDate && hoverDate >= start ? hoverDate : '')
  const daysCount = start && (end || start) ? weekdays(start, end || start) : 0

  return (
    <div className="relative inline-block w-full">
      <input type="hidden" name="start_date" value={start} required />
      <input type="hidden" name="end_date" value={end || start} required />

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`input flex items-center justify-between text-left cursor-pointer ${className ?? ''}`}
      >
        <span className={start ? 'text-white font-medium text-xs sm:text-sm' : 'text-slate-500'}>
          {start
            ? end && start !== end
              ? `${formatDate(start)} – ${formatDate(end)} (${daysCount} ${daysCount === 1 ? 'day' : 'days'})`
              : `${formatDate(start)} (1 day)`
            : 'Select leave dates…'}
        </span>
        <span className="text-slate-400 text-xs">📅</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3"
          onClick={handleDone}
        >
          <div
            className="card w-full max-w-sm border border-slate-700 bg-slate-900 p-4 shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-sm text-white">Select Leave Dates</span>
              <button
                type="button"
                className="text-slate-400 hover:text-white text-xs p-1"
                onClick={handleDone}
              >
                ✕
              </button>
            </div>

            {/* Month Header */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <button
                type="button"
                onClick={() =>
                  setViewDate((prev) =>
                    prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
                  )
                }
                className="rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ‹
              </button>
              <span>{monthNames[viewDate.month]} {viewDate.year}</span>
              <button
                type="button"
                onClick={() =>
                  setViewDate((prev) =>
                    prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
                  )
                }
                className="rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ›
              </button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500">
              <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span className="text-slate-600">Sa</span><span className="text-slate-600">Su</span>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isStart = start === dayStr
                const inRange = start && effectiveEnd && dayStr > start && dayStr < effectiveEnd

                let btnClass = 'text-slate-300 hover:bg-slate-800'
                if (isStart || (end && dayStr === end)) {
                  btnClass = 'bg-indigo-600 font-bold text-white shadow'
                } else if (inRange) {
                  btnClass = 'bg-indigo-500/20 text-indigo-300 font-medium'
                }

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(dayStr)}
                    onMouseEnter={() => setHoverDate(dayStr)}
                    className={`rounded p-1.5 transition text-center text-xs ${btnClass}`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Summary & Actions */}
            <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                {start ? (
                  <div className="text-[11px] text-slate-300 leading-tight">
                    <span className="text-indigo-400 font-medium">{formatDate(start)}</span>
                    {end && end !== start && (
                      <>
                        <span className="text-slate-500"> → </span>
                        <span className="text-indigo-400 font-medium">{formatDate(end)}</span>
                      </>
                    )}
                    <span className="text-slate-400 ml-1">({daysCount} {daysCount === 1 ? 'day' : 'days'})</span>
                  </div>
                ) : (
                  <span className="text-slate-500 text-[11px]">Click start, then end date</span>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  className="btn btn-ghost text-xs py-1 px-2"
                  onClick={() => {
                    setStart('')
                    setEnd('')
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn text-xs py-1 px-3"
                  onClick={handleDone}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const num = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2))

export const statusColor: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-300',
  cancelled: 'bg-slate-500/15 text-slate-400'
}

export const Badge = ({ status }: { status: string }): ReactNode => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[status]}`}>{status}</span>
)

export function Modal(props: {
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
  className?: string
}): ReactNode {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm p-3 sm:p-4 md:p-6 flex items-center justify-center min-h-screen"
      onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}
      onKeyDown={(e) => e.key === 'Escape' && props.onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className={`card w-full ${props.maxWidth || 'max-w-md'} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto shadow-2xl flex flex-col my-auto transition-all ${props.className || ''}`}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-white truncate pr-2">{props.title}</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 text-sm leading-none transition hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {props.children}
        </div>
      </div>
    </div>
  )
}

/** Form values as a plain object of strings. */
export const formData = (e: React.FormEvent<HTMLFormElement>): Record<string, string> =>
  Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>

export function downloadCsv(name: string, rows: (string | number)[][]): void {
  const esc = (v: string | number): string => `"${String(v).replace(/"/g, '""')}"`
  const blob = new Blob(['\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name })
  a.click()
  URL.revokeObjectURL(a.href)
}

// In-memory cache & prefetching for reports
let balancesCache: { year: number; data: any[] } | null = null
let prefetchPromise: Promise<any[]> | null = null

export const prefetchReports = (year = new Date().getFullYear()): Promise<any[]> => {
  if (balancesCache && balancesCache.year === year) return Promise.resolve(balancesCache.data)
  if (!prefetchPromise) {
    prefetchPromise = api.balances(year).then((data) => {
      balancesCache = { year, data }
      prefetchPromise = null
      return data
    })
  }
  return prefetchPromise
}

export const getCachedBalances = <T,>(year: number): T[] | null =>
  balancesCache && balancesCache.year === year ? (balancesCache.data as T[]) : null

export const invalidateBalancesCache = (): void => {
  balancesCache = null
  prefetchPromise = null
}
