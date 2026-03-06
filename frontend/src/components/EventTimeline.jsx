import { useState, useEffect } from 'react'
import { fetchTimeline } from '../api'
import './EventTimeline.css'

export default function EventTimeline({ token, onNavigate, activeChildId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchTimeline(token, activeChildId)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, activeChildId])

  if (loading) return <div className="event-timeline__empty">불러오는 중...</div>

  if (events.length === 0) {
    return (
      <div className="event-timeline__empty">
        <div className="event-timeline__empty-icon">○</div>
        <p>일기 작성 시 '타임라인 이벤트'를 체크하면<br/>여기에 표시됩니다</p>
      </div>
    )
  }

  return (
    <div className="event-timeline">
      <div className="event-timeline__list">
        {events.map((ev, i) => (
          <div
            key={ev.id}
            className="event-timeline__item"
            onClick={() => onNavigate('detail', ev.id)}
          >
            <div className="event-timeline__rail">
              <div className="event-timeline__dot" />
              {i < events.length - 1 && <div className="event-timeline__line" />}
            </div>
            <div className="event-timeline__content">
              <div className="event-timeline__header">
                <span className="event-timeline__date">{ev.date}</span>
                <span className="event-timeline__label">{ev.timeline_label}</span>
              </div>
              {ev.body && (
                <div className="event-timeline__body">{ev.body}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
