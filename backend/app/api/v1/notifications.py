from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.job import NotificationOut
from app.services.serializers import notification_out

router = APIRouter()


@router.get("", response_model=List[NotificationOut])
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return [notification_out(n) for n in docs]


@router.get("/counts")
async def counts(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    notifications = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    messages = await db.messages.count_documents({"recipient_id": user["id"], "read_at": None})
    return {"notifications": notifications, "messages": messages}


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    await db.notifications.update_many({"user_id": user["id"], "is_read": False}, {"$set": {"is_read": True}})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(notification_id: str, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    res = await db.notifications.update_one({"_id": notification_id, "user_id": user["id"]}, {"$set": {"is_read": True}})
    if res.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
