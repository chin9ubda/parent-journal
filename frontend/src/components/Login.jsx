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
      onLogin(data.token, data.role, auto, { baby_name: data.baby_name, due_date: data.due_date })
    } catch (err) {
      setError('로그인 실패: 아이디 또는 비밀번호를 확인하세요.')
    }
  }

  return (
    <div className="login">
      <h2>Parent Journal</h2>
      <form onSubmit={handleSubmit}>
        <div className="login__field">
          <label htmlFor="username">Username</label>
          <input id="username" value={user} onChange={e => setUser(e.target.value)} />
        </div>
        <div className="login__field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={pw} onChange={e => setPw(e.target.value)} />
        </div>
        <div className="login__field">
          <label>
            <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
            {' '}자동로그인
          </label>
        </div>
        {error && <div className="login__error">{error}</div>}
        <button type="submit" className="btn btn--primary">Login</button>
      </form>
    </div>
  )
}
