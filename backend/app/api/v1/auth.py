import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    utcnow,
    verify_password,
)
from app.db.session import get_db
from app.schemas.user import (
    AuthResponse,
    ChangePasswordIn,
    ForgotPasswordIn,
    ResetPasswordIn,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.email import EmailNotConfigured, send_email
from app.services.serializers import user_out

logger = logging.getLogger(__name__)
router = APIRouter()

# bcrypt hash of a random value, used to keep login timing similar for unknown accounts.
_DUMMY_HASH = hash_password(uuid.uuid4().hex)


def _ci_exact(value: str) -> dict:
    return {"$regex": f"^{re.escape(value)}$", "$options": "i"}


def _auth_response(user: dict) -> dict:
    token, expires_at = create_access_token(str(user["_id"]), int(user.get("token_version", 0)))
    return {"access_token": token, "token_type": "bearer", "expires_at": expires_at, "user": user_out(user)}


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    # Case-insensitive checks also cover legacy accounts stored with mixed case.
    if await db.users.find_one({"email": _ci_exact(user_in.email)}, {"_id": 1}):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
    if await db.users.find_one({"username": _ci_exact(user_in.username)}, {"_id": 1}):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This username is already taken.")

    now = utcnow()
    user = {
        "_id": str(uuid.uuid4()),
        "full_name": user_in.full_name,
        "username": user_in.username,
        "email": user_in.email,
        "phone": user_in.phone,
        "password_hash": hash_password(user_in.password),
        "roles": ["employer", "seeker"],
        "onboarded": False,
        "token_version": 0,
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.users.insert_one(user)
    except DuplicateKeyError as exc:
        field = "email" if "email" in str(exc) else "username"
        detail = "An account with this email already exists." if field == "email" else "This username is already taken."
        raise HTTPException(status.HTTP_409_CONFLICT, detail=detail)

    await db.profiles.update_one(
        {"user_id": user["_id"]},
        {"$setOnInsert": {"_id": str(uuid.uuid4()), "user_id": user["_id"], "created_at": now}},
        upsert=True,
    )
    logger.info("Registered user %s", user["_id"])
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
async def login(user_in: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    ident = user_in.identifier.strip()
    query = {"email": _ci_exact(ident)} if "@" in ident else {"username": _ci_exact(ident)}
    user = await db.users.find_one(query)
    if not user:
        verify_password(user_in.password, _DUMMY_HASH)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email/username or password.")
    if not verify_password(user_in.password, user.get("password_hash")):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email/username or password.")

    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": utcnow()}})
    return _auth_response(user)


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return user_out(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    payload = request.state.token_payload
    await db.revoked_tokens.update_one(
        {"_id": payload["jti"]},
        {
            "$set": {
                "user_id": user["id"],
                "expires_at": datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
            }
        },
        upsert=True,
    )


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordIn, db: AsyncIOMotorDatabase = Depends(get_db)):
    if not settings.email_enabled and not settings.allow_dev_email_fallback:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset by email is not available yet: the server has no email service configured. "
            "Please contact support.",
        )

    generic = {"message": "If an account exists for that email, a reset link has been sent."}
    user = await db.users.find_one({"email": _ci_exact(body.email)})
    if not user:
        return generic

    raw, token_hash = generate_reset_token()
    await db.password_resets.insert_one(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "token_hash": token_hash,
            "expires_at": utcnow() + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
            "created_at": utcnow(),
        }
    )
    link = f"{settings.primary_frontend_url}/reset-password?token={raw}"
    try:
        await send_email(
            user["email"],
            "Reset your Sidekick password",
            f"Hi {user.get('full_name') or user.get('username')},\n\n"
            f"Use the link below to choose a new password. It expires in {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes.\n\n"
            f"{link}\n\nIf you didn't request this, you can ignore this email.\n\n— Sidekick",
        )
    except EmailNotConfigured:
        # Local development only (hosted servers return 503 above): surface the link in server logs for testing.
        logger.warning("SMTP not configured. Development password reset link for %s: %s", user["_id"], link)
    except Exception as exc:  # SMTP failure
        logger.error("Failed to send reset email: %s", exc)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="We couldn't send the reset email. Please try again later.")
    return generic


@router.post("/reset-password")
async def reset_password(body: ResetPasswordIn, db: AsyncIOMotorDatabase = Depends(get_db)):
    record = await db.password_resets.find_one({"token_hash": hash_reset_token(body.token)})
    if not record or record["expires_at"] < utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has expired.")
    await db.users.update_one(
        {"_id": record["user_id"]},
        {"$set": {"password_hash": hash_password(body.password), "updated_at": utcnow()}, "$inc": {"token_version": 1}},
    )
    await db.password_resets.delete_many({"user_id": record["user_id"]})
    return {"message": "Your password has been reset. You can now sign in."}


@router.post("/change-password", response_model=AuthResponse)
async def change_password(body: ChangePasswordIn, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not verify_password(body.current_password, user.get("password_hash")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Your current password is incorrect.")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(body.new_password), "updated_at": utcnow()}, "$inc": {"token_version": 1}},
    )
    updated = await db.users.find_one({"_id": user["_id"]})
    # All other sessions are invalidated by the token_version bump; return a fresh token for this one.
    return _auth_response(updated)
