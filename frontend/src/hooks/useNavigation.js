import { useState, useEffect, useCallback, useRef } from 'react'

export default function useNavigation() {
  const [view, setView] = useState('dashboard')
  const [viewId, setViewId] = useState(null)
  const [modal, setModal] = useState({
    open: false, editId: null, date: null, fromCalendar: false
  })
  const skipPopRef = useRef(false)

  useEffect(() => {
    if (!history.state?.view) {
      history.replaceState({ view: 'dashboard', modal: false }, '')
    }

    function onPopState() {
      // Skip this popstate if we're handling a closeAndNavigate
      if (skipPopRef.current) {
        skipPopRef.current = false
        return
      }
      const s = history.state || {}
      if (s.view) {
        setView(s.view)
        setViewId(s.id || null)
      }
      if (s.modal) {
        setModal({
          open: true,
          editId: s.modalId || null,
          date: s.modalDate || null,
          fromCalendar: s.modalFrom === 'calendar'
        })
      } else {
        setModal({ open: false, editId: null, date: null, fromCalendar: false })
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((newView, id = null) => {
    history.pushState({ view: newView, id }, '')
    setView(newView)
    setViewId(id)
  }, [])

  const openModal = useCallback((opts = {}) => {
    const { editId = null, date = null, fromCalendar = false } = opts
    history.pushState({
      modal: true,
      modalId: editId,
      modalDate: date,
      modalFrom: fromCalendar ? 'calendar' : null
    }, '')
    setModal({ open: true, editId, date, fromCalendar })
  }, [])

  const closeModal = useCallback(() => {
    history.back()
    setModal({ open: false, editId: null, date: null, fromCalendar: false })
  }, [])

  // Close modal and navigate in one step (avoids popstate race condition)
  const closeModalAndNavigate = useCallback((newView, id = null) => {
    skipPopRef.current = true
    history.back()
    setModal({ open: false, editId: null, date: null, fromCalendar: false })
    // Use setTimeout to ensure the back() completes before pushState
    setTimeout(() => {
      history.replaceState({ view: newView, id }, '')
      setView(newView)
      setViewId(id)
    }, 0)
  }, [])

  return { view, viewId, modal, navigate, openModal, closeModal, closeModalAndNavigate }
}
