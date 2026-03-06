import { useState, useCallback } from 'react'
import { fetchEntries } from '../api'
import { groupEntriesByDate } from '../utils/date'

export default function useEntries(token, childId) {
  const [entriesByDate, setEntriesByDate] = useState({})

  const loadEntries = useCallback(async () => {
    if (!token) return
    try {
      const data = await fetchEntries(token, 1000, {}, childId)
      setEntriesByDate(groupEntriesByDate(data))
    } catch (err) {
      console.error('기록 불러오기 실패:', err)
    }
  }, [token, childId])

  return { entriesByDate, loadEntries }
}
