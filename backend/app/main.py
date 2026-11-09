import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import ConnectionFailure, OperationFailure, ServerSelectionTimeoutError

from app.api.v1 import applications, auth, jobs, messages, notifications, profiles, saved, users
from app.core.config import settings
from app.db import session

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("sidekick")


async def migrate_legacy_data() -> None:
    """Idempotent fixes for documents written by earlier versions of the API."""
    db = session.db
    async for app in db.applications.find({"employer_id": {"$exists": False}}, {"job_id": 1}):
        job = await db.jobs.find_one({"_id": app["job_id"]}, {"employer_id": 1})
        if job:
            await db.applications.update_one({"_id": app["_id"]}, {"$set": {"employer_id": job["employer_id"]}})


@asynccontextmanager
async def lifespan(_: FastAPI):
    if await session.ping():
        logger.info("Connected to MongoDB database '%s'", settings.DATABASE_NAME)
        await session.ensure_indexes()
        await migrate_legacy_data()
    else:
        logger.error(
            "MongoDB is unreachable. Check MONGODB_URL and (for Atlas) that Network Access allows this server's IP. "
            "API requests that need the database will return 503 until it is reachable."
        )
    yield
    session.client.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list({*settings.frontend_origins, "http://localhost:3000", "http://127.0.0.1:3000"}),
    allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
    # Auth uses a Bearer token header, not cookies, so credentials mode is not required.
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)


def _clean_msg(msg: str) -> str:
    return msg.removeprefix("Value error, ").removeprefix("Assertion failed, ")


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errors = {}
    first = None
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
        field = ".".join(loc) or "_"
        msg = _clean_msg(err.get("msg", "Invalid value"))
        if err.get("type") == "missing":
            msg = "This field is required."
        elif "email" in field and "email" in msg.lower():
            msg = "Enter a valid email address."
        errors.setdefault(field, msg)
        if first is None:
            first = msg if field == "_" else f"{field.replace('_', ' ').capitalize()}: {msg}"
    return JSONResponse(status_code=422, content={"detail": first or "Invalid request.", "errors": errors})


@app.exception_handler(ServerSelectionTimeoutError)
@app.exception_handler(ConnectionFailure)
async def db_unavailable_handler(_: Request, exc: Exception):
    logger.error("Database unavailable: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Sidekick can't reach its database right now. Please try again in a moment."},
    )


@app.exception_handler(OperationFailure)
async def db_operation_handler(_: Request, exc: OperationFailure):
    logger.error("Database operation failed: %s", exc)
    if exc.code in (8000, 18, 13):  # Atlas auth / authentication failed / unauthorized
        return JSONResponse(status_code=503, content={"detail": "Database authentication failed. Check server configuration."})
    return JSONResponse(status_code=500, content={"detail": "A database error occurred. Please try again."})


@app.exception_handler(Exception)
async def unhandled_handler(_: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again."})


api = settings.API_V1_STR
app.include_router(auth.router, prefix=f"{api}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{api}/users", tags=["users"])
app.include_router(profiles.router, prefix=f"{api}/profiles", tags=["profiles"])
app.include_router(jobs.router, prefix=f"{api}/jobs", tags=["jobs"])
app.include_router(applications.router, prefix=f"{api}/applications", tags=["applications"])
app.include_router(saved.router, prefix=f"{api}/saved-jobs", tags=["saved-jobs"])
app.include_router(notifications.router, prefix=f"{api}/notifications", tags=["notifications"])
app.include_router(messages.router, prefix=f"{api}/messages", tags=["messages"])


@app.get("/", include_in_schema=False)
async def root():
    return {"service": "sidekick-api", "docs": "/docs", "health": f"{api}/health"}


@app.get(f"{api}/health", tags=["health"])
async def health():
    db_ok = await session.ping()
    return JSONResponse(
        status_code=200 if db_ok else 503,
        content={"status": "ok" if db_ok else "degraded", "database": "connected" if db_ok else "unreachable"},
    )
