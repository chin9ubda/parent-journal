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
import TestTracker from './components/TestTracker'
import EventTimeline from './components/EventTimeline'
import Gallery from './components/Gallery'
import GrowthTracker from './components/GrowthTracker'
import CareTracker from './components/CareTracker'
import Dashboard from './components/Dashboard'
import VaccinationTracker from './components/VaccinationTracker'
import Settings from './components/Settings'
import Modal from './components/Modal'
import './App.css'

export default function App() {
  const {
    token, role, babyName, dueDate,
    children, activeChildId, activeChild,
    login: authLogin, logout, setSettings, switchChild, updateChildren,
  } = useAuth()
  const { view, viewId, modal, navigate, openModal, closeModal, closeModalAndNavigate } = useNavigation()
  const { entriesByDate, loadEntries } = useEntries(token, activeChildId)
  const [detailKey, setDetailKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (token) loadEntries()
  }, [token, loadEntries, activeChildId])

  if (!token) return <Login onLogin={authLogin} />

  const showHeader = view !== 'detail'

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
    navigate('dashboard')
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
          children={children}
          activeChildId={activeChildId}
          onSwitchChild={switchChild}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {view === 'dashboard' && (
        <Dashboard
          token={token}
          dueDate={dueDate}
          onNavigate={navigate}
          onNewEntry={() => openModal()}
          activeChildId={activeChildId}
        />
      )}

      {view === 'timeline' && (
        <Timeline token={token} onViewEntry={id => navigate('detail', id)} onNewEntry={() => openModal()} activeChildId={activeChildId} />
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
          dueDate={dueDate}
        />
      )}

      {view === 'test' && (
        <TestTracker token={token} activeChildId={activeChildId} />
      )}

      {view === 'events' && (
        <EventTimeline token={token} onNavigate={navigate} activeChildId={activeChildId} />
      )}

      {view === 'gallery' && (
        <Gallery token={token} onNavigate={navigate} activeChildId={activeChildId} />
      )}

      {view === 'growth' && (
        <GrowthTracker token={token} activeChildId={activeChildId} />
      )}

      {view === 'care' && (
        <CareTracker token={token} activeChildId={activeChildId} />
      )}

      {view === 'vaccination' && (
        <VaccinationTracker token={token} activeChildId={activeChildId} />
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
              activeChildId={activeChildId}
            />
          )}
        </Modal>
      )}

      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)}>
          <Settings
            token={token}
            children={children}
            activeChildId={activeChildId}
            onChildrenUpdated={updateChildren}
            onSaved={handleSettingsSaved}
            onClose={() => setSettingsOpen(false)}
            onLogout={logout}
          />
        </Modal>
      )}
    </div>
  )
}
