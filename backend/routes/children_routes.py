from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api")


class ChildBody(BaseModel):
    name: str
    due_date: Optional[str] = None
    birth_date: Optional[str] = None


@router.get('/children')
def list_children(user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'SELECT id, name, due_date, birth_date FROM children WHERE user_id=? ORDER BY created_at ASC',
            (uid,)
        )
        rows = c.fetchall()
    return [
        {'id': r[0], 'name': r[1], 'due_date': r[2] or '', 'birth_date': r[3] or ''}
        for r in rows
    ]


@router.post('/children')
def create_child(body: ChildBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'INSERT INTO children(user_id, name, due_date, birth_date, created_at) VALUES(?,?,?,?,?)',
            (uid, body.name, body.due_date or None, body.birth_date or None, now)
        )
        cid = c.lastrowid
        conn.commit()
    return {'id': cid, 'name': body.name, 'due_date': body.due_date or '', 'birth_date': body.birth_date or ''}


@router.put('/children/{cid}')
def update_child(cid: int, body: ChildBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM children WHERE id=?', (cid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid:
            raise HTTPException(403)
        c.execute(
            'UPDATE children SET name=?, due_date=?, birth_date=? WHERE id=?',
            (body.name, body.due_date or None, body.birth_date or None, cid)
        )
        conn.commit()
    return {'id': cid, 'name': body.name, 'due_date': body.due_date or '', 'birth_date': body.birth_date or ''}


@router.delete('/children/{cid}')
def delete_child(cid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT COUNT(*) FROM children WHERE user_id=?', (uid,))
        if c.fetchone()[0] <= 1:
            raise HTTPException(400, detail='최소 1명의 아이가 필요합니다')
        c.execute('SELECT user_id FROM children WHERE id=?', (cid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid:
            raise HTTPException(403)
        c.execute('DELETE FROM children WHERE id=?', (cid,))
        conn.commit()
    return {'ok': True}
