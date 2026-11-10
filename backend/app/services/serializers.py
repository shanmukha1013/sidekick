"""Convert raw MongoDB documents (including legacy shapes) into API output dicts."""
from typing import Any, Dict, List, Optional

LEGACY_ROLE_MAP = {"WORKER": "seeker", "EMPLOYER": "employer"}

# Sidekick is one marketplace: every account can both find work and hire. These are the capabilities
# reported for (and enforced on) every user, regardless of what was chosen at sign-up.
ALL_CAPABILITIES: List[str] = ["employer", "seeker"]


def stored_roles(user: Dict[str, Any]) -> List[str]:
    """The roles recorded on the document (kept for history; no longer used to restrict access)."""
    roles = user.get("roles")
    if isinstance(roles, list):
        return [r for r in roles if r in ("seeker", "employer")]
    legacy = LEGACY_ROLE_MAP.get(str(user.get("role", "")).upper())
    return [legacy] if legacy else []


def user_roles(user: Dict[str, Any]) -> List[str]:
    return list(ALL_CAPABILITIES)


def user_out(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(user["_id"]),
        "full_name": user.get("full_name") or user.get("username", ""),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "phone": user.get("phone") or user.get("phone_number"),
        "roles": user_roles(user),
        "onboarded": bool(user.get("onboarded", True)),
        "created_at": user.get("created_at"),
    }


def profile_out(user: Dict[str, Any], profile: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    p = profile or {}
    return {
        "user_id": str(user["_id"]),
        "full_name": user.get("full_name") or p.get("name") or user.get("username", ""),
        "username": user.get("username", ""),
        "roles": user_roles(user),
        "headline": p.get("headline"),
        "bio": p.get("bio"),
        "location": p.get("location"),
        "skills": p.get("skills") or [],
        "experience": p.get("experience"),
        "education": p.get("education"),
        "portfolio_links": p.get("portfolio_links") or [],
        "availability": p.get("availability"),
        "preferred_categories": p.get("preferred_categories") or [],
        "avatar_url": p.get("avatar_url"),
        "company_name": p.get("company_name"),
        "company_website": p.get("company_website"),
        "company_description": p.get("company_description"),
        "member_since": user.get("created_at"),
    }


def job_out(job: Dict[str, Any], **extra: Any) -> Dict[str, Any]:
    out = {k: v for k, v in job.items() if k != "_id"}
    out["id"] = str(job["_id"])
    out.setdefault("status", "open")
    out["is_remote"] = bool(job.get("is_remote", False))
    out["hourly_rate"] = float(job.get("hourly_rate") or 0)
    out.update({k: v for k, v in extra.items() if v is not None})
    return out


def application_out(app: Dict[str, Any], **extra: Any) -> Dict[str, Any]:
    out = {k: v for k, v in app.items() if k != "_id"}
    out["id"] = str(app["_id"])
    if out.get("expected_rate") is None and app.get("expected_salary") is not None:
        out["expected_rate"] = app.get("expected_salary")
    out.update({k: v for k, v in extra.items() if v is not None})
    return out


def applicant_summary(user: Dict[str, Any], profile: Optional[Dict[str, Any]], include_contact: bool) -> Dict[str, Any]:
    p = profile or {}
    return {
        "id": str(user["_id"]),
        "full_name": user.get("full_name") or p.get("name") or user.get("username", ""),
        "username": user.get("username", ""),
        "email": user.get("email") if include_contact else None,
        "headline": p.get("headline"),
        "location": p.get("location"),
        "skills": p.get("skills") or [],
        "avatar_url": p.get("avatar_url"),
    }


def notification_out(n: Dict[str, Any]) -> Dict[str, Any]:
    link = n.get("link")
    if not link and n.get("related_job_id"):
        link = f"/jobs/{n['related_job_id']}"
    return {
        "id": str(n["_id"]),
        "type": n.get("type", "info"),
        "title": n.get("title", ""),
        "body": n.get("body"),
        "link": link,
        "is_read": bool(n.get("is_read", False)),
        "created_at": n.get("created_at"),
    }


def message_out(m: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(m["_id"]),
        "application_id": m["application_id"],
        "sender_id": m["sender_id"],
        "body": m["body"],
        "created_at": m["created_at"],
        "read_at": m.get("read_at"),
    }
