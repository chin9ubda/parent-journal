import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config import UPLOAD_DIR
from database import init_db, get_db
from auth import hash_password, verify_password
from routes import auth_routes, user_routes, entry_routes

os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI()
app.mount('/uploads', StaticFiles(directory=UPLOAD_DIR), name='uploads')

ALLOWED_ORIGINS = os.environ.get('PJ_CORS_ORIGINS', '').split(',')
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(entry_routes.router)


def create_default_admin():
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT count(*) FROM users')
        if c.fetchone()[0] == 0:
            pw = hash_password('password')
            c.execute(
                'INSERT INTO users(username, password_hash, role) VALUES(?,?,?)',
                ('admin', pw, 'admin')
            )
            conn.commit()


@app.on_event("startup")
def startup():
    init_db()
    create_default_admin()


@app.get('/')
def root():
    return {'ok': True}
