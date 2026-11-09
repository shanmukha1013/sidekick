"""Messaging between an applicant and the employer, scoped to a single job application."""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user
from app.core.security import utcnow
from app.db.session import get_db
from app.schemas.job import MessageIn, MessageOut, ThreadOut
from app.services.serializers import message_out

router = APIRouter()


async def _thread_context(db: AsyncIOMotorDatabase, application_id: str, user: dict) -> tuple[dict, dict, str]:
    app = await db.applications.find_one({"_id": application_id})
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    job = await db.jobs.find_one({"_id": app["job_id"]})
    employer_id = app.get("employer_id") or (job or {}).get("employer_id")
    if user["id"] == app["applicant_id"]:
        return app, job or {}, employer_id
    if user["id"] == employer_id:
        return app, job or {}, app["applicant_id"]
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You are not part of this conversation.")


@router.get("/threads", response_model=List[ThreadOut])
async def list_threads(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    # Conversations exist for every application where the user is the applicant or the employer.
    my_job_ids = await db.jobs.distinct("_id", {"employer_id": user["id"]})
    apps = await db.applications.find(
        {"$or": [{"applicant_id": user["id"]}, {"job_id": {"$in": my_job_ids}}]}
    ).to_list(1000)
    if not apps:
        return []
    app_ids = [a["_id"] for a in apps]
    jobs = {j["_id"]: j async for j in db.jobs.find({"_id": {"$in": list({a["job_id"] for a in apps})}})}

    last_by_app = {}
    async for row in db.messages.aggregate(
        [
            {"$match": {"application_id": {"$in": app_ids}}},
            {"$sort": {"created_at": -1}},
            {"$group": {"_id": "$application_id", "doc": {"$first": "$$ROOT"}}},
        ]
    ):
        last_by_app[row["_id"]] = row["doc"]
    unread = {
        row["_id"]: row["n"]
        async for row in db.messages.aggregate(
            [
                {"$match": {"application_id": {"$in": app_ids}, "recipient_id": user["id"], "read_at": None}},
                {"$group": {"_id": "$application_id", "n": {"$sum": 1}}},
            ]
        )
    }

    counterpart_ids = set()
    rows = []
    for a in apps:
        job = jobs.get(a["job_id"])
        if not job:
            continue
        is_applicant = a["applicant_id"] == user["id"]
        counterpart = job.get("employer_id") if is_applicant else a["applicant_id"]
        counterpart_ids.add(counterpart)
        rows.append((a, job, is_applicant, counterpart))

    users = {u["_id"]: u async for u in db.users.find({"_id": {"$in": list(counterpart_ids)}}, {"full_name": 1, "username": 1})}
    profiles = {p["user_id"]: p async for p in db.profiles.find({"user_id": {"$in": list(counterpart_ids)}})}

    threads = []
    for a, job, is_applicant, counterpart in rows:
        cu = users.get(counterpart, {})
        cp = profiles.get(counterpart, {})
        name = (cp.get("company_name") if is_applicant else None) or cu.get("full_name") or cu.get("username") or "Unknown user"
        last = last_by_app.get(a["_id"])
        threads.append(
            {
                "application_id": a["_id"],
                "job_id": job["_id"],
                "job_title": job.get("title", ""),
                "counterpart_id": counterpart,
                "counterpart_name": name,
                "counterpart_avatar": cp.get("avatar_url"),
                "my_side": "applicant" if is_applicant else "employer",
                "application_status": a.get("status", "pending"),
                "last_message": message_out(last) if last else None,
                "unread_count": unread.get(a["_id"], 0),
                "updated_at": last["created_at"] if last else a.get("created_at"),
            }
        )
    threads.sort(key=lambda t: t["updated_at"], reverse=True)
    return threads


@router.get("/threads/{application_id}", response_model=List[MessageOut])
async def get_thread(application_id: str, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    await _thread_context(db, application_id, user)
    await db.messages.update_many(
        {"application_id": application_id, "recipient_id": user["id"], "read_at": None}, {"$set": {"read_at": utcnow()}}
    )
    docs = await db.messages.find({"application_id": application_id}).sort("created_at", 1).to_list(1000)
    return [message_out(m) for m in docs]


@router.post("/threads/{application_id}", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    application_id: str, body: MessageIn, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)
):
    _, _, recipient_id = await _thread_context(db, application_id, user)
    msg = {
        "_id": str(uuid.uuid4()),
        "application_id": application_id,
        "sender_id": user["id"],
        "recipient_id": recipient_id,
        "body": body.body,
        "created_at": utcnow(),
        "read_at": None,
    }
    await db.messages.insert_one(msg)
    return message_out(msg)
