import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, TEXT
from pymongo.errors import PyMongoError

from app.core.config import settings

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = AsyncIOMotorClient(
    settings.MONGODB_URL,
    serverSelectionTimeoutMS=8000,
    tz_aware=True,
    uuidRepresentation="standard",
)
db: AsyncIOMotorDatabase = client[settings.DATABASE_NAME]


async def get_db():
    yield db


async def ping() -> bool:
    try:
        await client.admin.command("ping")
        return True
    except PyMongoError as exc:
        logger.error("MongoDB ping failed: %s", exc)
        return False


async def ensure_indexes() -> None:
    """Create indexes. Failures (e.g. legacy duplicate data) are logged, not fatal."""
    specs = [
        (db.users, [("email", ASCENDING)], {"unique": True, "name": "uniq_email"}),
        (db.users, [("username", ASCENDING)], {"unique": True, "name": "uniq_username"}),
        (db.profiles, [("user_id", ASCENDING)], {"unique": True, "name": "uniq_profile_user"}),
        (db.jobs, [("status", ASCENDING), ("created_at", DESCENDING)], {"name": "status_created"}),
        (db.jobs, [("employer_id", ASCENDING), ("created_at", DESCENDING)], {"name": "employer_created"}),
        (
            db.jobs,
            [("title", TEXT), ("description", TEXT), ("skills_required", TEXT), ("company_name", TEXT)],
            {"name": "job_text", "weights": {"title": 10, "skills_required": 5, "company_name": 3, "description": 1}},
        ),
        (db.applications, [("job_id", ASCENDING), ("applicant_id", ASCENDING)], {"unique": True, "name": "uniq_application"}),
        (db.applications, [("applicant_id", ASCENDING), ("created_at", DESCENDING)], {"name": "applicant_created"}),
        (db.applications, [("employer_id", ASCENDING), ("created_at", DESCENDING)], {"name": "employer_apps"}),
        (db.saved_jobs, [("user_id", ASCENDING), ("job_id", ASCENDING)], {"unique": True, "name": "uniq_saved"}),
        (db.notifications, [("user_id", ASCENDING), ("created_at", DESCENDING)], {"name": "user_created"}),
        (db.messages, [("application_id", ASCENDING), ("created_at", ASCENDING)], {"name": "thread_created"}),
        (db.revoked_tokens, [("expires_at", ASCENDING)], {"expireAfterSeconds": 0, "name": "ttl_revoked"}),
        (db.password_resets, [("expires_at", ASCENDING)], {"expireAfterSeconds": 0, "name": "ttl_resets"}),
        (db.password_resets, [("token_hash", ASCENDING)], {"unique": True, "name": "uniq_reset_hash"}),
    ]
    for collection, keys, opts in specs:
        try:
            await collection.create_index(keys, **opts)
        except PyMongoError as exc:
            logger.warning("Could not create index %s on %s: %s", opts.get("name"), collection.name, exc)
