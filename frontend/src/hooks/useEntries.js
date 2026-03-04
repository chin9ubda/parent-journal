import { useState, useCallback } from 'react'
import { fetchEntries } from '../api'
import { groupEntriesByDate } from '../utils/date'

export default function useEntries(token) {
  const [entriesByDate, setEntriesByDate] = useState({})

  const loadEntries = useCallback(async () => {
    if (!token) return
    try {
      const data = await fetchEntries(token)
      setEntriesByDate(groupEntriesByDate(data))
    } catch (err) {
      console.error('기록 불러오기 실패:', err)
    }
  }, [token])

  return { entriesByDate, loadEntries }
}
