from app.db.session import get_db
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not token.startswith("token_for_"):
        raise HTTPException(status_code=401, detail="Invalid token format")
    email = token.replace("token_for_", "")
    
    user = await db.users.find_one({"email": email})
    if not user:
        new_id = str(uuid.uuid4())
        user_doc = {
            "id": new_id,
            "_id": new_id,
            "email": email,
            "password_hash": "fake",
            "role": "developer"
        }
        await db.users.insert_one(user_doc)
        user = user_doc
    else:
        user["id"] = str(user["_id"])
    return user
