from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.deps import get_db
from app.schemas.user import UserCreate, UserLogin, Token
import uuid

router = APIRouter()

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"email": user_in.email})
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Fake hash for local dev speed
    hashed_password = f"hashed_{user_in.password}"
    
    new_user = {
        "_id": str(uuid.uuid4()),
        "email": user_in.email,
        "password_hash": hashed_password,
        "role": user_in.role.value
    }
    await db.users.insert_one(new_user)
    
    # Mock token
    return {"access_token": f"token_for_{new_user['email']}", "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"email": user_in.email})
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # Fake verify
    if user["password_hash"] != f"hashed_{user_in.password}":
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # Mock token
    return {"access_token": f"token_for_{user['email']}", "token_type": "bearer"}
