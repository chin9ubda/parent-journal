import { useState } from 'react'
import { updateSettings, changePassword, getExportJsonUrl, getExportZipUrl, getExportPdfUrl } from '../api'
import './Settings.css'

export default function Settings({ token, babyName, dueDate, onSaved, onClose }) {
  const [name, setName] = useState(babyName || '')
  const [date, setDate] = useState(dueDate || '')
  const [saving, setSaving] = useState(false)

  const [pwOpen, setPwOpen] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

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

  async function handlePasswordChange() {
    if (!curPw || !newPw) return alert('현재 비밀번호와 새 비밀번호를 입력하세요.')
    if (newPw !== confirmPw) return alert('새 비밀번호가 일치하지 않습니다.')
    if (newPw.length < 4) return alert('비밀번호는 4자 이상이어야 합니다.')
    setPwSaving(true)
    try {
      await changePassword(token, curPw, newPw)
      alert('비밀번호가 변경되었습니다.')
      setCurPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      alert('현재 비밀번호가 올바르지 않습니다.')
    } finally {
      setPwSaving(false)
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

      <button className="settings__pw-toggle" onClick={() => setPwOpen(v => !v)}>
        비밀번호 변경 {pwOpen ? '▲' : '▼'}
      </button>
      {pwOpen && (
        <div className="settings__form" style={{ marginTop: 12 }}>
          <input
            type="password"
            className="settings__input"
            placeholder="현재 비밀번호"
            value={curPw}
            onChange={e => setCurPw(e.target.value)}
          />
          <input
            type="password"
            className="settings__input"
            placeholder="새 비밀번호"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
          />
          <input
            type="password"
            className="settings__input"
            placeholder="새 비밀번호 확인"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
          />
          <button className="btn btn--primary" onClick={handlePasswordChange} disabled={pwSaving}>
            {pwSaving ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      )}

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
        <a href={getExportPdfUrl(token)} className="settings__export-btn" download>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 1h7l3 3v11H3V1z"/>
            <path d="M10 1v3h3"/>
            <path d="M5 9h6M5 11.5h4"/>
          </svg>
          PDF 내보내기
        </a>
      </div>
    </div>
  )
}
