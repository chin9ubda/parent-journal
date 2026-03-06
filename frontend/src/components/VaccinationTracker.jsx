import { useState, useEffect } from 'react'
import { fetchVaccinations, createVaccination, deleteVaccination } from '../api'
import './VaccinationTracker.css'

// 한국 국가 필수 예방접종 스케줄
export const VACCINATION_SCHEDULE = [
  { group: '출생', ageMonths: 0, vaccines: [
    { name: 'BCG (피내용)', doses: 1 },
    { name: 'B형간염', doses: 1, doseLabel: '1차' },
  ]},
  { group: '1개월', ageMonths: 1, vaccines: [
    { name: 'B형간염', doses: 1, doseLabel: '2차' },
  ]},
  { group: '2개월', ageMonths: 2, vaccines: [
    { name: 'DTaP', doses: 1, doseLabel: '1차' },
    { name: 'IPV (폴리오)', doses: 1, doseLabel: '1차' },
    { name: 'Hib (뇌수막염)', doses: 1, doseLabel: '1차' },
    { name: 'PCV (폐렴구균)', doses: 1, doseLabel: '1차' },
    { name: '로타바이러스', doses: 1, doseLabel: '1차' },
  ]},
  { group: '4개월', ageMonths: 4, vaccines: [
    { name: 'DTaP', doses: 1, doseLabel: '2차' },
    { name: 'IPV (폴리오)', doses: 1, doseLabel: '2차' },
    { name: 'Hib (뇌수막염)', doses: 1, doseLabel: '2차' },
    { name: 'PCV (폐렴구균)', doses: 1, doseLabel: '2차' },
    { name: '로타바이러스', doses: 1, doseLabel: '2차' },
  ]},
  { group: '6개월', ageMonths: 6, vaccines: [
    { name: 'B형간염', doses: 1, doseLabel: '3차' },
    { name: 'DTaP', doses: 1, doseLabel: '3차' },
    { name: 'IPV (폴리오)', doses: 1, doseLabel: '3차' },
    { name: 'Hib (뇌수막염)', doses: 1, doseLabel: '3차' },
    { name: 'PCV (폐렴구균)', doses: 1, doseLabel: '3차' },
    { name: '로타바이러스', doses: 1, doseLabel: '3차' },
    { name: '인플루엔자', doses: 1, doseLabel: '매년' },
  ]},
  { group: '12개월', ageMonths: 12, vaccines: [
    { name: 'MMR (홍역)', doses: 1, doseLabel: '1차' },
    { name: '수두', doses: 1, doseLabel: '1차' },
    { name: 'Hib (뇌수막염)', doses: 1, doseLabel: '추가' },
    { name: 'PCV (폐렴구균)', doses: 1, doseLabel: '추가' },
    { name: 'A형간염', doses: 1, doseLabel: '1차' },
  ]},
  { group: '15~18개월', ageMonths: 15, vaccines: [
    { name: 'DTaP', doses: 1, doseLabel: '추가(4차)' },
  ]},
  { group: '18~23개월', ageMonths: 18, vaccines: [
    { name: 'A형간염', doses: 1, doseLabel: '2차' },
  ]},
  { group: '24개월', ageMonths: 24, vaccines: [
    { name: '일본뇌염 (사백신)', doses: 1, doseLabel: '1~2차' },
    { name: '일본뇌염 (생백신)', doses: 1, doseLabel: '1차' },
  ]},
  { group: '4~6세', ageMonths: 48, vaccines: [
    { name: 'DTaP', doses: 1, doseLabel: '5차' },
    { name: 'IPV (폴리오)', doses: 1, doseLabel: '4차' },
    { name: 'MMR (홍역)', doses: 1, doseLabel: '2차' },
    { name: '일본뇌염 (사백신)', doses: 1, doseLabel: '추가' },
    { name: '일본뇌염 (생백신)', doses: 1, doseLabel: '2차' },
  ]},
  { group: '6세', ageMonths: 72, vaccines: [
    { name: 'Td/Tdap', doses: 1, doseLabel: '6차' },
  ]},
  { group: '12세', ageMonths: 144, vaccines: [
    { name: 'HPV (자궁경부암)', doses: 1, doseLabel: '1~2차' },
  ]},
]

// Helper: unique key for a vaccination item
function vaccKey(groupLabel, name, doseLabel) {
  return `${groupLabel}|${name}|${doseLabel}`
}

// Count total items
export const TOTAL_VACCINATIONS = VACCINATION_SCHEDULE.reduce(
  (sum, g) => sum + g.vaccines.length, 0
)

export default function VaccinationTracker({ token, activeChildId }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [token, activeChildId])

  async function load() {
    try {
      const data = await fetchVaccinations(token, activeChildId)
      setRecords(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  // Build a lookup: key -> record
  const recordMap = {}
  for (const r of records) {
    const key = `${r.vaccine_name}|${r.dose_number}`
    recordMap[key] = r
  }

  // match record by group+vaccine
  function findRecord(group, vaccine) {
    const key = `${group.group}|${vaccine.name}|${vaccine.doseLabel}`
    // look up by stored key format
    for (const r of records) {
      const rKey = vaccKey(r.memo || '', r.vaccine_name, r.dose_number)
      if (rKey === key) return r
    }
    // fallback: match vaccine_name + dose_number (stored as doseLabel string)
    return records.find(r =>
      r.vaccine_name === vaccine.name &&
      String(r.dose_number) === String(vaccine.doseLabel) &&
      String(r.scheduled_age_months) === String(group.ageMonths)
    )
  }

  async function handleToggle(group, vaccine, checked) {
    const existing = findRecord(group, vaccine)
    if (checked && !existing) {
      const today = new Date().toISOString().slice(0, 10)
      await createVaccination(token, {
        vaccine_name: vaccine.name,
        dose_number: String(vaccine.doseLabel),
        scheduled_age_months: group.ageMonths,
        date_completed: today,
        memo: group.group,
        child_id: activeChildId || undefined,
      })
    } else if (!checked && existing) {
      await deleteVaccination(existing.id, token)
    }
    load()
  }

  async function handleDateChange(group, vaccine, date) {
    const existing = findRecord(group, vaccine)
    if (existing) {
      // delete and re-create with new date
      await deleteVaccination(existing.id, token)
    }
    await createVaccination(token, {
      vaccine_name: vaccine.name,
      dose_number: String(vaccine.doseLabel),
      scheduled_age_months: group.ageMonths,
      date_completed: date,
      memo: group.group,
      child_id: activeChildId || undefined,
    })
    load()
  }

  const completedCount = records.length
  const progress = TOTAL_VACCINATIONS > 0
    ? Math.round((completedCount / TOTAL_VACCINATIONS) * 100) : 0

  if (loading) return <div className="vacc-tracker"><p>로딩 중...</p></div>

  return (
    <div className="vacc-tracker">
      <div className="vacc-tracker__progress-card">
        <div className="vacc-tracker__progress-header">
          <span className="vacc-tracker__progress-title">접종 진행률</span>
          <span className="vacc-tracker__progress-count">{completedCount}/{TOTAL_VACCINATIONS}</span>
        </div>
        <div className="vacc-tracker__progress-bar">
          <div className="vacc-tracker__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="vacc-tracker__progress-pct">{progress}%</div>
      </div>

      {VACCINATION_SCHEDULE.map(group => (
        <div key={group.group} className="vacc-tracker__group">
          <div className="vacc-tracker__group-header">{group.group}</div>
          <div className="vacc-tracker__group-list">
            {group.vaccines.map(vaccine => {
              const record = findRecord(group, vaccine)
              const isCompleted = !!record
              return (
                <div key={vaccKey(group.group, vaccine.name, vaccine.doseLabel)}
                  className={`vacc-tracker__item ${isCompleted ? 'vacc-tracker__item--done' : ''}`}>
                  <label className="vacc-tracker__check">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={e => handleToggle(group, vaccine, e.target.checked)}
                    />
                    <span className="vacc-tracker__checkmark" />
                  </label>
                  <div className="vacc-tracker__item-info">
                    <span className="vacc-tracker__item-name">{vaccine.name}</span>
                    <span className="vacc-tracker__item-dose">{vaccine.doseLabel}</span>
                  </div>
                  <input
                    type="date"
                    className="vacc-tracker__date"
                    value={record?.date_completed || ''}
                    onChange={e => handleDateChange(group, vaccine, e.target.value)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
