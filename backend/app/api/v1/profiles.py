import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import utcnow
from app.db.session import get_db
from app.schemas.profile import ProfileOut, ProfileUpdate
from app.services.serializers import profile_out

router = APIRouter()

MAX_AVATAR_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.get("/me", response_model=ProfileOut)
async def get_my_profile(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    profile = await db.profiles.find_one({"user_id": user["id"]})
    return profile_out(user, profile)


@router.put("/me", response_model=ProfileOut)
async def update_my_profile(body: ProfileUpdate, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    if "employer" in user["roles"] and "company_name" in data and not (data["company_name"] or "").strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Company name is required while hiring is enabled.")
    now = utcnow()
    data["updated_at"] = now
    await db.profiles.update_one(
        {"user_id": user["id"]},
        {"$set": data, "$setOnInsert": {"_id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now}},
        upsert=True,
    )
    if data.get("company_name"):
        # Keep the company name shown on this employer's listings in sync.
        await db.jobs.update_many({"employer_id": user["id"]}, {"$set": {"company_name": data["company_name"]}})
    return profile_out(user, await db.profiles.find_one({"user_id": user["id"]}))


@router.post("/me/avatar", response_model=ProfileOut)
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not settings.CLOUDINARY_URL:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Photo uploads are not available yet: image storage (CLOUDINARY_URL) is not configured on the server.",
        )
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Upload a JPEG, PNG or WebP image.")
    content = await file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Image must be 5 MB or smaller.")

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
    try:
        result = cloudinary.uploader.upload(
            content, folder="sidekick/avatars", public_id=user["id"], overwrite=True,
            transformation=[{"width": 400, "height": 400, "crop": "fill", "gravity": "face"}],
        )
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=f"Image upload failed: {exc}")
    now = utcnow()
    await db.profiles.update_one(
        {"user_id": user["id"]},
        {"$set": {"avatar_url": result.get("secure_url"), "updated_at": now},
         "$setOnInsert": {"_id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now}},
        upsert=True,
    )
    return profile_out(user, await db.profiles.find_one({"user_id": user["id"]}))


@router.get("/{user_id}", response_model=ProfileOut)
async def get_public_profile(user_id: str, _: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"_id": user_id}, {"password_hash": 0})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return profile_out(user, await db.profiles.find_one({"user_id": user_id}))
