import json
import os
import io
import zipfile
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from auth import get_current_user
from database import get_db
from config import UPLOAD_DIR

router = APIRouter(prefix="/api")


@router.get('/export/json')
def export_json(user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'SELECT id, title, body, date, tags, timeline_label FROM entries WHERE user_id=? ORDER BY date ASC',
            (uid,)
        )
        entries = []
        for r in c.fetchall():
            eid = r[0]
            c2 = conn.cursor()
            c2.execute('SELECT filename, thumb FROM images WHERE entry_id=?', (eid,))
            images = [{'filename': row[0], 'thumb': row[1]} for row in c2.fetchall()]
            entries.append({
                'id': eid, 'title': r[1], 'body': r[2], 'date': r[3],
                'tags': json.loads(r[4]) if r[4] else [],
                'timeline_label': r[5],
                'images': images,
            })

    data = {
        'exported_at': datetime.utcnow().isoformat(),
        'entries': entries,
    }

    buf = io.BytesIO()
    buf.write(json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8'))
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type='application/json',
        headers={'Content-Disposition': f'attachment; filename="journal_backup_{datetime.now().strftime("%Y%m%d")}.json"'}
    )


@router.get('/export/zip')
def export_zip(user: dict = Depends(get_current_user)):
    """Export all entries + images as a ZIP file."""
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'SELECT id, title, body, date, tags, timeline_label FROM entries WHERE user_id=? ORDER BY date ASC',
            (uid,)
        )
        entries = []
        for r in c.fetchall():
            eid = r[0]
            c2 = conn.cursor()
            c2.execute('SELECT filename, thumb FROM images WHERE entry_id=?', (eid,))
            images = [{'filename': row[0], 'thumb': row[1]} for row in c2.fetchall()]
            entries.append({
                'id': eid, 'title': r[1], 'body': r[2], 'date': r[3],
                'tags': json.loads(r[4]) if r[4] else [],
                'timeline_label': r[5],
                'images': images,
            })

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Write entries JSON
        zf.writestr('entries.json', json.dumps(entries, ensure_ascii=False, indent=2))
        # Write image files
        for entry in entries:
            eid = entry['id']
            entry_dir = os.path.join(UPLOAD_DIR, str(eid))
            for img in entry['images']:
                fpath = os.path.join(entry_dir, img['filename'])
                if os.path.isfile(fpath):
                    zf.write(fpath, f"images/{eid}/{img['filename']}")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type='application/zip',
        headers={'Content-Disposition': f'attachment; filename="journal_backup_{datetime.now().strftime("%Y%m%d")}.zip"'}
    )
