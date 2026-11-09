from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, require_employer
from app.core.security import utcnow
from app.db.session import get_db
from app.schemas.job import ApplicationOut, ApplicationStatusUpdate
from app.services.notify import notify
from app.services.serializers import applicant_summary, application_out, job_out

router = APIRouter()

STATUS_MESSAGES = {
    "reviewing": "is being reviewed",
    "shortlisted": "has been shortlisted",
    "accepted": "has been accepted",
    "rejected": "was not selected",
}


async def _jobs_by_id(db: AsyncIOMotorDatabase, ids: List[str]) -> Dict[str, dict]:
    return {j["_id"]: j async for j in db.jobs.find({"_id": {"$in": list(set(ids))}})}


async def _applicants_by_id(db: AsyncIOMotorDatabase, ids: List[str]) -> Dict[str, tuple]:
    ids = list(set(ids))
    users = {u["_id"]: u async for u in db.users.find({"_id": {"$in": ids}}, {"password_hash": 0})}
    profiles = {p["user_id"]: p async for p in db.profiles.find({"user_id": {"$in": ids}})}
    return {uid: (u, profiles.get(uid)) for uid, u in users.items()}


async def _employer_id_for(db: AsyncIOMotorDatabase, app: dict) -> Optional[str]:
    if app.get("employer_id"):
        return app["employer_id"]
    job = await db.jobs.find_one({"_id": app["job_id"]}, {"employer_id": 1})
    return job.get("employer_id") if job else None


@router.get("/mine", response_model=List[ApplicationOut])
async def my_applications(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    apps = await db.applications.find({"applicant_id": user["id"]}).sort("created_at", -1).to_list(500)
    jobs = await _jobs_by_id(db, [a["job_id"] for a in apps])
    return [application_out(a, job=job_out(jobs[a["job_id"]]) if a["job_id"] in jobs else None) for a in apps]


@router.get("/received", response_model=List[ApplicationOut])
async def received_applications(
    job_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    user: dict = Depends(require_employer),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    my_job_ids = await db.jobs.distinct("_id", {"employer_id": user["id"]})
    if job_id:
        if job_id not in my_job_ids:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only view applicants for your own jobs.")
        my_job_ids = [job_id]
    query: dict = {"job_id": {"$in": my_job_ids}}
    if status_filter:
        query["status"] = status_filter
    apps = await db.applications.find(query).sort("created_at", -1).to_list(1000)
    jobs = await _jobs_by_id(db, [a["job_id"] for a in apps])
    people = await _applicants_by_id(db, [a["applicant_id"] for a in apps])
    out = []
    for a in apps:
        person = people.get(a["applicant_id"])
        out.append(
            application_out(
                a,
                job=job_out(jobs[a["job_id"]]) if a["job_id"] in jobs else None,
                applicant=applicant_summary(person[0], person[1], include_contact=True) if person else None,
            )
        )
    return out


@router.get("/{application_id}", response_model=ApplicationOut)
async def get_application(application_id: str, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    app = await db.applications.find_one({"_id": application_id})
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Application not found.")
    employer_id = await _employer_id_for(db, app)
    if user["id"] not in (app["applicant_id"], employer_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You don't have access to this application.")
    job = await db.jobs.find_one({"_id": app["job_id"]})
    person = (await _applicants_by_id(db, [app["applicant_id"]])).get(app["applicant_id"])
    return application_out(
        app,
        job=job_out(job) if job else None,
        applicant=applicant_summary(person[0], person[1], include_contact=True) if person else None,
    )


@router.patch("/{application_id}/status", response_model=ApplicationOut)
async def update_status(
    application_id: str,
    body: ApplicationStatusUpdate,
    user: dict = Depends(require_employer),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    app = await db.applications.find_one({"_id": application_id})
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Application not found.")
    job = await db.jobs.find_one({"_id": app["job_id"]})
    if not job or job.get("employer_id") != user["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only manage applications for your own jobs.")
    if app.get("status") == "withdrawn":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="The applicant has withdrawn this application.")

    now = utcnow()
    await db.applications.update_one(
        {"_id": application_id}, {"$set": {"status": body.status, "updated_at": now, "employer_id": job["employer_id"]}}
    )
    if app.get("status") != body.status:
        await notify(
            db,
            app["applicant_id"],
            f"application_{body.status}",
            f"Your application for “{job['title']}” {STATUS_MESSAGES[body.status]}",
            f"{job.get('company_name') or 'The employer'} updated your application status.",
            "/applications",
        )
    app.update({"status": body.status, "updated_at": now})
    return application_out(app, job=job_out(job))


@router.post("/{application_id}/withdraw", response_model=ApplicationOut)
async def withdraw(application_id: str, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    app = await db.applications.find_one({"_id": application_id})
    if not app or app["applicant_id"] != user["id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Application not found.")
    if app.get("status") in ("accepted", "rejected", "withdrawn"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"This application is already {app['status']}.")
    now = utcnow()
    await db.applications.update_one({"_id": application_id}, {"$set": {"status": "withdrawn", "updated_at": now}})
    job = await db.jobs.find_one({"_id": app["job_id"]})
    employer_id = await _employer_id_for(db, app)
    if job and employer_id:
        await notify(
            db,
            employer_id,
            "application_withdrawn",
            f"An applicant withdrew from “{job['title']}”",
            f"{user.get('full_name') or user.get('username')} withdrew their application.",
            f"/employer/applicants?job={job['_id']}",
        )
    app.update({"status": "withdrawn", "updated_at": now})
    return application_out(app, job=job_out(job) if job else None)
