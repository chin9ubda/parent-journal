import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List
from auth import get_current_user, get_current_user_form
from database import get_db
from file_handler import save_upload_files, delete_entry_files, get_entry_images, remove_images

router = APIRouter(prefix="/api")


@router.post('/entries')
async def create_entry(
    body: str = Form(...),
    title: str = Form(None),
    date: str = Form(None),
    files: List[UploadFile] = File([]),
    user: dict = Depends(get_current_user_form)
):
    uid = user['uid']
    dt = date or datetime.utcnow().isoformat()
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'INSERT INTO entries(user_id, title, body, date) VALUES(?,?,?,?)',
            (uid, title or '', body, dt)
        )
        eid = c.lastrowid
        save_upload_files(eid, files, conn)
        conn.commit()
    return {'id': eid}


@router.get('/entries')
def list_entries(
    limit: int = 100,
    offset: int = 0,
    user: dict = Depends(get_current_user)
):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'SELECT id, title, body, date FROM entries WHERE user_id=? '
            'ORDER BY date DESC, id DESC LIMIT ? OFFSET ?',
            (uid, limit, offset)
        )
        rows = c.fetchall()
    return [{'id': r[0], 'title': r[1], 'body': r[2], 'date': r[3]} for r in rows]


@router.get('/entries/{eid}')
def get_entry(eid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT id, user_id, title, body, date FROM entries WHERE id=?', (eid,))
        r = c.fetchone()
    if not r:
        raise HTTPException(status_code=404)
    # Ownership check
    if r[1] != uid and user.get('role') != 'admin':
        raise HTTPException(status_code=403)
    imgs = get_entry_images(eid)
    return {'id': r[0], 'title': r[2], 'body': r[3], 'date': r[4], 'images': imgs}


@router.put('/entries/{eid}')
async def update_entry(
    eid: int,
    body: str = Form(...),
    date: str = Form(None),
    keep_images: str = Form(None),
    files: List[UploadFile] = File([]),
    user: dict = Depends(get_current_user_form)
):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM entries WHERE id=?', (eid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(status_code=403)
        c.execute(
            'UPDATE entries SET body=?, date=? WHERE id=?',
            (body, date or datetime.utcnow().isoformat(), eid)
        )
        # Handle kept images
        if keep_images is not None:
            try:
                keep = set(json.loads(keep_images))
            except (json.JSONDecodeError, TypeError):
                keep = set()
            c.execute('SELECT filename FROM images WHERE entry_id=?', (eid,))
            current_files = {row[0] for row in c.fetchall()}
            to_remove = current_files - keep
            if to_remove:
                remove_images(eid, to_remove, conn)
        # Handle new uploads
        save_upload_files(eid, files, conn)
        conn.commit()
    return {'ok': True}


@router.delete('/entries/{eid}')
def delete_entry(eid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM entries WHERE id=?', (eid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(status_code=403)
        delete_entry_files(eid)
        c.execute('DELETE FROM images WHERE entry_id=?', (eid,))
        c.execute('DELETE FROM entries WHERE id=?', (eid,))
        conn.commit()
    return {'ok': True}
