import { useState, useEffect } from 'react'
import useAuth from './hooks/useAuth'
import useNavigation from './hooks/useNavigation'
import useEntries from './hooks/useEntries'
import Login from './components/Login'
import Header from './components/Header'
import Timeline from './components/Timeline'
import Detail from './components/Detail'
import CalendarView from './components/CalendarView'
import Editor from './components/Editor'
import ListModal from './components/ListModal'
import Settings from './components/Settings'
import Modal from './components/Modal'
import './App.css'

export default function App() {
  const { token, role, babyName, dueDate, login, setSettings } = useAuth()
  const { view, viewId, modal, navigate, openModal, closeModal, closeModalAndNavigate } = useNavigation()
  const { entriesByDate, loadEntries } = useEntries(token)
  const [detailKey, setDetailKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (token) loadEntries()
  }, [token, loadEntries])

  if (!token) return <Login onLogin={login} />

  const showHeader = view !== 'detail' && !modal.open && !settingsOpen

  function handleOpenDate(dateKey) {
    openModal({ date: dateKey, fromCalendar: true })
  }

  function handleModalDone(eid) {
    if (eid) {
      closeModalAndNavigate('detail', eid)
      setDetailKey(k => k + 1)
    } else {
      closeModal()
    }
    loadEntries()
  }

  function handleEntryDeleted() {
    navigate('timeline')
    loadEntries()
  }

  function handleSettingsSaved(name, date) {
    setSettings(name, date)
    setSettingsOpen(false)
  }

  const isListModal = modal.fromCalendar &&
    entriesByDate[modal.date]?.length > 0

  return (
    <div>
      {showHeader && (
        <Header
          view={view}
          onNavigate={navigate}
          babyName={babyName}
          dueDate={dueDate}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {view === 'timeline' && (
        <Timeline token={token} onViewEntry={id => navigate('detail', id)} onNewEntry={() => openModal()} />
      )}

      {view === 'detail' && (
        <Detail
          key={detailKey}
          token={token}
          id={viewId}
          onBack={() => history.back()}
          onEdit={id => openModal({ editId: id })}
          onDeleted={handleEntryDeleted}
        />
      )}

      {view === 'calendar' && (
        <CalendarView
          entriesByDate={entriesByDate}
          onOpenDate={handleOpenDate}
        />
      )}

      {modal.open && (
        <Modal onClose={closeModal} wide={!isListModal}>
          {isListModal ? (
            <ListModal
              items={entriesByDate[modal.date]}
              date={modal.date}
              token={token}
              onClose={closeModal}
              onOpenEntry={id => closeModalAndNavigate('detail', id)}
            />
          ) : (
            <Editor
              token={token}
              editId={modal.editId}
              initialDate={modal.date}
              onDone={handleModalDone}
            />
          )}
        </Modal>
      )}

      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)}>
          <Settings
            token={token}
            babyName={babyName}
            dueDate={dueDate}
            onSaved={handleSettingsSaved}
            onClose={() => setSettingsOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
