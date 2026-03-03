import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List
from auth import get_current_user, get_current_user_form
from database import get_db
from file_handler import save_upload_files, delete_entry_files, get_entry_images, remove_images

router = APIRouter(prefix="/api")


def _parse_tags(raw: str) -> str:
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            parsed = []
        return json.dumps(parsed, ensure_ascii=False)
    except (json.JSONDecodeError, TypeError):
        return '[]'


@router.post('/entries')
async def create_entry(
    body: str = Form(...),
    title: str = Form(None),
    date: str = Form(None),
    tags: str = Form('[]'),
    files: List[UploadFile] = File([]),
    user: dict = Depends(get_current_user_form)
):
    uid = user['uid']
    dt = date or datetime.utcnow().isoformat()
    tags_json = _parse_tags(tags)
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'INSERT INTO entries(user_id, title, body, date, tags) VALUES(?,?,?,?,?)',
            (uid, title or '', body, dt, tags_json)
        )
        eid = c.lastrowid
        save_upload_files(eid, files, conn)
        conn.commit()
    return {'id': eid}


@router.get('/entries')
def list_entries(
    limit: int = 100,
    offset: int = 0,
    q: str = None,
    tag: str = None,
    user: dict = Depends(get_current_user)
):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        sql = 'SELECT id, title, body, date, tags FROM entries WHERE user_id=?'
        params = [uid]
        if q:
            sql += ' AND (title LIKE ? OR body LIKE ?)'
            like_q = f'%{q}%'
            params.extend([like_q, like_q])
        if tag:
            sql += ' AND tags LIKE ?'
            params.append(f'%"{tag}"%')
        sql += ' ORDER BY date DESC, id DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        c.execute(sql, params)
        rows = c.fetchall()
    return [
        {'id': r[0], 'title': r[1], 'body': r[2], 'date': r[3],
         'tags': json.loads(r[4]) if r[4] else []}
        for r in rows
    ]


@router.get('/tags')
def list_tags(user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT tags FROM entries WHERE user_id=? AND tags IS NOT NULL AND tags != '[]'",
            (uid,)
        )
        rows = c.fetchall()
    tag_set = set()
    for row in rows:
        try:
            for t in json.loads(row[0]):
                if t:
                    tag_set.add(t)
        except (json.JSONDecodeError, TypeError):
            pass
    return sorted(tag_set)


@router.get('/entries/{eid}')
def get_entry(eid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT id, user_id, title, body, date, tags FROM entries WHERE id=?', (eid,))
        r = c.fetchone()
    if not r:
        raise HTTPException(status_code=404)
    # Ownership check
    if r[1] != uid and user.get('role') != 'admin':
        raise HTTPException(status_code=403)
    imgs = get_entry_images(eid)
    return {
        'id': r[0], 'title': r[2], 'body': r[3], 'date': r[4],
        'tags': json.loads(r[5]) if r[5] else [],
        'images': imgs
    }


@router.put('/entries/{eid}')
async def update_entry(
    eid: int,
    body: str = Form(...),
    date: str = Form(None),
    tags: str = Form(None),
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

        update_fields = ['body=?', 'date=?']
        update_params = [body, date or datetime.utcnow().isoformat()]
        if tags is not None:
            update_fields.append('tags=?')
            update_params.append(_parse_tags(tags))
        update_params.append(eid)
        c.execute(f'UPDATE entries SET {", ".join(update_fields)} WHERE id=?', update_params)

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
