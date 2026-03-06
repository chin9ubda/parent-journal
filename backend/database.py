import sqlite3
from contextlib import contextmanager
from fastapi import HTTPException
from config import DB_PATH

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


def verify_child_owner(child_id, uid):
    """Verify that child_id belongs to the given user. Returns child_id or raises 403."""
    if not child_id:
        return None
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT id FROM children WHERE id=? AND user_id=?', (child_id, uid))
        if not c.fetchone():
            raise HTTPException(status_code=403, detail='Not your child')
    return child_id


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
        # Migrate: add tags column to entries table
        entry_cols = {row[1] for row in c.execute("PRAGMA table_info(entries)").fetchall()}
        if 'tags' not in entry_cols:
            c.execute("ALTER TABLE entries ADD COLUMN tags TEXT DEFAULT '[]'")
        if 'timeline_label' not in entry_cols:
            c.execute("ALTER TABLE entries ADD COLUMN timeline_label TEXT")
        # Pregnancy test analyses table
        c.execute('''CREATE TABLE IF NOT EXISTS test_analyses
            (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
             date TEXT, original_path TEXT, cropped_path TEXT,
             c_intensity REAL, t_intensity REAL, ratio REAL,
             created_at TEXT)''')
        # Migrate: add c_line_x, t_line_x to test_analyses
        test_cols = {row[1] for row in c.execute("PRAGMA table_info(test_analyses)").fetchall()}
        if 'c_line_x' not in test_cols:
            c.execute("ALTER TABLE test_analyses ADD COLUMN c_line_x INTEGER")
        if 't_line_x' not in test_cols:
            c.execute("ALTER TABLE test_analyses ADD COLUMN t_line_x INTEGER")
        # Growth records table
        c.execute('''CREATE TABLE IF NOT EXISTS growth_records
            (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
             date TEXT, height REAL, weight REAL,
             created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')
        # Care records table (feeding / sleep / diaper)
        c.execute('''CREATE TABLE IF NOT EXISTS care_records
            (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
             category TEXT, datetime TEXT,
             feeding_type TEXT, amount_ml REAL, duration_min REAL,
             end_datetime TEXT,
             diaper_type TEXT,
             created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')
        # Baby food records table
        c.execute('''CREATE TABLE IF NOT EXISTS babyfood_records
            (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
             date TEXT, ingredient TEXT, reaction TEXT, memo TEXT,
             created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')
        # Hospital records table
        c.execute('''CREATE TABLE IF NOT EXISTS hospital_records
            (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
             date TEXT, hospital_name TEXT, department TEXT, memo TEXT,
             created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')
        # Vaccination records table
        c.execute('''CREATE TABLE IF NOT EXISTS vaccination_records
            (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
             vaccine_name TEXT, dose_number INTEGER,
             scheduled_age_months INTEGER, date_completed TEXT, memo TEXT,
             created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')

        # ── Children table ──
        c.execute('''CREATE TABLE IF NOT EXISTS children
            (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
             name TEXT, due_date TEXT, birth_date TEXT,
             created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')

        # Migrate: add child_id column to 7 record tables
        _tables_needing_child_id = [
            'entries', 'test_analyses', 'growth_records',
            'care_records', 'babyfood_records', 'hospital_records',
            'vaccination_records',
        ]
        for tbl in _tables_needing_child_id:
            tbl_cols = {row[1] for row in c.execute(f"PRAGMA table_info({tbl})").fetchall()}
            if 'child_id' not in tbl_cols:
                c.execute(f"ALTER TABLE {tbl} ADD COLUMN child_id INTEGER REFERENCES children(id)")

        # Auto-migrate: if users have baby_name but children is empty, create child records
        c.execute('SELECT id, baby_name, due_date FROM users WHERE baby_name IS NOT NULL AND baby_name != ""')
        users_with_baby = c.fetchall()
        for uid, baby_name, due_date in users_with_baby:
            c.execute('SELECT COUNT(*) FROM children WHERE user_id=?', (uid,))
            if c.fetchone()[0] == 0:
                c.execute(
                    'INSERT INTO children(user_id, name, due_date, created_at) VALUES(?,?,?,CURRENT_TIMESTAMP)',
                    (uid, baby_name, due_date)
                )
                child_id = c.lastrowid
                # Assign all existing records to this child
                for tbl in _tables_needing_child_id:
                    c.execute(f'UPDATE {tbl} SET child_id=? WHERE user_id=? AND child_id IS NULL',
                              (child_id, uid))

        conn.commit()
