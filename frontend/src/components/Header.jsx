import { useState } from 'react'
import './Header.css'

export default function Header({ view, onNavigate, babyName, dueDate, onOpenSettings }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const title = babyName ? `${babyName}의 일기` : '육아 일기'
  const dday = dueDate ? calcDday(dueDate) : null

  const icons = {
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
    settings: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="2.5"/><path d="M9 1.5v2M9 14.5v2M3 3l1.2 1.2M13.8 13.8L15 15M1.5 9h2M14.5 9h2M3 15l1.2-1.2M13.8 4.2L15 3"/>
      </svg>
    ),
  }

  const navItems = [
    { key: 'timeline', label: '일기' },
    { key: 'calendar', label: '캘린더' },
    { key: 'test', label: '임태기' },
    { key: 'events', label: '타임라인' },
  ]

  function handleNav(key) {
    onNavigate(key)
    setMenuOpen(false)
  }

  function handleSettings() {
    onOpenSettings()
    setMenuOpen(false)
  }

  return (
    <>
      <div className="header">
        <div className="header__left">
          <div className="header__title" onClick={() => onNavigate('timeline')}>{title}</div>
          {dday && <div className="header__dday">{dday}</div>}
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
