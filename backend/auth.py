import hashlib
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Query, Form
from passlib.context import CryptContext
from config import SECRET

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    # Support legacy SHA-256 hashes (64 hex chars) during migration
    if len(hashed) == 64:
        return hashlib.sha256(plain.encode()).hexdigest() == hashed
    return pwd_context.verify(plain, hashed)


def create_token(uid: int, role: str) -> str:
    return jwt.encode(
        {'uid': uid, 'role': role, 'exp': datetime.utcnow() + timedelta(days=365)},
        SECRET, algorithm='HS256'
    )


def _decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET, algorithms=['HS256'])
        if payload.get('uid') is None:
            raise HTTPException(status_code=401, detail='Invalid token')
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')


def get_current_user(token: str = Query(...)) -> dict:
    """FastAPI dependency: extracts and validates JWT from query param."""
    return _decode_token(token)


def get_current_user_form(token: str = Form(...)) -> dict:
    """FastAPI dependency: extracts and validates JWT from form data."""
    return _decode_token(token)


def require_admin(user: dict) -> dict:
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Admin only')
    return user
