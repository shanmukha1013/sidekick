"""End-to-end API tests against a running server and a real MongoDB.

Run (from backend/):
    # terminal 1 – use a throwaway database
    DATABASE_NAME=sidekick_e2e_test JWT_SECRET=<32+ chars> uvicorn app.main:app --port 8001
    # terminal 2
    SIDEKICK_API_URL=http://localhost:8001/api/v1 JWT_SECRET=<same> pytest -q
"""
import hashlib
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pymongo
import pytest
from jose import jwt

API = os.environ.get("SIDEKICK_API_URL", "http://localhost:8001/api/v1")
MONGO = os.environ.get("MONGODB_URL", "mongodb://127.0.0.1:27017")
DB_NAME = os.environ.get("DATABASE_NAME", "sidekick_e2e_test")
SECRET = os.environ.get("JWT_SECRET", "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz")
RUN = uuid.uuid4().hex[:6]
PASSWORD = "Sidekick123"


@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=API, timeout=30) as c:
        yield c


@pytest.fixture(scope="session")
def mongo():
    c = pymongo.MongoClient(MONGO, serverSelectionTimeoutMS=3000)
    yield c[DB_NAME]
    c.close()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register(client, prefix, **overrides):
    body = {
        "full_name": f"{prefix.title()} Person",
        "username": f"{prefix}_{RUN}",
        "email": f"{prefix}_{RUN}@example.com",
        "phone": "+91 98765 43210",
        "password": PASSWORD,
    }
    body.update(overrides)
    return client.post("/auth/register", json=body)


@pytest.fixture(scope="session")
def employer(client):
    r = register(client, "employer")
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    r = client.post(
        "/users/me/onboarding",
        headers=auth(token),
        json={"roles": ["employer"], "company_name": f"Acme {RUN}", "company_description": "We make things."},
    )
    assert r.status_code == 200, r.text
    assert r.json()["roles"] == ["employer", "seeker"] and r.json()["onboarded"] is True
    return {"token": token, "user": r.json()}


@pytest.fixture(scope="session")
def seeker(client):
    r = register(client, "seeker")
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    r = client.post(
        "/users/me/onboarding",
        headers=auth(token),
        json={"roles": ["seeker"], "skills": ["React", "Customer Service"], "preferred_categories": ["Software & IT"]},
    )
    assert r.status_code == 200, r.text
    return {"token": token, "user": r.json()}


JOB = {
    "title": "Weekend Barista",
    "description": "Prepare coffee and serve customers at our campus cafe on weekends.",
    "category": "Food & Hospitality",
    "job_type": "Part-time",
    "experience_level": "Entry",
    "hourly_rate": 180,
    "skills_required": "Customer Service, Coffee",
    "location_name": "Hyderabad, Telangana",
    "is_remote": False,
}


@pytest.fixture(scope="session")
def job(client, employer):
    r = client.post("/jobs", headers=auth(employer["token"]), json={**JOB, "title": f"Weekend Barista {RUN}"})
    assert r.status_code == 201, r.text
    return r.json()


# ── Registration ────────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["database"] == "connected"


def test_register_returns_token_and_user_with_both_capabilities(client, mongo):
    r = register(client, "fresh")
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["token_type"] == "bearer" and data["access_token"]
    assert data["user"]["username"] == f"fresh_{RUN}"
    assert data["user"]["roles"] == ["employer", "seeker"] and data["user"]["onboarded"] is False
    stored = mongo.users.find_one({"username": f"fresh_{RUN}"})
    assert stored["password_hash"].startswith("$2") and PASSWORD not in str(stored)
    assert stored["phone"] == "+919876543210"


def test_register_duplicate_email_case_insensitive(client, employer):
    r = register(client, "other", email=f"EMPLOYER_{RUN}@Example.com")
    assert r.status_code == 409 and "email" in r.json()["detail"].lower()


def test_register_duplicate_username(client, employer):
    r = register(client, "other2", username=f"Employer_{RUN}")
    assert r.status_code == 409 and "username" in r.json()["detail"].lower()


@pytest.mark.parametrize(
    "override,field",
    [
        ({"phone": "12ab"}, "phone"),
        ({"password": "short1"}, "password"),
        ({"password": "nodigitshere"}, "password"),
        ({"email": "not-an-email"}, "email"),
        ({"username": "a"}, "username"),
        ({"full_name": ""}, "full_name"),
    ],
)
def test_register_validation(client, override, field):
    r = register(client, f"bad{uuid.uuid4().hex[:4]}", **override)
    assert r.status_code == 422, r.text
    assert field in r.json()["errors"]


def test_register_missing_fields(client):
    r = client.post("/auth/register", json={"email": "x@example.com"})
    assert r.status_code == 422
    errs = r.json()["errors"]
    assert {"full_name", "username", "phone", "password"} <= set(errs)


# ── Login / session ─────────────────────────────────────────────────────────────

def test_login_with_username_and_email(client, employer):
    for ident in (f"employer_{RUN}", f"EMPLOYER_{RUN}@example.com"):
        r = client.post("/auth/login", json={"identifier": ident, "password": PASSWORD})
        assert r.status_code == 200, r.text
        assert r.json()["user"]["roles"] == ["employer", "seeker"]


def test_login_wrong_password_and_unknown_user(client, employer):
    r = client.post("/auth/login", json={"identifier": f"employer_{RUN}", "password": "Wrong12345"})
    assert r.status_code == 401
    r = client.post("/auth/login", json={"identifier": f"nobody_{RUN}", "password": PASSWORD})
    assert r.status_code == 401
    assert r.json()["detail"] == "Incorrect email/username or password."


def test_me_requires_valid_token(client, employer):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers=auth("garbage.token.value")).status_code == 401
    r = client.get("/auth/me", headers=auth(employer["token"]))
    assert r.status_code == 200 and r.json()["username"] == f"employer_{RUN}"


def test_expired_token_rejected(client, employer):
    now = datetime.now(timezone.utc)
    expired = jwt.encode(
        {"sub": employer["user"]["id"], "jti": uuid.uuid4().hex, "tv": 0, "type": "access",
         "iat": int((now - timedelta(days=2)).timestamp()), "exp": int((now - timedelta(days=1)).timestamp())},
        SECRET, algorithm="HS256",
    )
    r = client.get("/auth/me", headers=auth(expired))
    assert r.status_code == 401 and "expired" in r.json()["detail"].lower()


def test_logout_revokes_token(client):
    r = register(client, "logout")
    token = r.json()["access_token"]
    assert client.get("/auth/me", headers=auth(token)).status_code == 200
    assert client.post("/auth/logout", headers=auth(token)).status_code == 204
    r = client.get("/auth/me", headers=auth(token))
    assert r.status_code == 401 and "signed out" in r.json()["detail"]


def test_change_password_invalidates_other_sessions(client):
    r = register(client, "pwchange")
    old = r.json()["access_token"]
    r = client.post("/auth/change-password", headers=auth(old), json={"current_password": PASSWORD, "new_password": "NewPass456"})
    assert r.status_code == 200, r.text
    new = r.json()["access_token"]
    assert client.get("/auth/me", headers=auth(old)).status_code == 401
    assert client.get("/auth/me", headers=auth(new)).status_code == 200
    assert client.post("/auth/login", json={"identifier": f"pwchange_{RUN}", "password": "NewPass456"}).status_code == 200


def test_password_reset_flow(client, mongo):
    r = register(client, "reset")
    user_id = r.json()["user"]["id"]
    r = client.post("/auth/forgot-password", json={"email": f"reset_{RUN}@example.com"})
    assert r.status_code == 200
    assert mongo.password_resets.count_documents({"user_id": user_id}) == 1
    # The raw token is only emailed; simulate the emailed link with a known token.
    raw = f"known-token-{RUN}"
    mongo.password_resets.insert_one({
        "_id": uuid.uuid4().hex, "user_id": user_id, "token_hash": hashlib.sha256(raw.encode()).hexdigest(),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10), "created_at": datetime.now(timezone.utc),
    })
    assert client.post("/auth/reset-password", json={"token": "wrong-token-xyz", "password": "Another789"}).status_code == 400
    assert client.post("/auth/reset-password", json={"token": raw, "password": "Another789"}).status_code == 200
    assert client.post("/auth/login", json={"identifier": f"reset_{RUN}", "password": "Another789"}).status_code == 200
    assert client.post("/auth/reset-password", json={"token": raw, "password": "Another789"}).status_code == 400


# ── Onboarding & roles ──────────────────────────────────────────────────────────

def test_one_account_can_hire_and_apply(client, employer):
    """Sidekick is one marketplace: a brand-new account can post jobs and apply without switching accounts."""
    token = register(client, "unified").json()["access_token"]
    h = auth(token)
    r = client.post("/users/me/onboarding", headers=h, json={"skills": ["Python"]})
    assert r.status_code == 200 and r.json()["roles"] == ["employer", "seeker"] and r.json()["onboarded"] is True
    mine = client.post("/jobs", headers=h, json={**JOB, "title": "Unified account listing"})
    assert mine.status_code == 201, mine.text
    assert mine.json()["company_name"]  # falls back to the poster's name when no company is set
    assert client.get("/jobs/mine", headers=h).status_code == 200
    assert client.get("/applications/received", headers=h).status_code == 200
    other = client.post("/jobs", headers=auth(employer["token"]), json={**JOB, "title": "Unified apply target"}).json()
    applied = client.post(f"/jobs/{other['id']}/apply", headers=h, json={"cover_letter": "I can do both on one account."})
    assert applied.status_code == 201, applied.text
    assert client.put(f"/saved-jobs/{other['id']}", headers=h).status_code == 204
    assert [a["job_id"] for a in client.get("/applications/mine", headers=h).json()] == [other["id"]]
    # Close both listings so they don't leak into the search tests that filter by this run's company.
    assert client.put(f"/jobs/{other['id']}", headers=auth(employer["token"]), json={"status": "closed"}).status_code == 200
    assert client.put(f"/jobs/{mine.json()['id']}", headers=h, json={"status": "closed"}).status_code == 200
    assert client.post(f"/jobs/{mine.json()['id']}/apply", headers=h, json={"cover_letter": "Applying to my own listing."}).status_code == 400


def test_cannot_manage_other_peoples_jobs(client, seeker, job):
    for token in (seeker["token"], register(client, "rival").json()["access_token"]):
        assert client.put(f"/jobs/{job['id']}", headers=auth(token), json={"title": "Hijack"}).status_code == 403
        assert client.delete(f"/jobs/{job['id']}", headers=auth(token)).status_code == 403
        assert client.get(f"/applications/received?job_id={job['id']}", headers=auth(token)).status_code == 403


def test_roles_cannot_be_injected_via_register_payload(client):
    r = register(client, "sneaky", roles=["admin"], role="ADMIN", onboarded=True)
    assert r.status_code == 201
    assert r.json()["user"]["roles"] == ["employer", "seeker"] and r.json()["user"]["onboarded"] is False


# ── Jobs ────────────────────────────────────────────────────────────────────────

def test_job_validation(client, employer):
    r = client.post("/jobs", headers=auth(employer["token"]), json={**JOB, "location_name": None})
    assert r.status_code == 422
    r = client.post("/jobs", headers=auth(employer["token"]), json={**JOB, "hourly_rate": -5})
    assert r.status_code == 422


def test_job_created_with_company_and_listed(client, job, employer):
    assert job["company_name"] == f"Acme {RUN}" and job["status"] == "open"
    r = client.get("/jobs", params={"q": RUN})
    assert r.status_code == 200
    assert any(j["id"] == job["id"] for j in r.json()["items"])


def test_search_and_filters(client, employer, job):
    remote = client.post(
        "/jobs", headers=auth(employer["token"]),
        json={**JOB, "title": f"Remote Tutor {RUN}", "category": "Tutoring & Education", "job_type": "Freelance",
              "is_remote": True, "location_name": None, "hourly_rate": 400},
    ).json()
    ids = lambda r: {j["id"] for j in r.json()["items"]}
    assert ids(client.get("/jobs", params={"q": f"tutor {RUN}"})) == {remote["id"]}
    assert remote["id"] in ids(client.get("/jobs", params={"category": "Tutoring & Education", "q": RUN}))
    assert job["id"] not in ids(client.get("/jobs", params={"category": "Tutoring & Education", "q": RUN}))
    assert ids(client.get("/jobs", params={"work_mode": "remote", "q": RUN})) == {remote["id"]}
    assert ids(client.get("/jobs", params={"location": "hyderabad", "q": RUN})) == {job["id"]}
    assert ids(client.get("/jobs", params={"job_type": "Freelance", "q": RUN})) == {remote["id"]}
    assert ids(client.get("/jobs", params={"min_rate": 300, "q": RUN})) == {remote["id"]}
    r = client.get("/jobs", params={"q": RUN, "sort": "pay_high"})
    assert r.json()["items"][0]["id"] == remote["id"]
    # Map-area filter only returns jobs whose real coordinates fall inside the box
    pinned = client.post(
        "/jobs", headers=auth(employer["token"]),
        json={**JOB, "title": f"Pinned Hyderabad {RUN}", "lat": 17.385, "lng": 78.4867},
    ).json()
    hyd = "78.3,17.2,78.7,17.6"
    assert ids(client.get("/jobs", params={"bbox": hyd, "q": RUN})) == {pinned["id"]}
    assert ids(client.get("/jobs", params={"bbox": "72.7,18.8,73.1,19.3", "q": RUN})) == set()
    assert client.get("/jobs", params={"bbox": "nope"}).status_code == 422
    client.put(f"/jobs/{pinned['id']}", headers=auth(employer["token"]), json={"status": "closed"})
    # Regex metacharacters are treated literally (no injection / 500s)
    assert client.get("/jobs", params={"q": ".*("}).status_code == 200


def test_edit_job_and_close(client, employer, job):
    r = client.put(f"/jobs/{job['id']}", headers=auth(employer["token"]), json={"hourly_rate": 200, "working_hours": "Sat–Sun 9–5"})
    assert r.status_code == 200 and r.json()["hourly_rate"] == 200
    r = client.get(f"/jobs/{job['id']}", headers=auth(employer["token"]))
    assert r.json()["is_owner"] is True and r.json()["working_hours"] == "Sat–Sun 9–5"


def test_job_not_found(client):
    assert client.get("/jobs/does-not-exist").status_code == 404


# ── Applications, saved jobs, notifications, messages ─────────────────────────

def test_save_and_unsave(client, seeker, job):
    h = auth(seeker["token"])
    assert client.put(f"/saved-jobs/{job['id']}", headers=h).status_code == 204
    assert client.put(f"/saved-jobs/{job['id']}", headers=h).status_code == 204  # idempotent
    assert [j["id"] for j in client.get("/saved-jobs", headers=h).json()] == [job["id"]]
    assert client.get(f"/jobs/{job['id']}", headers=h).json()["is_saved"] is True
    assert client.delete(f"/saved-jobs/{job['id']}", headers=h).status_code == 204
    assert client.get("/saved-jobs", headers=h).json() == []


def test_recommended_uses_skills(client, seeker, job):
    r = client.get("/jobs/recommended", headers=auth(seeker["token"]))
    assert r.status_code == 200
    assert job["id"] in [j["id"] for j in r.json()]  # "Customer Service" skill overlaps


def test_full_application_lifecycle(client, seeker, employer, job, mongo):
    hs, he = auth(seeker["token"]), auth(employer["token"])
    r = client.post(f"/jobs/{job['id']}/apply", headers=hs, json={"cover_letter": "Short"})
    assert r.status_code == 422  # cover letter too short

    r = client.post(f"/jobs/{job['id']}/apply", headers=hs,
                    json={"cover_letter": "I have two years of cafe experience and love coffee.", "availability": "Weekends"})
    assert r.status_code == 201, r.text
    app_id = r.json()["id"]
    assert r.json()["status"] == "pending"
    assert client.post(f"/jobs/{job['id']}/apply", headers=hs,
                       json={"cover_letter": "Applying twice should not be allowed at all."}).status_code == 409
    assert client.post(f"/jobs/{job['id']}/apply", headers=he,
                       json={"cover_letter": "Employer applying to own job, should fail."}).status_code == 400

    # Employer sees the applicant with contact info and an accurate count
    received = client.get("/applications/received", params={"job_id": job["id"]}, headers=he).json()
    assert [a["id"] for a in received] == [app_id]
    assert received[0]["applicant"]["email"] == f"seeker_{RUN}@example.com"
    assert client.get(f"/jobs/{job['id']}", headers=he).json()["applicant_count"] == 1
    mine = client.get("/jobs/mine", headers=he).json()
    assert next(j for j in mine if j["id"] == job["id"])["applicant_count"] == 1

    # Employer got notified
    notifs = client.get("/notifications", headers=he).json()
    assert any(n["type"] == "application_received" for n in notifs)
    assert client.get("/notifications/counts", headers=he).json()["notifications"] >= 1

    # Status update → applicant notified
    assert client.patch(f"/applications/{app_id}/status", headers=hs, json={"status": "accepted"}).status_code == 403
    assert client.patch(f"/applications/{app_id}/status", headers=he, json={"status": "bogus"}).status_code == 422
    r = client.patch(f"/applications/{app_id}/status", headers=he, json={"status": "shortlisted"})
    assert r.status_code == 200 and r.json()["status"] == "shortlisted"
    my_apps = client.get("/applications/mine", headers=hs).json()
    assert my_apps[0]["status"] == "shortlisted" and my_apps[0]["job"]["id"] == job["id"]
    seeker_notifs = client.get("/notifications", headers=hs).json()
    target = next(n for n in seeker_notifs if n["type"] == "application_shortlisted")
    assert client.post(f"/notifications/{target['id']}/read", headers=hs).status_code == 204
    assert client.post("/notifications/read-all", headers=hs).status_code == 204
    assert client.get("/notifications/counts", headers=hs).json()["notifications"] == 0

    # Messaging, both directions, with unread counts
    assert client.post(f"/messages/threads/{app_id}", headers=he, json={"body": "Can you start Saturday?"}).status_code == 201
    assert client.get("/notifications/counts", headers=hs).json()["messages"] == 1
    threads = client.get("/messages/threads", headers=hs).json()
    assert threads[0]["application_id"] == app_id and threads[0]["unread_count"] == 1
    assert threads[0]["counterpart_name"] == f"Acme {RUN}"
    msgs = client.get(f"/messages/threads/{app_id}", headers=hs).json()
    assert [m["body"] for m in msgs] == ["Can you start Saturday?"]
    assert client.get("/notifications/counts", headers=hs).json()["messages"] == 0
    assert client.post(f"/messages/threads/{app_id}", headers=hs, json={"body": "Yes!"}).status_code == 201
    assert client.post(f"/messages/threads/{app_id}", headers=hs, json={"body": "   "}).status_code == 422
    outsider = register(client, "outsider").json()["access_token"]
    assert client.get(f"/messages/threads/{app_id}", headers=auth(outsider)).status_code == 403

    # Withdraw → employer notified, can no longer change status
    assert client.post(f"/applications/{app_id}/withdraw", headers=hs).status_code == 200
    assert client.patch(f"/applications/{app_id}/status", headers=he, json={"status": "accepted"}).status_code == 400


def test_closed_job_rejects_applications(client, employer, seeker):
    j = client.post("/jobs", headers=auth(employer["token"]), json={**JOB, "title": f"Closing {RUN}"}).json()
    assert client.put(f"/jobs/{j['id']}", headers=auth(employer["token"]), json={"status": "closed"}).json()["status"] == "closed"
    assert j["id"] not in {x["id"] for x in client.get("/jobs", params={"q": RUN}).json()["items"]}
    r = client.post(f"/jobs/{j['id']}/apply", headers=auth(seeker["token"]), json={"cover_letter": "I would love to work here please."})
    assert r.status_code == 400


def test_delete_job_cascades(client, employer, seeker, mongo):
    he, hs = auth(employer["token"]), auth(seeker["token"])
    j = client.post("/jobs", headers=he, json={**JOB, "title": f"Temp {RUN}"}).json()
    client.put(f"/saved-jobs/{j['id']}", headers=hs)
    a = client.post(f"/jobs/{j['id']}/apply", headers=hs, json={"cover_letter": "Happy to help with this temporary role."}).json()
    client.post(f"/messages/threads/{a['id']}", headers=he, json={"body": "hi"})
    assert client.delete(f"/jobs/{j['id']}", headers=he).status_code == 204
    assert client.get(f"/jobs/{j['id']}").status_code == 404
    assert mongo.applications.count_documents({"job_id": j["id"]}) == 0
    assert mongo.saved_jobs.count_documents({"job_id": j["id"]}) == 0
    assert mongo.messages.count_documents({"application_id": a["id"]}) == 0
    assert any(n["type"] == "job_removed" for n in client.get("/notifications", headers=hs).json())


def test_profile_update_and_public_view(client, seeker, employer):
    hs = auth(seeker["token"])
    r = client.put("/profiles/me", headers=hs, json={"headline": "CS student", "skills": ["React", "react", " SQL "], "portfolio_links": ["https://github.com/x"]})
    assert r.status_code == 200 and r.json()["skills"] == ["React", "SQL"]
    assert client.put("/profiles/me", headers=hs, json={"portfolio_links": ["javascript:alert(1)"]}).status_code == 422
    pub = client.get(f"/profiles/{seeker['user']['id']}", headers=auth(employer["token"]))
    assert pub.status_code == 200 and pub.json()["headline"] == "CS student"
    assert "email" not in pub.json()


def test_settings_update_and_roles(client):
    token = register(client, "settings").json()["access_token"]
    h = auth(token)
    client.post("/users/me/onboarding", headers=h, json={"roles": ["seeker"]})
    r = client.patch("/users/me", headers=h, json={"full_name": "New  Name", "phone": "9876500000"})
    assert r.status_code == 200 and r.json()["full_name"] == "New Name"
    assert r.json()["roles"] == ["employer", "seeker"]
    r = client.put("/users/me/roles", headers=h, json={"roles": ["seeker"]})
    assert r.status_code == 200 and r.json()["roles"] == ["employer", "seeker"]
    assert client.put("/users/me/roles", headers=h, json={"roles": ["admin"]}).status_code == 422
