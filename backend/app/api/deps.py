from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import TokenError, decode_access_token
from app.db.session import get_db
from app.services.serializers import user_roles

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _resolve_user(
    request: Request, creds: Optional[HTTPAuthorizationCredentials], db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    if creds is None or creds.scheme.lower() != "bearer" or not creds.credentials:
        raise _unauthorized("Authentication required. Please sign in.")
    try:
        payload = decode_access_token(creds.credentials)
    except TokenError as exc:
        raise _unauthorized(exc.message)

    if await db.revoked_tokens.find_one({"_id": payload["jti"]}, {"_id": 1}):
        raise _unauthorized("This session has been signed out. Please sign in again.")

    user = await db.users.find_one({"_id": payload["sub"]})
    if not user:
        raise _unauthorized("Account not found. Please sign in again.")
    if int(user.get("token_version", 0)) != int(payload.get("tv", 0)):
        raise _unauthorized("Your session is no longer valid. Please sign in again.")

    user["id"] = str(user["_id"])
    user["roles"] = user_roles(user)
    request.state.token_payload = payload
    return user


async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Dict[str, Any]:
    return await _resolve_user(request, creds, db)


async def get_optional_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Optional[Dict[str, Any]]:
    if creds is None:
        return None
    try:
        return await _resolve_user(request, creds, db)
    except HTTPException:
        return None


async def get_onboarded_user(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if not user.get("onboarded", bool(user["roles"])) or not user["roles"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please complete onboarding first.")
    return user


def require_role(role: str):
    """Authorization is decided from the roles stored in MongoDB, never from client-supplied values."""

    async def checker(user: Dict[str, Any] = Depends(get_onboarded_user)) -> Dict[str, Any]:
        if role not in user["roles"]:
            label = "hiring" if role == "employer" else "job seeking"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your account does not have {label} enabled. You can enable it in Settings.",
            )
        return user

    return checker


require_employer = require_role("employer")
require_seeker = require_role("seeker")
