import uuid
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import utcnow


async def notify(
    db: AsyncIOMotorDatabase,
    user_id: str,
    type_: str,
    title: str,
    body: Optional[str] = None,
    link: Optional[str] = None,
) -> None:
    await db.notifications.insert_one(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": type_,
            "title": title,
            "body": body,
            "link": link,
            "is_read": False,
            "created_at": utcnow(),
        }
    )
