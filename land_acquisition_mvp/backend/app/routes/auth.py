"""
auth.py - Auth Routes
"""
from fastapi import APIRouter, HTTPException
from app.models import LoginRequest, LoginResponse
from app.auth import USERS, create_access_token

router = APIRouter()

@router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token = create_access_token(data={"sub": user["username"]})
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        role=user["role"],
        name=user["name"]
    )
