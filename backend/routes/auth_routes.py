from fastapi import APIRouter, Form, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from auth import hash_password, verify_password, create_token, get_current_user, get_current_user_form
from database import get_db

router = APIRouter(prefix="/api")


class AuthIn(BaseModel):
    username: str
    password: str


def _get_children(conn, uid):
    c = conn.cursor()
    c.execute(
        'SELECT id, name, due_date, birth_date FROM children WHERE user_id=? ORDER BY created_at ASC',
        (uid,)
    )
    return [
        {'id': r[0], 'name': r[1], 'due_date': r[2] or '', 'birth_date': r[3] or ''}
        for r in c.fetchall()
    ]


@router.post('/login')
def login(data: AuthIn):
    with get_db() as conn:
        c = conn.cursor()
        try:
            c.execute('SELECT id, password_hash, role, baby_name, due_date FROM users WHERE username=?', (data.username,))
            row = c.fetchone()
        except Exception:
            c.execute('SELECT id, password_hash, role FROM users WHERE username=?', (data.username,))
            row = c.fetchone()
            if row:
                row = (row[0], row[1], row[2], None, None)
        if not row or not verify_password(data.password, row[1]):
            raise HTTPException(status_code=401, detail='Invalid credentials')
        uid, _, role, baby_name, due_date = row
        token = create_token(uid, role)
        children = _get_children(conn, uid)
    return {
        'token': token, 'role': role,
        'baby_name': baby_name or '', 'due_date': due_date or '',
        'children': children,
    }


class SettingsIn(BaseModel):
    baby_name: Optional[str] = ''
    due_date: Optional[str] = ''


@router.get('/settings')
def get_settings(user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT baby_name, due_date FROM users WHERE id=?', (uid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404)
        children = _get_children(conn, uid)
    return {'baby_name': row[0] or '', 'due_date': row[1] or '', 'children': children}


@router.put('/settings')
def update_settings(data: SettingsIn, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('UPDATE users SET baby_name=?, due_date=? WHERE id=?',
                  (data.baby_name, data.due_date, uid))
        conn.commit()
    return {'ok': True, 'baby_name': data.baby_name or '', 'due_date': data.due_date or ''}


@router.post('/change-password')
def change_password(
    current: str = Form(...),
    new: str = Form(...),
    user: dict = Depends(get_current_user_form)
):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT password_hash FROM users WHERE id=?', (uid,))
        row = c.fetchone()
        if not row or not verify_password(current, row[0]):
            raise HTTPException(status_code=401, detail='Wrong current password')
        new_hash = hash_password(new)
        c.execute('UPDATE users SET password_hash=? WHERE id=?', (new_hash, uid))
        conn.commit()
    return {'ok': True}
