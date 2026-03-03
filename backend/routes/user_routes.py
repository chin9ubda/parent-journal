from fastapi import APIRouter, Form, HTTPException, Depends
from auth import hash_password, get_current_user, get_current_user_form, require_admin
from database import get_db

router = APIRouter(prefix="/api")


@router.get('/users')
def list_users(user: dict = Depends(get_current_user)):
    require_admin(user)
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT id, username, role FROM users')
        rows = c.fetchall()
    return [{'id': r[0], 'username': r[1], 'role': r[2]} for r in rows]


@router.post('/users')
def add_user(
    username: str = Form(...),
    password: str = Form(...),
    role: str = Form('viewer'),
    user: dict = Depends(get_current_user_form)
):
    require_admin(user)
    if role not in ('admin', 'viewer'):
        raise HTTPException(status_code=400, detail='Invalid role')
    with get_db() as conn:
        c = conn.cursor()
        try:
            c.execute(
                'INSERT INTO users(username, password_hash, role) VALUES(?,?,?)',
                (username, hash_password(password), role)
            )
            conn.commit()
        except Exception:
            raise HTTPException(status_code=400, detail='Username already exists')
    return {'ok': True}


@router.delete('/users/{uid}')
def delete_user(uid: int, user: dict = Depends(get_current_user)):
    require_admin(user)
    with get_db() as conn:
        c = conn.cursor()
        c.execute('DELETE FROM users WHERE id=?', (uid,))
        conn.commit()
    return {'ok': True}
