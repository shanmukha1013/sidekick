from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
import cloudinary
import cloudinary.uploader
from app.api.deps import get_db, get_current_user
from app.schemas.profile import WorkerProfileUpdate, WorkerProfileResponse
from app.core.config import settings

# Configure cloudinary if URL is available
if settings.CLOUDINARY_URL:
    cloudinary.config(url=settings.CLOUDINARY_URL)

router = APIRouter()

@router.get("/me", response_model=WorkerProfileResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        profile = {
            "user_id": current_user["id"],
            "name": "New User",
            "trust_score": 0.0
        }
        res = await db.profiles.insert_one(profile)
        profile["_id"] = res.inserted_id
    
    return profile

@router.put("/me", response_model=WorkerProfileResponse)
async def update_my_profile(profile_in: WorkerProfileUpdate, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        profile = {
            "user_id": current_user["id"],
            "name": profile_in.name or "New User",
            "trust_score": 0.0
        }
        await db.profiles.insert_one(profile)
    
    update_data = profile_in.model_dump(exclude_unset=True)
    if update_data:
        await db.profiles.update_one(
            {"user_id": current_user["id"]},
            {"$set": update_data}
        )
        profile.update(update_data)
        
    return profile

@router.post("/me/avatar", response_model=WorkerProfileResponse)
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not settings.CLOUDINARY_URL:
        raise HTTPException(status_code=500, detail="Cloudinary configuration missing")
    
    try:
        result = cloudinary.uploader.upload(file.file, folder="sidekick/avatars")
        avatar_url = result.get("secure_url")
        
        # Ensure profile exists before updating
        profile = await db.profiles.find_one({"user_id": current_user["id"]})
        if not profile:
            profile = {
                "user_id": current_user["id"],
                "name": "New User",
                "trust_score": 0.0,
                "avatar_url": avatar_url
            }
            res = await db.profiles.insert_one(profile)
            profile["_id"] = res.inserted_id
        else:
            await db.profiles.update_one(
                {"user_id": current_user["id"]},
                {"$set": {"avatar_url": avatar_url}}
            )
            profile["avatar_url"] = avatar_url
            
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
