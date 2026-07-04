from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.deps import get_db
from app.schemas.user import UserCreate, UserLogin, Token
import uuid

router = APIRouter()

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"username": user_in.username})
    if user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = f"hashed_{user_in.password}"
    
    new_user = {
        "_id": str(uuid.uuid4()),
        "username": user_in.username,
        "phone_number": user_in.phone_number,
        "email": user_in.email,
        "password_hash": hashed_password,
        "role": user_in.role.value
    }
    await db.users.insert_one(new_user)
    
    # Mock token
    return {"access_token": f"token_for_{new_user['username']}", "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"username": user_in.username})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    if user.get("password_hash") != f"hashed_{user_in.password}":
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    # Mock token
    return {"access_token": f"token_for_{user['username']}", "token_type": "bearer"}
