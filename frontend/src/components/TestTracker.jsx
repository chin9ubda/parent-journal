import { useState, useEffect, useRef, useCallback } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { uploadTest, fetchTests, deleteTest, adjustTestLines, updateTestDate } from '../api'
import { getUploadUrl } from '../utils/url'
import { rotateImage, cropFromElement } from '../utils/cropImage'
import './TestTracker.css'

export default function TestTracker({ token }) {
  const [tests, setTests] = useState([])
  const [uploading, setUploading] = useState(false)
  const [date, setDate] = useState(() => {
    const d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
  })
  const [selectedId, setSelectedId] = useState(null)
  const [linePos, setLinePos] = useState({ c: null, t: null })
  const [dragging, setDragging] = useState(null)
  const [imgScale, setImgScale] = useState(1)
  const [adjusting, setAdjusting] = useState(false)
  const [showGuides, setShowGuides] = useState(true)
  const [originalSrc, setOriginalSrc] = useState(null)
  const [rotatedSrc, setRotatedSrc] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)
  const fileInputRef = useRef(null)
  const editorImgRef = useRef(null)
  const rotateTimerRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    if (token) loadTests()
  }, [token])

  async function loadTests() {
    try {
      const data = await fetchTests(token)
      setTests(data)
    } catch (err) {
      console.error('임태기 불러오기 실패:', err)
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setOriginalSrc(url)
    setRotatedSrc(url)
    setRotation(0)
    setCrop(undefined)
    setCompletedCrop(null)
  }

  // Debounced rotation — generates a rotated image 200ms after slider stops
  useEffect(() => {
    if (!originalSrc) return
    if (rotation === 0) {
      setRotatedSrc(prev => {
        if (prev && prev !== originalSrc) URL.revokeObjectURL(prev)
        return originalSrc
      })
      return
    }
    clearTimeout(rotateTimerRef.current)
    rotateTimerRef.current = setTimeout(() => {
      rotateImage(originalSrc, rotation).then(url => {
        setRotatedSrc(prev => {
          if (prev && prev !== originalSrc) URL.revokeObjectURL(prev)
          return url
        })
      })
    }, 200)
    return () => clearTimeout(rotateTimerRef.current)
  }, [originalSrc, rotation])

  function handleEditorClose() {
    if (originalSrc) URL.revokeObjectURL(originalSrc)
    if (rotatedSrc && rotatedSrc !== originalSrc) URL.revokeObjectURL(rotatedSrc)
    setOriginalSrc(null)
    setRotatedSrc(null)
    setCrop(undefined)
    setCompletedCrop(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCropConfirm() {
    if (uploading) return
    setUploading(true)
    try {
      let blob
      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && editorImgRef.current) {
        blob = await cropFromElement(editorImgRef.current, completedCrop)
      } else {
        // No crop drawn — send the (rotated) full image
        const resp = await fetch(rotatedSrc)
        blob = await resp.blob()
      }
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
      await uploadTest(token, file, date, true)
      await loadTests()
      handleEditorClose()
    } catch (err) {
      alert('업로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    try {
      await deleteTest(id, token)
      setTests(tests.filter(t => t.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch (err) {
      alert('삭제에 실패했습니다.')
    }
  }

  const selected = tests.find(t => t.id === selectedId)

  // Sync linePos when selection changes
  useEffect(() => {
    if (selected && selected.c_line_x != null && selected.t_line_x != null) {
      setLinePos({ c: selected.c_line_x, t: selected.t_line_x })
    } else {
      setLinePos({ c: null, t: null })
    }
  }, [selectedId])

  function handleImgLoad(e) {
    const img = e.target
    setImgScale(img.clientWidth / img.naturalWidth)
  }

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const displayX = e.clientX - rect.left
    const imageX = Math.round(displayX / imgScale)
    const clamped = Math.max(0, Math.min(imageX, imgRef.current.naturalWidth))
    setLinePos(prev => ({ ...prev, [dragging]: clamped }))
  }, [dragging, imgScale])

  const handlePointerUp = useCallback(async () => {
    if (!dragging) return
    const which = dragging
    setDragging(null)
    // Call API to recalculate
    if (selected && linePos.c != null && linePos.t != null) {
      setAdjusting(true)
      try {
        const res = await adjustTestLines(token, selected.id, linePos.c, linePos.t)
        setTests(prev => prev.map(t =>
          t.id === selected.id
            ? { ...t, c_intensity: res.c_intensity, t_intensity: res.t_intensity, ratio: res.ratio, c_line_x: res.c_line_x, t_line_x: res.t_line_x }
            : t
        ))
      } catch (err) {
        console.error('Line adjust failed:', err)
      } finally {
        setAdjusting(false)
      }
    }
  }, [dragging, selected, linePos, token])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => handlePointerMove(e)
    const onUp = () => handlePointerUp()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, handlePointerMove, handlePointerUp])

  function startDrag(e, which) {
    e.preventDefault()
    setDragging(which)
  }

  // Calculate max ratio for bar chart scaling
  const maxRatio = Math.max(1, ...tests.map(t => t.ratio || 0))

  return (
    <div className="test-tracker">
      <div className="test-tracker__upload">
        <input
          type="date"
          className="test-tracker__date-input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <label className="test-tracker__upload-btn">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            disabled={uploading}
          />
          {uploading ? '분석 중...' : '📷 임태기 사진 선택'}
        </label>
      </div>

      {/* Progress chart — line chart */}
      {tests.length > 1 && (() => {
        const sorted = [...tests].reverse()
        const pad = { top: 16, bottom: 28, left: 30, right: 30 }
        const chartH = 120
        const chartW = Math.max(sorted.length * 56, 280)
        const plotH = chartH - pad.top - pad.bottom
        const plotW = chartW - pad.left - pad.right
        const step = sorted.length > 1 ? plotW / (sorted.length - 1) : 0
        const points = sorted.map((t, i) => ({
          x: pad.left + i * step,
          y: pad.top + plotH - (plotH * Math.min((t.ratio || 0) / maxRatio, 1)),
          t,
        }))
        const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
        return (
          <div className="test-tracker__chart">
            <div className="test-tracker__chart-title">진하기 변화</div>
            <div className="test-tracker__chart-scroll">
              <svg width={chartW} height={chartH} className="test-tracker__line-svg">
                <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH}
                  stroke="var(--color-border)" strokeWidth="1" />
                <path d={line} fill="none" stroke="var(--color-primary-light)" strokeWidth="2" />
                {points.map((p, i) => (
                  <g key={p.t.id} onClick={() => setSelectedId(p.t.id === selectedId ? null : p.t.id)}
                    className="test-tracker__chart-point" style={{ cursor: 'pointer' }}>
                    <circle cx={p.x} cy={p.y} r={selectedId === p.t.id ? 6 : 4}
                      fill={selectedId === p.t.id ? 'var(--color-primary)' : 'var(--color-primary-light)'}
                      stroke="#fff" strokeWidth="2" />
                    <text x={p.x} y={chartH - 6} textAnchor="middle"
                      className="test-tracker__chart-label">
                      {p.t.date?.slice(5)}
                    </text>
                    <text x={p.x} y={p.y - 10} textAnchor="middle"
                      className="test-tracker__chart-val">
                      {p.t.ratio?.toFixed(2)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )
      })()}

      {/* Selected detail */}
      {selected && (
        <div className="test-tracker__detail">
          <div className="test-tracker__detail-header">
            <input
              type="date"
              className="test-tracker__date-edit"
              value={selected.date}
              onChange={async e => {
                const newDate = e.target.value
                if (!newDate) return
                try {
                  await updateTestDate(token, selected.id, newDate)
                  setTests(prev => prev.map(t => t.id === selected.id ? { ...t, date: newDate } : t))
                } catch (err) {
                  alert('날짜 변경에 실패했습니다.')
                }
              }}
            />
            <div className="test-tracker__detail-actions">
              {linePos.c != null && linePos.t != null && (
                <button
                  className={`test-tracker__guide-btn ${showGuides ? '' : 'test-tracker__guide-btn--off'}`}
                  onClick={() => setShowGuides(v => !v)}
                >
                  {showGuides ? '가이드 숨기기' : '가이드 보기'}
                </button>
              )}
              <button className="test-tracker__delete-btn" onClick={() => handleDelete(selected.id)}>삭제</button>
            </div>
          </div>
          <div className="test-tracker__detail-images">
            {selected.cropped_url && linePos.c != null && linePos.t != null ? (
              <div className="test-tracker__line-editor">
                <img
                  ref={imgRef}
                  src={getUploadUrl(selected.cropped_url)}
                  alt="분석 결과"
                  className="test-tracker__detail-img"
                  onLoad={handleImgLoad}
                  draggable={false}
                />
                {showGuides && (
                  <>
                    <div
                      className="test-tracker__line-marker test-tracker__line-marker--c"
                      style={{ left: linePos.c * imgScale }}
                      onPointerDown={e => startDrag(e, 'c')}
                    >
                      <span className="test-tracker__line-label">C</span>
                    </div>
                    <div
                      className="test-tracker__line-marker test-tracker__line-marker--t"
                      style={{ left: linePos.t * imgScale }}
                      onPointerDown={e => startDrag(e, 't')}
                    >
                      <span className="test-tracker__line-label">T</span>
                    </div>
                  </>
                )}
                {adjusting && <div className="test-tracker__adjusting">재계산 중...</div>}
              </div>
            ) : selected.annotated_url ? (
              <img
                src={getUploadUrl(selected.annotated_url)}
                alt="분석 결과"
                className="test-tracker__detail-img"
              />
            ) : null}
          </div>
          {selected.c_intensity != null && (
            <div className="test-tracker__detail-stats">
              <div className="test-tracker__stat">
                <span className="test-tracker__stat-label">C선 (대조)</span>
                <div className="test-tracker__stat-bar-wrap">
                  <div
                    className="test-tracker__stat-bar test-tracker__stat-bar--c"
                    style={{ width: `${Math.min(100, selected.c_intensity)}%` }}
                  />
                </div>
                <span className="test-tracker__stat-value">{selected.c_intensity?.toFixed(1)}</span>
              </div>
              <div className="test-tracker__stat">
                <span className="test-tracker__stat-label">T선 (검사)</span>
                <div className="test-tracker__stat-bar-wrap">
                  <div
                    className="test-tracker__stat-bar test-tracker__stat-bar--t"
                    style={{ width: `${Math.min(100, selected.t_intensity)}%` }}
                  />
                </div>
                <span className="test-tracker__stat-value">{selected.t_intensity?.toFixed(1)}</span>
              </div>
              <div className="test-tracker__ratio">
                T/C 비율: <strong>{selected.ratio?.toFixed(2)}</strong>
                <span className="test-tracker__ratio-hint">
                  (높을수록 T선이 진함)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History list */}
      <div className="test-tracker__list">
        {tests.map(t => (
          <div
            key={t.id}
            className={`test-tracker__card ${selectedId === t.id ? 'test-tracker__card--active' : ''}`}
            onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
          >
            {t.cropped_url && (
              <img
                src={getUploadUrl(t.cropped_url)}
                alt=""
                className="test-tracker__card-thumb"
              />
            )}
            <div className="test-tracker__card-info">
              <div className="test-tracker__card-date">{t.date}</div>
              {t.ratio != null ? (
                <div className="test-tracker__card-ratio">
                  T/C {t.ratio.toFixed(2)}
                </div>
              ) : (
                <div className="test-tracker__card-error">분석 실패</div>
              )}
            </div>
            <button
              className="test-tracker__card-delete"
              onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
            >
              &times;
            </button>
          </div>
        ))}
        {tests.length === 0 && (
          <div className="test-tracker__empty">
            아직 분석한 임태기가 없습니다.<br />사진을 선택해 보세요!
          </div>
        )}
      </div>
      {originalSrc && (
        <div className="test-editor-overlay">
          <div className="test-editor-crop-area">
            {rotatedSrc && (
              <ReactCrop crop={crop} onChange={setCrop} onComplete={setCompletedCrop}>
                <img
                  ref={editorImgRef}
                  src={rotatedSrc}
                  alt=""
                  className="test-editor-img"
                />
              </ReactCrop>
            )}
          </div>
          <div className="test-editor-toolbar">
            <button className="test-editor-btn" onClick={handleEditorClose}>취소</button>
            <div className="test-editor-controls">
              <div className="test-editor-row">
                <span className="test-editor-label">회전</span>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={rotation}
                  onChange={e => setRotation(Number(e.target.value))}
                  className="test-editor-slider"
                />
                <span className="test-editor-value">{rotation}°</span>
              </div>
            </div>
            <button
              className="test-editor-btn test-editor-btn--confirm"
              onClick={handleCropConfirm}
              disabled={uploading}
            >
              {uploading ? '분석 중...' : '확인'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
