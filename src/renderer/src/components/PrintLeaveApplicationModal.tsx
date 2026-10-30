import { useEffect, useMemo, useState } from 'react'
import type { Employee, LeaveRow, Signatory } from '../../../shared/types'
import { api, errMsg, useLoad } from '../lib'
import maguindanaoLogo from '../assets/maguindanao_del_norte.jpg'
import bangsamoroLogo from '../assets/bangsamoro.png'

export interface PrintModalProps {
  leave: LeaveRow
  employee: Employee
  onClose: () => void
}

export function PrintLeaveApplicationModal({ leave, employee, onClose }: PrintModalProps): React.JSX.Element {
  const [signatories] = useLoad(api.listSignatories, [] as Signatory[])
  const [balances] = useLoad(() => api.balances(new Date().getFullYear()), [])

  // Dynamic form state
  const [salary, setSalary] = useState('')
  const [commutation, setCommutation] = useState<'not_requested' | 'requested'>('not_requested')
  const [vacationLoc, setVacationLoc] = useState<'philippines' | 'abroad' | ''>('')
  const [vacationLocDetail, setVacationLocDetail] = useState('')
  const [sickType, setSickType] = useState<'hospital' | 'outpatient' | ''>('')
  const [sickDetail, setSickDetail] = useState('')
  const [womenIllness, setWomenIllness] = useState('')
  const [studyPurpose, setStudyPurpose] = useState<'masters' | 'bar' | ''>('')
  const [otherPurpose, setOtherPurpose] = useState<'monetization' | 'terminal' | ''>('')

  // Signatory selection
  const certifiers = useMemo(() => signatories.filter((s) => s.role === 'certifier' || s.role === 'other'), [signatories])
  const supervisors = useMemo(() => signatories.filter((s) => s.role === 'supervisor' || s.role === 'other'), [signatories])
  const approvers = useMemo(() => signatories.filter((s) => s.role === 'approver' || s.role === 'other'), [signatories])

  const [selectedCertId, setSelectedCertId] = useState<string>('')
  const [selectedSupId, setSelectedSupId] = useState<string>('')
  const [selectedAppId, setSelectedAppId] = useState<string>('')

  // Manually editable Approving Authority
  const [appName, setAppName] = useState('DATU TUCAO O. MASTURA, CPA')
  const [appPosition, setAppPosition] = useState('Provincial Governor')

  const handleSelectApp = (id: string): void => {
    setSelectedAppId(id)
    const found = approvers.find((s) => String(s.id) === id)
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
      if (!selectedSupId) {
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
  }, [signatories, employee.department, selectedCertId, selectedSupId, selectedAppId, certifiers, supervisors, approvers])

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
    () => balances.filter((b) => b.employee_id === employee.id),
    [balances, employee.id]
  )

  const vlBal = empBalances.find((b) => b.leave_type_id === 1) // Vacation Leave
  const slBal = empBalances.find((b) => b.leave_type_id === 2 || b.leave_type_id === 3) // Sick Leave

  const isVl = leave.type_name?.toLowerCase().includes('vacation') || leave.type_name?.toLowerCase().includes('forced')
  const isSl = leave.type_name?.toLowerCase().includes('sick')

  const vlTotal = vlBal?.accrued ?? 0
  const vlLess = isVl ? leave.days : 0
  const vlRemaining = Math.max(0, vlTotal - vlLess)

  const slTotal = slBal?.accrued ?? 0
  const slLess = isSl ? leave.days : 0
  const slRemaining = Math.max(0, slTotal - slLess)

  function formatDate(val: string | Date | undefined): string {
    if (!val) return ''
    const d = typeof val === 'string' ? new Date(val.length === 10 ? val + 'T00:00:00' : val) : val
    if (isNaN(d.getTime())) return String(val)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`
  }

  const asOfDate = formatDate(new Date())
  const filingDate = formatDate(leave.created_at || new Date())
  const [generating, setGenerating] = useState(false)

  const handlePrint = async (): Promise<void> => {
    setGenerating(true)
    try {
      const cleanEmpName = (employee.name || 'employee').replace(/[^a-zA-Z0-9]/g, '_')
      await api.printToPdf(`leave-app-${cleanEmpName}`)
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="print-modal-card flex h-[96vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="no-print flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/95 p-3 sm:p-4 gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-sm sm:text-base font-semibold text-white">CS Form No. 6 — Print Preview</h2>
            <span className="hidden sm:inline text-xs text-slate-400">Page 1 & 2 (8.5 × 13 in)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn text-xs sm:text-sm py-1 sm:py-1.5"
              onClick={handlePrint}
              disabled={generating}
            >
              {generating ? '⏳ Generating PDF…' : '📄 Generate & Open PDF'}
            </button>
            <button className="btn btn-ghost text-xs sm:text-sm py-1 sm:py-1.5" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {/* Options Drawer (Hidden during print) */}
        <div className="no-print border-b border-slate-800 bg-slate-950/70 p-3 sm:p-4 text-xs text-slate-300 max-h-[35vh] overflow-y-auto shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* 7.A Certifying Officer */}
            <label className="flex flex-col gap-1 md:col-span-3">
              <span className="font-semibold text-slate-300">7.A Certifying Officer (HR):</span>
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

            {/* 7.B Immediate Supervisor */}
            <label className="flex flex-col gap-1 md:col-span-4">
              <span className="font-semibold text-slate-300">7.B Immediate Supervisor:</span>
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

            {/* 7.C Approving Authority */}
            <div className="flex flex-col gap-1 md:col-span-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">7.C Approving Authority:</span>
                <select
                  className="rounded bg-slate-800 px-1.5 py-0.5 text-[10.5px] text-slate-300 border border-slate-700"
                  value={selectedAppId}
                  onChange={(e) => handleSelectApp(e.target.value)}
                  title="Choose preset"
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
                  title="Approving Authority Name (Editable)"
                />
                <input
                  className="input py-1 text-xs"
                  placeholder="Designation / Position"
                  value={appPosition}
                  onChange={(e) => setAppPosition(e.target.value)}
                  title="Approving Authority Position (Editable)"
                />
              </div>
            </div>
          </div>

          {/* Conditional Detail Options */}
          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-800/60 pt-2.5">
            <label className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Monthly Salary (Optional):</span>
              <input
                className="input py-1 text-xs w-36"
                placeholder="e.g. ₱ 25,000.00"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </label>

            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">6.D Commutation:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="commutation"
                  checked={commutation === 'not_requested'}
                  onChange={() => setCommutation('not_requested')}
                />
                Not Requested
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
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
                <span className="font-medium text-slate-400">6.B VL Location:</span>
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
                    className="input py-0.5 text-xs flex-1"
                    placeholder="Specific destination"
                    value={vacationLocDetail}
                    onChange={(e) => setVacationLocDetail(e.target.value)}
                  />
                )}
              </div>
            )}

            {isSl && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-400">6.B Sick Type:</span>
                <select
                  className="input py-0.5 text-xs w-auto"
                  value={sickType}
                  onChange={(e) => setSickType(e.target.value as 'hospital' | 'outpatient' | '')}
                >
                  <option value="">(Select)</option>
                  <option value="hospital">In Hospital</option>
                  <option value="outpatient">Out Patient</option>
                </select>
                {sickType && (
                  <input
                    className="input py-0.5 text-xs flex-1"
                    placeholder="Specify illness"
                    value={sickDetail}
                    onChange={(e) => setSickDetail(e.target.value)}
                  />
                )}
              </div>
            )}

            {leave.type_name?.toLowerCase().includes('women') && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-400">6.B Women Illness:</span>
                <input
                  className="input py-0.5 text-xs flex-1"
                  placeholder="Specify gynecological disorder"
                  value={womenIllness}
                  onChange={(e) => setWomenIllness(e.target.value)}
                />
              </div>
            )}

            {leave.type_name?.toLowerCase().includes('study') && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-400">6.B Study Purpose:</span>
                <select
                  className="input py-0.5 text-xs w-auto"
                  value={studyPurpose}
                  onChange={(e) => setStudyPurpose(e.target.value as 'masters' | 'bar' | '')}
                >
                  <option value="">(Select)</option>
                  <option value="masters">Completion of Master's Degree</option>
                  <option value="bar">BAR/Board Examination Review</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-400">Other Purpose:</span>
              <select
                className="input py-0.5 text-xs w-auto"
                value={otherPurpose}
                onChange={(e) => setOtherPurpose(e.target.value as 'monetization' | 'terminal' | '')}
              >
                <option value="">(None)</option>
                <option value="monetization">Monetization</option>
                <option value="terminal">Terminal Leave</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Paper Container */}
        <div className="print-modal-scroll flex-1 overflow-auto bg-slate-950/40 p-2 sm:p-4 md:p-8 flex justify-center">
          <div className="cs-form-printable flex flex-col gap-8 items-center" style={{ width: '8.5in' }}>
            {/* ================= PAGE 1 ================= */}
            <div
              className="cs-page cs-page-1 p-5 text-[10px] leading-[1.28] text-black bg-white shadow-2xl flex flex-col justify-between"
              style={{ width: '8.5in', minHeight: '13in', boxSizing: 'border-box' }}
            >
              <div>
                {/* Form Header */}
                <div className="text-[9px] font-serif italic mb-1 flex justify-between">
                  <span>Civil Service Form No. 6<br />Revised 2020</span>
                </div>

                <div className="relative flex items-center justify-between mb-1.5 pb-1">
                  {/* Left Seal: Maguindanao del Norte */}
                  <img
                    src={maguindanaoLogo}
                    alt="Province of Maguindanao del Norte"
                    className="w-16 h-16 object-contain shrink-0"
                  />

                  {/* Header Titles */}
                  <div className="text-center flex-1 px-2">
                    <div className="text-[10px] font-medium uppercase tracking-wide">Republic of the Philippines</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-slate-900">
                      PROVINCIAL GOVERNMENT OF MAGUINDANAO DEL NORTE
                    </div>
                    <div className="text-[9.5px] text-slate-700">
                      Provincial Government Satellite Office, Sinsuat Avenue, Cotabato City
                    </div>
                    <div className="text-[14px] font-extrabold uppercase mt-0.5 tracking-widest border-b-2 border-black inline-block px-3 pb-0.5">
                      APPLICATION FOR LEAVE
                    </div>
                  </div>

                  {/* Right Seal: BARMM */}
                  <img
                    src={bangsamoroLogo}
                    alt="Bangsamoro Autonomous Region in Muslim Mindanao"
                    className="w-16 h-16 object-contain shrink-0"
                  />
                </div>

                {/* Box 1-5: Employee Information Table */}
                <table className="w-full border-2 border-black border-collapse text-[10.5px]">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="w-1/2 border-r border-black p-1.5 align-top">
                        <span className="font-bold">1. OFFICE/DEPARTMENT:</span>
                        <div className="font-semibold text-slate-900 uppercase mt-0.5 pl-2">{employee.department || 'General'}</div>
                      </td>
                      <td className="w-1/2 p-1.5 align-top">
                        <span className="font-bold">2. NAME :</span>
                        <div className="font-semibold text-slate-900 uppercase mt-0.5 pl-2 tracking-wide">{employee.name}</div>
                      </td>
                    </tr>
                    <tr className="border-b-2 border-black">
                      <td className="border-r border-black p-1.5 align-top">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">3. DATE OF FILING:</span>
                          <span className="font-semibold text-slate-900 pl-1 text-sm">{filingDate}</span>
                        </div>
                      </td>
                      <td className="p-1.5 align-top">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-bold">4. POSITION:</span>
                            <div className="font-semibold text-slate-900 uppercase mt-0.5">{employee.position || 'Staff'}</div>
                          </div>
                          <div>
                            <span className="font-bold">5. SALARY:</span>
                            <div className="font-semibold text-slate-900 mt-0.5">{salary || '_______________'}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Section 6: Details of Application Header */}
                <div className="border-x-2 border-b-2 border-black bg-slate-200 text-center font-bold text-[11px] py-0.5 tracking-wide uppercase">
                  6. DETAILS OF APPLICATION
                </div>

                {/* Section 6.A and 6.B */}
                <table className="w-full border-x-2 border-b border-black border-collapse text-[10px]">
                  <tbody>
                    <tr className="divide-x border-black">
                      {/* 6.A: Type of Leave */}
                      <td className="w-1/2 p-2 align-top space-y-1.5 border-r border-black">
                        <div className="font-bold text-[10.5px] mb-1">6.A TYPE OF LEAVE TO BE AVAILED OF</div>

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

                        <div className="pt-1">
                          <span className="font-semibold">Others:</span>
                          <span className="border-b border-black inline-block w-40 ml-1">
                            {!isKnownType(leave.type_name) ? leave.type_name : ''}
                          </span>
                        </div>
                      </td>

                      {/* 6.B: Details of Leave */}
                      <td className="w-1/2 p-2 align-top text-[10px] space-y-2">
                        <div className="font-bold text-[10.5px]">6.B DETAILS OF LEAVE</div>

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

                {/* Section 6.C and 6.D */}
                <table className="w-full border-x-2 border-b-2 border-black border-collapse text-[10px]">
                  <tbody>
                    <tr className="border-b border-black">
                      {/* 6.C Number of Working Days & Inclusive Dates */}
                      <td className="w-1/2 p-2.5 border-r border-black align-top">
                        <div className="flex flex-col justify-between h-full space-y-3">
                          <div>
                            <div className="font-bold">6.C NUMBER OF WORKING DAYS APPLIED FOR</div>
                            <div className="mt-1 pl-4 border-b border-black pb-0.5">
                              <span className="font-bold text-[12px] text-slate-950 tracking-wide">
                                {leave.days} DAY{leave.days > 1 ? 'S' : ''}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="font-bold">INCLUSIVE DATES:</div>
                            <div className="mt-1 pl-4 border-b border-black pb-0.5">
                              <span className="font-semibold text-[11px] text-slate-950 tracking-wide">
                                {formatDate(leave.start_date)} to {formatDate(leave.end_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 6.D Commutation & Applicant Signature */}
                      <td className="w-1/2 p-2 align-top">
                        <div className="flex flex-col justify-between h-full min-h-[85px]">
                          <div>
                            <div className="font-bold">6.D COMMUTATION</div>
                            <div className="pl-4 space-y-1 mt-1.5">
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

                {/* Section 7: Action on Application Header */}
                <div className="border-x-2 border-b-2 border-black bg-slate-200 text-center font-bold text-[11px] py-1 tracking-wider uppercase">
                  7. DETAILS OF ACTION ON APPLICATION
                </div>

                {/* Section 7.A and 7.B */}
                <table className="w-full border-x-2 border-b-2 border-black border-collapse text-[10px]">
                  <tbody>
                    <tr>
                      {/* 7.A: Certification of Leave Credits */}
                      <td className="w-1/2 p-2.5 align-top border-r border-black">
                        <div className="flex flex-col justify-between h-full">
                          <div>
                            <div className="font-bold">7.A CERTIFICATION OF LEAVE CREDITS</div>
                            <div className="italic text-[9.5px] mt-0.5 mb-2">
                              As of <span className="font-semibold underline">{asOfDate}</span>
                            </div>

                            <table className="w-full border border-black border-collapse text-center text-[9.5px] mb-2">
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

                          <div className="mt-4 mb-0.5 text-center">
                            <div className="w-56 mx-auto border-b border-black mb-1">
                              <span className="font-bold text-[10.5px] uppercase tracking-wide">
                                {activeCert.name || '_______________________________'}
                              </span>
                            </div>
                            <div className="text-[9.5px] font-semibold text-slate-900 uppercase">{activeCert.position}</div>
                            {/* <div className="text-[8.5px] text-slate-600 uppercase tracking-wider">(Authorized Officer)</div> */}
                          </div>
                        </div>
                      </td>

                      {/* 7.B: Recommendation */}
                      <td className="w-1/2 p-2 align-top">
                        <div className="flex flex-col justify-between h-full">
                          <div>
                            <div className="font-bold">7.B RECOMMENDATION</div>
                            <div className="pl-3 space-y-1 mt-1.5">
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

                          <div className="mt-4 mb-0.5 text-center">
                            <div className="w-56 mx-auto border-b border-black mb-1">
                              <span className="font-bold text-[10.5px] uppercase tracking-wide">
                                {activeSup.name || '_______________________________'}
                              </span>
                            </div>
                            <div className="text-[9.5px] font-semibold text-slate-900 uppercase">{activeSup.position}</div>
                            {/* <div className="text-[8.5px] text-slate-600 uppercase tracking-wider">(Immediate Supervisor)</div> */}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Section 7.C and 7.D with Centered Approving Authority Signature */}
                <table className="w-full border-x-2 border-b-2 border-black border-collapse text-[10px]">
                  <tbody>
                    <tr className="border-b border-black">
                      {/* 7.C: Approved For */}
                      <td className="w-1/2 p-2.5 border-r border-black align-top">
                        <div className="font-bold">7.C APPROVED FOR:</div>
                        <div className="pl-4 space-y-1.5 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="border-b border-black min-w-[40px] text-center font-bold">
                              {leave.status === 'approved' ? leave.days : '____'}
                            </span>
                            <span>days with pay</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="border-b border-black min-w-[40px] text-center font-bold">____</span>
                            <span>days without pay</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="border-b border-black min-w-[40px] text-center font-bold">____</span>
                            <span>others (Specify)</span>
                          </div>
                        </div>
                      </td>

                      {/* 7.D: Disapproved Due To */}
                      <td className="w-1/2 p-2.5 align-top">
                        <div className="font-bold">7.D DISAPPROVED DUE TO:</div>
                        <div className="pl-4 mt-2 space-y-3">
                          <div className="border-b border-black w-full" />
                          <div className="border-b border-black w-full" />
                          <div className="border-b border-black w-full" />
                        </div>
                      </td>
                    </tr>

                    {/* Centered Final Approving Authority / Governor Signature Block */}
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-center bg-slate-50/40">
                        <div className="w-80 mx-auto border-b-2 border-black mb-1">
                          <span className="font-extrabold text-[12px] uppercase tracking-wider text-slate-950">
                            {appName || '_______________________________'}
                          </span>
                        </div>
                        <div className="text-[10.5px] font-bold text-slate-900 uppercase tracking-wide">
                          {appPosition || 'Provincial Governor'}
                        </div>
                        {/* <div className="text-[8.5px] text-slate-600 uppercase tracking-wider mt-0.5">
                          (Authorized Official)
                        </div> */}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ================= PAGE 2 (Mandatory Back-to-Back) ================= */}
            <div
              className="cs-page cs-page-2 p-5 text-[9.5px] leading-[1.3] text-black bg-white shadow-2xl flex flex-col justify-between"
              style={{ width: '8.5in', minHeight: '13in', boxSizing: 'border-box', pageBreakBefore: 'always' }}
            >
              <div className="border-2 border-black p-4 h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-center font-bold text-[12px] tracking-wider uppercase mb-2.5 border-b-2 border-black pb-1 text-black">
                    INSTRUCTIONS AND REQUIREMENTS
                  </h2>

                  <p className="mb-2 text-justify">
                    Application for any type of leave shall be made on this Form and to be accomplished at least in duplicate with documentary requirements, as follows:
                  </p>

                  <ol className="space-y-1.5 list-none pl-0 text-justify">
                    <li>
                      <span className="font-bold">1. Vacation leave*</span><br />
                      It shall be filed five (5) days in advance, whenever possible, of the effective date of such leave. Vacation leave within the Philippines or abroad shall be indicated in the form for purposes of securing travel authority and completing clearance from money and work accountabilities.
                    </li>

                    <li>
                      <span className="font-bold">2. Mandatory/Forced leave</span><br />
                      Annual five-day vacation leave shall be forfeited if not taken during the year. In case the scheduled leave has been cancelled in the exigency of the service by the head of agency, it shall no longer be deducted from the accumulated vacation leave. Availment of one (1) day or more Vacation Leave (VL) shall be considered for complying the mandatory/forced leave subject to the conditions under Section 25, Rule XVI of the Omnibus Rules Implementing E.O. No. 292.
                    </li>

                    <li>
                      <span className="font-bold">3. Sick leave*</span><br />
                      • It shall be filed immediately upon employee's return from such leave.<br />
                      • If filed in advance or exceeding five (5) days, application shall be accompanied by a medical certificate. In case medical consultation was not availed of, an affidavit should be executed by an applicant.
                    </li>

                    <li>
                      <span className="font-bold">4. Maternity leave* – 105 days</span><br />
                      • Proof of pregnancy e.g. ultrasound, doctor’s certificate on the expected date of delivery<br />
                      • Accomplished Notice of Allocation of Maternity Leave Credits (CS Form No. 6a), if needed<br />
                      • Seconded female employees shall enjoy maternity leave with full pay in the recipient agency.
                    </li>

                    <li>
                      <span className="font-bold">5. Paternity leave – 7 days</span><br />
                      Proof of child’s delivery e.g. birth certificate, medical certificate and marriage contract.
                    </li>

                    <li>
                      <span className="font-bold">6. Special Privilege leave – 3 days</span><br />
                      It shall be filed/approved for at least one (1) week prior to availment, except on emergency cases. Special privilege leave within the Philippines or abroad shall be indicated in the form for purposes of securing travel authority and completing clearance from money and work accountabilities.
                    </li>

                    <li>
                      <span className="font-bold">7. Solo Parent leave – 7 days</span><br />
                      It shall be filed in advance or whenever possible five (5) days before going on such leave with updated Solo Parent Identification Card.
                    </li>

                    <li>
                      <span className="font-bold">8. Study leave* – up to 6 months</span><br />
                      • Shall meet the agency’s internal requirements, if any;<br />
                      • Contract between the agency head or authorized representative and the employee concerned.
                    </li>

                    <li>
                      <span className="font-bold">9. VAWC leave – 10 days</span><br />
                      • It shall be filed in advance or immediately upon the woman employee’s return from such leave.<br />
                      • It shall be accompanied by any of the following supporting documents:
                      <div className="pl-3 text-[10px] space-y-0.5 mt-0.5">
                        <div>a. Barangay Protection Order (BPO) obtained from the barangay;</div>
                        <div>b. Temporary/Permanent Protection Order (TPO/PPO) obtained from the court;</div>
                        <div>c. If the protection order is not yet issued by the barangay or the court, a certification issued by the Punong Barangay/Kagawad or Prosecutor or the Clerk of Court that the application for the BPO, TPO or PPO has been filed with the said office shall be sufficient to support the application for the ten-day leave; or</div>
                        <div>d. In the absence of the BPO/TPO/PPO or the certification, a police report specifying the details of the occurrence of violence on the victim and a medical certificate may be considered, at the discretion of the immediate supervisor of the woman employee concerned.</div>
                      </div>
                    </li>

                    <li>
                      <span className="font-bold">10. Rehabilitation leave* – up to 6 months</span><br />
                      • Application shall be made within one (1) week from the time of the accident except when a longer period is warranted.<br />
                      • Letter request supported by relevant reports such as the police report, if any.<br />
                      • Medical certificate on the nature of the injuries, the course of treatment involved, and the need to undergo rest, recuperation, and rehabilitation, as the case may be.<br />
                      • Written concurrence of a government physician should be obtained relative to the recommendation for rehabilitation if the attending physician is a private practitioner, particularly on the duration of the period of rehabilitation.
                    </li>

                    <li>
                      <span className="font-bold">11. Special leave benefits for women* – up to 2 months</span><br />
                      • The application may be filed in advance, that is, at least five (5) days prior to the scheduled date of the gynecological surgery that will be undergone by the employee. In case of emergency, the application for special leave shall be filed immediately upon employee’s return but during confinement the agency shall be notified of said surgery.<br />
                      • The application shall be accompanied by a medical certificate filled out by the proper medical authorities, e.g. the attending surgeon accompanied by a clinical summary reflecting the gynecological disorder which shall be addressed or was addressed by the said surgery; the histopathological report; the operative technique used for the surgery; the duration of the surgery including the peri-operative period (period of confinement around surgery); as well as the employee's estimated period of recuperation for the same.
                    </li>

                    <li>
                      <span className="font-bold">12. Special Emergency (Calamity) leave – up to 5 days</span><br />
                      • The special emergency leave can be applied for a maximum of five (5) straight working days or staggered basis within thirty (30) days from the actual occurrence of the natural calamity/disaster. Said privilege shall be enjoyed once a year, not in every instance of calamity or disaster.<br />
                      • The head of office shall take full responsibility for the grant of special emergency leave and verification of the employee’s eligibility to be granted thereof.
                    </li>

                    <li>
                      <span className="font-bold">13. Monetization of leave credits</span><br />
                      Application for monetization of fifty percent (50%) or more of the accumulated leave credits shall be accompanied by letter request to the head of the agency stating the valid and justifiable reasons.
                    </li>

                    <li>
                      <span className="font-bold">14. Terminal leave*</span><br />
                      Proof of employee’s resignation or retirement or separation from the service.
                    </li>

                    <li>
                      <span className="font-bold">15. Adoption Leave</span><br />
                      Application for adoption leave shall be filed with an authenticated copy of the Pre-Adoptive Placement Authority issued by the Department of Social Welfare and Development (DSWD).
                    </li>
                  </ol>
                </div>

                <div className="border-t border-black pt-2 mt-4 text-[9px] italic">
                  * For leave of absence for thirty (30) calendar days or more and terminal leave, application shall be accompanied by a clearance from money, property and work-related accountabilities (pursuant to CSC Memorandum Circular No. 2, s. 1985).
                </div>
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

function isKnownType(name?: string): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  return (
    lower.includes('vacation') ||
    lower.includes('forced') ||
    lower.includes('sick') ||
    lower.includes('maternity') ||
    lower.includes('paternity') ||
    lower.includes('special privilege') ||
    lower.includes('solo parent') ||
    lower.includes('study') ||
    lower.includes('vawc') ||
    lower.includes('rehabilitation') ||
    lower.includes('women') ||
    lower.includes('calamity') ||
    lower.includes('adoption')
  )
}
