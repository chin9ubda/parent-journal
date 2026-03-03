import { useState } from 'react'
import Editor from './Editor'
import './ListModal.css'

export default function ListModal({ items, date, token, onClose, onOpenEntry }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Editor
        token={token}
        initialDate={date}
        onDone={(eid) => {
          setEditing(false)
          if (eid) {
            onClose()
            onOpenEntry(eid)
          }
        }}
      />
    )
  }

  return (
    <div className="list-modal">
      <div className="list-modal__header">
        <div className="list-modal__title">{date}에 작성된 기록</div>
        <button className="btn btn--soft" onClick={() => setEditing(true)}>
          새로운 기록
        </button>
      </div>
      <div className="list-modal__items">
        {items.map(it => (
          <div
            key={it.id}
            className="list-modal__item"
            onClick={() => onOpenEntry(it.id)}
          >
            <div className="list-modal__item-date">{it.date}</div>
            <div className="list-modal__item-body">{it.body.slice(0, 120)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
