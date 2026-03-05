import { useEffect } from 'react'
import './Modal.css'

export default function Modal({ onClose, wide, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className={`modal-content ${wide ? 'modal-content--wide' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-inner">
          {children}
        </div>
      </div>
    </div>
  )
}
