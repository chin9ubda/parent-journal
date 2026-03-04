import { useState } from 'react'
import { updateSettings, getExportJsonUrl, getExportZipUrl } from '../api'
import './Settings.css'

export default function Settings({ token, babyName, dueDate, onSaved, onClose }) {
  const [name, setName] = useState(babyName || '')
  const [date, setDate] = useState(dueDate || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const result = await updateSettings(token, { baby_name: name, due_date: date })
      onSaved(result.baby_name, result.due_date)
    } catch (err) {
      alert('설정 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings">
      <h2 className="settings__title">설정</h2>
      <div className="settings__form">
        <label className="settings__label">아기 이름 / 태명</label>
        <input
          type="text"
          className="settings__input"
          placeholder="예: 콩이"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <label className="settings__label">출산 예정일</label>
        <input
          type="date"
          className="settings__input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        <div className="settings__actions">
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>

      <div className="settings__divider" />

      <h3 className="settings__section-title">데이터 내보내기</h3>
      <div className="settings__export">
        <a href={getExportJsonUrl(token)} className="settings__export-btn" download>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8M5 7l3 3 3-3M2 12h12"/>
          </svg>
          JSON 백업
        </a>
        <a href={getExportZipUrl(token)} className="settings__export-btn" download>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8M5 7l3 3 3-3M2 12h12"/>
          </svg>
          전체 백업 (사진 포함)
        </a>
      </div>
    </div>
  )
}
