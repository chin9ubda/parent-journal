import { useState, useEffect } from 'react'
import {
  fetchCareRecords, fetchCareSummary, createCareRecord, updateCareRecord, deleteCareRecord,
  fetchBabyfoodRecords, createBabyfoodRecord, updateBabyfoodRecord, deleteBabyfoodRecord,
  fetchHospitalRecords, createHospitalRecord, updateHospitalRecord, deleteHospitalRecord,
} from '../api'
import './CareTracker.css'

const TABS = [
  { key: 'feeding', label: '수유' },
  { key: 'sleep', label: '수면' },
  { key: 'diaper', label: '기저귀' },
  { key: 'babyfood', label: '이유식' },
  { key: 'hospital', label: '병원' },
]

export default function CareTracker({ token, activeChildId }) {
  const [tab, setTab] = useState('feeding')

  return (
    <div className="care-tracker">
      <div className="care-tracker__tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`care-tracker__tab ${tab === t.key ? 'care-tracker__tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="care-tracker__panel">
        {tab === 'feeding' && <FeedingPanel token={token} activeChildId={activeChildId} />}
        {tab === 'sleep' && <SleepPanel token={token} activeChildId={activeChildId} />}
        {tab === 'diaper' && <DiaperPanel token={token} activeChildId={activeChildId} />}
        {tab === 'babyfood' && <BabyfoodPanel token={token} activeChildId={activeChildId} />}
        {tab === 'hospital' && <HospitalPanel token={token} activeChildId={activeChildId} />}
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────
function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function nowTimeStr() {
  const d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function nowDatetimeLocal() {
  return todayStr() + 'T' + nowTimeStr()
}

function formatTime(dt) {
  if (!dt) return ''
  const t = dt.includes('T') ? dt.split('T')[1] : dt
  return t.slice(0, 5)
}

function formatDate(dt) {
  if (!dt) return ''
  return dt.includes('T') ? dt.split('T')[0] : dt
}

function calcMinutes(start, end) {
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.round((e - s) / 60000)
  return diff > 0 ? diff : null
}

function formatDuration(min) {
  if (!min) return ''
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

// ─── Feeding Panel ──────────────────────────────────
function FeedingPanel({ token, activeChildId }) {
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState({ datetime: nowDatetimeLocal(), feeding_type: '모유', amount_ml: '', duration_min: '' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [token, activeChildId])

  async function load() {
    try {
      const [recs, sum] = await Promise.all([
        fetchCareRecords(token, 'feeding', activeChildId),
        fetchCareSummary(token, todayStr(), activeChildId),
      ])
      setRecords(recs)
      setSummary(sum)
      if (recs.length > 0 && !editId) {
        setForm(f => ({ ...f, feeding_type: recs[0].feeding_type || '모유' }))
      }
    } catch (e) { console.error(e) }
  }

  function resetForm() {
    const lastType = records.length > 0 ? records[0].feeding_type || '모유' : '모유'
    setForm({ datetime: nowDatetimeLocal(), feeding_type: lastType, amount_ml: '', duration_min: '' })
    setEditId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const data = {
      category: 'feeding',
      datetime: form.datetime,
      feeding_type: form.feeding_type,
      amount_ml: form.amount_ml ? parseFloat(form.amount_ml) : null,
      duration_min: form.duration_min ? parseFloat(form.duration_min) : null,
      child_id: activeChildId || undefined,
    }
    try {
      if (editId) {
        await updateCareRecord(token, editId, data)
      } else {
        await createCareRecord(token, data)
      }
      await load()
      resetForm()
    } catch (err) { alert('저장 실패') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    try { await deleteCareRecord(id, token); await load(); if (editId === id) resetForm() }
    catch { alert('삭제 실패') }
  }

  function handleEdit(r) {
    if (editId === r.id) { resetForm(); return }
    setEditId(r.id)
    setForm({
      datetime: r.datetime,
      feeding_type: r.feeding_type || '모유',
      amount_ml: r.amount_ml != null ? String(r.amount_ml) : '',
      duration_min: r.duration_min != null ? String(r.duration_min) : '',
    })
  }

  const feedSummary = summary?.feeding

  return (
    <div>
      {feedSummary && (
        <div className="care-tracker__summary">
          <span>오늘 수유 {feedSummary.count}회</span>
          {feedSummary.total_ml > 0 && <span> · 총 {feedSummary.total_ml}ml</span>}
        </div>
      )}
      <form className="care-tracker__form" onSubmit={handleSubmit}>
        <input type="datetime-local" value={form.datetime} onChange={e => setForm({ ...form, datetime: e.target.value })} required />
        <div className="care-tracker__row">
          <select value={form.feeding_type} onChange={e => setForm({ ...form, feeding_type: e.target.value })}>
            <option value="모유">모유</option>
            <option value="분유">분유</option>
            <option value="혼합">혼합</option>
          </select>
          <input type="number" placeholder="ml" value={form.amount_ml} onChange={e => setForm({ ...form, amount_ml: e.target.value })} />
          <input type="number" placeholder="분" value={form.duration_min} onChange={e => setForm({ ...form, duration_min: e.target.value })} />
        </div>
        <div className="care-tracker__form-actions">
          <button type="submit" className="care-tracker__submit" disabled={saving}>
            {saving ? '저장 중...' : editId ? '수정' : '추가'}
          </button>
          {editId && <button type="button" className="care-tracker__cancel" onClick={resetForm}>취소</button>}
        </div>
      </form>
      <RecordList
        records={records}
        editId={editId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderItem={r => (
          <>
            <span className="care-tracker__card-time">{formatTime(r.datetime)}</span>
            <span className="care-tracker__badge">{r.feeding_type}</span>
            {r.amount_ml != null && <span className="care-tracker__val">{r.amount_ml}ml</span>}
            {r.duration_min != null && <span className="care-tracker__val">{r.duration_min}분</span>}
          </>
        )}
      />
    </div>
  )
}

// ─── Sleep Panel ────────────────────────────────────
function SleepPanel({ token, activeChildId }) {
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState({ datetime: nowDatetimeLocal(), end_datetime: nowDatetimeLocal() })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [token, activeChildId])

  async function load() {
    try {
      const [recs, sum] = await Promise.all([
        fetchCareRecords(token, 'sleep', activeChildId),
        fetchCareSummary(token, todayStr(), activeChildId),
      ])
      setRecords(recs)
      setSummary(sum)
    } catch (e) { console.error(e) }
  }

  function resetForm() {
    setForm({ datetime: nowDatetimeLocal(), end_datetime: nowDatetimeLocal() })
    setEditId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const dur = calcMinutes(form.datetime, form.end_datetime)
    const data = {
      category: 'sleep',
      datetime: form.datetime,
      end_datetime: form.end_datetime,
      duration_min: dur,
      child_id: activeChildId || undefined,
    }
    try {
      if (editId) {
        await updateCareRecord(token, editId, data)
      } else {
        await createCareRecord(token, data)
      }
      await load()
      resetForm()
    } catch { alert('저장 실패') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    try { await deleteCareRecord(id, token); await load(); if (editId === id) resetForm() }
    catch { alert('삭제 실패') }
  }

  function handleEdit(r) {
    if (editId === r.id) { resetForm(); return }
    setEditId(r.id)
    setForm({
      datetime: r.datetime,
      end_datetime: r.end_datetime || r.datetime,
    })
  }

  const sleepSummary = summary?.sleep

  return (
    <div>
      {sleepSummary && (
        <div className="care-tracker__summary">
          <span>오늘 수면 {sleepSummary.count}회</span>
          {sleepSummary.total_min > 0 && <span> · 총 {formatDuration(sleepSummary.total_min)}</span>}
        </div>
      )}
      <form className="care-tracker__form" onSubmit={handleSubmit}>
        <div className="care-tracker__row">
          <label className="care-tracker__field">
            <span>시작</span>
            <input type="datetime-local" value={form.datetime} onChange={e => setForm({ ...form, datetime: e.target.value })} required />
          </label>
          <label className="care-tracker__field">
            <span>종료</span>
            <input type="datetime-local" value={form.end_datetime} onChange={e => setForm({ ...form, end_datetime: e.target.value })} required />
          </label>
        </div>
        {calcMinutes(form.datetime, form.end_datetime) > 0 && (
          <div className="care-tracker__calc">= {formatDuration(calcMinutes(form.datetime, form.end_datetime))}</div>
        )}
        <div className="care-tracker__form-actions">
          <button type="submit" className="care-tracker__submit" disabled={saving}>
            {saving ? '저장 중...' : editId ? '수정' : '추가'}
          </button>
          {editId && <button type="button" className="care-tracker__cancel" onClick={resetForm}>취소</button>}
        </div>
      </form>
      <RecordList
        records={records}
        editId={editId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderItem={r => {
          const dur = calcMinutes(r.datetime, r.end_datetime)
          return (
            <>
              <span className="care-tracker__card-time">{formatTime(r.datetime)} ~ {formatTime(r.end_datetime)}</span>
              {dur && <span className="care-tracker__val">{formatDuration(dur)}</span>}
            </>
          )
        }}
      />
    </div>
  )
}

// ─── Diaper Panel ───────────────────────────────────
function DiaperPanel({ token, activeChildId }) {
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState({ datetime: nowDatetimeLocal(), diaper_type: '소변' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [token, activeChildId])

  async function load() {
    try {
      const [recs, sum] = await Promise.all([
        fetchCareRecords(token, 'diaper', activeChildId),
        fetchCareSummary(token, todayStr(), activeChildId),
      ])
      setRecords(recs)
      setSummary(sum)
    } catch (e) { console.error(e) }
  }

  function resetForm() {
    setForm({ datetime: nowDatetimeLocal(), diaper_type: '소변' })
    setEditId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const data = {
      category: 'diaper',
      datetime: form.datetime,
      diaper_type: form.diaper_type,
      child_id: activeChildId || undefined,
    }
    try {
      if (editId) {
        await updateCareRecord(token, editId, data)
      } else {
        await createCareRecord(token, data)
      }
      await load()
      resetForm()
    } catch { alert('저장 실패') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    try { await deleteCareRecord(id, token); await load(); if (editId === id) resetForm() }
    catch { alert('삭제 실패') }
  }

  function handleEdit(r) {
    if (editId === r.id) { resetForm(); return }
    setEditId(r.id)
    setForm({ datetime: r.datetime, diaper_type: r.diaper_type || '소변' })
  }

  const diaperSummary = summary?.diaper || {}
  const diaperTotal = Object.values(diaperSummary).reduce((a, b) => a + b, 0)

  return (
    <div>
      {diaperTotal > 0 && (
        <div className="care-tracker__summary">
          <span>오늘 기저귀 {diaperTotal}회</span>
          {Object.entries(diaperSummary).map(([k, v]) => (
            <span key={k}> · {k} {v}회</span>
          ))}
        </div>
      )}
      <form className="care-tracker__form" onSubmit={handleSubmit}>
        <input type="datetime-local" value={form.datetime} onChange={e => setForm({ ...form, datetime: e.target.value })} required />
        <div className="care-tracker__row">
          <select value={form.diaper_type} onChange={e => setForm({ ...form, diaper_type: e.target.value })}>
            <option value="소변">소변</option>
            <option value="대변">대변</option>
            <option value="혼합">혼합</option>
          </select>
        </div>
        <div className="care-tracker__form-actions">
          <button type="submit" className="care-tracker__submit" disabled={saving}>
            {saving ? '저장 중...' : editId ? '수정' : '추가'}
          </button>
          {editId && <button type="button" className="care-tracker__cancel" onClick={resetForm}>취소</button>}
        </div>
      </form>
      <RecordList
        records={records}
        editId={editId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderItem={r => (
          <>
            <span className="care-tracker__card-time">{formatTime(r.datetime)}</span>
            <span className={`care-tracker__badge care-tracker__badge--${r.diaper_type === '대변' ? 'poo' : r.diaper_type === '혼합' ? 'mix' : 'pee'}`}>
              {r.diaper_type}
            </span>
          </>
        )}
      />
    </div>
  )
}

// ─── Babyfood Panel ─────────────────────────────────
function BabyfoodPanel({ token, activeChildId }) {
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ datetime: nowDatetimeLocal(), ingredient: '', reaction: 'normal', memo: '' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [token, activeChildId])

  async function load() {
    try {
      setRecords(await fetchBabyfoodRecords(token, activeChildId))
    } catch (e) { console.error(e) }
  }

  function resetForm() {
    setForm({ datetime: nowDatetimeLocal(), ingredient: '', reaction: 'normal', memo: '' })
    setEditId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving || !form.ingredient.trim()) return
    setSaving(true)
    const data = { date: form.datetime, ingredient: form.ingredient.trim(), reaction: form.reaction, memo: form.memo.trim() || null, child_id: activeChildId || undefined }
    try {
      if (editId) {
        await updateBabyfoodRecord(token, editId, data)
      } else {
        await createBabyfoodRecord(token, data)
      }
      await load()
      resetForm()
    } catch { alert('저장 실패') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    try { await deleteBabyfoodRecord(id, token); await load(); if (editId === id) resetForm() }
    catch { alert('삭제 실패') }
  }

  function handleEdit(r) {
    if (editId === r.id) { resetForm(); return }
    setEditId(r.id)
    setForm({ datetime: r.date, ingredient: r.ingredient, reaction: r.reaction || 'normal', memo: r.memo || '' })
  }

  const reactionBadge = { good: '좋음 🟢', normal: '보통 ⚪', allergy: '알레르기 🔴' }

  return (
    <div>
      <form className="care-tracker__form" onSubmit={handleSubmit}>
        <input type="datetime-local" value={form.datetime} onChange={e => setForm({ ...form, datetime: e.target.value })} required />
        <input type="text" placeholder="식재료" value={form.ingredient} onChange={e => setForm({ ...form, ingredient: e.target.value })} required />
        <div className="care-tracker__row">
          <select value={form.reaction} onChange={e => setForm({ ...form, reaction: e.target.value })}>
            <option value="good">좋음 🟢</option>
            <option value="normal">보통 ⚪</option>
            <option value="allergy">알레르기 🔴</option>
          </select>
        </div>
        <textarea placeholder="메모 (선택)" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} />
        <div className="care-tracker__form-actions">
          <button type="submit" className="care-tracker__submit" disabled={saving}>
            {saving ? '저장 중...' : editId ? '수정' : '추가'}
          </button>
          {editId && <button type="button" className="care-tracker__cancel" onClick={resetForm}>취소</button>}
        </div>
      </form>
      <div className="care-tracker__list">
        {records.length === 0 && <div className="care-tracker__empty">아직 기록이 없습니다.</div>}
        {records.map(r => (
          <div
            key={r.id}
            className={`care-tracker__card ${editId === r.id ? 'care-tracker__card--active' : ''}`}
            onClick={() => handleEdit(r)}
          >
            <div className="care-tracker__card-main">
              <span className="care-tracker__card-date">{formatDate(r.date)}</span>
              <span className="care-tracker__card-time">{formatTime(r.date)}</span>
              <span className="care-tracker__card-ingredient">{r.ingredient}</span>
              <span className={`care-tracker__reaction care-tracker__reaction--${r.reaction || 'normal'}`}>
                {reactionBadge[r.reaction] || reactionBadge.normal}
              </span>
            </div>
            {r.memo && <div className="care-tracker__card-memo">{r.memo}</div>}
            <button className="care-tracker__card-delete" onClick={e => { e.stopPropagation(); handleDelete(r.id) }}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Hospital Panel ─────────────────────────────────
const DEPARTMENTS = [
  '소아청소년과',
  '산부인과',
  '이비인후과',
  '피부과',
  '안과',
  '치과',
  '정형외과',
  '응급실',
  '영상의학과',
  '재활의학과',
]

function HospitalPanel({ token, activeChildId }) {
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ date: todayStr(), hospital_name: '', department: '', customDept: false, memo: '' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [token, activeChildId])

  async function load() {
    try {
      setRecords(await fetchHospitalRecords(token, activeChildId))
    } catch (e) { console.error(e) }
  }

  function resetForm() {
    setForm({ date: todayStr(), hospital_name: '', department: '', customDept: false, memo: '' })
    setEditId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving || !form.hospital_name.trim()) return
    setSaving(true)
    const data = {
      date: form.date,
      hospital_name: form.hospital_name.trim(),
      department: form.department.trim() || null,
      memo: form.memo.trim() || null,
      child_id: activeChildId || undefined,
    }
    try {
      if (editId) {
        await updateHospitalRecord(token, editId, data)
      } else {
        await createHospitalRecord(token, data)
      }
      await load()
      resetForm()
    } catch { alert('저장 실패') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    try { await deleteHospitalRecord(id, token); await load(); if (editId === id) resetForm() }
    catch { alert('삭제 실패') }
  }

  function handleEdit(r) {
    if (editId === r.id) { resetForm(); return }
    setEditId(r.id)
    const isPreset = DEPARTMENTS.includes(r.department)
    setForm({ date: r.date, hospital_name: r.hospital_name, department: r.department || '', customDept: !isPreset && !!r.department, memo: r.memo || '' })
  }

  function handleRevisit(r) {
    setEditId(null)
    const isPreset = DEPARTMENTS.includes(r.department)
    setForm({ date: todayStr(), hospital_name: r.hospital_name, department: r.department || '', customDept: !isPreset && !!r.department, memo: '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDeptChange(val) {
    if (val === '__custom__') {
      setForm({ ...form, department: '', customDept: true })
    } else {
      setForm({ ...form, department: val, customDept: false })
    }
  }

  const deptStats = {}
  for (const r of records) {
    const d = r.department || '미분류'
    deptStats[d] = (deptStats[d] || 0) + 1
  }

  return (
    <div>
      {records.length > 0 && (
        <div className="care-tracker__summary">
          <span>총 {records.length}회</span>
          {Object.entries(deptStats)
            .sort((a, b) => b[1] - a[1])
            .map(([dept, cnt]) => (
              <span key={dept}> · {dept} {cnt}회</span>
            ))
          }
        </div>
      )}
      <form className="care-tracker__form" onSubmit={handleSubmit}>
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
        <input type="text" placeholder="병원명" list="hospital-names" value={form.hospital_name} onChange={e => setForm({ ...form, hospital_name: e.target.value })} required />
        <datalist id="hospital-names">
          {[...new Set(records.map(r => r.hospital_name).filter(Boolean))].map(name => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="care-tracker__row">
          {form.customDept ? (
            <>
              <input type="text" placeholder="진료과 직접 입력" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} autoFocus />
              <button type="button" className="care-tracker__cancel" onClick={() => setForm({ ...form, department: '', customDept: false })}>목록</button>
            </>
          ) : (
            <select value={form.department} onChange={e => handleDeptChange(e.target.value)}>
              <option value="">진료과 선택</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="__custom__">직접 입력...</option>
            </select>
          )}
        </div>
        <textarea placeholder="메모 (선택)" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} />
        <div className="care-tracker__form-actions">
          <button type="submit" className="care-tracker__submit" disabled={saving}>
            {saving ? '저장 중...' : editId ? '수정' : '추가'}
          </button>
          {editId && <button type="button" className="care-tracker__cancel" onClick={resetForm}>취소</button>}
        </div>
      </form>
      <div className="care-tracker__list">
        {records.length === 0 && <div className="care-tracker__empty">아직 기록이 없습니다.</div>}
        {records.map(r => (
          <div
            key={r.id}
            className={`care-tracker__card ${editId === r.id ? 'care-tracker__card--active' : ''}`}
            onClick={() => handleEdit(r)}
          >
            <div className="care-tracker__card-main">
              <span className="care-tracker__card-date">{r.date}</span>
              <span className="care-tracker__card-hospital">{r.hospital_name}</span>
              {r.department && <span className="care-tracker__badge">{r.department}</span>}
            </div>
            {r.memo && <div className="care-tracker__card-memo">{r.memo}</div>}
            <div className="care-tracker__card-actions">
              <button className="care-tracker__card-revisit" onClick={e => { e.stopPropagation(); handleRevisit(r) }} title="재방문">+</button>
              <button className="care-tracker__card-delete" onClick={e => { e.stopPropagation(); handleDelete(r.id) }}>&times;</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shared RecordList ──────────────────────────────
function RecordList({ records, editId, onEdit, onDelete, renderItem }) {
  return (
    <div className="care-tracker__list">
      {records.length === 0 && <div className="care-tracker__empty">아직 기록이 없습니다.</div>}
      {records.map(r => (
        <div
          key={r.id}
          className={`care-tracker__card ${editId === r.id ? 'care-tracker__card--active' : ''}`}
          onClick={() => onEdit(r)}
        >
          <div className="care-tracker__card-main">
            <span className="care-tracker__card-date">{formatDate(r.datetime)}</span>
            {renderItem(r)}
          </div>
          <button className="care-tracker__card-delete" onClick={e => { e.stopPropagation(); onDelete(r.id) }}>&times;</button>
        </div>
      ))}
    </div>
  )
}
