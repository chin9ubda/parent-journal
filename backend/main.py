import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import sqlite3
import uuid
import shutil
import hashlib
import jwt
from datetime import datetime, timedelta
from PIL import Image

DATA_DIR='/data'
DB_PATH=os.path.join(DATA_DIR,'journal.db')
UPLOAD_DIR=os.path.join(DATA_DIR,'uploads')
SECRET=os.environ.get('PJ_SECRET','devsecret')
THUMB_SIZE=(320,240)

os.makedirs(UPLOAD_DIR, exist_ok=True)

app=FastAPI()
app.mount('/uploads', StaticFiles(directory=UPLOAD_DIR), name='uploads')

# Allow CORS from local network (frontend served on same host but different port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],
    allow_headers=["*"],
)

# simple DB helpers
def init_db():
    conn=sqlite3.connect(DB_PATH)
    c=conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, role TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT, body TEXT, date TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS images (id INTEGER PRIMARY KEY, entry_id INTEGER, filename TEXT, thumb TEXT)''')
    conn.commit(); conn.close()

def create_default_admin():
    conn=sqlite3.connect(DB_PATH)
    c=conn.cursor()
    c.execute('SELECT count(*) FROM users')
    if c.fetchone()[0]==0:
        pw=hashlib.sha256(b'password').hexdigest()
        c.execute('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)',('admin',pw,'admin'))
        conn.commit()
    conn.close()

init_db(); create_default_admin()

class AuthIn(BaseModel):
    username:str
    password:str

def hashpw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def verify_user(u,pw):
    conn=sqlite3.connect(DB_PATH)
    c=conn.cursor()
    try:
        c.execute('SELECT id,password_hash,role FROM users WHERE username=?',(u,))
        row=c.fetchone()
        if row:
            uid,ph,role=row
        else:
            conn.close(); return None
    except sqlite3.OperationalError:
        # older DB without role column
        c.execute('SELECT id,password_hash FROM users WHERE username=?',(u,))
        row=c.fetchone()
        if not row:
            conn.close(); return None
        uid,ph=row
        role='admin' if uid==1 else 'viewer'
    conn.close()
    if hashpw(pw)==ph:
        return {'id':uid,'role':role}
    return None

@app.post('/api/login')
def login(data:AuthIn):
    r=verify_user(data.username,data.password)
    if not r:
        raise HTTPException(status_code=401,detail='Invalid')
    token=jwt.encode({'uid':r['id'],'role':r['role'],'exp':datetime.utcnow()+timedelta(days=3650)},SECRET,algorithm='HS256')
    return {'token':token,'role':r['role']}

@app.post('/api/change-password')
def change_password(current: str = Form(...), new: str = Form(...), token: str = Form(...)):
    payload=None
    try:
        payload=jwt.decode(token,SECRET,algorithms=['HS256'])
    except:
        raise HTTPException(status_code=401)
    uid=payload.get('uid')
    # verify current
    conn=sqlite3.connect(DB_PATH)
    c=conn.cursor()
    c.execute('SELECT password_hash FROM users WHERE id=?',(uid,))
    row=c.fetchone()
    if not row or hashpw(current)!=row[0]:
        conn.close()
        raise HTTPException(status_code=401,detail='bad current')
    ph=hashpw(new)
    c.execute('UPDATE users SET password_hash=? WHERE id=?',(ph,uid))
    conn.commit(); conn.close()
    # handle newly uploaded files (if any)
    if files:
        conn=sqlite3.connect(DB_PATH); c=conn.cursor()
        entry_dir=os.path.join(UPLOAD_DIR,str(eid))
        os.makedirs(entry_dir, exist_ok=True)
        for up in files:
            fn = up.filename
            dest=os.path.join(entry_dir,fn)
            with open(dest,'wb') as f:
                f.write(up.file.read())
            # create thumbnail
            try:
                img=Image.open(dest)
                img.thumbnail((320,320))
                thumb=os.path.join(entry_dir,'thumb_'+fn)
                img.save(thumb)
            except Exception:
                pass
            c.execute('INSERT INTO images(entry_id,filename) VALUES(?,?)',(eid,fn))
        conn.commit(); conn.close()
    return {'ok':True}

@app.get('/api/users')
def list_users(token: str):
    try:
        p=jwt.decode(token,SECRET,algorithms=['HS256'])
    except:
        raise HTTPException(status_code=401)
    if p.get('role')!='admin': raise HTTPException(status_code=403)
    conn=sqlite3.connect(DB_PATH); c=conn.cursor(); c.execute('SELECT id,username,role FROM users'); rows=c.fetchall(); conn.close()
    return [{'id':r[0],'username':r[1],'role':r[2]} for r in rows]

@app.post('/api/users')
def add_user(username: str = Form(...), password: str = Form(...), role: str = Form('viewer'), token: str = Form(...)):
    try:
        p=jwt.decode(token,SECRET,algorithms=['HS256'])
    except:
        raise HTTPException(status_code=401)
    if p.get('role')!='admin': raise HTTPException(status_code=403)
    conn=sqlite3.connect(DB_PATH); c=conn.cursor()
    try:
        c.execute('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)',(username,hashpw(password),role))
        conn.commit()
    except Exception as e:
        conn.close(); raise HTTPException(status_code=400,detail='exists')
    conn.close(); return {'ok':True}

@app.delete('/api/users/{uid}')
def delete_user(uid:int, token: str):
    try:
        p=jwt.decode(token,SECRET,algorithms=['HS256'])
    except:
        raise HTTPException(status_code=401)
    if p.get('role')!='admin': raise HTTPException(status_code=403)
    conn=sqlite3.connect(DB_PATH); c=conn.cursor(); c.execute('DELETE FROM users WHERE id=?',(uid,)); conn.commit(); conn.close(); return {'ok':True}

def get_uid_from_token(token:str):
    try:
        d=jwt.decode(token,SECRET,algorithms=['HS256'])
        return d.get('uid')
    except:
        return None

@app.post('/api/entries')
async def create_entry(title: str = Form(None), body: str = Form(...), date: str = Form(None), files: List[UploadFile] = File([]), token: str = Form(None)):
    uid=get_uid_from_token(token)
    if not uid:
        raise HTTPException(status_code=401,detail='auth')
    dt=date or datetime.utcnow().isoformat()
    conn=sqlite3.connect(DB_PATH)
    c=conn.cursor()
    c.execute('INSERT INTO entries(user_id,title,body,date) VALUES(?,?,?,?)',(uid,title or '',body,dt))
    eid=c.lastrowid
    entry_dir=os.path.join(UPLOAD_DIR,str(eid))
    os.makedirs(entry_dir, exist_ok=True)
    for f in files:
        fname=str(uuid.uuid4())+os.path.splitext(f.filename)[1]
        path=os.path.join(entry_dir,fname)
        with open(path,'wb') as out:
            shutil.copyfileobj(f.file,out)
        # create thumbnail
        try:
            im=Image.open(path); im.thumbnail(THUMB_SIZE); thumb_name='thumb_'+fname; thumb_path=os.path.join(entry_dir,thumb_name); im.save(thumb_path)
        except Exception:
            thumb_name=''
        c.execute('INSERT INTO images(entry_id,filename,thumb) VALUES(?,?,?)',(eid,fname,thumb_name))
    conn.commit(); conn.close()
    return {'id':eid}

@app.get('/api/entries')
def list_entries(token: str, limit: int = 100, offset: int = 0):
    uid=get_uid_from_token(token)
    if not uid:
        raise HTTPException(status_code=401)
    conn=sqlite3.connect(DB_PATH)
    c=conn.cursor()
    # Order by date desc, then id desc so later-created entries on the same date appear first
    c.execute('SELECT id,title,body,date FROM entries WHERE user_id=? ORDER BY date DESC, id DESC LIMIT ? OFFSET ?',(uid,limit,offset))
    rows=c.fetchall(); conn.close()
    return [{'id':r[0],'title':r[1],'body':r[2],'date':r[3]} for r in rows]

@app.get('/api/entries/{eid}')
def get_entry(eid:int, token: str):
    uid=get_uid_from_token(token)
    if not uid:
        raise HTTPException(status_code=401)
    conn=sqlite3.connect(DB_PATH)
    c=conn.cursor()
    c.execute('SELECT id,title,body,date FROM entries WHERE id=?',(eid,))
    r=c.fetchone(); conn.close()
    if not r: raise HTTPException(status_code=404)
    # list images
    entry_dir=os.path.join(UPLOAD_DIR,str(eid))
    imgs=[]
    if os.path.isdir(entry_dir):
        for row in os.listdir(entry_dir):
            if row.startswith('thumb_'):
                imgs.append({'thumb':f'/uploads/{eid}/{row}','original':f'/uploads/{eid}/{row[6:]}'} )
    return {'id':r[0],'title':r[1],'body':r[2],'date':r[3],'images':imgs}


@app.put('/api/entries/{eid}')
def update_entry(eid:int, body: str = Form(...), date: str = Form(None), token: str = Form(...), keep_images: str = Form(None), files: List[UploadFile] = File(None)):
    uid=get_uid_from_token(token)
    if not uid: raise HTTPException(status_code=401)
    conn=sqlite3.connect(DB_PATH); c=conn.cursor()
    # ensure ownership or admin
    c.execute('SELECT user_id FROM entries WHERE id=?',(eid,))
    row=c.fetchone()
    if not row: conn.close(); raise HTTPException(status_code=404)
    owner=row[0]
    p=jwt.decode(token,SECRET,algorithms=['HS256'])
    if p.get('role')!='admin' and owner!=uid:
        conn.close(); raise HTTPException(status_code=403)
    c.execute('UPDATE entries SET body=?, date=? WHERE id=?',(body, date or datetime.utcnow().isoformat(), eid))
    # handle kept images: keep_images is JSON list of filenames to retain
    if keep_images is not None:
        try:
            import json
            keep = set(json.loads(keep_images))
        except:
            keep = set()
        # get current images
        c.execute('SELECT filename FROM images WHERE entry_id=?',(eid,))
        rows=c.fetchall()
        for (fn,) in rows:
            if fn not in keep:
                # delete file and thumbnail
                p=os.path.join(UPLOAD_DIR,str(eid),fn)
                t=os.path.join(UPLOAD_DIR,str(eid),'thumb_'+fn)
                try: os.remove(p)
                except: pass
                try: os.remove(t)
                except: pass
                c.execute('DELETE FROM images WHERE entry_id=? AND filename=?',(eid,fn))
    conn.commit(); conn.close()
    # handle newly uploaded files (if any)
    if files:
        conn=sqlite3.connect(DB_PATH); c=conn.cursor()
        entry_dir=os.path.join(UPLOAD_DIR,str(eid))
        os.makedirs(entry_dir, exist_ok=True)
        for up in files:
            fn = up.filename
            dest=os.path.join(entry_dir,fn)
            with open(dest,'wb') as f:
                f.write(up.file.read())
            # create thumbnail
            try:
                img=Image.open(dest)
                img.thumbnail((320,320))
                thumb=os.path.join(entry_dir,'thumb_'+fn)
                img.save(thumb)
            except Exception:
                pass
            c.execute('INSERT INTO images(entry_id,filename) VALUES(?,?)',(eid,fn))
        conn.commit(); conn.close()
    return {'ok':True}


@app.delete('/api/entries/{eid}')
def delete_entry(eid:int, token: str):
    uid=get_uid_from_token(token)
    if not uid: raise HTTPException(status_code=401)
    conn=sqlite3.connect(DB_PATH); c=conn.cursor()
    c.execute('SELECT user_id FROM entries WHERE id=?',(eid,)); row=c.fetchone()
    if not row: conn.close(); raise HTTPException(status_code=404)
    owner=row[0]
    p=jwt.decode(token,SECRET,algorithms=['HS256'])
    if p.get('role')!='admin' and owner!=uid:
        conn.close(); raise HTTPException(status_code=403)
    # delete images
    entry_dir=os.path.join(UPLOAD_DIR,str(eid))
    if os.path.isdir(entry_dir):
        for f in os.listdir(entry_dir):
            try: os.remove(os.path.join(entry_dir,f))
            except: pass
        try: os.rmdir(entry_dir)
        except: pass
    c.execute('DELETE FROM images WHERE entry_id=?',(eid,))
    c.execute('DELETE FROM entries WHERE id=?',(eid,))
    conn.commit(); conn.close()
    # handle newly uploaded files (if any)
    if files:
        conn=sqlite3.connect(DB_PATH); c=conn.cursor()
        entry_dir=os.path.join(UPLOAD_DIR,str(eid))
        os.makedirs(entry_dir, exist_ok=True)
        for up in files:
            fn = up.filename
            dest=os.path.join(entry_dir,fn)
            with open(dest,'wb') as f:
                f.write(up.file.read())
            # create thumbnail
            try:
                img=Image.open(dest)
                img.thumbnail((320,320))
                thumb=os.path.join(entry_dir,'thumb_'+fn)
                img.save(thumb)
            except Exception:
                pass
            c.execute('INSERT INTO images(entry_id,filename) VALUES(?,?)',(eid,fn))
        conn.commit(); conn.close()
    return {'ok':True}

@app.get('/')
def root():
    return {'ok':True}
