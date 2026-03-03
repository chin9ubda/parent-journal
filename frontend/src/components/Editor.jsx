import { useState, useEffect } from 'react'
import { fetchEntry, createEntry, updateEntry } from '../api'
import { getUploadUrl } from '../utils/url'
import './Editor.css'

export default function Editor({ token, onDone, editId, initialDate }) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10))
  const [body, setBody] = useState('')
  const [files, setFiles] = useState([])
  const [keepImages, setKeepImages] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editId) {
      (async () => {
        try {
          const data = await fetchEntry(editId, token)
          setBody(data.body)
          setDate(data.date)
          setKeepImages((data.images || []).map(i => i.filename || i.original.split('/').pop()))
        } catch (err) {
          console.error('Failed to load entry:', err)
        }
      })()
    }
  }, [editId, token])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const form = new FormData()
      form.append('body', body)
      form.append('date', date)
      form.append('token', token)
      for (const f of files) form.append('files', f)

      if (editId) {
        form.append('keep_images', JSON.stringify(keepImages))
        await updateEntry(editId, form)
        onDone(editId)
      } else {
        const data = await createEntry(form)
        onDone(data?.id || null)
      }
    } catch (err) {
      alert(editId ? '수정 실패' : '저장 실패: ' + (err.response?.statusText || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="editor">
      <h2 className="editor__title">{editId ? '기록 수정' : '새 기록 작성'}</h2>
      <div className="editor__form">
        <label className="editor__label">날짜</label>
        <input
          type="date"
          className="editor__input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        <label className="editor__label">내용</label>
        <textarea
          className="editor__textarea"
          placeholder="오늘의 순간을 적어보세요..."
          value={body}
          onChange={e => setBody(e.target.value)}
        />

        <label className="editor__label">사진 추가</label>
        <label className="editor__file-btn">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            className="editor__file-input"
            onChange={e => {
              const selected = Array.from(e.target.files)
              if (selected.length > 0) {
                setFiles(prev => [...prev, ...selected])
              }
              setTimeout(() => { e.target.value = '' }, 500)
            }}
          />
          {files.length > 0
            ? `${files.length}장 선택됨 — 더 추가하려면 클릭`
            : '사진을 선택하세요'}
        </label>

        {(files.length > 0 || keepImages.length > 0) && (
          <div className="editor__images">
            {keepImages.map(fn => (
              <div key={fn} className="editor__image-item">
                {/\.(mp4|mov|webm|avi|mkv)$/i.test(fn) ? (
                  <video src={getUploadUrl(`/uploads/${editId || ''}/${fn}`)} className="editor__thumb" muted />
                ) : (
                  <img src={getUploadUrl(`/uploads/${editId || ''}/${fn}`)} alt="" className="editor__thumb" />
                )}
                <button
                  className="editor__remove-btn"
                  onClick={() => setKeepImages(keepImages.filter(x => x !== fn))}
                >
                  제거
                </button>
              </div>
            ))}
            {files.map((f, i) => (
              <div key={`new-${i}`} className="editor__image-item">
                {f.type.startsWith('video/') ? (
                  <video src={URL.createObjectURL(f)} className="editor__thumb" muted />
                ) : (
                  <img src={URL.createObjectURL(f)} alt="" className="editor__thumb" />
                )}
                <button
                  className="editor__remove-btn"
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                >
                  제거
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="editor__actions">
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button className="btn" onClick={() => onDone()}>취소</button>
        </div>
      </div>
    </div>
  )
}
