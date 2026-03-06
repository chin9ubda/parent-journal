import { useState, useCallback, useMemo } from 'react'

export default function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('pj_token'))
  const [role, setRole] = useState(() => localStorage.getItem('pj_role'))
  const [children, setChildren] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pj_children')) || [] } catch { return [] }
  })
  const [activeChildId, setActiveChildId] = useState(() => {
    const stored = localStorage.getItem('pj_active_child_id')
    return stored ? Number(stored) : null
  })

  // Derived: backward-compatible babyName/dueDate from active child
  const activeChild = useMemo(
    () => children.find(c => c.id === activeChildId) || children[0] || null,
    [children, activeChildId]
  )
  const babyName = activeChild?.name || ''
  const dueDate = activeChild?.due_date || ''

  // Auto-correct stale activeChildId (e.g. deleted child)
  if (children.length > 0 && activeChild && activeChild.id !== activeChildId) {
    const correctedId = activeChild.id
    setTimeout(() => {
      setActiveChildId(correctedId)
      localStorage.setItem('pj_active_child_id', String(correctedId))
    }, 0)
  }

  const _persistChildren = useCallback((list, activeId) => {
    localStorage.setItem('pj_children', JSON.stringify(list))
    const id = activeId ?? list[0]?.id ?? null
    localStorage.setItem('pj_active_child_id', id != null ? String(id) : '')
    setChildren(list)
    setActiveChildId(id)
  }, [])

  const login = useCallback((t, r, remember, settings = {}) => {
    setToken(t)
    setRole(r)
    if (remember) {
      localStorage.setItem('pj_token', t)
      localStorage.setItem('pj_role', r)
    }
    // Support new children array from login response
    const childList = settings.children || []
    if (childList.length > 0) {
      _persistChildren(childList, childList[0].id)
    } else {
      // Legacy fallback
      localStorage.setItem('pj_baby_name', settings.baby_name || '')
      localStorage.setItem('pj_due_date', settings.due_date || '')
    }
  }, [_persistChildren])

  const logout = useCallback(() => {
    setToken(null)
    setRole(null)
    setChildren([])
    setActiveChildId(null)
    localStorage.removeItem('pj_token')
    localStorage.removeItem('pj_role')
    localStorage.removeItem('pj_baby_name')
    localStorage.removeItem('pj_due_date')
    localStorage.removeItem('pj_children')
    localStorage.removeItem('pj_active_child_id')
  }, [])

  const setSettings = useCallback((name, date) => {
    // Legacy compat — update active child in local list
    setChildren(prev => {
      const updated = prev.map(c =>
        c.id === activeChildId ? { ...c, name: name || c.name, due_date: date || c.due_date } : c
      )
      localStorage.setItem('pj_children', JSON.stringify(updated))
      return updated
    })
  }, [activeChildId])

  const switchChild = useCallback((childId) => {
    setActiveChildId(childId)
    localStorage.setItem('pj_active_child_id', String(childId))
  }, [])

  const updateChildren = useCallback((list) => {
    _persistChildren(list, activeChildId && list.find(c => c.id === activeChildId) ? activeChildId : list[0]?.id)
  }, [_persistChildren, activeChildId])

  return {
    token, role, babyName, dueDate,
    children, activeChildId, activeChild,
    login, logout, setSettings, switchChild, updateChildren,
  }
}
