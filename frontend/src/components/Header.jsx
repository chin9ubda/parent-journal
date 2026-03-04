import { useState } from 'react'
import './Header.css'

export default function Header({ view, onNavigate, babyName, dueDate, onOpenSettings }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const title = babyName ? `${babyName}의 일기` : '육아 일기'
  const dday = dueDate ? calcDday(dueDate) : null

  const navItems = [
    { key: 'timeline', label: '타임라인', icon: '📋' },
    { key: 'calendar', label: '캘린더', icon: '📅' },
    { key: 'test', label: '임태기', icon: '🧪' },
    { key: 'events', label: '이벤트', icon: '📌' },
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
              <span className="drawer__icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="drawer__divider" />

        <button className="drawer__item" onClick={handleSettings}>
          <span className="drawer__icon">⚙️</span>
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
