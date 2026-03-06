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


@router.get('/export/json')
def export_json(child_id: int = None, user: dict = Depends(get_current_user)):
    uid = user['uid']
    with get_db() as conn:
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
def export_zip(child_id: int = None, user: dict = Depends(get_current_user)):
    """Export all entries + images as a ZIP file."""
    uid = user['uid']
    with get_db() as conn:
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
    uid = user['uid']
    with get_db() as conn:
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
