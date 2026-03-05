import { useState, useEffect, useRef } from 'react'
import { fetchGrowthRecords, createGrowthRecord, updateGrowthRecord, deleteGrowthRecord } from '../api'
import './GrowthTracker.css'

const TABS = [
  { key: 'height', label: '키', unit: 'cm', color: 'var(--color-primary)' },
  { key: 'weight', label: '몸무게', unit: 'kg', color: '#f59e0b' },
]

export default function GrowthTracker({ token }) {
  const [records, setRecords] = useState([])
  const [tab, setTab] = useState('height')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState({ date: todayStr(), height: '', weight: '' })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const chartScrollRef = useRef(null)

  useEffect(() => {
    if (token) loadRecords()
  }, [token])

  useEffect(() => {
    const el = chartScrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [records, tab])

  async function loadRecords() {
    try {
      const data = await fetchGrowthRecords(token)
      setRecords(data)
    } catch (err) {
      console.error('성장 기록 불러오기 실패:', err)
    }
  }

  function resetForm() {
    setForm({ date: todayStr(), height: '', weight: '' })
    setEditing(false)
    setSelectedId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    const data = {
      date: form.date,
      height: form.height !== '' ? parseFloat(form.height) : null,
      weight: form.weight !== '' ? parseFloat(form.weight) : null,
    }
    if (data.height == null && data.weight == null) return
    setSaving(true)
    try {
      if (editing && selectedId) {
        await updateGrowthRecord(token, selectedId, data)
      } else {
        await createGrowthRecord(token, data)
      }
      await loadRecords()
      resetForm()
    } catch (err) {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    try {
      await deleteGrowthRecord(id, token)
      setRecords(records.filter(r => r.id !== id))
      if (selectedId === id) resetForm()
    } catch (err) {
      alert('삭제에 실패했습니다.')
    }
  }

  function handleSelect(rec) {
    if (selectedId === rec.id) {
      resetForm()
      return
    }
    setSelectedId(rec.id)
    setEditing(true)
    setForm({
      date: rec.date,
      height: rec.height != null ? String(rec.height) : '',
      weight: rec.weight != null ? String(rec.weight) : '',
    })
  }

  const activeTab = TABS.find(t => t.key === tab)
  const chartData = records.filter(r => r[tab] != null)

  return (
    <div className="growth-tracker">
      {/* Form */}
      <form className="growth-tracker__form" onSubmit={handleSubmit}>
        <input
          type="date"
          className="growth-tracker__date-input"
          value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
          required
        />
        <div className="growth-tracker__inputs">
          <label className="growth-tracker__field">
            <span>키 (cm)</span>
            <input
              type="number"
              step="0.1"
              placeholder="cm"
              value={form.height}
              onChange={e => setForm({ ...form, height: e.target.value })}
            />
          </label>
          <label className="growth-tracker__field">
            <span>몸무게 (kg)</span>
            <input
              type="number"
              step="0.01"
              placeholder="kg"
              value={form.weight}
              onChange={e => setForm({ ...form, weight: e.target.value })}
            />
          </label>
        </div>
        <div className="growth-tracker__form-actions">
          <button type="submit" className="growth-tracker__submit-btn" disabled={saving}>
            {saving ? '저장 중...' : editing ? '수정' : '추가'}
          </button>
          {editing && (
            <button type="button" className="growth-tracker__cancel-btn" onClick={resetForm}>취소</button>
          )}
        </div>
      </form>

      {/* Tabs + Chart */}
      {chartData.length > 1 && (
        <div className="growth-tracker__chart-section">
          <div className="growth-tracker__tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`growth-tracker__tab ${tab === t.key ? 'growth-tracker__tab--active' : ''}`}
                style={tab === t.key ? { borderColor: t.color, color: t.color } : {}}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <GrowthChart
            data={chartData}
            field={tab}
            color={activeTab.color}
            unit={activeTab.unit}
            selectedId={selectedId}
            onSelect={handleSelect}
            scrollRef={chartScrollRef}
          />
        </div>
      )}

      {/* Record list */}
      <div className="growth-tracker__list">
        {records.length === 0 && (
          <div className="growth-tracker__empty">
            아직 기록이 없습니다.<br />아기의 성장을 기록해 보세요!
          </div>
        )}
        {[...records].reverse().map(r => (
          <div
            key={r.id}
            className={`growth-tracker__card ${selectedId === r.id ? 'growth-tracker__card--active' : ''}`}
            onClick={() => handleSelect(r)}
          >
            <div className="growth-tracker__card-date">{r.date}</div>
            <div className="growth-tracker__card-values">
              {r.height != null && <span className="growth-tracker__card-val growth-tracker__card-val--height">{r.height}cm</span>}
              {r.weight != null && <span className="growth-tracker__card-val growth-tracker__card-val--weight">{r.weight}kg</span>}
            </div>
            <button
              className="growth-tracker__card-delete"
              onClick={e => { e.stopPropagation(); handleDelete(r.id) }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function GrowthChart({ data, field, color, unit, selectedId, onSelect, scrollRef }) {
  const pad = { top: 20, bottom: 28, left: 44, right: 20 }
  const pointPad = 24 // extra inset so first/last points don't overlap axis
  const chartH = 160
  const chartW = Math.max(data.length * 60, 280)
  const plotH = chartH - pad.top - pad.bottom
  const plotW = chartW - pad.left - pad.right - pointPad * 2

  const values = data.map(r => r[field])
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  const step = data.length > 1 ? plotW / (data.length - 1) : 0
  const points = data.map((r, i) => ({
    x: pad.left + pointPad + i * step,
    y: pad.top + plotH - (plotH * (r[field] - minV) / range),
    r,
  }))

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  const tickCount = 4
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = minV + (range * i) / tickCount
    return { v, y: pad.top + plotH - (plotH * i) / tickCount }
  })

  return (
    <div className="growth-tracker__chart-scroll" ref={scrollRef}>
      <svg width={chartW} height={chartH} className="growth-tracker__svg">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y}
              stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 2" />
            <text x={pad.left - 4} y={t.y + 3} textAnchor="end" className="growth-tracker__axis-label">
              {t.v % 1 === 0 ? t.v : t.v.toFixed(1)}
            </text>
          </g>
        ))}
        <line x1={pad.left} y1={pad.top + plotH} x2={chartW - pad.right} y2={pad.top + plotH}
          stroke="var(--color-border)" strokeWidth="1" />
        <path
          d={`${line} L${points[points.length - 1].x},${pad.top + plotH} L${points[0].x},${pad.top + plotH} Z`}
          fill={color}
          opacity="0.08"
        />
        <path d={line} fill="none" stroke={color} strokeWidth="2" />
        {points.map((p) => (
          <g key={p.r.id} onClick={() => onSelect(p.r)} style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r={selectedId === p.r.id ? 6 : 4}
              fill={selectedId === p.r.id ? color : '#fff'}
              stroke={color} strokeWidth="2" />
            <text x={p.x} y={chartH - 6} textAnchor="middle" className="growth-tracker__chart-date">
              {p.r.date?.slice(5)}
            </text>
            <text x={p.x} y={p.y - 10} textAnchor="middle" className="growth-tracker__chart-val"
              style={{ fill: color }}>
              {p.r[field]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
