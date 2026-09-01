"""
auth.py - JWT Authentication & RBAC
====================================
Simulates JWT authentication with hardcoded demo users.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import datetime, timedelta, timezone

SECRET_KEY = "sih-2026-mvp-secret-key"
ALGORITHM = "HS256"

security = HTTPBearer()

# Dummy Users DB
USERS = {
    "lao1": {"username": "lao1", "password": "password123", "role": "LAO", "name": "Rajesh Kumar"},
    "collector1": {"username": "collector1", "password": "password123", "role": "Collector", "name": "Dr. Anjali Sharma"},
    "policy1": {"username": "policy1", "password": "password123", "role": "PolicyMaker", "name": "Delhi HQ"}
}

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None or username not in USERS:
            raise HTTPException(status_code=401, detail="Invalid token")
        return USERS[username]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(allowed_roles: list[str]):
    def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker
