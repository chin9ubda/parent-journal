from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from database import get_db, verify_child_owner

router = APIRouter(prefix="/api")


class CareBody(BaseModel):
    category: str  # feeding, sleep, diaper
    datetime: str
    feeding_type: Optional[str] = None
    amount_ml: Optional[float] = None
    duration_min: Optional[float] = None
    end_datetime: Optional[str] = None
    diaper_type: Optional[str] = None
    child_id: Optional[int] = None


@router.post('/care')
def create_care(body: CareBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    if body.child_id:
        verify_child_owner(body.child_id, uid)
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            '''INSERT INTO care_records(user_id, category, datetime,
               feeding_type, amount_ml, duration_min, end_datetime, diaper_type, created_at, child_id)
               VALUES(?,?,?,?,?,?,?,?,?,?)''',
            (uid, body.category, body.datetime,
             body.feeding_type, body.amount_ml, body.duration_min,
             body.end_datetime, body.diaper_type, now, body.child_id)
        )
        rid = c.lastrowid
        conn.commit()
    return {'id': rid, 'category': body.category, 'datetime': body.datetime,
            'feeding_type': body.feeding_type, 'amount_ml': body.amount_ml,
            'duration_min': body.duration_min, 'end_datetime': body.end_datetime,
            'diaper_type': body.diaper_type}


@router.get('/care')
def list_care(category: Optional[str] = None, child_id: int = None, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        sql = '''SELECT id, category, datetime, feeding_type, amount_ml,
                 duration_min, end_datetime, diaper_type
                 FROM care_records WHERE user_id=?'''
        params = [uid]
        if category:
            sql += ' AND category=?'
            params.append(category)
        if child_id:
            sql += ' AND child_id=?'
            params.append(child_id)
        sql += ' ORDER BY datetime DESC'
        c.execute(sql, params)
        rows = c.fetchall()
    return [
        {'id': r[0], 'category': r[1], 'datetime': r[2],
         'feeding_type': r[3], 'amount_ml': r[4],
         'duration_min': r[5], 'end_datetime': r[6], 'diaper_type': r[7]}
        for r in rows
    ]


@router.get('/care/summary')
def care_summary(date: str, child_id: int = None, user: dict = Depends(get_current_user)):
    uid = user['uid']
    child_filter = ' AND child_id=?' if child_id else ''
    base_params = [uid, date + '%'] + ([child_id] if child_id else [])
    with get_db() as conn:
        c = conn.cursor()
        # Feeding count + total ml
        c.execute(
            f'''SELECT COUNT(*), COALESCE(SUM(amount_ml),0)
               FROM care_records WHERE user_id=? AND category='feeding'
               AND datetime LIKE ?{child_filter}''',
            base_params
        )
        feed_row = c.fetchone()
        # Sleep count + total minutes
        c.execute(
            f'''SELECT COUNT(*), COALESCE(SUM(duration_min),0)
               FROM care_records WHERE user_id=? AND category='sleep'
               AND datetime LIKE ?{child_filter}''',
            base_params
        )
        sleep_row = c.fetchone()
        # Diaper counts by type
        c.execute(
            f'''SELECT diaper_type, COUNT(*)
               FROM care_records WHERE user_id=? AND category='diaper'
               AND datetime LIKE ?{child_filter}
               GROUP BY diaper_type''',
            base_params
        )
        diaper_rows = c.fetchall()
    return {
        'feeding': {'count': feed_row[0], 'total_ml': feed_row[1]},
        'sleep': {'count': sleep_row[0], 'total_min': sleep_row[1]},
        'diaper': {r[0]: r[1] for r in diaper_rows if r[0]},
    }


@router.put('/care/{rid}')
def update_care(rid: int, body: CareBody, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM care_records WHERE id=?', (rid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute(
            '''UPDATE care_records SET category=?, datetime=?,
               feeding_type=?, amount_ml=?, duration_min=?,
               end_datetime=?, diaper_type=?
               WHERE id=?''',
            (body.category, body.datetime,
             body.feeding_type, body.amount_ml, body.duration_min,
             body.end_datetime, body.diaper_type, rid)
        )
        conn.commit()
    return {'id': rid, 'category': body.category, 'datetime': body.datetime,
            'feeding_type': body.feeding_type, 'amount_ml': body.amount_ml,
            'duration_min': body.duration_min, 'end_datetime': body.end_datetime,
            'diaper_type': body.diaper_type}


@router.delete('/care/{rid}')
def delete_care(rid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM care_records WHERE id=?', (rid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute('DELETE FROM care_records WHERE id=?', (rid,))
        conn.commit()
    return {'ok': True}
