import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import type { Employee, LeaveRow, Signatory } from '../../../shared/types'
import { api, errMsg, formatDate, useLoad } from '../lib'
import maguindanaoLogo from '../assets/maguindanao_del_norte.jpg'
import bangsamoroLogo from '../assets/bangsamoro.png'

export default function PrintLeave(): React.JSX.Element {
  const { id } = useParams()
  const navigate = useNavigate()
  const leaveId = Number(id)

  const [leaves] = useLoad(api.listLeaves, [] as LeaveRow[])
  const [employees] = useLoad(api.listEmployees, [] as Employee[])
  const [signatories] = useLoad(api.listSignatories, [] as Signatory[])
  const [balances] = useLoad(() => api.balances(new Date().getFullYear()), [])

  const leave = leaves.find((l) => l.id === leaveId)
  const employee = employees.find((e) => e.id === leave?.employee_id)

  // Dynamic form details
  const [salary, setSalary] = useState('')
  const [commutation, setCommutation] = useState<'not_requested' | 'requested'>('not_requested')
  const [vacationLoc, setVacationLoc] = useState<'philippines' | 'abroad' | ''>('')
  const [vacationLocDetail, setVacationLocDetail] = useState('')
  const [sickType, setSickType] = useState<'hospital' | 'outpatient' | ''>('')
  const [sickDetail, setSickDetail] = useState('')
  const [womenIllness, setWomenIllness] = useState('')
  const [studyPurpose, setStudyPurpose] = useState<'masters' | 'bar' | ''>('')
  const [otherPurpose, setOtherPurpose] = useState<'monetization' | 'terminal' | ''>('')
  const [generating, setGenerating] = useState(false)

  // Signatories
  const certifiers = useMemo(() => signatories.filter((s) => s.role === 'certifier' || s.role === 'other'), [signatories])
  const supervisors = useMemo(() => signatories.filter((s) => s.role === 'supervisor' || s.role === 'other'), [signatories])
  const approvers = useMemo(() => signatories.filter((s) => s.role === 'approver' || s.role === 'other'), [signatories])

  const [selectedCertId, setSelectedCertId] = useState<string>('')
  const [selectedSupId, setSelectedSupId] = useState<string>('')
  const [selectedAppId, setSelectedAppId] = useState<string>('')

  // Manually editable Approving Authority
  const [appName, setAppName] = useState('DATU TUCAO O. MASTURA, CPA')
  const [appPosition, setAppPosition] = useState('Provincial Governor')

  const handleSelectApp = (appId: string): void => {
    setSelectedAppId(appId)
    const found = approvers.find((s) => String(s.id) === appId)
    if (found) {
      setAppName(found.name)
      setAppPosition(found.position)
    }
  }

  useEffect(() => {
    if (signatories.length > 0) {
      if (!selectedCertId) {
        const c = certifiers.find((s) => s.position.toLowerCase().includes('human resource')) || certifiers[0]
        if (c) setSelectedCertId(String(c.id))
      }
      if (!selectedSupId && employee) {
        const empDept = (employee.department || '').toLowerCase().trim()
        const supMatch = supervisors.find((s) => {
          const off = (s.office || '').toLowerCase()
          return empDept && (off.includes(empDept) || empDept.includes(off.replace('office', '').replace('department', '').trim()))
        }) || supervisors[0]
        if (supMatch) setSelectedSupId(String(supMatch.id))
      }
      if (!selectedAppId) {
        const a = approvers.find((s) => s.position.toLowerCase().includes('governor')) || approvers[0]
        if (a) {
          setSelectedAppId(String(a.id))
          setAppName(a.name)
          setAppPosition(a.position)
        }
      }
    }
  }, [signatories, employee, selectedCertId, selectedSupId, selectedAppId, certifiers, supervisors, approvers])

  const activeCert = signatories.find((s) => String(s.id) === selectedCertId) || certifiers[0] || {
    name: 'MONINA K. MACARONGON, MPA',
    position: "Prov'l Human Resource Mngt. Officer",
    office: 'Provincial Human Resource Management Office'
  }
  const activeSup = signatories.find((s) => String(s.id) === selectedSupId) || supervisors[0] || {
    name: '',
    position: 'Immediate Supervisor',
    office: ''
  }

  // Live calculations for Section 7.A (Vacation Leave vs Sick Leave)
  const empBalances = useMemo(
    () => balances.filter((b) => b.employee_id === leave?.employee_id),
    [balances, leave?.employee_id]
  )

  const vlBal = empBalances.find((b) => b.leave_type_id === 1) // Vacation Leave
  const slBal = empBalances.find((b) => b.leave_type_id === 2 || b.leave_type_id === 3) // Sick Leave

  const isVl = leave?.type_name?.toLowerCase().includes('vacation') || leave?.type_name?.toLowerCase().includes('forced')
  const isSl = leave?.type_name?.toLowerCase().includes('sick')

  const vlTotal = vlBal?.accrued ?? 0
  const vlLess = isVl ? leave?.days ?? 0 : 0
  const vlRemaining = Math.max(0, vlTotal - vlLess)

  const slTotal = slBal?.accrued ?? 0
  const slLess = isSl ? leave?.days ?? 0 : 0
  const slRemaining = Math.max(0, slTotal - slLess)

  const asOfDate = formatDate(new Date())
  const filingDate = formatDate(leave?.created_at || new Date())

  const handlePrintPdf = async (): Promise<void> => {
    setGenerating(true)
    try {
      const cleanEmpName = (employee?.name || 'employee').replace(/[^a-zA-Z0-9]/g, '_')
      await api.printToPdf(`leave-app-${cleanEmpName}`)
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setGenerating(false)
    }
  }

  if (leaves.length > 0 && !leave) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-semibold text-rose-400">Leave record #{leaveId} not found</h2>
        <button className="btn" onClick={() => navigate('/leave')}>
          ← Back to Leave Requests
        </button>
      </div>
    )
  }

  if (!leave || !employee) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="inline-block animate-spin mr-2">⏳</div> Loading application form...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center print:min-h-0 print:bg-white print:block">
      {/* ================= STICKY TOP CONTROL PANEL (Hidden during print) ================= */}
      <header className="no-print sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-xl px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/leave"
              className="btn btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              ← Back to Leaves
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">
                CS Form No. 6 — {employee.name}
              </h1>
              <p className="text-[11px] text-slate-400">
                {leave.type_name} · {leave.days} {leave.days === 1 ? 'day' : 'days'} ({formatDate(leave.start_date)} – {formatDate(leave.end_date)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn text-xs py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30"
              onClick={handlePrintPdf}
              disabled={generating}
            >
              {generating ? '⏳ Generating PDF…' : '📄 Generate PDF (8.5 × 13)'}
            </button>
          </div>
        </div>

        {/* Options & Signatories Bar */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Certifier */}
            <label className="flex flex-col gap-1 md:col-span-3">
              <span className="font-semibold text-slate-400 text-[11px]">7.A Certifying Officer (HR):</span>
              <select
                className="input py-1 text-xs truncate"
                value={selectedCertId}
                onChange={(e) => setSelectedCertId(e.target.value)}
              >
                {certifiers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ? `${s.name} — ${s.position}` : s.position}
                  </option>
                ))}
              </select>
            </label>

            {/* Supervisor */}
            <label className="flex flex-col gap-1 md:col-span-4">
              <span className="font-semibold text-slate-400 text-[11px]">7.B Immediate Supervisor:</span>
              <select
                className="input py-1 text-xs truncate"
                value={selectedSupId}
                onChange={(e) => setSelectedSupId(e.target.value)}
              >
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ? `${s.name} — ${s.position} (${s.office})` : `${s.position} (${s.office})`}
                  </option>
                ))}
              </select>
            </label>

            {/* Approving Authority */}
            <div className="flex flex-col gap-1 md:col-span-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-400 text-[11px]">7.C Approving Authority:</span>
                <select
                  className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 border border-slate-700"
                  value={selectedAppId}
                  onChange={(e) => handleSelectApp(e.target.value)}
                >
                  <option value="">Choose preset...</option>
                  {approvers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ? `${s.name} (${s.position})` : s.position}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  className="input py-1 text-xs uppercase"
                  placeholder="Official Name"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  title="Official Name"
                />
                <input
                  className="input py-1 text-xs"
                  placeholder="Position"
                  value={appPosition}
                  onChange={(e) => setAppPosition(e.target.value)}
                  title="Position"
                />
              </div>
            </div>
          </div>

          {/* Additional details */}
          <div className="mt-2 flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800/50 text-[11px]">
            <label className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Salary:</span>
              <input
                className="input py-0.5 text-xs w-32"
                placeholder="Optional"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">6.D Commutation:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="commutation"
                  checked={commutation === 'not_requested'}
                  onChange={() => setCommutation('not_requested')}
                />
                Not Requested
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="commutation"
                  checked={commutation === 'requested'}
                  onChange={() => setCommutation('requested')}
                />
                Requested
              </label>
            </div>

            {isVl && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">6.B VL Destination:</span>
                <select
                  className="input py-0.5 text-xs w-auto"
                  value={vacationLoc}
                  onChange={(e) => setVacationLoc(e.target.value as any)}
                >
                  <option value="">(Select)</option>
                  <option value="philippines">Within Philippines</option>
                  <option value="abroad">Abroad</option>
                </select>
                {vacationLoc && (
                  <input
                    className="input py-0.5 text-xs w-48"
                    placeholder="Specific destination"
                    value={vacationLocDetail}
                    onChange={(e) => setVacationLocDetail(e.target.value)}
                  />
                )}
              </div>
            )}

            {isSl && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">6.B Sick Type:</span>
                <select
                  className="input py-0.5 text-xs w-auto"
                  value={sickType}
                  onChange={(e) => setSickType(e.target.value as any)}
                >
                  <option value="">(Select)</option>
                  <option value="hospital">In Hospital</option>
                  <option value="outpatient">Out Patient</option>
                </select>
                {sickType && (
                  <input
                    className="input py-0.5 text-xs w-48"
                    placeholder="Specify illness"
                    value={sickDetail}
                    onChange={(e) => setSickDetail(e.target.value)}
                  />
                )}
              </div>
            )}

            {leave.type_name?.toLowerCase().includes('women') && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">6.B Women Disorder:</span>
                <input
                  className="input py-0.5 text-xs w-56"
                  placeholder="Specify gynecological disorder"
                  value={womenIllness}
                  onChange={(e) => setWomenIllness(e.target.value)}
                />
              </div>
            )}

            {leave.type_name?.toLowerCase().includes('study') && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">6.B Study:</span>
                <select
                  className="input py-0.5 text-xs w-auto"
                  value={studyPurpose}
                  onChange={(e) => setStudyPurpose(e.target.value as any)}
                >
                  <option value="">(Select)</option>
                  <option value="masters">Master's Degree</option>
                  <option value="bar">BAR/Board Review</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Other:</span>
              <select
                className="input py-0.5 text-xs w-auto"
                value={otherPurpose}
                onChange={(e) => setOtherPurpose(e.target.value as any)}
              >
                <option value="">(None)</option>
                <option value="monetization">Monetization</option>
                <option value="terminal">Terminal Leave</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* ================= PRINT CANVAS CONTAINER (8.5 × 13 INCHES) ================= */}
      <div className="w-full py-8 px-2 flex justify-center overflow-auto print:p-0 print:overflow-visible print:block">
        <div className="cs-form-printable flex flex-col gap-10 items-center print:block" style={{ width: '8.5in' }}>
          {/* Sheet 1 */}
          <div
            className="cs-page cs-page-1 p-6 text-[10px] leading-[1.28] text-black bg-white shadow-2xl flex flex-col justify-between"
            style={{ width: '8.5in', height: '13in', boxSizing: 'border-box' }}
          >
            <div>
              <div className="text-[9px] font-serif italic mb-1 flex justify-between">
                <span>Civil Service Form No. 6<br />Revised 2020</span>
              </div>

              <div className="relative flex items-center justify-between mb-1.5 pb-1">
                <img
                  src={maguindanaoLogo}
                  alt="Province of Maguindanao del Norte"
                  className="w-16 h-16 object-contain shrink-0"
                />
                <div className="text-center flex-1 px-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide">Republic of the Philippines</div>
                  <div className="text-[12.5px] font-bold uppercase tracking-wider text-slate-900">
                    PROVINCIAL GOVERNMENT OF MAGUINDANAO DEL NORTE
                  </div>
                  <div className="text-[9.5px] text-slate-700">
                    Provincial Government Satellite Office, Sinsuat Avenue, Cotabato City
                  </div>
                  <div className="text-[14px] font-extrabold uppercase mt-0.5 tracking-widest border-b-2 border-black inline-block px-3 pb-0.5">
                    APPLICATION FOR LEAVE
                  </div>
                </div>
                <img
                  src={bangsamoroLogo}
                  alt="Bangsamoro Autonomous Region in Muslim Mindanao"
                  className="w-16 h-16 object-contain shrink-0"
                />
              </div>

              <table className="w-full border-2 border-black border-collapse text-[10px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td colSpan={2} className="w-1/2 border-r border-black p-1 align-top">
                      <span className="font-bold">1. OFFICE/DEPARTMENT:</span>
                      <div className="font-semibold text-slate-900 uppercase mt-0.5 pl-2">{employee.department || 'General'}</div>
                    </td>
                    <td colSpan={2} className="w-1/2 p-1 align-top">
                      <span className="font-bold">2. NAME :</span>
                      <div className="font-semibold text-slate-900 uppercase mt-0.5 pl-2 tracking-wide">{employee.name}</div>
                    </td>
                  </tr>
                  <tr className="border-b-2 border-black">
                    <td colSpan={2} className="w-1/2 border-r border-black p-1 align-top">
                      <span className="font-bold">3. DATE OF FILING:</span>
                      <div className="font-semibold text-slate-900 mt-0.5 pl-2">{filingDate}</div>
                    </td>
                    <td className="w-1/4 border-r border-black p-1 align-top">
                      <span className="font-bold">4. POSITION:</span>
                      <div className="font-semibold text-slate-900 uppercase mt-0.5 pl-2">{employee.position || 'Staff'}</div>
                    </td>
                    <td className="w-1/4 p-1 align-top">
                      <span className="font-bold">5. SALARY:</span>
                      <div className="font-semibold text-slate-900 mt-0.5 pl-2">{salary || '_______________'}</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border-x-2 border-b-2 border-black bg-slate-200 text-center font-bold text-[10.5px] py-0.5 tracking-wide uppercase">
                6. DETAILS OF APPLICATION
              </div>

              <table className="w-full border-x-2 border-b border-black border-collapse text-[9.5px]">
                <tbody>
                  <tr className="divide-x border-black">
                    <td className="w-1/2 p-1.5 align-top space-y-1 border-r border-black">
                      <div className="font-bold text-[10px] mb-0.5">6.A TYPE OF LEAVE TO BE AVAILED OF</div>
                      <LeaveCheckbox label="Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)" checked={leave.type_name === 'Vacation Leave'} />
                      <LeaveCheckbox label="Mandatory/Forced Leave (Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)" checked={leave.type_name?.toLowerCase().includes('forced')} />
                      <LeaveCheckbox label="Sick Leave (Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)" checked={leave.type_name === 'Sick Leave'} />
                      <LeaveCheckbox label="Maternity Leave (R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)" checked={leave.type_name?.toLowerCase().includes('maternity')} />
                      <LeaveCheckbox label="Paternity Leave (R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)" checked={leave.type_name?.toLowerCase().includes('paternity')} />
                      <LeaveCheckbox label="Special Privilege Leave (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)" checked={leave.type_name?.toLowerCase().includes('special privilege')} />
                      <LeaveCheckbox label="Solo Parent Leave (RA No. 8972 / CSC MC No. 8, s. 2004)" checked={leave.type_name?.toLowerCase().includes('solo parent')} />
                      <LeaveCheckbox label="Study Leave (Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)" checked={leave.type_name?.toLowerCase().includes('study')} />
                      <LeaveCheckbox label="10-Day VAWC Leave (RA No. 9262 / CSC MC No. 15, s. 2005)" checked={leave.type_name?.toLowerCase().includes('vawc')} />
                      <LeaveCheckbox label="Rehabilitation Privilege (Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)" checked={leave.type_name?.toLowerCase().includes('rehabilitation')} />
                      <LeaveCheckbox label="Special Leave Benefits for Women (RA No. 9710 / CSC MC No. 25, s. 2010)" checked={leave.type_name?.toLowerCase().includes('women')} />
                      <LeaveCheckbox label="Special Emergency (Calamity) Leave (CSC MC No. 2, s. 2012, as amended)" checked={leave.type_name?.toLowerCase().includes('calamity')} />
                      <LeaveCheckbox label="Adoption Leave (R.A. No. 8552)" checked={leave.type_name?.toLowerCase().includes('adoption')} />
                    </td>

                    <td className="w-1/2 p-1.5 align-top text-[9.5px] space-y-1.5">
                      <div className="font-bold text-[10px]">6.B DETAILS OF LEAVE</div>
                      <div>
                        <div className="font-semibold italic">In case of Vacation/Special Privilege Leave:</div>
                        <div className="pl-3 space-y-0.5 mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{vacationLoc === 'philippines' ? '[✓]' : '[  ]'}</span>
                            <span>Within the Philippines:</span>
                            <span className="border-b border-black flex-1 pl-1 font-semibold">{vacationLoc === 'philippines' ? vacationLocDetail : ''}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{vacationLoc === 'abroad' ? '[✓]' : '[  ]'}</span>
                            <span>Abroad (Specify):</span>
                            <span className="border-b border-black flex-1 pl-1 font-semibold">{vacationLoc === 'abroad' ? vacationLocDetail : ''}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold italic">In case of Sick Leave:</div>
                        <div className="pl-3 space-y-0.5 mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{sickType === 'hospital' ? '[✓]' : '[  ]'}</span>
                            <span>In Hospital (Specify Illness):</span>
                            <span className="border-b border-black flex-1 pl-1 font-semibold">{sickType === 'hospital' ? sickDetail : ''}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{sickType === 'outpatient' ? '[✓]' : '[  ]'}</span>
                            <span>Out Patient (Specify Illness):</span>
                            <span className="border-b border-black flex-1 pl-1 font-semibold">{sickType === 'outpatient' ? sickDetail : ''}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold italic">In case of Special Leave Benefits for Women:</div>
                        <div className="pl-3 flex items-center gap-1.5 mt-0.5">
                          <span>(Specify Illness):</span>
                          <span className="border-b border-black flex-1 pl-1 font-semibold">{womenIllness}</span>
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold italic">In case of Study Leave:</div>
                        <div className="pl-3 space-y-0.5 mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{studyPurpose === 'masters' ? '[✓]' : '[  ]'}</span>
                            <span>Completion of Master's Degree</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{studyPurpose === 'bar' ? '[✓]' : '[  ]'}</span>
                            <span>BAR/Board Examination Review</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold italic">Other purpose:</div>
                        <div className="pl-3 space-y-0.5 mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{otherPurpose === 'monetization' ? '[✓]' : '[  ]'}</span>
                            <span>Monetization of Leave Credits</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{otherPurpose === 'terminal' ? '[✓]' : '[  ]'}</span>
                            <span>Terminal Leave</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-x-2 border-b-2 border-black border-collapse text-[9.5px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="w-1/2 p-2 border-r border-black align-top">
                      <div className="flex flex-col justify-between h-full space-y-2">
                        <div>
                          <div className="font-bold">6.C NUMBER OF WORKING DAYS APPLIED FOR</div>
                          <div className="mt-1 pl-4 border-b border-black pb-0.5">
                            <span className="font-bold text-[11px] text-slate-950 tracking-wide">
                              {leave.days} DAY{leave.days > 1 ? 'S' : ''}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="font-bold">INCLUSIVE DATES:</div>
                          <div className="mt-1 pl-4 border-b border-black pb-0.5">
                            <span className="font-semibold text-[10.5px] text-slate-950 tracking-wide">
                              {formatDate(leave.start_date)} to {formatDate(leave.end_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="w-1/2 p-2 align-top">
                      <div className="flex flex-col justify-between h-full min-h-[85px]">
                        <div>
                          <div className="font-bold">6.D COMMUTATION</div>
                          <div className="pl-4 space-y-1 mt-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{commutation === 'not_requested' ? '[✓]' : '[  ]'}</span>
                              <span>Not Requested</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{commutation === 'requested' ? '[✓]' : '[  ]'}</span>
                              <span>Requested</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 mb-0.5 text-center">
                          <div className="w-56 mx-auto border-b border-black mb-1">
                            <span className="font-bold text-[10.5px] uppercase tracking-wide text-slate-950">
                              {employee.name}
                            </span>
                          </div>
                          <span className="text-[8.5px] text-slate-600 uppercase tracking-wider">(Signature of Applicant)</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border-x-2 border-b-2 border-black bg-slate-200 text-center font-bold text-[10.5px] py-0.5 tracking-wider uppercase">
                7. DETAILS OF ACTION ON APPLICATION
              </div>

              <table className="w-full border-x-2 border-b-2 border-black border-collapse text-[9.5px]">
                <tbody>
                  <tr>
                    <td className="w-1/2 p-2 align-top border-r border-black">
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="font-bold">7.A CERTIFICATION OF LEAVE CREDITS</div>
                          <div className="italic text-[9px] mt-0.5 mb-1.5">
                            As of <span className="font-semibold underline">{asOfDate}</span>
                          </div>
                          <table className="w-full border border-black border-collapse text-center text-[9px] mb-1.5">
                            <thead>
                              <tr className="bg-slate-100 border-b border-black">
                                <th className="border-r border-black p-1 text-left" />
                                <th className="border-r border-black p-1 font-bold">Vacation Leave</th>
                                <th className="p-1 font-bold">Sick Leave</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-medium">Total Earned</td>
                                <td className="border-r border-black p-1 font-mono">{vlTotal.toFixed(3)}</td>
                                <td className="p-1 font-mono">{slTotal.toFixed(3)}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-medium">Less this application</td>
                                <td className="border-r border-black p-1 font-mono">{vlLess > 0 ? vlLess.toFixed(3) : '–'}</td>
                                <td className="p-1 font-mono">{slLess > 0 ? slLess.toFixed(3) : '–'}</td>
                              </tr>
                              <tr className="font-bold bg-slate-50">
                                <td className="border-r border-black p-1 text-left">Balance</td>
                                <td className="border-r border-black p-1 font-mono">{vlRemaining.toFixed(3)}</td>
                                <td className="p-1 font-mono">{slRemaining.toFixed(3)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-8 mb-0.5 text-center">
                          <div className="w-56 mx-auto border-b border-black mb-1">
                            <span className="font-bold text-[10.5px] uppercase tracking-wide">
                              {activeCert.name || '_______________________________'}
                            </span>
                          </div>
                          <div className="text-[9.5px] font-semibold text-slate-900 uppercase">{activeCert.position}</div>
                          <div className="text-[8.5px] text-slate-600 uppercase tracking-wider">(Authorized Officer)</div>
                        </div>
                      </div>
                    </td>

                    <td className="w-1/2 p-2 align-top">
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="font-bold">7.B RECOMMENDATION</div>
                          <div className="pl-3 space-y-1 mt-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{leave.status === 'approved' || leave.status === 'pending' ? '[✓]' : '[  ]'}</span>
                              <span>For approval</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-mono text-xs">{leave.status === 'rejected' ? '[✓]' : '[  ]'}</span>
                              <div className="flex-1">
                                <span>For disapproval due to:</span>
                                <div className="border-b border-black w-full mt-1.5" />
                                <div className="border-b border-black w-full mt-2" />
                                <div className="border-b border-black w-full mt-2" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 mb-0.5 text-center">
                          <div className="w-56 mx-auto border-b border-black mb-1">
                            <span className="font-bold text-[10.5px] uppercase tracking-wide">
                              {activeSup.name || '_______________________________'}
                            </span>
                          </div>
                          <div className="text-[9.5px] font-semibold text-slate-900 uppercase">{activeSup.position}</div>
                          <div className="text-[8.5px] text-slate-600 uppercase tracking-wider">(Immediate Supervisor)</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-x-2 border-b-2 border-black border-collapse text-[9.5px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="w-1/2 p-2 border-r border-black align-top">
                      <div className="font-bold">7.C APPROVED FOR:</div>
                      <div className="pl-4 space-y-1 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="border-b border-black min-w-[36px] text-center font-bold">
                            {leave.status === 'approved' ? leave.days : '____'}
                          </span>
                          <span>days with pay</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="border-b border-black min-w-[36px] text-center font-bold">____</span>
                          <span>days without pay</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="border-b border-black min-w-[36px] text-center font-bold">____</span>
                          <span>others (Specify)</span>
                        </div>
                      </div>
                    </td>

                    <td className="w-1/2 p-2 align-top">
                      <div className="font-bold">7.D DISAPPROVED DUE TO:</div>
                      <div className="pl-4 mt-3.5 space-y-3">
                        <div className="border-b border-black w-full" />
                        <div className="border-b border-black w-full" />
                        <div className="border-b border-black w-full" />
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td colSpan={2} className="pt-9 pb-2.5 px-3 text-center bg-slate-50/40">
                      <div className="w-80 mx-auto border-b-2 border-black mb-1">
                        <span className="font-extrabold text-[12px] uppercase tracking-wider text-slate-950">
                          {appName || '_______________________________'}
                        </span>
                      </div>
                      <div className="text-[10.5px] font-bold text-slate-900 uppercase tracking-wide">
                        {appPosition || 'Provincial Governor'}
                      </div>
                      <div className="text-[8.5px] text-slate-600 uppercase tracking-wider mt-0.5">
                        (Authorized Official)
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sheet 2 - CSC Form No. 6 Back Page (Instructions and Requirements) */}
          <div
            className="cs-page cs-page-2 p-8 text-[8pt] leading-[1.28] text-black bg-white shadow-2xl flex flex-col justify-between"
            style={{ width: '8.5in', height: '13in', boxSizing: 'border-box' }}
          >
            <div className="flex flex-col justify-between h-full">
              <div>
                {/* Header Box */}
                <div className="border border-black py-1 px-4 mb-2.5">
                  <h2 className="text-center font-bold text-[10.5pt] tracking-wider uppercase text-black">
                    INSTRUCTIONS AND REQUIREMENTS
                  </h2>
                </div>

                <p className="mb-2 text-justify text-[8pt]">
                  Application for any type of leave shall be made on this Form and <span className="underline font-semibold">to be accomplished at least in duplicate</span> with documentary requirements, as follows:
                </p>

                <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-justify text-[7.5pt] leading-[1.24]">
                  {/* Column 1: Items 1 to 9 */}
                  <div className="space-y-1.5">
                    <div>
                      <span className="font-bold">1. Vacation leave*</span>
                      <p className="mt-0.5">
                        It shall be filed five (5) days in advance, whenever possible, of the effective date of such leave. Vacation leave within the Philippines or abroad shall be indicated in the form for purposes of securing travel authority and completing clearance from money and work accountabilities.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold">2. Mandatory/Forced leave</span>
                      <p className="mt-0.5">
                        Annual five-day vacation leave shall be forfeited if not taken during the year. In case the scheduled leave has been cancelled in the exigency of the service by the head of agency, it shall no longer be deducted from the accumulated vacation leave. Availment of one (1) day or more Vacation Leave (VL) shall be considered for complying the mandatory/forced leave subject to the conditions under Section 25, Rule XVI of the Omnibus Rules Implementing E.O. No. 292.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold">3. Sick leave*</span>
                      <ul className="list-disc pl-3.5 space-y-0.5 mt-0.5">
                        <li>It shall be filed immediately upon employee&apos;s return from such leave.</li>
                        <li>If filed in advance or exceeding five (5) days, application shall be accompanied by a medical certificate. In case medical consultation was not availed of, an affidavit should be executed by an applicant.</li>
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold">4. Maternity leave* – 105 days</span>
                      <ul className="list-disc pl-3.5 space-y-0.5 mt-0.5">
                        <li>Proof of pregnancy e.g. ultrasound, doctor&apos;s certificate on the expected date of delivery</li>
                        <li>Accomplished Notice of Allocation of Maternity Leave Credits (CS Form No. 6a), if needed</li>
                        <li>Seconded female employees shall enjoy maternity leave with full pay in the recipient agency.</li>
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold">5. Paternity leave – 7 days</span>
                      <p className="mt-0.5">
                        Proof of child&apos;s delivery e.g. birth certificate, medical certificate and marriage contract
                      </p>
                    </div>

                    <div>
                      <span className="font-bold">6. Special Privilege leave – 3 days</span>
                      <p className="mt-0.5">
                        It shall be filed/approved for at least one (1) week prior to availment, except on emergency cases. Special privilege leave within the Philippines or abroad shall be indicated in the form for purposes of securing travel authority and completing clearance from money and work accountabilities.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold">7. Solo Parent leave – 7 days</span>
                      <p className="mt-0.5">
                        It shall be filed in advance or whenever possible five (5) days before going on such leave with updated Solo Parent Identification Card.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold">8. Study leave* – up to 6 months</span>
                      <ul className="list-disc pl-3.5 space-y-0.5 mt-0.5">
                        <li>Shall meet the agency&apos;s internal requirements, if any;</li>
                        <li>Contract between the agency head or authorized representative and the employee concerned.</li>
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold">9. VAWC leave – 10 days</span>
                      <ul className="list-disc pl-3.5 space-y-0.5 mt-0.5">
                        <li>It shall be filed in advance or immediately upon the woman employee&apos;s return from such leave.</li>
                        <li>
                          It shall be accompanied by any of the following supporting documents:
                          <div className="pl-1.5 space-y-0.5 mt-0.5">
                            <p>a. Barangay Protection Order (BPO) obtained from the barangay;</p>
                            <p>b. Temporary/Permanent Protection Order (TPO/PPO) obtained from the court;</p>
                            <p>c. If the protection order is not yet issued by the barangay or the court, a certification issued by the Punong Barangay/Kagawad or Prosecutor or the Clerk of Court that the application for the BPO, TPO or PPO has been filed with the said office shall be sufficient to support the application for the ten-day leave; or</p>
                            <p>d. In the absence of the BPO/TPO/PPO or the certification, a police report specifying the details of the occurrence of violence on the victim and a medical certificate may be considered, at the discretion of the immediate supervisor of the woman employee concerned.</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Column 2: Items 10 to 15 */}
                  <div className="space-y-1.5">
                    <div>
                      <span className="font-bold">10. Rehabilitation leave* – up to 6 months</span>
                      <ul className="list-disc pl-3.5 space-y-0.5 mt-0.5">
                        <li>Application shall be made within one (1) week from the time of the accident except when a longer period is warranted.</li>
                        <li>Letter request supported by relevant reports such as the police report, if any.</li>
                        <li>Medical certificate on the nature of the injuries, the course of treatment involved, and the need to undergo rest, recuperation, and rehabilitation, as the case may be.</li>
                        <li>Written concurrence of a government physician should be obtained relative to the recommendation for rehabilitation if the attending physician is a private practitioner, particularly on the duration of the period of rehabilitation.</li>
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold">11. Special leave benefits for women* – up to 2 months</span>
                      <ul className="list-disc pl-3.5 space-y-0.5 mt-0.5">
                        <li>The application may be filed in advance, that is, at least five (5) days prior to the scheduled date of the gynecological surgery that will be undergone by the employee. In case of emergency, the application for special leave shall be filed immediately upon employee&apos;s return but during confinement the agency shall be notified of said surgery.</li>
                        <li>The application shall be accompanied by a medical certificate filled out by the proper medical authorities, e.g. the attending surgeon accompanied by a clinical summary reflecting the gynecological disorder which shall be addressed or was addressed by the said surgery; the histopathological report; the operative technique used for the surgery; the duration of the surgery including the peri-operative period (period of confinement around surgery); as well as the employee&apos;s estimated period of recuperation for the same.</li>
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold">12. Special Emergency (Calamity) leave – up to 5 days</span>
                      <ul className="list-disc pl-3.5 space-y-0.5 mt-0.5">
                        <li>The special emergency leave can be applied for a maximum of five (5) straight working days or staggered basis within thirty (30) days from the actual occurrence of the natural calamity/disaster. Said privilege shall be enjoyed once a year, not in every instance of calamity or disaster.</li>
                        <li>The head of office shall take full responsibility for the grant of special emergency leave and verification of the employee&apos;s eligibility to be granted thereof. Said verification shall include: validation of place of residence based on latest available records of the affected employee; verification that the place of residence is covered in the declaration of calamity area by the proper government agency; and such other proofs as may be necessary.</li>
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold">13. Monetization of leave credits</span>
                      <p className="mt-0.5">
                        Application for monetization of fifty percent (50%) or more of the accumulated leave credits shall be accompanied by letter request to the head of the agency stating the valid and justifiable reasons.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold">14. Terminal leave*</span>
                      <p className="mt-0.5">
                        Proof of employee&apos;s resignation or retirement or separation from the service.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold">15. Adoption Leave</span>
                      <ul className="list-disc pl-3.5 space-y-0.5 mt-0.5">
                        <li>Application for adoption leave shall be filed with an authenticated copy of the Pre-Adoptive Placement Authority issued by the Department of Social Welfare and Development (DSWD).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footnote */}
              <div className="border-t border-black pt-1.5 mt-2 text-[7.5pt] italic text-justify leading-snug">
                * For leave of absence for thirty (30) calendar days or more and terminal leave, application shall be accompanied by a <span className="underline">clearance from money, property and work-related accountabilities</span> (pursuant to CSC Memorandum Circular No. 2, s. 1985).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaveCheckbox({ label, checked }: { label: string; checked: boolean }): React.JSX.Element {
  return (
    <div className="flex items-start gap-1.5 leading-tight">
      <span className="font-mono text-xs select-none shrink-0">{checked ? '[✓]' : '[  ]'}</span>
      <span className={checked ? 'font-bold text-slate-900' : 'text-slate-800'}>{label}</span>
    </div>
  )
}
