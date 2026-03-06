import os
import uuid
import shutil
from datetime import datetime
import cv2
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from auth import get_current_user, get_current_user_form
from database import get_db, verify_child_owner
from config import UPLOAD_DIR, IMAGE_EXTENSIONS
from test_analyzer import analyze_test, recalculate_at_positions, _draw_annotations

router = APIRouter(prefix="/api")

TESTS_DIR = os.path.join(UPLOAD_DIR, '_tests')


@router.post('/tests')
async def create_test(
    file: UploadFile = File(...),
    date: str = Form(None),
    pre_cropped: str = Form(None),
    child_id: int = Form(None),
    user: dict = Depends(get_current_user_form)
):
    uid = user['uid']
    if child_id:
        verify_child_owner(child_id, uid)
    dt = date or datetime.utcnow().isoformat()[:10]

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in IMAGE_EXTENSIONS:
        raise HTTPException(400, 'Image file required')

    # Save original
    test_id = str(uuid.uuid4())[:8]
    test_dir = os.path.join(TESTS_DIR, test_id)
    os.makedirs(test_dir, exist_ok=True)

    original_name = 'original' + ext
    original_path = os.path.join(test_dir, original_name)
    with open(original_path, 'wb') as out:
        shutil.copyfileobj(file.file, out)

    # Run analysis
    result = analyze_test(original_path, test_dir, pre_cropped=(pre_cropped == 'true'))

    # Save to DB
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'INSERT INTO test_analyses(user_id, date, original_path, cropped_path, '
            'c_intensity, t_intensity, ratio, c_line_x, t_line_x, created_at, child_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
            (
                uid, dt,
                f'_tests/{test_id}/{original_name}',
                f'_tests/{test_id}/{result.get("cropped_filename", "")}' if result.get('success') else '',
                result.get('c_intensity'),
                result.get('t_intensity'),
                result.get('ratio'),
                result.get('c_line_x'),
                result.get('t_line_x'),
                datetime.utcnow().isoformat(),
                child_id,
            )
        )
        db_id = c.lastrowid
        conn.commit()

    return {
        'id': db_id,
        'date': dt,
        'success': result.get('success', False),
        'original_url': f'/uploads/_tests/{test_id}/{original_name}',
        'cropped_url': f'/uploads/_tests/{test_id}/{result.get("cropped_filename", "")}' if result.get('cropped_filename') else None,
        'annotated_url': f'/uploads/_tests/{test_id}/{result.get("annotated_filename", "")}' if result.get('annotated_filename') else None,
        'c_intensity': result.get('c_intensity'),
        't_intensity': result.get('t_intensity'),
        'ratio': result.get('ratio'),
        'c_line_x': result.get('c_line_x'),
        't_line_x': result.get('t_line_x'),
        'error': result.get('error'),
    }


@router.get('/tests')
def list_tests(child_id: int = None, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        sql = ('SELECT id, date, original_path, cropped_path, c_intensity, t_intensity, ratio, c_line_x, t_line_x '
               'FROM test_analyses WHERE user_id=?')
        params = [uid]
        if child_id:
            sql += ' AND child_id=?'
            params.append(child_id)
        sql += ' ORDER BY date DESC, id DESC'
        c.execute(sql, params)
        rows = c.fetchall()
    return [
        {
            'id': r[0],
            'date': r[1],
            'original_url': f'/uploads/{r[2]}' if r[2] else None,
            'cropped_url': f'/uploads/{r[3]}' if r[3] else None,
            'annotated_url': f'/uploads/{r[3]}'.replace('cropped', 'annotated') if r[3] else None,
            'c_intensity': r[4],
            't_intensity': r[5],
            'ratio': r[6],
            'c_line_x': r[7],
            't_line_x': r[8],
        }
        for r in rows
    ]


class DateUpdate(BaseModel):
    date: str


class LineAdjust(BaseModel):
    c_line_x: int
    t_line_x: int


@router.put('/tests/{tid}/date')
def update_date(tid: int, body: DateUpdate, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id FROM test_analyses WHERE id=?', (tid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        c.execute('UPDATE test_analyses SET date=? WHERE id=?', (body.date, tid))
        conn.commit()
    return {'date': body.date}


@router.put('/tests/{tid}/lines')
def adjust_lines(tid: int, body: LineAdjust, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id, cropped_path FROM test_analyses WHERE id=?', (tid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)

        cropped_path = os.path.join(UPLOAD_DIR, row[1])
        if not os.path.isfile(cropped_path):
            raise HTTPException(400, 'Cropped image not found')

        img = cv2.imread(cropped_path)
        if img is None:
            raise HTTPException(400, 'Cannot read cropped image')

        result = recalculate_at_positions(img, body.c_line_x, body.t_line_x)

        # Regenerate annotated image
        ann_result = {
            'success': True,
            'c_line_x': body.c_line_x,
            't_line_x': body.t_line_x,
            'window_y': result['window_y'],
            'window_x': None,
        }
        annotated = _draw_annotations(img, ann_result)
        annotated_path = cropped_path.replace('cropped', 'annotated')
        cv2.imwrite(annotated_path, annotated)

        c.execute(
            'UPDATE test_analyses SET c_line_x=?, t_line_x=?, c_intensity=?, t_intensity=?, ratio=? WHERE id=?',
            (body.c_line_x, body.t_line_x, result['c_intensity'], result['t_intensity'], result['ratio'], tid)
        )
        conn.commit()

    return {
        'c_intensity': result['c_intensity'],
        't_intensity': result['t_intensity'],
        'ratio': result['ratio'],
        'c_line_x': body.c_line_x,
        't_line_x': body.t_line_x,
    }


@router.delete('/tests/{tid}')
def delete_test(tid: int, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT user_id, original_path FROM test_analyses WHERE id=?', (tid,))
        row = c.fetchone()
        if not row:
            raise HTTPException(404)
        if row[0] != uid and user.get('role') != 'admin':
            raise HTTPException(403)
        # Delete files
        if row[1]:
            test_dir = os.path.join(UPLOAD_DIR, os.path.dirname(row[1]))
            if os.path.isdir(test_dir):
                shutil.rmtree(test_dir, ignore_errors=True)
        c.execute('DELETE FROM test_analyses WHERE id=?', (tid,))
        conn.commit()
    return {'ok': True}
