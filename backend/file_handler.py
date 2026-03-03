import os
import uuid
import shutil
from PIL import Image
from config import UPLOAD_DIR, THUMB_SIZE, ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS


def save_upload_files(entry_id: int, files, conn):
    """Save uploaded files, create thumbnails for images, insert into DB."""
    if not files:
        return
    entry_dir = os.path.join(UPLOAD_DIR, str(entry_id))
    os.makedirs(entry_dir, exist_ok=True)
    c = conn.cursor()
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
        fname = str(uuid.uuid4()) + ext
        safe_path = os.path.join(entry_dir, fname)
        # Path traversal check
        if not os.path.abspath(safe_path).startswith(os.path.abspath(entry_dir)):
            continue
        with open(safe_path, 'wb') as out:
            shutil.copyfileobj(f.file, out)
        thumb_name = ''
        if ext in IMAGE_EXTENSIONS:
            try:
                im = Image.open(safe_path)
                im.thumbnail(THUMB_SIZE)
                thumb_name = 'thumb_' + fname
                im.save(os.path.join(entry_dir, thumb_name))
            except Exception:
                thumb_name = ''
        c.execute(
            'INSERT INTO images(entry_id, filename, thumb) VALUES(?,?,?)',
            (entry_id, fname, thumb_name)
        )


def delete_entry_files(entry_id: int):
    """Delete all files for an entry from disk."""
    entry_dir = os.path.join(UPLOAD_DIR, str(entry_id))
    if os.path.isdir(entry_dir):
        shutil.rmtree(entry_dir, ignore_errors=True)


def get_entry_files(entry_id: int) -> list:
    """Read all media files for an entry from filesystem and DB."""
    from database import get_db
    entry_dir = os.path.join(UPLOAD_DIR, str(entry_id))
    result = []
    if not os.path.isdir(entry_dir):
        return result
    existing = set(os.listdir(entry_dir))
    for name in sorted(existing):
        if name.startswith('thumb_'):
            continue
        ext = os.path.splitext(name)[1].lower()
        is_video = ext not in IMAGE_EXTENSIONS and ext in ALLOWED_EXTENSIONS
        thumb = f'thumb_{name}' if f'thumb_{name}' in existing else ''
        item = {
            'original': f'/uploads/{entry_id}/{name}',
            'filename': name,
            'type': 'video' if is_video else 'image',
        }
        if thumb:
            item['thumb'] = f'/uploads/{entry_id}/{thumb}'
        result.append(item)
    return result


# Keep old name as alias for compatibility
get_entry_images = get_entry_files


def remove_images(entry_id: int, filenames_to_remove: set, conn):
    """Remove specific files from an entry."""
    entry_dir = os.path.join(UPLOAD_DIR, str(entry_id))
    c = conn.cursor()
    for fn in filenames_to_remove:
        file_path = os.path.join(entry_dir, fn)
        thumb_path = os.path.join(entry_dir, 'thumb_' + fn)
        try:
            os.remove(file_path)
        except OSError:
            pass
        try:
            os.remove(thumb_path)
        except OSError:
            pass
        c.execute('DELETE FROM images WHERE entry_id=? AND filename=?', (entry_id, fn))
