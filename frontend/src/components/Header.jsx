import './Header.css'

export default function Header({ view, onNavigate, babyName, dueDate, onOpenSettings }) {
  const title = babyName ? `${babyName}의 일기` : '육아 일기'
  const dday = dueDate ? calcDday(dueDate) : null

  return (
    <div className="header">
      <div className="header__left">
        <div className="header__title">{title}</div>
        {dday && <div className="header__dday">{dday}</div>}
      </div>
      <div className="header__center">
        <button
          className={`header__btn ${view === 'timeline' ? 'header__btn--active' : ''}`}
          onClick={() => onNavigate('timeline')}
        >
          타임라인
        </button>
        <button
          className={`header__btn ${view === 'calendar' ? 'header__btn--active' : ''}`}
          onClick={() => onNavigate('calendar')}
        >
          캘린더
        </button>
      </div>
      <div className="header__right">
        <button className="header__settings-btn" onClick={onOpenSettings} title="설정">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="3"/>
            <path d="M10 1.5v2M10 16.5v2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M1.5 10h2M16.5 10h2M3.4 16.6l1.4-1.4M15.2 4.8l1.4-1.4"/>
          </svg>
        </button>
      </div>
    </div>
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
