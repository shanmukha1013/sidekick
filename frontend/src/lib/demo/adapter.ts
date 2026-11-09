/**
 * DEMO MODE ONLY — an in-browser implementation of the Sidekick API used when the live server or its
 * database is unavailable. It mirrors the live endpoints' shapes and permission rules (roles are read from
 * the stored account, never from the request), and keeps everything in the browser-local demo store.
 */
import { ApiError } from "@/lib/api";
import { EXPERIENCE_LEVELS, JOB_CATEGORIES, JOB_TYPES, type Role } from "@/lib/types";
import {
  type DApplication,
  type DJob,
  type DemoDB,
  type DProfile,
  type DUser,
  hashPassword,
  loadDb,
  nowIso,
  saveDb,
  uid,
  verifyPassword,
} from "@/lib/demo/store";

type Body = Record<string, unknown>;
interface Ctx {
  db: DemoDB;
  user: DUser | null;
  q: URLSearchParams;
  body: Body;
  token: string | null;
}

const SESSION_DAYS = 7;
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STATUS_MESSAGES: Record<string, string> = {
  reviewing: "is being reviewed",
  shortlisted: "has been shortlisted",
  accepted: "has been accepted",
  rejected: "was not selected",
};

function fail(status: number, detail: string, errors: Record<string, string> = {}): never {
  throw new ApiError(detail, status, errors);
}
function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const ci = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// ── serializers (same shapes as the live API) ──────────────────────────────

function userOut(u: DUser) {
  return {
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    email: u.email,
    phone: u.phone,
    roles: u.roles,
    onboarded: u.onboarded,
    created_at: u.created_at,
  };
}

function profileFor(db: DemoDB, userId: string): DProfile {
  let p = db.profiles.find((x) => x.user_id === userId);
  if (!p) {
    p = { user_id: userId, skills: [], portfolio_links: [], preferred_categories: [] };
    db.profiles.push(p);
  }
  return p;
}

function profileOut(db: DemoDB, u: DUser) {
  const p = profileFor(db, u.id);
  return {
    ...p,
    user_id: u.id,
    full_name: u.full_name,
    username: u.username,
    roles: u.roles,
    skills: p.skills || [],
    portfolio_links: p.portfolio_links || [],
    preferred_categories: p.preferred_categories || [],
    member_since: u.created_at,
  };
}

function jobOut(db: DemoDB, j: DJob, viewer: DUser | null, extra: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = { ...j };
  if (viewer) {
    out.is_saved = db.saved.some((s) => s.user_id === viewer.id && s.job_id === j.id);
    out.has_applied = db.applications.some((a) => a.applicant_id === viewer.id && a.job_id === j.id);
  }
  return { ...out, ...extra };
}

const applicantCount = (db: DemoDB, jobId: string) => db.applications.filter((a) => a.job_id === jobId).length;

function applicantSummary(db: DemoDB, userId: string) {
  const u = db.users.find((x) => x.id === userId);
  if (!u) return null;
  const p = profileFor(db, userId);
  return {
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    email: u.email,
    headline: p.headline ?? null,
    location: p.location ?? null,
    skills: p.skills || [],
    avatar_url: p.avatar_url ?? null,
  };
}

function appOut(db: DemoDB, a: DApplication, withApplicant = false) {
  const job = db.jobs.find((j) => j.id === a.job_id);
  return {
    ...a,
    job: job ? jobOut(db, job, null) : null,
    ...(withApplicant ? { applicant: applicantSummary(db, a.applicant_id) } : {}),
  };
}

function notify(db: DemoDB, userId: string, type: string, title: string, body: string, link: string) {
  db.notifications.push({ id: uid("n_"), user_id: userId, type, title, body, link, is_read: false, created_at: nowIso() });
}

// ── auth helpers ───────────────────────────────────────────────────────────

function sessionUser(db: DemoDB, token: string | null): DUser | null {
  if (!token) return null;
  const now = Date.now();
  db.sessions = db.sessions.filter((s) => new Date(s.expires_at).getTime() > now);
  const s = db.sessions.find((x) => x.token === token);
  return s ? db.users.find((u) => u.id === s.user_id) ?? null : null;
}

function startSession(db: DemoDB, user: DUser) {
  const token = uid("demo_");
  const expires_at = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  db.sessions.push({ token, user_id: user.id, expires_at });
  return { access_token: token, token_type: "bearer", expires_at, user: userOut(user) };
}

function requireUser(ctx: Ctx): DUser {
  if (!ctx.user) fail(401, ctx.token ? "Your demo session has ended. Please sign in again." : "Please sign in to continue.");
  return ctx.user as DUser;
}

function requireRole(ctx: Ctx, role: Role): DUser {
  const u = requireUser(ctx);
  if (!u.onboarded) fail(403, "Finish setting up your account first.");
  if (!u.roles.includes(role)) {
    fail(403, role === "employer" ? "Enable hiring in Settings to use employer features." : "Enable job seeking in Settings to apply for jobs.");
  }
  return u;
}

function ownedJob(ctx: Ctx, id: string): DJob {
  const u = requireRole(ctx, "employer");
  const job = ctx.db.jobs.find((j) => j.id === id);
  if (!job) fail(404, "This job doesn't exist or has been removed.");
  if (job!.employer_id !== u.id) fail(403, "You can only manage your own job listings.");
  return job!;
}

function normalizePhone(raw: string): string | null {
  const p = raw.replace(/[\s\-().]/g, "");
  return /^\+?[0-9]{10,15}$/.test(p) ? p : null;
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Include at least one letter and one number.";
  if (new TextEncoder().encode(pw).length > 72) return "Use at most 72 characters.";
  return null;
}

function normalizeWebsite(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) fail(422, "Enter a valid website address.", { company_website: "Enter a valid website address." });
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function validateJob(input: Body, partial: boolean) {
  const errors: Record<string, string> = {};
  const has = (k: string) => k in input;
  if (!partial || has("title")) {
    const t = str(input.title);
    if (t.length < 3) errors.title = "Use at least 3 characters.";
  }
  if (!partial || has("description")) {
    const d = str(input.description);
    if (d.length < 20) errors.description = "Describe the role in at least 20 characters.";
  }
  if (!partial || has("hourly_rate")) {
    const r = Number(input.hourly_rate);
    if (!(r > 0) || r > 100000) errors.hourly_rate = "Enter a pay rate above 0.";
  }
  if (has("category") && input.category && !(JOB_CATEGORIES as readonly string[]).includes(String(input.category))) errors.category = "Choose a category.";
  if (has("job_type") && input.job_type && !(JOB_TYPES as readonly string[]).includes(String(input.job_type))) errors.job_type = "Choose a type.";
  if (has("experience_level") && input.experience_level && !(EXPERIENCE_LEVELS as readonly string[]).includes(String(input.experience_level)))
    errors.experience_level = "Choose an experience level.";
  if (Object.keys(errors).length) fail(422, "Please fix the highlighted fields.", errors);
}

const JOB_FIELDS = [
  "title", "description", "responsibilities", "benefits", "category", "job_type", "experience_level", "hourly_rate",
  "skills_required", "working_hours", "location_name", "is_remote", "lat", "lng", "deadline",
] as const;

function pickJob(body: Body, extra: readonly string[] = []): Partial<DJob> {
  const out: Record<string, unknown> = {};
  for (const k of [...JOB_FIELDS, ...extra]) {
    if (!(k in body)) continue;
    const v = body[k];
    out[k] = typeof v === "string" ? v.trim() || null : v;
  }
  if ("hourly_rate" in out) out.hourly_rate = Number(out.hourly_rate);
  if ("is_remote" in out) out.is_remote = !!out.is_remote;
  return out as Partial<DJob>;
}

// ── router ─────────────────────────────────────────────────────────────────

type Handler = (ctx: Ctx, params: string[]) => unknown | Promise<unknown>;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, h: Handler) =>
  routes.push([method, new RegExp("^" + pattern.replace(/:\w+/g, "([^/]+)") + "$"), h]);

on("GET", "/health", () => ({ status: "demo", database: "browser-local" }));

// auth
on("POST", "/auth/register", async ({ db, body }) => {
  const full_name = str(body.full_name).replace(/\s+/g, " ");
  const username = str(body.username).toLowerCase();
  const email = str(body.email).toLowerCase();
  const phone = normalizePhone(str(body.phone));
  const password = typeof body.password === "string" ? body.password : "";
  const errors: Record<string, string> = {};
  if (full_name.length < 2) errors.full_name = "Enter your full name.";
  if (!USERNAME_RE.test(username) || username.includes("..")) errors.username = "3–30 characters: letters, numbers, dots or underscores.";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!phone) errors.phone = "Enter a valid phone number (10–15 digits).";
  const pwErr = validatePassword(password);
  if (pwErr) errors.password = pwErr;
  if (Object.keys(errors).length) fail(422, "Please fix the highlighted fields.", errors);
  if (db.users.some((u) => ci(u.email, email))) fail(409, "An account with this email already exists.");
  if (db.users.some((u) => ci(u.username, username))) fail(409, "This username is already taken.");

  const user: DUser = {
    id: uid("u_"),
    full_name,
    username,
    email,
    phone,
    roles: [],
    onboarded: false,
    created_at: nowIso(),
    password: await hashPassword(password),
  };
  db.users.push(user);
  profileFor(db, user.id);
  return startSession(db, user);
});

on("POST", "/auth/login", async ({ db, body }) => {
  const ident = str(body.identifier ?? body.username);
  const password = typeof body.password === "string" ? body.password : "";
  if (!ident || !password) fail(422, "Enter your email or username and password.");
  const user = db.users.find((u) => (ident.includes("@") ? ci(u.email, ident) : ci(u.username, ident)));
  if (!user || !(await verifyPassword(password, user.password))) fail(401, "Incorrect email/username or password.");
  return startSession(db, user!);
});

on("GET", "/auth/me", (ctx) => userOut(requireUser(ctx)));

on("POST", "/auth/logout", (ctx) => {
  requireUser(ctx);
  ctx.db.sessions = ctx.db.sessions.filter((s) => s.token !== ctx.token);
  return undefined;
});

const resetUnavailable = () =>
  fail(503, "Password reset emails need the live Sidekick server. In demo mode, sign in with the demo account or create a new demo account.");
on("POST", "/auth/forgot-password", resetUnavailable);
on("POST", "/auth/reset-password", resetUnavailable);

on("POST", "/auth/change-password", async (ctx) => {
  const u = requireUser(ctx);
  if (!(await verifyPassword(String(ctx.body.current_password ?? ""), u.password))) fail(400, "Your current password is incorrect.");
  const next = String(ctx.body.new_password ?? "");
  const err = validatePassword(next);
  if (err) fail(422, err, { new_password: err });
  u.password = await hashPassword(next);
  ctx.db.sessions = ctx.db.sessions.filter((s) => s.user_id !== u.id); // sign out every other session
  return startSession(ctx.db, u);
});

// users
on("POST", "/users/me/onboarding", (ctx) => {
  const u = requireUser(ctx);
  const roles = Array.from(new Set((Array.isArray(ctx.body.roles) ? ctx.body.roles : []).filter((r): r is Role => r === "seeker" || r === "employer"))).sort();
  if (!roles.length) fail(422, "Choose at least one way to use Sidekick.");
  if (roles.includes("employer") && !str(ctx.body.company_name)) fail(422, "Company or organization name is required to hire on Sidekick.", { company_name: "Required to hire on Sidekick." });
  const p = profileFor(ctx.db, u.id);
  for (const k of ["headline", "location", "company_name", "company_description"] as const) {
    if (str(ctx.body[k])) p[k] = str(ctx.body[k]);
  }
  if (str(ctx.body.company_website)) p.company_website = normalizeWebsite(ctx.body.company_website);
  if (Array.isArray(ctx.body.skills)) p.skills = (ctx.body.skills as unknown[]).map(str).filter(Boolean).slice(0, 30);
  if (Array.isArray(ctx.body.preferred_categories)) p.preferred_categories = (ctx.body.preferred_categories as unknown[]).map(str).filter(Boolean);
  u.roles = roles;
  u.onboarded = true;
  return userOut(u);
});

on("PATCH", "/users/me", (ctx) => {
  const u = requireUser(ctx);
  if ("full_name" in ctx.body) {
    const n = str(ctx.body.full_name).replace(/\s+/g, " ");
    if (n.length < 2) fail(422, "Enter your full name.", { full_name: "Enter your full name." });
    u.full_name = n;
  }
  if ("phone" in ctx.body && ctx.body.phone != null) {
    const p = normalizePhone(str(ctx.body.phone));
    if (!p) fail(422, "Enter a valid phone number (10–15 digits).", { phone: "Enter a valid phone number (10–15 digits)." });
    u.phone = p;
  }
  return userOut(u);
});

on("PUT", "/users/me/roles", (ctx) => {
  const u = requireUser(ctx);
  const roles = Array.from(new Set((Array.isArray(ctx.body.roles) ? ctx.body.roles : []).filter((r): r is Role => r === "seeker" || r === "employer"))).sort();
  if (!roles.length) fail(422, "Keep at least one role enabled.");
  if (roles.includes("employer") && !u.roles.includes("employer") && !str(profileFor(ctx.db, u.id).company_name)) {
    fail(400, "Add your company or organization name to your profile before enabling hiring.");
  }
  u.roles = roles;
  u.onboarded = true;
  return userOut(u);
});

// profiles
on("GET", "/profiles/me", (ctx) => profileOut(ctx.db, requireUser(ctx)));

on("PUT", "/profiles/me", (ctx) => {
  const u = requireUser(ctx);
  const p = profileFor(ctx.db, u.id);
  const b = ctx.body;
  if (u.roles.includes("employer") && "company_name" in b && !str(b.company_name)) fail(400, "Company name is required while hiring is enabled.");
  for (const k of ["headline", "bio", "location", "experience", "education", "availability", "company_name", "company_description"] as const) {
    if (k in b) p[k] = str(b[k]) || null;
  }
  if ("company_website" in b) p.company_website = normalizeWebsite(b.company_website);
  if (Array.isArray(b.skills)) p.skills = (b.skills as unknown[]).map(str).filter(Boolean).slice(0, 30);
  if (Array.isArray(b.preferred_categories)) p.preferred_categories = (b.preferred_categories as unknown[]).map(str).filter(Boolean);
  if (Array.isArray(b.portfolio_links)) {
    const links = (b.portfolio_links as unknown[]).map(str).filter(Boolean);
    if (links.some((l) => !/^https?:\/\/\S+$/i.test(l))) fail(422, "Portfolio links must start with http:// or https://", { portfolio_links: "Use full links starting with https://" });
    p.portfolio_links = links;
  }
  if (p.company_name) ctx.db.jobs.filter((j) => j.employer_id === u.id).forEach((j) => (j.company_name = p.company_name));
  return profileOut(ctx.db, u);
});

on("POST", "/profiles/me/avatar", () => fail(503, "Photo uploads need the live server's image storage, so they're not available in demo mode."));

on("GET", "/profiles/:id", (ctx, [id]) => {
  requireUser(ctx);
  const u = ctx.db.users.find((x) => x.id === id);
  if (!u) fail(404, "Profile not found.");
  return profileOut(ctx.db, u!);
});

// jobs
on("GET", "/jobs/meta", () => ({ categories: JOB_CATEGORIES, job_types: JOB_TYPES, experience_levels: EXPERIENCE_LEVELS }));

on("GET", "/jobs", ({ db, user, q }) => {
  const kw = (q.get("q") || "").trim().toLowerCase();
  const loc = (q.get("location") || "").trim().toLowerCase();
  const types = (q.get("job_type") || "").split(",").map((t) => t.trim()).filter(Boolean);
  const min = q.get("min_rate") ? Number(q.get("min_rate")) : null;
  const max = q.get("max_rate") ? Number(q.get("max_rate")) : null;
  let rows = db.jobs.filter((j) => j.status === "open");
  if (kw) rows = rows.filter((j) => [j.title, j.description, j.skills_required, j.company_name, j.category].some((f) => (f || "").toLowerCase().includes(kw)));
  if (q.get("category")) rows = rows.filter((j) => j.category === q.get("category"));
  if (types.length) rows = rows.filter((j) => types.includes(j.job_type));
  if (loc) rows = rows.filter((j) => (j.location_name || "").toLowerCase().includes(loc));
  if (q.get("work_mode") === "remote") rows = rows.filter((j) => j.is_remote);
  if (q.get("work_mode") === "onsite") rows = rows.filter((j) => !j.is_remote);
  if (q.get("experience_level")) rows = rows.filter((j) => j.experience_level === q.get("experience_level"));
  if (min !== null) rows = rows.filter((j) => j.hourly_rate >= min);
  if (max !== null) rows = rows.filter((j) => j.hourly_rate <= max);
  const sort = q.get("sort") || "newest";
  rows.sort((a, b) =>
    sort === "pay_high" ? b.hourly_rate - a.hourly_rate : sort === "pay_low" ? a.hourly_rate - b.hourly_rate : b.created_at.localeCompare(a.created_at),
  );
  const skip = Math.max(0, Number(q.get("skip") || 0));
  const limit = Math.min(50, Math.max(1, Number(q.get("limit") || 20)));
  return { items: rows.slice(skip, skip + limit).map((j) => jobOut(db, j, user)), total: rows.length };
});

on("GET", "/jobs/recommended", (ctx) => {
  const u = requireRole(ctx, "seeker");
  const p = profileFor(ctx.db, u.id);
  const skills = new Set((p.skills || []).map((s) => s.toLowerCase()));
  const cats = new Set(p.preferred_categories || []);
  const applied = new Set(ctx.db.applications.filter((a) => a.applicant_id === u.id).map((a) => a.job_id));
  return ctx.db.jobs
    .filter((j) => j.status === "open" && j.employer_id !== u.id && !applied.has(j.id))
    .map((j) => {
      const js = new Set((j.skills_required || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
      const text = `${j.title} ${j.description}`.toLowerCase();
      let score = 0;
      skills.forEach((s) => {
        if (js.has(s)) score += 3;
        if (s && text.includes(s)) score += 1;
      });
      if (cats.has(j.category)) score += 2;
      return { score, j };
    })
    .sort((a, b) => b.score - a.score || b.j.created_at.localeCompare(a.j.created_at))
    .slice(0, 6)
    .map(({ j }) => jobOut(ctx.db, j, u, { has_applied: false }));
});

on("GET", "/jobs/mine", (ctx) => {
  const u = requireRole(ctx, "employer");
  return ctx.db.jobs
    .filter((j) => j.employer_id === u.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((j) => jobOut(ctx.db, j, null, { applicant_count: applicantCount(ctx.db, j.id), is_owner: true }));
});

on("POST", "/jobs", (ctx) => {
  const u = requireRole(ctx, "employer");
  validateJob(ctx.body, false);
  const data = pickJob(ctx.body);
  if (!data.is_remote && !str(data.location_name)) fail(422, "Location is required for on-site jobs.", { location_name: "Location is required for on-site jobs." });
  const now = nowIso();
  const job: DJob = {
    category: "Other",
    job_type: "Part-time",
    experience_level: "Entry",
    is_remote: false,
    ...data,
    title: str(data.title),
    description: str(data.description),
    hourly_rate: Number(data.hourly_rate),
    id: uid("j_"),
    employer_id: u.id,
    company_name: profileFor(ctx.db, u.id).company_name || u.full_name,
    status: "open",
    created_at: now,
    updated_at: now,
  };
  if (job.is_remote && !job.location_name) job.location_name = "Remote";
  ctx.db.jobs.push(job);
  return jobOut(ctx.db, job, null, { applicant_count: 0, is_owner: true });
});

on("GET", "/jobs/:id", (ctx, [id]) => {
  const job = ctx.db.jobs.find((j) => j.id === id);
  if (!job) fail(404, "This job doesn't exist or has been removed.");
  const isOwner = !!ctx.user && job!.employer_id === ctx.user.id;
  return jobOut(ctx.db, job!, ctx.user, {
    ...(ctx.user ? { is_owner: isOwner } : {}),
    ...(isOwner ? { applicant_count: applicantCount(ctx.db, id) } : {}),
  });
});

on("PUT", "/jobs/:id", (ctx, [id]) => {
  const job = ownedJob(ctx, id);
  validateJob(ctx.body, true);
  const data = pickJob(ctx.body, ["status"]);
  if ("status" in data && data.status !== "open" && data.status !== "closed") fail(422, "Status must be open or closed.");
  const merged = { ...job, ...data };
  if (!merged.is_remote && !str(merged.location_name)) fail(422, "Location is required for on-site jobs.", { location_name: "Location is required for on-site jobs." });
  Object.assign(job, data, { updated_at: nowIso() });
  return jobOut(ctx.db, job, null, { applicant_count: applicantCount(ctx.db, id), is_owner: true });
});

on("DELETE", "/jobs/:id", (ctx, [id]) => {
  const job = ownedJob(ctx, id);
  const apps = ctx.db.applications.filter((a) => a.job_id === id);
  for (const a of apps) {
    if (a.status !== "rejected" && a.status !== "withdrawn") {
      notify(ctx.db, a.applicant_id, "job_removed", `“${job.title}” is no longer available`, "The employer removed this listing. Your application has been closed.", "/applications");
    }
  }
  const appIds = new Set(apps.map((a) => a.id));
  ctx.db.messages = ctx.db.messages.filter((m) => !appIds.has(m.application_id));
  ctx.db.applications = ctx.db.applications.filter((a) => a.job_id !== id);
  ctx.db.saved = ctx.db.saved.filter((s) => s.job_id !== id);
  ctx.db.jobs = ctx.db.jobs.filter((j) => j.id !== id);
  return undefined;
});

on("POST", "/jobs/:id/apply", (ctx, [id]) => {
  const u = requireRole(ctx, "seeker");
  const job = ctx.db.jobs.find((j) => j.id === id);
  if (!job) fail(404, "This job doesn't exist or has been removed.");
  if (job!.status !== "open") fail(400, "This job is no longer accepting applications.");
  if (job!.employer_id === u.id) fail(400, "You can't apply to your own job listing.");
  if (ctx.db.applications.some((a) => a.job_id === id && a.applicant_id === u.id)) fail(409, "You have already applied to this job.");
  const cover = str(ctx.body.cover_letter);
  if (cover.length < 20) fail(422, "Write at least 20 characters.", { cover_letter: "Write at least 20 characters." });
  const now = nowIso();
  const app: DApplication = {
    id: uid("a_"),
    job_id: id,
    applicant_id: u.id,
    employer_id: job!.employer_id,
    cover_letter: cover,
    expected_rate: ctx.body.expected_rate != null && ctx.body.expected_rate !== "" ? Number(ctx.body.expected_rate) : null,
    availability: str(ctx.body.availability) || null,
    portfolio_links: str(ctx.body.portfolio_links) || null,
    phone: str(ctx.body.phone) || u.phone,
    status: "pending",
    created_at: now,
    updated_at: now,
  };
  ctx.db.applications.push(app);
  notify(ctx.db, job!.employer_id, "application_received", `New application for “${job!.title}”`, `${u.full_name} applied.`, `/employer/applicants?job=${id}`);
  return appOut(ctx.db, app);
});

// applications
on("GET", "/applications/mine", (ctx) => {
  const u = requireUser(ctx);
  return ctx.db.applications
    .filter((a) => a.applicant_id === u.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((a) => appOut(ctx.db, a));
});

on("GET", "/applications/received", (ctx) => {
  const u = requireRole(ctx, "employer");
  let jobIds = ctx.db.jobs.filter((j) => j.employer_id === u.id).map((j) => j.id);
  const jobId = ctx.q.get("job_id");
  if (jobId) {
    if (!jobIds.includes(jobId)) fail(403, "You can only view applicants for your own jobs.");
    jobIds = [jobId];
  }
  const sf = ctx.q.get("status_filter");
  return ctx.db.applications
    .filter((a) => jobIds.includes(a.job_id) && (!sf || a.status === sf))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((a) => appOut(ctx.db, a, true));
});

on("GET", "/applications/:id", (ctx, [id]) => {
  const u = requireUser(ctx);
  const a = ctx.db.applications.find((x) => x.id === id);
  if (!a) fail(404, "Application not found.");
  if (u.id !== a!.applicant_id && u.id !== a!.employer_id) fail(403, "You don't have access to this application.");
  return appOut(ctx.db, a!, true);
});

on("PATCH", "/applications/:id/status", (ctx, [id]) => {
  const u = requireRole(ctx, "employer");
  const a = ctx.db.applications.find((x) => x.id === id);
  if (!a) fail(404, "Application not found.");
  const job = ctx.db.jobs.find((j) => j.id === a!.job_id);
  if (!job || job.employer_id !== u.id) fail(403, "You can only manage applications for your own jobs.");
  if (a!.status === "withdrawn") fail(400, "The applicant has withdrawn this application.");
  const status = String(ctx.body.status || "");
  if (!(status in STATUS_MESSAGES)) fail(422, "Choose a valid status.");
  if (a!.status !== status) {
    notify(ctx.db, a!.applicant_id, `application_${status}`, `Your application for “${job!.title}” ${STATUS_MESSAGES[status]}`, `${job!.company_name || "The employer"} updated your application status.`, "/applications");
  }
  a!.status = status as DApplication["status"];
  a!.updated_at = nowIso();
  return appOut(ctx.db, a!);
});

on("POST", "/applications/:id/withdraw", (ctx, [id]) => {
  const u = requireUser(ctx);
  const a = ctx.db.applications.find((x) => x.id === id);
  if (!a || a.applicant_id !== u.id) fail(404, "Application not found.");
  if (["accepted", "rejected", "withdrawn"].includes(a!.status)) fail(400, `This application is already ${a!.status}.`);
  a!.status = "withdrawn";
  a!.updated_at = nowIso();
  const job = ctx.db.jobs.find((j) => j.id === a!.job_id);
  if (job) notify(ctx.db, a!.employer_id, "application_withdrawn", `An applicant withdrew from “${job.title}”`, `${u.full_name} withdrew their application.`, `/employer/applicants?job=${job.id}`);
  return appOut(ctx.db, a!);
});

// saved jobs
on("GET", "/saved-jobs", (ctx) => {
  const u = requireUser(ctx);
  return ctx.db.saved
    .filter((s) => s.user_id === u.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((s) => ctx.db.jobs.find((j) => j.id === s.job_id))
    .filter((j): j is DJob => !!j)
    .map((j) => jobOut(ctx.db, j, u, { is_saved: true }));
});

on("PUT", "/saved-jobs/:id", (ctx, [id]) => {
  const u = requireUser(ctx);
  if (!ctx.db.jobs.some((j) => j.id === id)) fail(404, "Job not found.");
  if (!ctx.db.saved.some((s) => s.user_id === u.id && s.job_id === id)) ctx.db.saved.push({ user_id: u.id, job_id: id, created_at: nowIso() });
  return undefined;
});

on("DELETE", "/saved-jobs/:id", (ctx, [id]) => {
  const u = requireUser(ctx);
  ctx.db.saved = ctx.db.saved.filter((s) => !(s.user_id === u.id && s.job_id === id));
  return undefined;
});

// notifications
on("GET", "/notifications", (ctx) => {
  const u = requireUser(ctx);
  const limit = Math.min(100, Math.max(1, Number(ctx.q.get("limit") || 50)));
  return ctx.db.notifications
    .filter((n) => n.user_id === u.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((n) => omit(n, "user_id"));
});

on("GET", "/notifications/counts", (ctx) => {
  const u = requireUser(ctx);
  return {
    notifications: ctx.db.notifications.filter((n) => n.user_id === u.id && !n.is_read).length,
    messages: ctx.db.messages.filter((m) => m.recipient_id === u.id && !m.read_at).length,
  };
});

on("POST", "/notifications/read-all", (ctx) => {
  const u = requireUser(ctx);
  ctx.db.notifications.forEach((n) => n.user_id === u.id && (n.is_read = true));
  return undefined;
});

on("POST", "/notifications/:id/read", (ctx, [id]) => {
  const u = requireUser(ctx);
  const n = ctx.db.notifications.find((x) => x.id === id && x.user_id === u.id);
  if (!n) fail(404, "Notification not found.");
  n!.is_read = true;
  return undefined;
});

// messages
function threadContext(ctx: Ctx, appId: string) {
  const u = requireUser(ctx);
  const a = ctx.db.applications.find((x) => x.id === appId);
  if (!a) fail(404, "Conversation not found.");
  if (u.id === a!.applicant_id) return { u, a: a!, other: a!.employer_id };
  if (u.id === a!.employer_id) return { u, a: a!, other: a!.applicant_id };
  return fail(403, "You are not part of this conversation.");
}

on("GET", "/messages/threads", (ctx) => {
  const u = requireUser(ctx);
  const msgOut = (m: DemoDB["messages"][number]) => omit(m, "recipient_id");
  return ctx.db.applications
    .filter((a) => a.applicant_id === u.id || a.employer_id === u.id)
    .map((a) => {
      const job = ctx.db.jobs.find((j) => j.id === a.job_id);
      if (!job) return null;
      const isApplicant = a.applicant_id === u.id;
      const otherId = isApplicant ? a.employer_id : a.applicant_id;
      const other = ctx.db.users.find((x) => x.id === otherId);
      const op = profileFor(ctx.db, otherId);
      const msgs = ctx.db.messages.filter((m) => m.application_id === a.id).sort((x, y) => x.created_at.localeCompare(y.created_at));
      const last = msgs[msgs.length - 1];
      return {
        application_id: a.id,
        job_id: job.id,
        job_title: job.title,
        counterpart_id: otherId,
        counterpart_name: (isApplicant ? op.company_name : null) || other?.full_name || "Unknown user",
        counterpart_avatar: op.avatar_url ?? null,
        my_side: isApplicant ? "applicant" : "employer",
        application_status: a.status,
        last_message: last ? msgOut(last) : null,
        unread_count: msgs.filter((m) => m.recipient_id === u.id && !m.read_at).length,
        updated_at: last ? last.created_at : a.created_at,
      };
    })
    .filter(Boolean)
    .sort((x, y) => y!.updated_at.localeCompare(x!.updated_at));
});

on("GET", "/messages/threads/:id", (ctx, [id]) => {
  const { u } = threadContext(ctx, id);
  const now = nowIso();
  return ctx.db.messages
    .filter((m) => m.application_id === id)
    .map((m) => {
      if (m.recipient_id === u.id && !m.read_at) m.read_at = now;
      return m;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m) => omit(m, "recipient_id"));
});

on("POST", "/messages/threads/:id", (ctx, [id]) => {
  const { u, other } = threadContext(ctx, id);
  const body = str(ctx.body.body);
  if (!body) fail(422, "Write a message first.", { body: "Write a message first." });
  if (body.length > 4000) fail(422, "Messages can be up to 4000 characters.", { body: "Too long." });
  const msg = { id: uid("m_"), application_id: id, sender_id: u.id, recipient_id: other, body, created_at: nowIso(), read_at: null };
  ctx.db.messages.push(msg);
  return omit(msg, "recipient_id");
});

// ── entry point ────────────────────────────────────────────────────────────

export async function demoRequest<T>(method: string, path: string, body: unknown, token: string | null): Promise<T> {
  // A short, realistic delay so loading states behave the same as against the live API.
  await new Promise((r) => setTimeout(r, 120));
  const url = new URL(path, "http://demo.local");
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const db = await loadDb();
  const ctx: Ctx = {
    db,
    user: sessionUser(db, token),
    q: url.searchParams,
    body: body && typeof body === "object" && !(body instanceof FormData) ? (body as Body) : {},
    token,
  };
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = re.exec(pathname);
    if (!match) continue;
    const result = await handler(ctx, match.slice(1).map(decodeURIComponent));
    saveDb(db);
    return result as T;
  }
  return fail(404, "Not found.");
}
