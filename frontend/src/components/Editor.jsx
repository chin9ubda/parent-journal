import { useState, useEffect } from 'react'
import { fetchEntry, fetchTags, createEntry, updateEntry } from '../api'
import { todayKey } from '../utils/date'
import { getUploadUrl } from '../utils/url'
import './Editor.css'

const PROMPTS = [
  '오늘 아기(또는 배 속 아기)에게 하고 싶은 말이 있나요?',
  '오늘 가장 기억에 남는 순간은?',
  '오늘의 컨디션은 어떠셨나요?',
  '오늘 처음 경험한 것이 있나요?',
  '지금 이 순간의 기분을 한 문장으로 표현한다면?',
  '오늘 감사한 것 하나를 적어볼까요?',
  '아기에게 들려주고 싶은 이야기가 있나요?',
  '오늘 먹은 것 중 가장 맛있었던 것은?',
  '오늘 병원에서 있었던 일을 기록해볼까요?',
  '태동을 느꼈나요? 어떤 느낌이었나요?',
]

export default function Editor({ token, onDone, editId, initialDate }) {
  const [date, setDate] = useState(initialDate || todayKey())
  const [body, setBody] = useState('')
  const [files, setFiles] = useState([])
  const [keepImages, setKeepImages] = useState([])
  const [saving, setSaving] = useState(false)
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [allTags, setAllTags] = useState([])
  const [isTimeline, setIsTimeline] = useState(false)
  const [timelineLabel, setTimelineLabel] = useState('')
  const [prompts] = useState(() => {
    const shuffled = [...PROMPTS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
  })

  useEffect(() => {
    if (token) fetchTags(token).then(setAllTags).catch(() => {})
  }, [token])

  useEffect(() => {
    if (editId) {
      (async () => {
        try {
          const data = await fetchEntry(editId, token)
          setBody(data.body)
          setDate(data.date)
          setTags(data.tags || [])
          if (data.timeline_label) {
            setIsTimeline(true)
            setTimelineLabel(data.timeline_label)
          }
          setKeepImages((data.images || []).map(i => i.filename || i.original.split('/').pop()))
        } catch (err) {
          console.error('기록 불러오기 실패:', err)
        }
      })()
    }
  }, [editId, token])

  function addTag(value) {
    const t = value.trim().replace(/^#/, '')
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const form = new FormData()
      form.append('body', body)
      form.append('date', date)
      form.append('token', token)
      form.append('tags', JSON.stringify(tags))
      if (isTimeline && timelineLabel.trim()) {
        form.append('timeline_label', timelineLabel.trim())
      }
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
      alert(editId ? '수정에 실패했습니다.' : '저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const suggestedTags = allTags
    .filter(t => !tags.includes(t))
    .filter(t => !tagInput || t.includes(tagInput))
    .slice(0, 8)

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
        {!editId && !body && (
          <div className="editor__prompts">
            {prompts.map((p, i) => (
              <button
                key={i}
                type="button"
                className="editor__prompt-btn"
                onClick={() => setBody(p + '\n\n')}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <textarea
          className="editor__textarea"
          placeholder="오늘의 순간을 적어보세요..."
          value={body}
          onChange={e => setBody(e.target.value)}
        />

        <label className="editor__label">태그</label>
        <div className="editor__tag-area">
          {tags.length > 0 && (
            <div className="editor__tag-list">
              {tags.map(t => (
                <span key={t} className="editor__tag-badge">
                  #{t}
                  <button
                    className="editor__tag-remove"
                    onClick={() => setTags(tags.filter(x => x !== t))}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="editor__tag-input-row">
            <input
              type="text"
              className="editor__tag-input"
              placeholder="태그 입력 (예: 이유식)"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
            />
            <button
              type="button"
              className="editor__tag-add-btn"
              onClick={() => { if (tagInput.trim()) addTag(tagInput) }}
              disabled={!tagInput.trim()}
            >
              추가
            </button>
          </div>
          {suggestedTags.length > 0 && (
            <div className="editor__tag-suggestions">
              {suggestedTags.map(t => (
                <button
                  key={t}
                  type="button"
                  className="editor__tag-suggest-btn"
                  onClick={() => addTag(t)}
                >
                  +{t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="editor__timeline-toggle">
          <label className="editor__timeline-check">
            <input
              type="checkbox"
              checked={isTimeline}
              onChange={e => {
                setIsTimeline(e.target.checked)
                if (!e.target.checked) setTimelineLabel('')
              }}
            />
            타임라인 이벤트
          </label>
          {isTimeline && (
            <div className="editor__timeline-label">
              <input
                type="text"
                placeholder="예: 채취일, 이식일..."
                value={timelineLabel}
                onChange={e => setTimelineLabel(e.target.value)}
                className="editor__timeline-input"
              />
            </div>
          )}
        </div>

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
