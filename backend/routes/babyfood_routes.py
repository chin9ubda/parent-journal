from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from database import get_db, verify_child_owner

router = APIRouter(prefix="/api")


class BabyfoodBody(BaseModel):
    date: str
    ingredient: str
    reaction: Optional[str] = None  # good, normal, allergy
    memo: Optional[str] = None
    child_id: Optional[int] = None


@router.post('/babyfood')
def create_babyfood(body: BabyfoodBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    if body.child_id:
        verify_child_owner(body.child_id, uid)
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            '''INSERT INTO babyfood_records(user_id, date, ingredient, reaction, memo, created_at, child_id)
               VALUES(?,?,?,?,?,?,?)''',
            (uid, body.date, body.ingredient, body.reaction, body.memo, now, body.child_id)
        )
        rid = c.lastrowid
        conn.commit()
    return {'id': rid, 'date': body.date, 'ingredient': body.ingredient,
            'reaction': body.reaction, 'memo': body.memo}


@router.get('/babyfood')
def list_babyfood(child_id: int = None, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        sql = '''SELECT id, date, ingredient, reaction, memo
                 FROM babyfood_records WHERE user_id=?'''
        params = [uid]
        if child_id:
            sql += ' AND child_id=?'
            params.append(child_id)
        sql += ' ORDER BY date DESC, id DESC'
        c.execute(sql, params)
        rows = c.fetchall()
    return [
        {'id': r[0], 'date': r[1], 'ingredient': r[2], 'reaction': r[3], 'memo': r[4]}
        for r in rows
    ]


@router.put('/babyfood/{rid}')
def update_babyfood(rid: int, body: BabyfoodBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM babyfood_records WHERE id=?', (rid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute(
            '''UPDATE babyfood_records SET date=?, ingredient=?, reaction=?, memo=?
               WHERE id=?''',
            (body.date, body.ingredient, body.reaction, body.memo, rid)
        )
        conn.commit()
    return {'id': rid, 'date': body.date, 'ingredient': body.ingredient,
            'reaction': body.reaction, 'memo': body.memo}


@router.delete('/babyfood/{rid}')
def delete_babyfood(rid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM babyfood_records WHERE id=?', (rid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute('DELETE FROM babyfood_records WHERE id=?', (rid,))
        conn.commit()
    return {'ok': True}
