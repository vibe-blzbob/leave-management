import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type EventResizeDoneArg, type DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg, EventDropArg } from '@fullcalendar/core'
import { Link } from 'react-router-dom'
import { api, Badge, DateRangeInput, errMsg, formData, invalidateBalancesCache, Modal, useLoad } from '../lib'
import type { Employee, LeaveRow, LeaveType } from '../../../shared/types'
import { EmployeeSearchSelect } from './Leave'

function formatDate(val: string | Date | undefined): string {
  if (!val) return ''
  const d = typeof val === 'string' ? new Date(val.length === 10 ? val + 'T00:00:00' : val) : val
  if (isNaN(d.getTime())) return String(val)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`
}

/** Shift a YYYY-MM-DD string by n days (FullCalendar all-day ends are exclusive). */
const shift = (s: string, n: number): string => {
  const d = new Date(s + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function CalendarPage(): React.JSX.Element {
  const [leaves, reload] = useLoad(api.listLeaves, [] as LeaveRow[])
  const [employees] = useLoad(api.listEmployees, [] as Employee[])
  const [types] = useLoad(api.listTypes, [] as LeaveType[])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [modalTab, setModalTab] = useState<'view' | 'apply'>('view')
  const [formDept, setFormDept] = useState('')
  const [formErr, setFormErr] = useState('')
  const [saving, setSaving] = useState(false)

  const events = useMemo(
    () =>
      leaves
        .filter((l) => l.status === 'approved' || l.status === 'pending')
        .map((l) => ({
          id: String(l.id),
          title: `${l.employee_name} · ${l.type_name}${l.status === 'pending' ? ' (pending)' : ''}`,
          start: l.start_date,
          end: shift(l.end_date, 1),
          allDay: true,
          backgroundColor: l.status === 'approved' ? '#10b981' : 'transparent',
          borderColor: l.status === 'approved' ? '#10b981' : '#f59e0b',
          textColor: l.status === 'approved' ? '#022c22' : '#fcd34d',
          extendedProps: l
        })),
    [leaves]
  )

  // Leaves active on selected date
  const dayLeaves = useMemo(() => {
    if (!selectedDate) return []
    return leaves.filter((l) => l.start_date <= selectedDate && l.end_date >= selectedDate)
  }, [leaves, selectedDate])

  // Move / reschedule drag & drop
  const move = (info: EventDropArg | EventResizeDoneArg): void => {
    const l = info.event.extendedProps as LeaveRow
    api
      .saveLeave({ ...l, start_date: info.event.startStr, end_date: shift(info.event.endStr || info.event.startStr, -1) })
      .then(() => {
        invalidateBalancesCache()
        reload()
      }, (e) => {
        info.revert()
        alert(errMsg(e))
      })
  }

  const openDate = (dateStr: string): void => {
    setSelectedDate(dateStr)
    setModalTab('view')
    setFormErr('')
    setFormDept('')
  }

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department?.trim() || 'General').filter(Boolean))].sort(),
    [employees]
  )

  const deptEmployees = useMemo(
    () => (!formDept ? employees : employees.filter((e) => (e.department?.trim() || 'General') === formDept)),
    [employees, formDept]
  )

  const handleCreateLeave = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setFormErr('')
    const f = formData(e)
    if (!f.employee_id) {
      setFormErr('Please select an employee.')
      return
    }
    setSaving(true)
    try {
      await api.saveLeave({
        employee_id: +f.employee_id,
        leave_type_id: +f.leave_type_id,
        start_date: f.start_date,
        end_date: f.end_date,
        reason: f.reason,
        status: f.approve ? 'approved' : 'pending'
      })
      invalidateBalancesCache()
      reload()
      setModalTab('view')
    } catch (x) {
      setFormErr(errMsg(x))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Calendar</h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <i className="size-3 rounded bg-emerald-500" /> Approved
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-3 rounded border border-amber-500" /> Pending
          </span>
          <span>Click any date to view or apply · Drag to reschedule</span>
        </div>
      </div>

      <div className="card">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
          height="auto"
          events={events}
          dayMaxEvents={3}
          dayMaxEventRows={3}
          eventDisplay="block"
          editable
          eventDurationEditable
          dateClick={(info: DateClickArg) => openDate(info.dateStr)}
          eventClick={(info: EventClickArg) => {
            info.jsEvent.preventDefault()
            openDate(info.event.startStr.slice(0, 10))
          }}
          eventDrop={move}
          eventResize={move}
        />
      </div>

      {selectedDate && (
        <Modal
          title={`Date: ${formatDate(selectedDate)}`}
          maxWidth="max-w-xl"
          onClose={() => setSelectedDate(null)}
        >
          <div className="space-y-4">
            {/* Sub-tabs: View Leaves vs Apply */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalTab('view')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    modalTab === 'view' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Leaves ({dayLeaves.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('apply')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    modalTab === 'apply' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  + Apply for Leave
                </button>
              </div>
              <span className="text-xs text-slate-400">{formatDate(selectedDate)}</span>
            </div>

            {/* TAB 1: Leaves for this day */}
            {modalTab === 'view' && (
              <div className="space-y-3">
                {dayLeaves.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-400">No leaves scheduled on this day.</p>
                    <button
                      type="button"
                      onClick={() => setModalTab('apply')}
                      className="btn mt-3 text-xs"
                    >
                      + Apply for Leave on this Day
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
                    {dayLeaves.map((l) => (
                      <div key={l.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/employees/${l.employee_id}`}
                              className="font-medium text-slate-200 hover:text-indigo-400 text-sm hover:underline"
                            >
                              {l.employee_name}
                            </Link>
                            <span className="text-xs text-slate-500">· {l.department || 'General'}</span>
                            <Badge status={l.status} />
                          </div>
                          <div className="text-xs text-slate-300">
                            <span className="font-medium text-indigo-300">{l.type_name}</span>
                            <span className="text-slate-500"> · </span>
                            <span>{l.days} {l.days === 1 ? 'day' : 'days'} ({formatDate(l.start_date)} – {formatDate(l.end_date)})</span>
                          </div>
                          {l.reason && (
                            <p className="text-xs text-slate-400 italic line-clamp-2">
                              &ldquo;{l.reason}&rdquo;
                            </p>
                          )}
                        </div>
                        <Link
                          to={`/leave/${l.id}/print`}
                          className="btn btn-ghost text-xs py-1 px-2 text-slate-400 hover:text-white shrink-0"
                          title="Print CS Form No. 6"
                        >
                          🖨️ Print
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Apply for Leave on this date */}
            {modalTab === 'apply' && (
              <form className="grid gap-3" onSubmit={handleCreateLeave}>
                {formErr && <div className="rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-300">{formErr}</div>}

                {/* Filter department */}
                <label className="text-xs">
                  <span className="text-slate-400 mb-1 block">Filter Department (Optional):</span>
                  <select
                    className="input text-xs"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                  >
                    <option value="">All Departments ({employees.length} employees)</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d} ({employees.filter((emp) => (emp.department?.trim() || 'General') === d).length})
                      </option>
                    ))}
                  </select>
                </label>

                {/* Employee Search Select */}
                <label className="text-xs">
                  <span className="text-slate-400 mb-1 block">Employee *</span>
                  <EmployeeSearchSelect employees={deptEmployees} />
                </label>

                {/* Leave Type */}
                <label className="text-xs">
                  <span className="text-slate-400 mb-1 block">Leave Type *</span>
                  <select className="input text-xs" name="leave_type_id" required defaultValue={types[0]?.id}>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Leave Dates */}
                <label className="text-xs">
                  <span className="text-slate-400 mb-1 block">Leave Dates *</span>
                  <DateRangeInput defaultStart={selectedDate} defaultEnd={selectedDate} />
                </label>

                {/* Reason */}
                <label className="text-xs">
                  <span className="text-slate-400 mb-1 block">Reason / Details</span>
                  <textarea className="input text-xs" name="reason" rows={2} placeholder="Optional notes" />
                </label>

                {/* Status Toggle */}
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input type="checkbox" name="approve" defaultChecked />
                  <span>Approve immediately</span>
                </label>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={() => setModalTab('view')}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn text-xs" disabled={saving}>
                    {saving ? 'Saving…' : 'Submit Leave'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
