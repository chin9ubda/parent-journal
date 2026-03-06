import { useState, useEffect, useRef } from 'react'
import './Header.css'

export default function Header({ view, onNavigate, babyName, dueDate, children, activeChildId, onSwitchChild, onOpenSettings }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [childDropdown, setChildDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [menuOpen])

  useEffect(() => {
    if (!childDropdown) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setChildDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [childDropdown])

  const title = babyName ? `${babyName}의 일기` : '육아 일기'
  const dday = dueDate ? calcDday(dueDate) : null
  const weekInfo = dueDate ? calcWeek(dueDate) : null
  const hasMultipleChildren = children && children.length > 1

  const icons = {
    dashboard: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="6" height="6" rx="1"/><rect x="10" y="2" width="6" height="6" rx="1"/>
        <rect x="2" y="10" width="6" height="6" rx="1"/><rect x="10" y="10" width="6" height="6" rx="1"/>
      </svg>
    ),
    timeline: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h12M3 9h8M3 14h10"/>
      </svg>
    ),
    calendar: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="14" height="13" rx="2"/><path d="M2 7h14M6 1v4M12 1v4"/>
      </svg>
    ),
    test: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2h4M9 2v4l4 7a1 1 0 01-.9 1.5H5.9A1 1 0 015 13l4-7V2"/>
      </svg>
    ),
    events: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="4" r="1.5" fill="currentColor"/><path d="M5 5.5v3"/>
        <circle cx="5" cy="10.5" r="1.5" fill="currentColor"/><path d="M5 12v3"/>
        <path d="M9 4h6M9 10.5h6"/>
      </svg>
    ),
    gallery: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="14" height="14" rx="2"/>
        <circle cx="6.5" cy="6.5" r="1.5"/>
        <path d="M16 12l-3.5-3.5L5 16"/>
      </svg>
    ),
    growth: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 15l4-5 3 3 5-7"/>
        <circle cx="15" cy="6" r="1.5"/>
      </svg>
    ),
    care: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 15.5s-6-4.35-6-8.15A3.5 3.5 0 019 4.85a3.5 3.5 0 016 2.5c0 3.8-6 8.15-6 8.15z"/>
      </svg>
    ),
    vaccination: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3l-2 2m0 0l-3-1-6 6 3 3 6-6-1-3 2-2zM8 10l-3 3"/>
        <path d="M4 14l-1 1"/>
      </svg>
    ),
    settings: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="2.5"/><path d="M9 1.5v2M9 14.5v2M3 3l1.2 1.2M13.8 13.8L15 15M1.5 9h2M14.5 9h2M3 15l1.2-1.2M13.8 4.2L15 3"/>
      </svg>
    ),
  }

  const navItems = [
    { key: 'dashboard', label: '홈' },
    { key: 'timeline', label: '일기' },
    { key: 'calendar', label: '캘린더' },
    { key: 'test', label: '임태기' },
    { key: 'events', label: '타임라인' },
    { key: 'gallery', label: '갤러리' },
    { key: 'growth', label: '성장' },
    { key: 'care', label: '육아 기록' },
    { key: 'vaccination', label: '예방접종' },
  ]

  function handleNav(key) {
    onNavigate(key)
    setMenuOpen(false)
  }

  function handleSettings() {
    onOpenSettings()
    setMenuOpen(false)
  }

  function handleSwitchChild(childId) {
    onSwitchChild(childId)
    setChildDropdown(false)
  }

  return (
    <>
      <div className="header">
        <div className="header__left">
          {hasMultipleChildren ? (
            <div className="header__child-switcher" ref={dropdownRef}>
              <button
                className="header__title header__title--dropdown"
                onClick={() => setChildDropdown(v => !v)}
              >
                {title}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
                  <path d="M3 5l3 3 3-3"/>
                </svg>
              </button>
              {childDropdown && (
                <div className="header__child-dropdown">
                  {children.map(child => (
                    <button
                      key={child.id}
                      className={`header__child-option ${child.id === activeChildId ? 'header__child-option--active' : ''}`}
                      onClick={() => handleSwitchChild(child.id)}
                    >
                      {child.name}의 일기
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="header__title" onClick={() => onNavigate('dashboard')}>{title}</div>
          )}
          {(dday || weekInfo) && (
            <div className="header__sub">
              {weekInfo && <span className="header__week">{weekInfo}</span>}
              {weekInfo && dday && <span className="header__sub-sep">·</span>}
              {dday && <span className="header__dday">{dday}</span>}
            </div>
          )}
        </div>
        <button
          className="header__menu-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="메뉴"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="18" y2="6"/>
            <line x1="4" y1="11" x2="18" y2="11"/>
            <line x1="4" y1="16" x2="18" y2="16"/>
          </svg>
        </button>
      </div>

      {menuOpen && <div className="drawer-overlay" onClick={() => setMenuOpen(false)} />}

      <div className={`drawer ${menuOpen ? 'drawer--open' : ''}`}>
        <div className="drawer__header">
          <button className="drawer__close" onClick={() => setMenuOpen(false)}>&times;</button>
        </div>

        <nav className="drawer__nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`drawer__item ${view === item.key ? 'drawer__item--active' : ''}`}
              onClick={() => handleNav(item.key)}
            >
              <span className="drawer__icon">{icons[item.key]}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="drawer__divider" />

        <button className="drawer__item" onClick={handleSettings}>
          <span className="drawer__icon">{icons.settings}</span>
          설정
        </button>
      </div>
    </>
  )
}

function calcDday(dueDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24))
  if (diff > 0) return `D-${diff}`
  if (diff === 0) return 'D-Day'
  return `태어난 지 ${Math.abs(diff)}일`
}

function calcWeek(dueDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  // 임신 기간 = 280일 (40주)
  const conceptionOffset = 280
  const start = new Date(due)
  start.setDate(start.getDate() - conceptionOffset)
  const elapsed = Math.floor((today - start) / (1000 * 60 * 60 * 24))
  if (elapsed < 0 || elapsed > conceptionOffset) return null
  const weeks = Math.floor(elapsed / 7)
  const days = elapsed % 7
  return `${weeks}주 ${days}일`
}
