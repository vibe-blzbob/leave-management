import { useSearchParams } from 'react-router-dom'
import { LeaveTypesModule } from './settings/LeaveTypesModule'
import { SignatoriesModule } from './settings/SignatoriesModule'

type SettingsTab = 'leave-types' | 'signatories'

export default function Settings(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: SettingsTab = rawTab === 'signatories' ? 'signatories' : 'leave-types'

  const selectTab = (tab: SettingsTab): void => {
    setSearchParams({ tab }, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="text-sm text-slate-400">
          Manage leave types and authorized application signatories.
        </p>
      </div>

      {/* Sub-module Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => selectTab('leave-types')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'leave-types'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <span>Leave Types</span>
        </button>
        <button
          type="button"
          onClick={() => selectTab('signatories')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'signatories'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <span>Application Signatories</span>
        </button>
      </div>

      {/* Render Active Sub-module */}
      <div>
        {activeTab === 'leave-types' && <LeaveTypesModule />}
        {activeTab === 'signatories' && <SignatoriesModule />}
      </div>
    </div>
  )
}
