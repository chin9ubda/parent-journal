import { useState } from 'react'
import { getUploadUrl } from '../utils/url'
import './CalendarView.css'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function buildMilestones(dueDate) {
  if (!dueDate) return {}
  const due = new Date(dueDate + 'T00:00:00')
  const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
  const milestones = {}
  // 출산예정일
  milestones[fmt(due)] = '출산예정일'
  // 출생 후 기념일 (예정일 기준)
  milestones[fmt(addDays(due, 100))] = '백일'
  milestones[fmt(addDays(due, 365))] = '첫돌'
  milestones[fmt(addDays(due, 50))] = '50일'
  milestones[fmt(addDays(due, 200))] = '200일'
  return milestones
}

function getPregnancyWeek(dueDate, dateKey) {
  if (!dueDate) return null
  const due = new Date(dueDate + 'T00:00:00')
  const target = new Date(dateKey + 'T00:00:00')
  if (target > due) return null
  const start = new Date(due)
  start.setDate(start.getDate() - 280)
  const elapsed = Math.floor((target - start) / (1000 * 60 * 60 * 24))
  const week = Math.floor(elapsed / 7)
  const day = elapsed % 7
  if (week < 0 || day < 0) return null
  return `${week}/${day}`
}

export default function CalendarView({ entriesByDate, onOpenDate, dueDate }) {
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

  const todayStr = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') })()
  const milestones = buildMilestones(dueDate)
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
              className={`calendar__cell ${cell.inMonth ? 'calendar__cell--active' : ''} ${cell.key === todayStr ? 'calendar__cell--today' : ''} ${milestones[cell.key] ? 'calendar__cell--milestone' : ''}`}
              onClick={() => cell.inMonth && onOpenDate(cell.key)}
            >
              {cell.inMonth && (
                <>
                  <div className="calendar__cell-day">
                    {cell.day}
                    {(() => {
                      const pw = getPregnancyWeek(dueDate, cell.key)
                      return pw ? <span className="calendar__cell-pw">{pw}</span> : null
                    })()}
                  </div>
                  {milestones[cell.key] && (
                    <div className="calendar__cell-milestone">{milestones[cell.key]}</div>
                  )}
                  <div className="calendar__cell-bottom">
                    {cell.entries.length > 0 ? (
                      <div className="calendar__cell-count">{cell.entries.length}개</div>
                    ) : <span />}
                    {getThumbUrl(cell.entries) && (
                      <img
                        src={getThumbUrl(cell.entries)}
                        alt=""
                        className="calendar__cell-thumb"
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
