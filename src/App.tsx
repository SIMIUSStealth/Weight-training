import { useEffect } from 'react'
import { useStore, type Tab } from './store/useStore'
import { Today } from './screens/Today'
import { Progress } from './screens/Progress'
import { History } from './screens/History'
import { Settings } from './screens/Settings'
import { Stretch } from './screens/Stretch'
import { Workout } from './overlays/Workout'
import { ExerciseDetail } from './overlays/ExerciseDetail'
import { SessionDetail } from './overlays/SessionDetail'
import { Summary } from './overlays/Summary'
import { DayPlanView } from './overlays/DayPlanView'
import { performBackup } from './ui/backup'
import { Alert, Chart, Gear, History as HistoryIcon, Home, Reach, X } from './ui/icons'

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'today', label: 'Today', Icon: Home },
  { id: 'progress', label: 'Progress', Icon: Chart },
  { id: 'history', label: 'History', Icon: HistoryIcon },
  { id: 'stretch', label: 'Stretch', Icon: Reach },
  { id: 'settings', label: 'Settings', Icon: Gear },
]

export default function App() {
  const loaded = useStore((s) => s.loaded)
  const init = useStore((s) => s.init)
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)
  const overlay = useStore((s) => s.overlay)
  const saveError = useStore((s) => s.saveError)
  const dismissSaveError = useStore((s) => s.dismissSaveError)
  const getBackup = useStore((s) => s.getBackup)
  const recordBackup = useStore((s) => s.recordBackup)

  useEffect(() => {
    void init()
  }, [init])

  if (!loaded) {
    return (
      <div className="app">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="app">
      {tab === 'today' && <Today />}
      {tab === 'progress' && <Progress />}
      {tab === 'history' && <History />}
      {tab === 'stretch' && <Stretch />}
      {tab === 'settings' && <Settings />}

      <nav className="bottom-nav">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={'nav-btn' + (tab === id ? ' active' : '')}
            onClick={() => setTab(id)}
          >
            <Icon size={22} />
            {label}
          </button>
        ))}
      </nav>

      {overlay?.name === 'workout' && <Workout />}
      {overlay?.name === 'exercise' && (
        <ExerciseDetail exerciseId={overlay.exerciseId} />
      )}
      {overlay?.name === 'session' && <SessionDetail sessionId={overlay.sessionId} />}
      {overlay?.name === 'summary' && <Summary summary={overlay.summary} />}
      {overlay?.name === 'day' && <DayPlanView weekday={overlay.weekday} />}

      {/* a write to the device failed — the log is still in memory: get it out */}
      {saveError && (
        <div className="save-error" role="alert">
          <Alert size={18} />
          <span className="grow">{saveError}</span>
          <button
            className="btn btn-sm"
            onClick={async () => {
              const res = await performBackup(getBackup())
              if (res !== 'cancelled') {
                recordBackup()
                dismissSaveError()
              }
            }}
          >
            Back up
          </button>
          <button className="icon-btn" onClick={dismissSaveError} aria-label="dismiss">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
