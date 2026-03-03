import { useState, useEffect } from 'react'
import './FadeIn.css'

export default function FadeIn({ children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 10) }, [])
  return (
    <div className={`fade-in ${visible ? 'fade-in--visible' : ''}`}>
      {children}
    </div>
  )
}
