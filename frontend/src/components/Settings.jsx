import { useState } from 'react'
import { changePassword, getExportJsonUrl, getExportZipUrl, getExportPdfUrl, createChild, updateChild, deleteChild } from '../api'
import './Settings.css'

export default function Settings({ token, children, activeChildId, onChildrenUpdated, onSaved, onClose, onLogout }) {
  const [pwOpen, setPwOpen] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [editingChild, setEditingChild] = useState(null)
  const [addingChild, setAddingChild] = useState(false)

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

  async function handleSaveChild(data) {
    try {
      if (data.id) {
        const updated = await updateChild(token, data.id, data)
        onChildrenUpdated(children.map(c => c.id === data.id ? updated : c))
        if (data.id === activeChildId) {
          onSaved(updated.name, updated.due_date)
        }
      } else {
        const created = await createChild(token, data)
        onChildrenUpdated([...children, created])
      }
      setEditingChild(null)
      setAddingChild(false)
    } catch (err) {
      alert('저장에 실패했습니다.')
    }
  }

  async function handleDeleteChild(id) {
    if (!confirm('이 아이의 기록은 유지되지만 더 이상 목록에 표시되지 않습니다. 삭제하시겠습니까?')) return
    try {
      await deleteChild(id, token)
      onChildrenUpdated(children.filter(c => c.id !== id))
    } catch (err) {
      alert(err?.response?.data?.detail || '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="settings">
      <h2 className="settings__title">설정</h2>

      <h3 className="settings__section-title">아이 관리</h3>
      <div className="settings__children-list">
        {children.map(child => (
          editingChild === child.id ? (
            <ChildForm
              key={child.id}
              initial={child}
              onSave={handleSaveChild}
              onCancel={() => setEditingChild(null)}
            />
          ) : (
            <div key={child.id} className="settings__child-card">
              <div className="settings__child-info">
                <strong>{child.name}</strong>
                {child.due_date && <span className="settings__child-meta">예정일: {child.due_date}</span>}
                {child.birth_date && <span className="settings__child-meta">생년월일: {child.birth_date}</span>}
              </div>
              <div className="settings__child-actions">
                <button className="btn btn--small" onClick={() => setEditingChild(child.id)}>수정</button>
                {children.length > 1 && (
                  <button className="btn btn--small btn--danger" onClick={() => handleDeleteChild(child.id)}>삭제</button>
                )}
              </div>
            </div>
          )
        ))}
      </div>

      {addingChild ? (
        <ChildForm
          onSave={handleSaveChild}
          onCancel={() => setAddingChild(false)}
        />
      ) : (
        <button className="btn btn--outline" onClick={() => setAddingChild(true)} style={{ marginTop: 8 }}>
          + 아이 추가
        </button>
      )}

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
        <a href={getExportJsonUrl(token, activeChildId)} className="settings__export-btn" download>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8M5 7l3 3 3-3M2 12h12"/>
          </svg>
          JSON 백업
        </a>
        <a href={getExportZipUrl(token, activeChildId)} className="settings__export-btn" download>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8M5 7l3 3 3-3M2 12h12"/>
          </svg>
          전체 백업 (사진 포함)
        </a>
        <a href={getExportPdfUrl(token, activeChildId)} className="settings__export-btn" download>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 1h7l3 3v11H3V1z"/>
            <path d="M10 1v3h3"/>
            <path d="M5 9h6M5 11.5h4"/>
          </svg>
          PDF 내보내기
        </a>
      </div>

      <div className="settings__divider" />

      <button
        className="btn btn--danger"
        style={{ width: '100%' }}
        onClick={() => {
          if (confirm('로그아웃하시겠습니까?')) onLogout()
        }}
      >
        로그아웃
      </button>

      <div className="settings__actions" style={{ marginTop: 16 }}>
        <button className="btn" onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}

function ChildForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [dueDate, setDueDate] = useState(initial?.due_date || '')
  const [birthDate, setBirthDate] = useState(initial?.birth_date || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return alert('이름을 입력하세요.')
    setSaving(true)
    try {
      await onSave({ id: initial?.id, name: name.trim(), due_date: dueDate, birth_date: birthDate })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="settings__child-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="settings__input"
        placeholder="아기 이름 / 태명"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />
      <label className="settings__label">출산 예정일</label>
      <input
        type="date"
        className="settings__input"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
      />
      <label className="settings__label">생년월일</label>
      <input
        type="date"
        className="settings__input"
        value={birthDate}
        onChange={e => setBirthDate(e.target.value)}
      />
      <div className="settings__child-form-actions">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? '저장 중...' : initial ? '수정' : '추가'}
        </button>
        <button type="button" className="btn" onClick={onCancel}>취소</button>
      </div>
    </form>
  )
}
