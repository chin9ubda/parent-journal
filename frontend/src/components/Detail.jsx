import { useState, useEffect } from 'react'
import { fetchEntry, deleteEntry } from '../api'
import { getUploadUrl } from '../utils/url'
import './Detail.css'

export default function Detail({ token, id, onBack, onEdit, onDeleted }) {
  const [entry, setEntry] = useState(null)

  useEffect(() => {
    if (id) loadEntry()
  }, [id])

  async function loadEntry() {
    try {
      const data = await fetchEntry(id, token)
      setEntry(data)
    } catch (err) {
      console.error('Failed to load entry:', err)
    }
  }

  async function handleDelete() {
    if (!window.confirm('삭제하시겠습니까?')) return
    try {
      await deleteEntry(id, token)
      onDeleted()
    } catch (err) {
      alert('삭제 실패')
    }
  }

  if (!entry) return <div className="detail__loading">로딩 중...</div>

  return (
    <div className="detail">
      <button className="detail__back" onClick={onBack}>← 목록으로</button>
      <div className="detail__header">
        <div className="detail__icon">👶</div>
        <div>
          <div className="detail__label">소중한 기록</div>
          <div className="detail__date">{entry.date}</div>
        </div>
      </div>
      <div className="detail__content">
        <div className="detail__body">{entry.body}</div>
        {entry.images?.length > 0 && (
          <div className="detail__images">
            {entry.images.map(im => (
              <div key={im.original} className="detail__image-wrap">
                {im.type === 'video' ? (
                  <video
                    src={getUploadUrl(im.original)}
                    className="detail__image"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={getUploadUrl(im.thumb || im.original)}
                    alt=""
                    className="detail__image"
                    onClick={() => window.open(getUploadUrl(im.original))}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="detail__actions">
        <button className="btn" onClick={handleDelete}>삭제</button>
        <button className="btn btn--primary" onClick={() => onEdit(id)}>수정</button>
      </div>
    </div>
  )
}
