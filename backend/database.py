import sqlite3
from contextlib import contextmanager
from config import DB_PATH

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS users
            (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, role TEXT)''')
        c.execute('''CREATE TABLE IF NOT EXISTS entries
            (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
             title TEXT, body TEXT, date TEXT)''')
        c.execute('''CREATE TABLE IF NOT EXISTS images
            (id INTEGER PRIMARY KEY, entry_id INTEGER REFERENCES entries(id) ON DELETE CASCADE,
             filename TEXT, thumb TEXT)''')
        # Migrate: add missing columns to users table
        cols = {row[1] for row in c.execute("PRAGMA table_info(users)").fetchall()}
        if 'role' not in cols:
            c.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'")
        if 'baby_name' not in cols:
            c.execute("ALTER TABLE users ADD COLUMN baby_name TEXT")
        if 'due_date' not in cols:
            c.execute("ALTER TABLE users ADD COLUMN due_date TEXT")
        conn.commit()
