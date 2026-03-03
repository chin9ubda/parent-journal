import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchEntries, fetchTags } from '../api'
import { localDateKey } from '../utils/date'
import './Timeline.css'

const PAGE_SIZE = 20

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function formatDateHeader(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = DAY_NAMES[date.getDay()]
  return `${y}년 ${m}월 ${d}일 (${day})`
}

export default function Timeline({ token, onViewEntry, onNewEntry }) {
  const [entries, setEntries] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [allTags, setAllTags] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const offsetRef = useRef(0)
  const sentinelRef = useRef(null)
  const observerRef = useRef(null)

  useEffect(() => {
    if (token) fetchTags(token).then(setAllTags).catch(() => {})
  }, [token])

  const loadPage = useCallback(async (offset, opts = {}) => {
    if (loading) return
    setLoading(true)
    try {
      const data = await fetchEntries(token, PAGE_SIZE, {
        q: opts.q || undefined,
        tag: opts.tag || undefined,
        offset,
      })
      if (offset === 0) {
        setEntries(data)
      } else {
        setEntries(prev => [...prev, ...data])
      }
      setHasMore(data.length >= PAGE_SIZE)
      offsetRef.current = offset + data.length
    } catch (err) {
      console.error('Failed to load entries:', err)
    } finally {
      setLoading(false)
    }
  }, [token, loading])

  // Reset and load when search/tag changes
  useEffect(() => {
    if (!token) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const delay = searchQuery ? 300 : 0
    debounceRef.current = setTimeout(() => {
      offsetRef.current = 0
      setHasMore(true)
      loadPage(0, { q: searchQuery, tag: activeTag })
    }, delay)
    return () => clearTimeout(debounceRef.current)
  }, [token, searchQuery, activeTag])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    if (!hasMore || !sentinelRef.current) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          loadPage(offsetRef.current, { q: searchQuery, tag: activeTag })
        }
      },
      { rootMargin: '200px' }
    )
    observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMore, loading, searchQuery, activeTag])

  // Group entries by date for rendering
  let lastDate = null
  const rows = []
  for (const e of entries) {
    const dk = localDateKey(e.date)
    if (dk !== lastDate) {
      rows.push({ type: 'header', date: dk })
      lastDate = dk
    }
    rows.push({ type: 'entry', data: e })
  }

  return (
    <div className="timeline">
      <div className="timeline__search">
        <input
          type="text"
          className="timeline__search-input"
          placeholder="검색어를 입력하세요..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="timeline__search-clear" onClick={() => setSearchQuery('')}>
            &times;
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="timeline__tags">
          {allTags.map(tag => (
            <button
              key={tag}
              className={`timeline__tag ${activeTag === tag ? 'timeline__tag--active' : ''}`}
              onClick={() => setActiveTag(prev => prev === tag ? null : tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <button className="btn btn--primary timeline__new-btn" onClick={onNewEntry}>
        + 새 기록
      </button>

      {(searchQuery || activeTag) && (
        <div className="timeline__filter-info">
          {entries.length}개의 기록
          {activeTag && <span> · #{activeTag}</span>}
          {searchQuery && <span> · "{searchQuery}"</span>}
        </div>
      )}

      <div className="timeline__list">
        {rows.map((row, i) =>
          row.type === 'header' ? (
            <div key={`h-${row.date}`} className="timeline__date-header">
              {formatDateHeader(row.date)}
            </div>
          ) : (
            <div
              key={row.data.id}
              className="timeline__card"
              onClick={() => onViewEntry(row.data.id)}
            >
              {row.data.tags?.length > 0 && (
                <div className="timeline__card-tags">
                  {row.data.tags.map(t => (
                    <span key={t} className="timeline__card-tag">#{t}</span>
                  ))}
                </div>
              )}
              <p className="timeline__body">{row.data.body.slice(0, 200)}</p>
            </div>
          )
        )}
        <div ref={sentinelRef} className="timeline__sentinel" />
        {loading && <div className="timeline__loading">불러오는 중...</div>}
      </div>
    </div>
  )
}
