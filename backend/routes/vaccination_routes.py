from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api")


class VaccinationBody(BaseModel):
    vaccine_name: str
    dose_number: int
    scheduled_age_months: Optional[int] = None
    date_completed: str
    memo: Optional[str] = None


@router.get('/vaccinations')
def list_vaccinations(user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'SELECT id, vaccine_name, dose_number, scheduled_age_months, date_completed, memo '
            'FROM vaccination_records WHERE user_id=? ORDER BY date_completed DESC',
            (uid,)
        )
        rows = c.fetchall()
    return [
        {'id': r[0], 'vaccine_name': r[1], 'dose_number': r[2],
         'scheduled_age_months': r[3], 'date_completed': r[4], 'memo': r[5]}
        for r in rows
    ]


@router.post('/vaccinations')
def create_vaccination(body: VaccinationBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'INSERT INTO vaccination_records(user_id, vaccine_name, dose_number, '
            'scheduled_age_months, date_completed, memo, created_at) VALUES(?,?,?,?,?,?,?)',
            (uid, body.vaccine_name, body.dose_number, body.scheduled_age_months,
             body.date_completed, body.memo, datetime.utcnow().isoformat())
        )
        vid = c.lastrowid
        conn.commit()
    return {'id': vid, 'vaccine_name': body.vaccine_name, 'dose_number': body.dose_number,
            'scheduled_age_months': body.scheduled_age_months,
            'date_completed': body.date_completed, 'memo': body.memo}


@router.delete('/vaccinations/{vid}')
def delete_vaccination(vid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM vaccination_records WHERE id=?', (vid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute('DELETE FROM vaccination_records WHERE id=?', (vid,))
        conn.commit()
    return {'ok': True}
