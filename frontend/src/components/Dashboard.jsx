import { useState, useEffect } from 'react'
import { fetchCareSummary, fetchGrowthRecords, fetchEntries, fetchVaccinations } from '../api'
import { VACCINATION_SCHEDULE, TOTAL_VACCINATIONS } from './VaccinationTracker'
import PregnancyInfo from './PregnancyInfo'
import './Dashboard.css'

export default function Dashboard({ token, dueDate, onNavigate, onNewEntry, activeChildId }) {
  const [care, setCare] = useState(null)
  const [growth, setGrowth] = useState(null)
  const [entries, setEntries] = useState(null)
  const [vaccinations, setVaccinations] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    Promise.allSettled([
      fetchCareSummary(token, today, activeChildId),
      fetchGrowthRecords(token, activeChildId),
      fetchEntries(token, 3, {}, activeChildId),
      fetchVaccinations(token, activeChildId),
    ]).then(([careRes, growthRes, entriesRes, vaccRes]) => {
      if (careRes.status === 'fulfilled') setCare(careRes.value)
      if (growthRes.status === 'fulfilled') setGrowth(growthRes.value)
      if (entriesRes.status === 'fulfilled') setEntries(entriesRes.value)
      if (vaccRes.status === 'fulfilled') setVaccinations(vaccRes.value)
      setLoading(false)
    })
  }, [token, activeChildId])

  // Find next upcoming vaccination
  function getNextVaccination() {
    if (!vaccinations) return null
    const completedKeys = new Set(
      vaccinations.map(v => `${v.vaccine_name}|${v.dose_number}|${v.scheduled_age_months}`)
    )
    for (const group of VACCINATION_SCHEDULE) {
      for (const vaccine of group.vaccines) {
        const key = `${vaccine.name}|${vaccine.doseLabel}|${group.ageMonths}`
        if (!completedKeys.has(key)) {
          return { group: group.group, name: vaccine.name, dose: vaccine.doseLabel }
        }
      }
    }
    return null
  }

  const nextVacc = getNextVaccination()
  const vaccCompleted = vaccinations?.length || 0
  const latestGrowth = growth && growth.length > 0 ? growth[growth.length - 1] : null

  if (loading) {
    return <div className="dashboard"><div className="dashboard__loading">로딩 중...</div></div>
  }

  return (
    <div className="dashboard">
      <PregnancyInfo dueDate={dueDate} />

      <div className="dashboard__grid">
        {/* 오늘의 돌봄 */}
        <div className="dashboard__card" onClick={() => onNavigate('care')}>
          <div className="dashboard__card-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17s-7-4.8-7-9a4 4 0 018 0 4 4 0 018 0c0 4.2-7 9-7 9z"/>
            </svg>
          </div>
          <div className="dashboard__card-title">오늘의 돌봄</div>
          {care ? (
            <div className="dashboard__card-body">
              <div className="dashboard__stat">
                <span className="dashboard__stat-val">{care.feeding_count || 0}</span>
                <span className="dashboard__stat-label">수유</span>
              </div>
              <div className="dashboard__stat">
                <span className="dashboard__stat-val">{care.sleep_hours != null ? care.sleep_hours.toFixed(1) : 0}</span>
                <span className="dashboard__stat-label">수면(h)</span>
              </div>
              <div className="dashboard__stat">
                <span className="dashboard__stat-val">{care.diaper_count || 0}</span>
                <span className="dashboard__stat-label">기저귀</span>
              </div>
            </div>
          ) : (
            <div className="dashboard__card-empty">기록이 없습니다</div>
          )}
        </div>

        {/* 최근 성장 */}
        <div className="dashboard__card" onClick={() => onNavigate('growth')}>
          <div className="dashboard__card-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l5-6 3 3 6-8"/><circle cx="17" cy="6" r="1.5"/>
            </svg>
          </div>
          <div className="dashboard__card-title">최근 성장</div>
          {latestGrowth ? (
            <div className="dashboard__card-body">
              {latestGrowth.height && (
                <div className="dashboard__stat">
                  <span className="dashboard__stat-val">{latestGrowth.height}</span>
                  <span className="dashboard__stat-label">cm</span>
                </div>
              )}
              {latestGrowth.weight && (
                <div className="dashboard__stat">
                  <span className="dashboard__stat-val">{latestGrowth.weight}</span>
                  <span className="dashboard__stat-label">kg</span>
                </div>
              )}
              <div className="dashboard__stat-date">{latestGrowth.date}</div>
            </div>
          ) : (
            <div className="dashboard__card-empty">기록이 없습니다</div>
          )}
        </div>

        {/* 다음 접종 */}
        <div className="dashboard__card" onClick={() => onNavigate('vaccination')}>
          <div className="dashboard__card-icon dashboard__card-icon--vacc">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3l-2 2m0 0l-3-1-7 7 3 3 7-7-1-3 2-2zM9 11l-4 4"/>
              <path d="M4 15l-1 1"/>
            </svg>
          </div>
          <div className="dashboard__card-title">예방접종</div>
          <div className="dashboard__card-body">
            <div className="dashboard__vacc-progress">
              <div className="dashboard__vacc-bar">
                <div className="dashboard__vacc-fill"
                  style={{ width: `${Math.round((vaccCompleted / TOTAL_VACCINATIONS) * 100)}%` }} />
              </div>
              <span className="dashboard__vacc-count">{vaccCompleted}/{TOTAL_VACCINATIONS}</span>
            </div>
            {nextVacc ? (
              <div className="dashboard__vacc-next">
                다음: <strong>{nextVacc.name}</strong> {nextVacc.dose} ({nextVacc.group})
              </div>
            ) : (
              <div className="dashboard__vacc-next">모든 접종 완료!</div>
            )}
          </div>
        </div>

        {/* 빠른 기록 */}
        <div className="dashboard__card dashboard__card--actions">
          <div className="dashboard__card-title">빠른 기록</div>
          <div className="dashboard__quick-actions">
            <button className="dashboard__quick-btn" onClick={onNewEntry}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3 4h12M3 9h8M3 14h10"/>
              </svg>
              일기 쓰기
            </button>
            <button className="dashboard__quick-btn" onClick={() => onNavigate('care')}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 15.5s-6-4.35-6-8.15A3.5 3.5 0 019 4.85a3.5 3.5 0 016 2.5c0 3.8-6 8.15-6 8.15z"/>
              </svg>
              돌봄 기록
            </button>
            <button className="dashboard__quick-btn" onClick={() => onNavigate('growth')}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 15l4-5 3 3 5-7"/><circle cx="15" cy="6" r="1.5"/>
              </svg>
              성장 기록
            </button>
          </div>
        </div>
      </div>

      {/* 최근 일기 — full-width */}
      {entries && entries.length > 0 && (
        <div className="dashboard__entries" onClick={() => onNavigate('timeline')}>
          <div className="dashboard__entries-header">
            <span>최근 일기</span>
            <span className="dashboard__entries-more">더보기 &rarr;</span>
          </div>
          {entries.slice(0, 3).map(entry => (
            <div key={entry.id} className="dashboard__entry"
              onClick={e => { e.stopPropagation(); onNavigate('detail', entry.id) }}>
              <div className="dashboard__entry-date">{entry.date}</div>
              {entry.body && (
                <div className="dashboard__entry-preview">
                  {entry.body.slice(0, 100)}{entry.body.length > 100 ? '...' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
