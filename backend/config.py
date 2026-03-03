import os

DATA_DIR = '/data'
DB_PATH = os.path.join(DATA_DIR, 'journal.db')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
SECRET = os.environ.get('PJ_SECRET', 'devsecret')
THUMB_SIZE = (320, 320)
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.webm', '.avi', '.mkv'}
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS
