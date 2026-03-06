import { useState } from 'react'
import { login as apiLogin } from '../api'
import './Login.css'

export default function Login({ onLogin }) {
  const [user, setUser] = useState('admin')
  const [pw, setPw] = useState('')
  const [auto, setAuto] = useState(true)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const data = await apiLogin(user, pw)
      onLogin(data.token, data.role, auto, { baby_name: data.baby_name, due_date: data.due_date, children: data.children || [] })
    } catch (err) {
      setError('로그인 실패: 아이디 또는 비밀번호를 확인하세요.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="var(--color-primary-light)" strokeWidth="2.5" fill="var(--color-primary-bg)"/>
            <path d="M24 14c-4 0-8 3.5-8 8s4 10 8 14c4-4 8-8.5 8-14s-4-8-8-8z" fill="var(--color-primary-light)" opacity="0.6"/>
          </svg>
        </div>
        <h1 className="login-card__title">Parent Journal</h1>
        <p className="login-card__subtitle">소중한 순간을 기록하세요</p>

        <form className="login-card__form" onSubmit={handleSubmit}>
          <div className="login-card__input-group">
            <input
              type="text"
              id="username"
              className="login-card__input"
              value={user}
              onChange={e => setUser(e.target.value)}
              placeholder="아이디"
            />
          </div>
          <div className="login-card__input-group">
            <input
              type="password"
              id="password"
              className="login-card__input"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="비밀번호"
            />
          </div>

          {error && <div className="login-card__error">{error}</div>}

          <button type="submit" className="login-card__submit">로그인</button>

          <label className="login-card__auto">
            <input
              type="checkbox"
              checked={auto}
              onChange={e => setAuto(e.target.checked)}
            />
            자동 로그인
          </label>
        </form>
      </div>
    </div>
  )
}
