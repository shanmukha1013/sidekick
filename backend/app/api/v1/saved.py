import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user
from app.core.security import utcnow
from app.db.session import get_db
from app.schemas.job import JobOut
from app.services.serializers import job_out

router = APIRouter()


@router.get("", response_model=List[JobOut])
async def list_saved(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    saved = await db.saved_jobs.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    order = [s["job_id"] for s in saved]
    jobs = {j["_id"]: j async for j in db.jobs.find({"_id": {"$in": order}})}
    applied = set(await db.applications.distinct("job_id", {"applicant_id": user["id"], "job_id": {"$in": order}}))
    return [job_out(jobs[jid], is_saved=True, has_applied=jid in applied) for jid in order if jid in jobs]


@router.put("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def save_job(job_id: str, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not await db.jobs.find_one({"_id": job_id}, {"_id": 1}):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found.")
    await db.saved_jobs.update_one(
        {"user_id": user["id"], "job_id": job_id},
        {"$setOnInsert": {"_id": str(uuid.uuid4()), "user_id": user["id"], "job_id": job_id, "created_at": utcnow()}},
        upsert=True,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_job(job_id: str, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    await db.saved_jobs.delete_many({"user_id": user["id"], "job_id": job_id})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
