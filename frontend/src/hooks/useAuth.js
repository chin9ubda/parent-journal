import { useState, useCallback } from 'react'

export default function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('pj_token'))
  const [role, setRole] = useState(() => localStorage.getItem('pj_role'))
  const [babyName, setBabyName] = useState(() => localStorage.getItem('pj_baby_name') || '')
  const [dueDate, setDueDate] = useState(() => localStorage.getItem('pj_due_date') || '')

  const login = useCallback((t, r, remember, settings = {}) => {
    setToken(t)
    setRole(r)
    setBabyName(settings.baby_name || '')
    setDueDate(settings.due_date || '')
    if (remember) {
      localStorage.setItem('pj_token', t)
      localStorage.setItem('pj_role', r)
    }
    localStorage.setItem('pj_baby_name', settings.baby_name || '')
    localStorage.setItem('pj_due_date', settings.due_date || '')
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setRole(null)
    setBabyName('')
    setDueDate('')
    localStorage.removeItem('pj_token')
    localStorage.removeItem('pj_role')
    localStorage.removeItem('pj_baby_name')
    localStorage.removeItem('pj_due_date')
  }, [])

  const setSettings = useCallback((name, date) => {
    setBabyName(name || '')
    setDueDate(date || '')
    localStorage.setItem('pj_baby_name', name || '')
    localStorage.setItem('pj_due_date', date || '')
  }, [])

  return { token, role, babyName, dueDate, login, logout, setSettings }
}
