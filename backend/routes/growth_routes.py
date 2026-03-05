from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api")


class GrowthBody(BaseModel):
    date: str
    height: Optional[float] = None
    weight: Optional[float] = None


@router.post('/growth')
def create_growth(body: GrowthBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'INSERT INTO growth_records(user_id, date, height, weight, created_at) VALUES(?,?,?,?,?)',
            (uid, body.date, body.height, body.weight, datetime.utcnow().isoformat())
        )
        gid = c.lastrowid
        conn.commit()
    return {'id': gid, 'date': body.date, 'height': body.height, 'weight': body.weight}


@router.get('/growth')
def list_growth(user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'SELECT id, date, height, weight FROM growth_records WHERE user_id=? ORDER BY date ASC',
            (uid,)
        )
        rows = c.fetchall()
    return [
        {'id': r[0], 'date': r[1], 'height': r[2], 'weight': r[3]}
        for r in rows
    ]


@router.put('/growth/{gid}')
def update_growth(gid: int, body: GrowthBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM growth_records WHERE id=?', (gid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute(
            'UPDATE growth_records SET date=?, height=?, weight=? WHERE id=?',
            (body.date, body.height, body.weight, gid)
        )
        conn.commit()
    return {'id': gid, 'date': body.date, 'height': body.height, 'weight': body.weight}


@router.delete('/growth/{gid}')
def delete_growth(gid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM growth_records WHERE id=?', (gid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute('DELETE FROM growth_records WHERE id=?', (gid,))
        conn.commit()
    return {'ok': True}
