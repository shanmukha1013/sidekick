from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.deps import get_db
from app.schemas.user import UserCreate, UserLogin, Token
from app.core.security import get_password_hash, verify_password, create_access_token
import uuid

router = APIRouter()

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"username": user_in.username})
    if user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user_in.password)
    
    new_user = {
        "_id": str(uuid.uuid4()),
        "username": user_in.username,
        "phone_number": user_in.phone_number,
        "email": user_in.email,
        "password_hash": hashed_password,
        "role": user_in.role.value
    }
    await db.users.insert_one(new_user)
    
    access_token = create_access_token(subject=new_user["username"])
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"username": user_in.username})
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    if not verify_password(user_in.password, user.get("password_hash")):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(subject=user["username"])
    return {"access_token": access_token, "token_type": "bearer"}
