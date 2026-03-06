import json
import os
import io
import glob
import zipfile
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from auth import get_current_user
from database import get_db
from config import UPLOAD_DIR

router = APIRouter(prefix="/api")


def _fetch_entries(conn, uid, child_id):
    c = conn.cursor()
    sql = 'SELECT id, title, body, date, tags, timeline_label FROM entries WHERE user_id=?'
    params = [uid]
    if child_id:
        sql += ' AND child_id=?'
        params.append(child_id)
    sql += ' ORDER BY date ASC'
    c.execute(sql, params)
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
    return entries


def _fetch_table(conn, table, columns, uid, child_id):
    sql = f'SELECT {", ".join(columns)} FROM {table} WHERE user_id=?'
    params = [uid]
    if child_id:
        sql += ' AND child_id=?'
        params.append(child_id)
    sql += ' ORDER BY id ASC'
    c = conn.cursor()
    c.execute(sql, params)
    return [dict(zip(columns, row)) for row in c.fetchall()]


def _fetch_all_data(uid, child_id):
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            'SELECT id, name, due_date, birth_date, created_at FROM children WHERE user_id=? ORDER BY id',
            (uid,)
        )
        children = [dict(zip(['id', 'name', 'due_date', 'birth_date', 'created_at'], r)) for r in c.fetchall()]

        return {
            'exported_at': datetime.utcnow().isoformat(),
            'children': children,
            'entries': _fetch_entries(conn, uid, child_id),
            'growth_records': _fetch_table(
                conn, 'growth_records',
                ['id', 'date', 'height', 'weight', 'created_at'], uid, child_id),
            'care_records': _fetch_table(
                conn, 'care_records',
                ['id', 'category', 'datetime', 'feeding_type', 'amount_ml', 'duration_min',
                 'end_datetime', 'diaper_type', 'created_at'], uid, child_id),
            'babyfood_records': _fetch_table(
                conn, 'babyfood_records',
                ['id', 'date', 'ingredient', 'reaction', 'memo', 'created_at'], uid, child_id),
            'hospital_records': _fetch_table(
                conn, 'hospital_records',
                ['id', 'date', 'hospital_name', 'department', 'memo', 'created_at'], uid, child_id),
            'vaccination_records': _fetch_table(
                conn, 'vaccination_records',
                ['id', 'vaccine_name', 'dose_number', 'scheduled_age_months',
                 'date_completed', 'memo', 'created_at'], uid, child_id),
            'test_analyses': _fetch_table(
                conn, 'test_analyses',
                ['id', 'date', 'original_path', 'cropped_path',
                 'c_intensity', 't_intensity', 'ratio', 'created_at'], uid, child_id),
        }


@router.get('/export/json')
def export_json(child_id: int = None, user: dict = Depends(get_current_user)):
    data = _fetch_all_data(user['uid'], child_id)

    buf = io.BytesIO()
    buf.write(json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8'))
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type='application/json',
        headers={'Content-Disposition': f'attachment; filename="journal_backup_{datetime.now().strftime("%Y%m%d")}.json"'}
    )


@router.get('/export/zip')
def export_zip(child_id: int = None, user: dict = Depends(get_current_user)):
    """Export all data + images as a ZIP file."""
    data = _fetch_all_data(user['uid'], child_id)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('backup.json', json.dumps(data, ensure_ascii=False, indent=2))
        # 일기 이미지
        for entry in data['entries']:
            eid = entry['id']
            entry_dir = os.path.join(UPLOAD_DIR, str(eid))
            for img in entry['images']:
                fpath = os.path.join(entry_dir, img['filename'])
                if os.path.isfile(fpath):
                    zf.write(fpath, f"images/{eid}/{img['filename']}")
        # 임테기 이미지 (original, cropped, annotated 등)
        for test in data['test_analyses']:
            for path_key in ('original_path', 'cropped_path'):
                rel = test.get(path_key)
                if not rel:
                    continue
                fpath = os.path.join(UPLOAD_DIR, rel)
                if os.path.isfile(fpath):
                    zf.write(fpath, f"tests/{rel}")
            # annotated 이미지도 있으면 포함
            cropped = test.get('cropped_path')
            if cropped:
                annotated_rel = cropped.replace('cropped', 'annotated')
                annotated_path = os.path.join(UPLOAD_DIR, annotated_rel)
                if os.path.isfile(annotated_path):
                    zf.write(annotated_path, f"tests/{annotated_rel}")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type='application/zip',
        headers={'Content-Disposition': f'attachment; filename="journal_backup_{datetime.now().strftime("%Y%m%d")}.zip"'}
    )


def _find_korean_font(bold=False):
    """Find a NanumGothic TTF font file on the system."""
    name = 'NanumGothicBold.ttf' if bold else 'NanumGothic.ttf'
    candidates = glob.glob(f'/usr/share/fonts/**/{name}', recursive=True)
    if not candidates:
        candidates = glob.glob('/usr/share/fonts/**/*.ttf', recursive=True)
    return candidates[0] if candidates else None


@router.get('/export/pdf')
def export_pdf(child_id: int = None, user: dict = Depends(get_current_user)):
    """Export all entries as a PDF file with images."""
    with get_db() as conn:
        entries = _fetch_entries(conn, user['uid'], child_id)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=25)

    # Colors
    PRIMARY = (255, 107, 129)
    PRIMARY_LIGHT = (255, 160, 175)
    TEXT = (50, 50, 50)
    TEXT_LIGHT = (120, 120, 120)
    BG_ACCENT = (255, 240, 243)

    # Load Korean font
    font_reg = _find_korean_font(bold=False)
    font_bold = _find_korean_font(bold=True) or font_reg
    if font_reg:
        pdf.add_font('KR', '', font_reg)
        pdf.add_font('KR', 'B', font_bold)
        fn = 'KR'
    else:
        fn = 'Helvetica'

    page_w = 210  # A4 width
    margin = 20

    # ── Title page ──
    pdf.add_page()
    # Decorative top bar
    pdf.set_fill_color(*PRIMARY)
    pdf.rect(0, 0, page_w, 6, 'F')
    # Centered title
    pdf.ln(80)
    pdf.set_font(fn, 'B', 32)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(0, 18, '육아 일기', new_x='LMARGIN', new_y='NEXT', align='C')
    pdf.ln(6)
    pdf.set_draw_color(*PRIMARY_LIGHT)
    pdf.set_line_width(0.5)
    pdf.line(page_w / 2 - 30, pdf.get_y(), page_w / 2 + 30, pdf.get_y())
    pdf.ln(8)
    pdf.set_font(fn, '', 12)
    pdf.set_text_color(*TEXT_LIGHT)
    pdf.cell(0, 8, f'{datetime.now().strftime("%Y년 %m월 %d일")} 내보내기', new_x='LMARGIN', new_y='NEXT', align='C')
    pdf.cell(0, 8, f'총 {len(entries)}개의 기록', new_x='LMARGIN', new_y='NEXT', align='C')
    # Bottom bar
    pdf.set_fill_color(*PRIMARY)
    pdf.rect(0, 297 - 6, page_w, 6, 'F')

    # ── Entry pages ──
    for entry in entries:
        pdf.add_page()
        content_w = page_w - margin * 2

        # Top accent line
        pdf.set_fill_color(*PRIMARY)
        pdf.rect(margin, 12, content_w, 1.5, 'F')
        pdf.ln(8)

        # Date
        date_str = entry['date'] or ''
        pdf.set_font(fn, 'B', 18)
        pdf.set_text_color(*PRIMARY)
        pdf.cell(0, 12, date_str, new_x='LMARGIN', new_y='NEXT')

        # Timeline label badge
        if entry.get('timeline_label'):
            pdf.ln(2)
            pdf.set_font(fn, 'B', 11)
            label_text = entry['timeline_label']
            label_w = pdf.get_string_width(label_text) + 12
            x = pdf.get_x()
            y = pdf.get_y()
            pdf.set_fill_color(*BG_ACCENT)
            pdf.set_draw_color(*PRIMARY_LIGHT)
            pdf.rect(x, y, label_w, 8, 'DF')
            pdf.set_text_color(*PRIMARY)
            pdf.set_xy(x + 6, y)
            pdf.cell(label_w - 12, 8, label_text, new_x='LMARGIN', new_y='NEXT')

        # Tags
        if entry.get('tags'):
            pdf.ln(3)
            pdf.set_font(fn, '', 9)
            pdf.set_text_color(*TEXT_LIGHT)
            tags_str = '  '.join(f'#{t}' for t in entry['tags'])
            pdf.cell(0, 6, tags_str, new_x='LMARGIN', new_y='NEXT')

        pdf.ln(5)
        # Thin separator
        pdf.set_draw_color(230, 230, 230)
        pdf.set_line_width(0.3)
        pdf.line(margin, pdf.get_y(), margin + content_w, pdf.get_y())
        pdf.ln(5)

        # Body text
        if entry.get('body'):
            pdf.set_font(fn, '', 11)
            pdf.set_text_color(*TEXT)
            pdf.multi_cell(0, 7, entry['body'])
            pdf.ln(6)

        # Images
        for img in entry.get('images', []):
            eid = entry['id']
            fpath = os.path.join(UPLOAD_DIR, str(eid), img['filename'])
            if not os.path.isfile(fpath):
                continue
            try:
                img_w = min(content_w, 130)
                if pdf.get_y() > pdf.h - 90:
                    pdf.add_page()
                x_center = margin + (content_w - img_w) / 2
                pdf.image(fpath, x=x_center, w=img_w)
                pdf.ln(6)
            except Exception:
                pass

        # Bottom accent
        pdf.set_fill_color(*PRIMARY_LIGHT)
        pdf.rect(margin, pdf.h - 15, content_w, 0.8, 'F')

    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="journal_{datetime.now().strftime("%Y%m%d")}.pdf"'}
    )
