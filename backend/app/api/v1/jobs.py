import re
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.api.deps import get_current_user, get_optional_user, require_employer, require_seeker
from app.core.security import utcnow
from app.db.session import get_db
from app.schemas.common import EXPERIENCE_LEVELS, JOB_CATEGORIES, JOB_TYPES
from app.schemas.job import ApplicationCreate, ApplicationOut, JobCreate, JobList, JobOut, JobUpdate
from app.services.notify import notify
from app.services.serializers import application_out, job_out

router = APIRouter()


def _rx(value: str) -> Dict[str, Any]:
    return {"$regex": re.escape(value.strip()), "$options": "i"}


async def _owned_job(db: AsyncIOMotorDatabase, job_id: str, user: dict) -> dict:
    job = await db.jobs.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found.")
    if job.get("employer_id") != user["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only manage jobs that you posted.")
    return job


async def _viewer_flags(db: AsyncIOMotorDatabase, user: Optional[dict], job_ids: List[str]) -> tuple[set, set]:
    if not user or not job_ids:
        return set(), set()
    saved = await db.saved_jobs.distinct("job_id", {"user_id": user["id"], "job_id": {"$in": job_ids}})
    applied = await db.applications.distinct("job_id", {"applicant_id": user["id"], "job_id": {"$in": job_ids}})
    return set(saved), set(applied)


async def _applicant_counts(db: AsyncIOMotorDatabase, job_ids: List[str]) -> Dict[str, int]:
    pipeline = [
        {"$match": {"job_id": {"$in": job_ids}, "status": {"$ne": "withdrawn"}}},
        {"$group": {"_id": "$job_id", "n": {"$sum": 1}}},
    ]
    return {row["_id"]: row["n"] async for row in db.applications.aggregate(pipeline)}


def _bbox_query(bbox: str) -> Dict[str, Any]:
    """Restrict to jobs whose stored coordinates fall inside the visible map area."""
    try:
        min_lng, min_lat, max_lng, max_lat = (float(v) for v in bbox.split(","))
    except ValueError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="bbox must be minLng,minLat,maxLng,maxLat.")
    min_lat, max_lat = max(-90.0, min(min_lat, max_lat)), min(90.0, max(min_lat, max_lat))
    min_lng, max_lng = max(-180.0, min_lng), min(180.0, max_lng)
    query: Dict[str, Any] = {"lat": {"$gte": min_lat, "$lte": max_lat}}
    if min_lng <= max_lng:
        query["lng"] = {"$gte": min_lng, "$lte": max_lng}
    else:  # area crosses the antimeridian
        query["$nor"] = [{"lng": {"$gt": max_lng, "$lt": min_lng}}]
        query["lng"] = {"$type": "number"}
    return query


@router.get("/meta")
async def job_meta():
    return {"categories": JOB_CATEGORIES, "job_types": JOB_TYPES, "experience_levels": EXPERIENCE_LEVELS}


@router.get("", response_model=JobList)
async def list_jobs(
    db: AsyncIOMotorDatabase = Depends(get_db),
    user: Optional[dict] = Depends(get_optional_user),
    q: Optional[str] = Query(default=None, max_length=100),
    category: Optional[str] = None,
    job_type: Optional[str] = Query(default=None, description="Comma-separated"),
    location: Optional[str] = Query(default=None, max_length=100),
    work_mode: Optional[str] = Query(default=None, pattern="^(remote|onsite)$"),
    experience_level: Optional[str] = None,
    min_rate: Optional[float] = Query(default=None, ge=0),
    max_rate: Optional[float] = Query(default=None, ge=0),
    bbox: Optional[str] = Query(default=None, max_length=120, description="Map area: minLng,minLat,maxLng,maxLat"),
    sort: str = Query(default="newest", pattern="^(newest|pay_high|pay_low)$"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
):
    query: Dict[str, Any] = {"status": "open"}
    if q and q.strip():
        query["$or"] = [
            {"title": _rx(q)},
            {"description": _rx(q)},
            {"skills_required": _rx(q)},
            {"company_name": _rx(q)},
            {"category": _rx(q)},
        ]
    if category:
        query["category"] = category
    if job_type:
        query["job_type"] = {"$in": [t.strip() for t in job_type.split(",") if t.strip()]}
    if location and location.strip():
        query["location_name"] = _rx(location)
    if work_mode == "remote":
        query["is_remote"] = True
    elif work_mode == "onsite":
        query["is_remote"] = {"$ne": True}
    if experience_level:
        query["experience_level"] = experience_level
    if min_rate is not None or max_rate is not None:
        query["hourly_rate"] = {}
        if min_rate is not None:
            query["hourly_rate"]["$gte"] = min_rate
        if max_rate is not None:
            query["hourly_rate"]["$lte"] = max_rate

    if bbox:
        query.update(_bbox_query(bbox))

    sort_spec = {"newest": [("created_at", -1)], "pay_high": [("hourly_rate", -1)], "pay_low": [("hourly_rate", 1)]}[sort]
    total = await db.jobs.count_documents(query)
    docs = await db.jobs.find(query).sort(sort_spec).skip(skip).limit(limit).to_list(length=limit)
    saved, applied = await _viewer_flags(db, user, [d["_id"] for d in docs])
    items = [
        job_out(d, is_saved=(d["_id"] in saved) if user else None, has_applied=(d["_id"] in applied) if user else None)
        for d in docs
    ]
    return {"items": items, "total": total}


@router.get("/recommended", response_model=List[JobOut])
async def recommended_jobs(user: dict = Depends(require_seeker), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Ranks recent open jobs by overlap with the seeker's skills and preferred categories."""
    profile = await db.profiles.find_one({"user_id": user["id"]}) or {}
    skills = {s.lower() for s in profile.get("skills") or []}
    categories = set(profile.get("preferred_categories") or [])
    applied = set(await db.applications.distinct("job_id", {"applicant_id": user["id"]}))

    candidates = await db.jobs.find({"status": "open", "employer_id": {"$ne": user["id"]}}).sort("created_at", -1).limit(200).to_list(200)
    scored = []
    for job in candidates:
        if job["_id"] in applied:
            continue
        job_skills = {s.strip().lower() for s in (job.get("skills_required") or "").split(",") if s.strip()}
        text = f"{job.get('title', '')} {job.get('description', '')}".lower()
        score = 3 * len(skills & job_skills) + sum(1 for s in skills if s and s in text)
        if job.get("category") in categories:
            score += 2
        scored.append((score, job))
    scored.sort(key=lambda t: (t[0], t[1]["created_at"]), reverse=True)
    top = [j for _, j in scored[:6]]
    saved, _ = await _viewer_flags(db, user, [j["_id"] for j in top])
    return [job_out(j, is_saved=j["_id"] in saved, has_applied=False) for j in top]


@router.get("/mine", response_model=List[JobOut])
async def my_jobs(user: dict = Depends(require_employer), db: AsyncIOMotorDatabase = Depends(get_db)):
    docs = await db.jobs.find({"employer_id": user["id"]}).sort("created_at", -1).to_list(500)
    counts = await _applicant_counts(db, [d["_id"] for d in docs])
    return [job_out(d, applicant_count=counts.get(d["_id"], 0), is_owner=True) for d in docs]


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(job_in: JobCreate, user: dict = Depends(require_employer), db: AsyncIOMotorDatabase = Depends(get_db)):
    profile = await db.profiles.find_one({"user_id": user["id"]}) or {}
    now = utcnow()
    job = job_in.model_dump()
    job.update(
        {
            "_id": str(uuid.uuid4()),
            "employer_id": user["id"],
            "company_name": profile.get("company_name") or user.get("full_name"),
            "status": "open",
            "created_at": now,
            "updated_at": now,
        }
    )
    if job["is_remote"] and not job.get("location_name"):
        job["location_name"] = "Remote"
    await db.jobs.insert_one(job)
    return job_out(job, applicant_count=0, is_owner=True)


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str, user: Optional[dict] = Depends(get_optional_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    job = await db.jobs.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="This job doesn't exist or has been removed.")
    # Closed listings stay visible (e.g. for applicants following up) but cannot be applied to.
    is_owner = bool(user and job.get("employer_id") == user["id"])
    saved, applied = await _viewer_flags(db, user, [job_id])
    count = (await _applicant_counts(db, [job_id])).get(job_id, 0) if is_owner else None
    return job_out(
        job,
        is_owner=is_owner if user else None,
        is_saved=(job_id in saved) if user else None,
        has_applied=(job_id in applied) if user else None,
        applicant_count=count,
    )


@router.put("/{job_id}", response_model=JobOut)
async def update_job(job_id: str, body: JobUpdate, user: dict = Depends(require_employer), db: AsyncIOMotorDatabase = Depends(get_db)):
    job = await _owned_job(db, job_id, user)
    data = body.model_dump(exclude_unset=True)
    merged = {**job, **data}
    if not merged.get("is_remote") and not (merged.get("location_name") or "").strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Location is required for on-site jobs.")
    data["updated_at"] = utcnow()
    await db.jobs.update_one({"_id": job_id}, {"$set": data})
    updated = await db.jobs.find_one({"_id": job_id})
    counts = await _applicant_counts(db, [job_id])
    return job_out(updated, applicant_count=counts.get(job_id, 0), is_owner=True)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str, user: dict = Depends(require_employer), db: AsyncIOMotorDatabase = Depends(get_db)):
    job = await _owned_job(db, job_id, user)
    apps = await db.applications.find({"job_id": job_id}, {"_id": 1, "applicant_id": 1, "status": 1}).to_list(None)
    for app in apps:
        if app.get("status") not in ("rejected", "withdrawn"):
            await notify(
                db,
                app["applicant_id"],
                "job_removed",
                f"“{job['title']}” is no longer available",
                "The employer removed this listing. Your application has been closed.",
                "/applications",
            )
    app_ids = [a["_id"] for a in apps]
    await db.messages.delete_many({"application_id": {"$in": app_ids}})
    await db.applications.delete_many({"job_id": job_id})
    await db.saved_jobs.delete_many({"job_id": job_id})
    await db.jobs.delete_one({"_id": job_id})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{job_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_to_job(job_id: str, body: ApplicationCreate, user: dict = Depends(require_seeker), db: AsyncIOMotorDatabase = Depends(get_db)):
    job = await db.jobs.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="This job doesn't exist or has been removed.")
    if job.get("status") != "open":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This job is no longer accepting applications.")
    if job.get("employer_id") == user["id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="You can't apply to your own job listing.")
    if await db.applications.find_one({"job_id": job_id, "applicant_id": user["id"]}, {"_id": 1}):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="You have already applied to this job.")

    now = utcnow()
    app = {
        "_id": str(uuid.uuid4()),
        "job_id": job_id,
        "applicant_id": user["id"],
        "employer_id": job["employer_id"],
        **body.model_dump(),
        "phone": body.phone or user.get("phone") or user.get("phone_number"),
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.applications.insert_one(app)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="You have already applied to this job.")

    await notify(
        db,
        job["employer_id"],
        "application_received",
        f"New application for “{job['title']}”",
        f"{user.get('full_name') or user.get('username')} applied.",
        f"/applicants?job={job_id}",
    )
    return application_out(app, job=job_out(job))
