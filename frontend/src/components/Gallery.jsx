import { useState, useEffect } from 'react'
import { fetchGallery } from '../api'
import { getUploadUrl } from '../utils/url'
import './Gallery.css'

export default function Gallery({ token, onNavigate }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!token) return
    fetchGallery(token)
      .then(setImages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="gallery__empty">불러오는 중...</div>
  if (images.length === 0) {
    return (
      <div className="gallery__empty">
        <p>아직 사진이 없습니다.<br/>일기에 사진을 추가해 보세요!</p>
      </div>
    )
  }

  // Group by date
  const grouped = []
  let lastDate = null
  for (const img of images) {
    if (img.date !== lastDate) {
      grouped.push({ date: img.date, items: [] })
      lastDate = img.date
    }
    grouped[grouped.length - 1].items.push(img)
  }

  return (
    <div className="gallery">
      {grouped.map(g => (
        <div key={g.date} className="gallery__group">
          <div className="gallery__date">{g.date}</div>
          <div className="gallery__grid">
            {g.items.map((img, i) => (
              <div
                key={`${img.entry_id}-${img.filename}`}
                className="gallery__item"
                onClick={() => setLightbox(img)}
              >
                <img
                  src={getUploadUrl(img.thumb)}
                  alt=""
                  className="gallery__thumb"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {lightbox && (
        <GalleryLightbox lightbox={lightbox} onClose={() => setLightbox(null)} onNavigate={onNavigate} />
      )}
    </div>
  )
}

function GalleryLightbox({ lightbox, onClose, onNavigate }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="gallery__lightbox" onClick={onClose}>
      <img
        src={getUploadUrl(lightbox.original)}
        alt=""
        className="gallery__lightbox-img"
        onClick={e => e.stopPropagation()}
      />
      <div className="gallery__lightbox-info" onClick={e => e.stopPropagation()}>
        <span>{lightbox.date}</span>
        <button
          className="gallery__lightbox-btn"
          onClick={() => { onClose(); onNavigate('detail', lightbox.entry_id) }}
        >
          일기 보기
        </button>
      </div>
    </div>
  )
}
