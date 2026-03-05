from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api")


class HospitalBody(BaseModel):
    date: str
    hospital_name: str
    department: Optional[str] = None
    memo: Optional[str] = None


@router.post('/hospital')
def create_hospital(body: HospitalBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            '''INSERT INTO hospital_records(user_id, date, hospital_name, department, memo, created_at)
               VALUES(?,?,?,?,?,?)''',
            (uid, body.date, body.hospital_name, body.department, body.memo, now)
        )
        rid = c.lastrowid
        conn.commit()
    return {'id': rid, 'date': body.date, 'hospital_name': body.hospital_name,
            'department': body.department, 'memo': body.memo}


@router.get('/hospital')
def list_hospital(user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            '''SELECT id, date, hospital_name, department, memo
               FROM hospital_records WHERE user_id=?
               ORDER BY date DESC, id DESC''',
            (uid,)
        )
        rows = c.fetchall()
    return [
        {'id': r[0], 'date': r[1], 'hospital_name': r[2], 'department': r[3], 'memo': r[4]}
        for r in rows
    ]


@router.put('/hospital/{rid}')
def update_hospital(rid: int, body: HospitalBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM hospital_records WHERE id=?', (rid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute(
            '''UPDATE hospital_records SET date=?, hospital_name=?, department=?, memo=?
               WHERE id=?''',
            (body.date, body.hospital_name, body.department, body.memo, rid)
        )
        conn.commit()
    return {'id': rid, 'date': body.date, 'hospital_name': body.hospital_name,
            'department': body.department, 'memo': body.memo}


@router.delete('/hospital/{rid}')
def delete_hospital(rid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM hospital_records WHERE id=?', (rid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute('DELETE FROM hospital_records WHERE id=?', (rid,))
        conn.commit()
    return {'ok': True}
