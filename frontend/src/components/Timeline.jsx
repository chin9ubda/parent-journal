import { useState, useEffect } from 'react'
import { fetchEntries } from '../api'
import './Timeline.css'

export default function Timeline({ token, onViewEntry, onNewEntry }) {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    if (token) loadEntries()
  }, [token])

  async function loadEntries() {
    try {
      const data = await fetchEntries(token)
      setEntries(data)
    } catch (err) {
      console.error('Failed to load entries:', err)
    }
  }

  return (
    <div className="timeline">
      <button className="btn btn--primary timeline__new-btn" onClick={onNewEntry}>
        + 새 기록
      </button>
      <div className="timeline__grid">
        {entries.map(e => (
          <div key={e.id} className="timeline__card" onClick={() => onViewEntry(e.id)}>
            <small className="timeline__date">{e.date}</small>
            <p className="timeline__body">{e.body.slice(0, 140)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
