import { useState } from 'react'
import { getUploadUrl } from '../utils/url'
import './CalendarView.css'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function CalendarView({ entriesByDate, onOpenDate }) {
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  function prev() {
    setYearMonth(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })
  }

  function next() {
    setYearMonth(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const startDay = new Date(yearMonth.y, yearMonth.m, 1).getDay()
  const daysInMonth = new Date(yearMonth.y, yearMonth.m + 1, 0).getDate()
  const totalCells = startDay + daysInMonth
  const weekCount = Math.ceil(totalCells / 7)
  const weeks = []
  let day = 1 - startDay
  for (let w = 0; w < weekCount; w++) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const cur = new Date(yearMonth.y, yearMonth.m, day)
      const inMonth = cur.getMonth() === yearMonth.m
      const key = cur.getFullYear() + '-' +
        String(cur.getMonth() + 1).padStart(2, '0') + '-' +
        String(cur.getDate()).padStart(2, '0')
      const entries = entriesByDate?.[key] || []
      week.push({ day: cur.getDate(), inMonth, key, entries })
      day++
    }
    weeks.push(week)
  }

  function getThumbUrl(entries) {
    const last = entries[entries.length - 1]
    if (last?.images?.length > 0) {
      return getUploadUrl(last.images[0].thumb)
    }
    return null
  }

  return (
    <div className="calendar">
      <div className="calendar__container">
        <div className="calendar__nav">
          <button onClick={prev} aria-label="이전 달">◀</button>
          <div className="calendar__month">{yearMonth.y}년 {yearMonth.m + 1}월</div>
          <button onClick={next} aria-label="다음 달">▶</button>
        </div>
        <div className="calendar__grid">
          {DAY_LABELS.map(h => (
            <div key={h} className="calendar__day-label">{h}</div>
          ))}
          {weeks.flat().map(cell => (
            <div
              key={cell.key}
              className={`calendar__cell ${cell.inMonth ? 'calendar__cell--active' : ''} ${cell.key === todayStr ? 'calendar__cell--today' : ''}`}
              onClick={() => cell.inMonth && onOpenDate(cell.key)}
            >
              {cell.inMonth && (
                <>
                  <div className="calendar__cell-day">{cell.day}</div>
                  {cell.entries.length > 0 && (
                    <div className="calendar__cell-count">{cell.entries.length}개</div>
                  )}
                  {getThumbUrl(cell.entries) && (
                    <img
                      src={getThumbUrl(cell.entries)}
                      alt=""
                      className="calendar__cell-thumb"
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
