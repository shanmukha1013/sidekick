from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Any, Optional
from datetime import datetime
import uuid

from app.api import deps
from app.schemas.job import JobCreate, JobInDB, ApplicationCreate, ApplicationInDB, ApplicationWithDetails, NotificationInDB

router = APIRouter()

# ── JOBS ───────────────────────────────────────────────────────────────────────

@router.post("/", response_model=JobInDB)
async def create_job(*, db: AsyncIOMotorDatabase = Depends(deps.get_db), job_in: JobCreate, current_user: dict = Depends(deps.get_current_user)) -> Any:
    job_id = str(uuid.uuid4())
    job_dict = job_in.model_dump()
    job_dict["id"] = job_id
    job_dict["_id"] = job_id
    job_dict["employer_id"] = current_user["id"]
    job_dict["created_at"] = datetime.utcnow()
    
    await db.jobs.insert_one(job_dict)
    return job_dict

@router.get("/", response_model=List[JobInDB])
async def read_jobs(
    db: AsyncIOMotorDatabase = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    job_type: Optional[str] = None,
    location_type: Optional[str] = None,
    min_rate: Optional[float] = None,
    max_rate: Optional[float] = None,
    experience_level: Optional[str] = None,
    sort: Optional[str] = "newest",
) -> Any:
    query = {"status": "open"}

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location_name": {"$regex": search, "$options": "i"}},
            {"skills_required": {"$regex": search, "$options": "i"}}
        ]
        
    if job_type:
        types = [t.strip() for t in job_type.split(",")]
        query["job_type"] = {"$in": types}
        
    if location_type == "remote":
        query["is_remote"] = True
    elif location_type == "onsite":
        query["is_remote"] = False
        
    if min_rate is not None or max_rate is not None:
        query["hourly_rate"] = {}
        if min_rate is not None:
            query["hourly_rate"]["$gte"] = min_rate
        if max_rate is not None:
            query["hourly_rate"]["$lte"] = max_rate
            
    if experience_level:
        query["experience_level"] = experience_level

    cursor = db.jobs.find(query).skip(skip).limit(limit)
    if sort == "highest_salary":
        cursor = cursor.sort("hourly_rate", -1)
    else:
        cursor = cursor.sort("created_at", -1)

    jobs = await cursor.to_list(length=limit)
    return jobs

@router.get("/my", response_model=List[JobInDB])
async def read_my_jobs(db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)) -> Any:
    jobs = await db.jobs.find({"employer_id": current_user["id"]}).sort("created_at", -1).to_list(length=100)
    return jobs

@router.get("/{job_id}", response_model=JobInDB)
async def get_job(job_id: str, db: AsyncIOMotorDatabase = Depends(deps.get_db)) -> Any:
    job = await db.jobs.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.put("/{job_id}/status")
async def update_job_status(job_id: str, status: str, db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)):
    res = await db.jobs.update_one(
        {"_id": job_id, "employer_id": current_user["id"]},
        {"$set": {"status": status}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found or unauthorized")
    return {"ok": True}

# ── APPLICATIONS ───────────────────────────────────────────────────────────────

@router.post("/{job_id}/apply", response_model=ApplicationInDB)
async def apply_to_job(job_id: str, app_in: ApplicationCreate, db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)) -> Any:
    job = await db.jobs.find_one({"_id": job_id, "status": "open"})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or closed")

    existing = await db.applications.find_one({"job_id": job_id, "applicant_id": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")

    app_id = str(uuid.uuid4())
    app_dict = app_in.model_dump()
    app_dict["id"] = app_id
    app_dict["_id"] = app_id
    app_dict["applicant_id"] = current_user["id"]
    app_dict["status"] = "pending"
    app_dict["created_at"] = datetime.utcnow()
    
    await db.applications.insert_one(app_dict)

    # Notify employer
    notif = {
        "id": str(uuid.uuid4()),
        "_id": str(uuid.uuid4()),
        "user_id": job["employer_id"],
        "type": "application_received",
        "title": f"New application for {job['title']}",
        "body": "Someone applied to your job posting.",
        "related_job_id": job_id,
        "related_application_id": app_id,
        "is_read": False,
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notif)
    return app_dict

@router.get("/applications/employer", response_model=List[ApplicationWithDetails])
async def get_employer_applications(db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)) -> Any:
    my_jobs = await db.jobs.find({"employer_id": current_user["id"]}).to_list(length=None)
    job_ids = [j["_id"] for j in my_jobs]
    job_map = {j["_id"]: j for j in my_jobs}

    apps = await db.applications.find({"job_id": {"$in": job_ids}}).sort("created_at", -1).to_list(length=None)
    
    result = []
    for a in apps:
        profile = await db.profiles.find_one({"user_id": a["applicant_id"]})
        job = job_map.get(a["job_id"])
        
        detail = dict(a)
        if job:
            detail["job_title"] = job.get("title")
            detail["job_location"] = job.get("location_name")
        if profile:
            detail["applicant_name"] = profile.get("name", "Unknown")
            detail["applicant_avatar"] = profile.get("avatar_url")
            detail["applicant_skills"] = ", ".join(profile.get("skills", [])) if profile.get("skills") else None
            detail["applicant_bio"] = profile.get("bio")
            
        result.append(detail)
    return result

@router.get("/applications/my", response_model=List[ApplicationWithDetails])
async def get_my_applications(db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)) -> Any:
    apps = await db.applications.find({"applicant_id": current_user["id"]}).sort("created_at", -1).to_list(length=None)
    result = []
    for a in apps:
        job = await db.jobs.find_one({"_id": a["job_id"]})
        detail = dict(a)
        if job:
            detail["job_title"] = job.get("title")
            detail["job_location"] = job.get("location_name")
        result.append(detail)
    return result

@router.put("/applications/{application_id}")
async def update_application_status(
    application_id: str,
    status: str,
    db: AsyncIOMotorDatabase = Depends(deps.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    app = await db.applications.find_one({"_id": application_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await db.jobs.find_one({"_id": app["job_id"], "employer_id": current_user["id"]})
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.applications.update_one({"_id": application_id}, {"$set": {"status": status}})
    
    # Notify applicant
    title = f"Your application was {status}"
    body = f"Your application for '{job['title']}' has been {status}."
    notif = {
        "id": str(uuid.uuid4()),
        "_id": str(uuid.uuid4()),
        "user_id": app["applicant_id"],
        "type": f"application_{status}",
        "title": title,
        "body": body,
        "related_job_id": job["_id"],
        "related_application_id": app["_id"],
        "is_read": False,
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notif)
    return {"ok": True, "status": status}

# ── NOTIFICATIONS ───────────────────────────────────────────────────────────────

@router.get("/notifications/me", response_model=List[NotificationInDB])
async def get_my_notifications(db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)) -> Any:
    notifs = await db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(50).to_list(length=50)
    return notifs

@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)):
    await db.notifications.update_one(
        {"_id": notif_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"ok": True}

@router.put("/notifications/read-all")
async def mark_all_read(db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"ok": True}

# ── SAVED JOBS ─────────────────────────────────────────────────────────────────

@router.post("/{job_id}/save")
async def save_job(job_id: str, db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)):
    existing = await db.saved_jobs.find_one({"user_id": current_user["id"], "job_id": job_id})
    if existing:
        await db.saved_jobs.delete_one({"_id": existing["_id"]})
        return {"saved": False}
        
    saved = {
        "id": str(uuid.uuid4()),
        "_id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "job_id": job_id
    }
    await db.saved_jobs.insert_one(saved)
    return {"saved": True}

@router.get("/saved/me", response_model=List[JobInDB])
async def get_saved_jobs(db: AsyncIOMotorDatabase = Depends(deps.get_db), current_user: dict = Depends(deps.get_current_user)) -> Any:
    saved = await db.saved_jobs.find({"user_id": current_user["id"]}).to_list(length=None)
    job_ids = [s["job_id"] for s in saved]
    
    jobs = await db.jobs.find({"_id": {"$in": job_ids}}).to_list(length=None)
    return jobs
