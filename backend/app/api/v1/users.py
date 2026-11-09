import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user
from app.core.security import utcnow
from app.db.session import get_db
from app.schemas.user import OnboardingIn, RolesUpdate, UserOut, UserUpdate
from app.services.serializers import user_out

router = APIRouter()


@router.post("/me/onboarding", response_model=UserOut)
async def complete_onboarding(body: OnboardingIn, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    now = utcnow()
    profile_fields = {
        k: v
        for k, v in body.model_dump(exclude={"roles"}, exclude_none=True).items()
        if not (isinstance(v, str) and not v.strip())
    }
    if "skills" in profile_fields:
        profile_fields["skills"] = [s.strip() for s in profile_fields["skills"] if s.strip()][:30]
    profile_fields["updated_at"] = now
    await db.profiles.update_one(
        {"user_id": user["id"]},
        {"$set": profile_fields, "$setOnInsert": {"_id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now}},
        upsert=True,
    )
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"roles": list(body.roles), "onboarded": True, "updated_at": now}, "$unset": {"role": ""}},
    )
    return user_out(await db.users.find_one({"_id": user["_id"]}))


@router.patch("/me", response_model=UserOut)
async def update_me(body: UserUpdate, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    data = body.model_dump(exclude_none=True)
    if "full_name" in data:
        data["full_name"] = " ".join(data["full_name"].split())
    if data:
        data["updated_at"] = utcnow()
        await db.users.update_one({"_id": user["_id"]}, {"$set": data, "$unset": {"phone_number": ""}})
    return user_out(await db.users.find_one({"_id": user["_id"]}))


@router.put("/me/roles", response_model=UserOut)
async def update_roles(body: RolesUpdate, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    roles = sorted(set(body.roles))
    if "employer" in roles and "employer" not in user["roles"]:
        profile = await db.profiles.find_one({"user_id": user["id"]}) or {}
        if not (profile.get("company_name") or "").strip():
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Add your company or organization name to your profile before enabling hiring.",
            )
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"roles": roles, "onboarded": True, "updated_at": utcnow()}, "$unset": {"role": ""}},
    )
    return user_out(await db.users.find_one({"_id": user["_id"]}))
