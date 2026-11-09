/**
 * DEMO MODE ONLY — browser-local data store.
 *
 * Holds non-sensitive demo records in localStorage under its own key. It never talks to the Sidekick API
 * or MongoDB. Passwords are stored only as salted PBKDF2-SHA256 hashes (never plaintext); sessions are
 * random opaque ids that the client keeps in sessionStorage.
 */
import type { ApplicationStatus, Role } from "@/lib/types";

export const DEMO_DB_KEY = "sidekick.demo.v1";

/** Demo-only credentials for the preconfigured account. They exist solely in this browser's demo store. */
export const DEMO_ACCOUNT = { email: "demo@sidekick.demo", username: "demo", password: "Demo1234" } as const;

export interface PasswordHash {
  salt: string;
  hash: string;
  iterations: number;
}

export interface DUser {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  roles: Role[];
  onboarded: boolean;
  created_at: string;
  password: PasswordHash | null; // null = seeded persona that cannot sign in
}

export interface DProfile {
  user_id: string;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  skills: string[];
  experience?: string | null;
  education?: string | null;
  portfolio_links: string[];
  availability?: string | null;
  preferred_categories: string[];
  avatar_url?: string | null;
  company_name?: string | null;
  company_website?: string | null;
  company_description?: string | null;
}

export interface DJob {
  id: string;
  title: string;
  description: string;
  responsibilities?: string | null;
  benefits?: string | null;
  category: string;
  job_type: string;
  experience_level: string;
  hourly_rate: number;
  skills_required?: string | null;
  working_hours?: string | null;
  location_name?: string | null;
  is_remote: boolean;
  lat?: number | null;
  lng?: number | null;
  deadline?: string | null;
  status: "open" | "closed";
  employer_id: string;
  company_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  employer_id: string;
  cover_letter?: string | null;
  expected_rate?: number | null;
  availability?: string | null;
  portfolio_links?: string | null;
  phone?: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface DNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DMessage {
  id: string;
  application_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface DemoDB {
  version: 1;
  seeded_at: string;
  users: DUser[];
  profiles: DProfile[];
  jobs: DJob[];
  applications: DApplication[];
  saved: { user_id: string; job_id: string; created_at: string }[];
  notifications: DNotification[];
  messages: DMessage[];
  sessions: { token: string; user_id: string; expires_at: string }[];
}

// ── helpers ────────────────────────────────────────────────────────────────

export function uid(prefix = ""): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const nowIso = () => new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * 86400_000).toISOString();

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Demo mode needs a secure browser context (https or localhost) to protect passwords.");
  }
  return globalThis.crypto.subtle;
}

export async function hashPassword(password: string, salt?: string, iterations = 120_000): Promise<PasswordHash> {
  const saltBytes = salt ? unb64(salt) : crypto.getRandomValues(new Uint8Array(16));
  const key = await subtle().importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations }, key, 256);
  return { salt: b64(saltBytes), hash: b64(bits), iterations };
}

export async function verifyPassword(password: string, stored: PasswordHash | null): Promise<boolean> {
  if (!stored) return false;
  const candidate = await hashPassword(password, stored.salt, stored.iterations);
  if (candidate.hash.length !== stored.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.hash.length; i++) diff |= candidate.hash.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  return diff === 0;
}

// ── persistence ────────────────────────────────────────────────────────────

let cache: DemoDB | null = null;
let seeding: Promise<DemoDB> | null = null;

if (typeof window !== "undefined") {
  // Another tab changed the demo store — drop the in-memory copy.
  window.addEventListener("storage", (e) => {
    if (e.key === DEMO_DB_KEY) cache = null;
  });
}

function read(): DemoDB | null {
  try {
    const raw = window.localStorage.getItem(DEMO_DB_KEY);
    if (!raw) return null;
    const db = JSON.parse(raw) as DemoDB;
    return db?.version === 1 ? db : null;
  } catch {
    return null;
  }
}

export function saveDb(db: DemoDB) {
  cache = db;
  try {
    window.localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
  } catch {
    /* quota exceeded or storage blocked — data lasts until the page closes */
  }
}

export async function loadDb(): Promise<DemoDB> {
  if (cache) return cache;
  const stored = read();
  if (stored) return (cache = stored);
  seeding ??= seed().then((db) => {
    saveDb(db);
    seeding = null;
    return db;
  });
  return seeding;
}

/** Wipes all demo records and sessions in this browser. */
export function resetDemoData() {
  cache = null;
  try {
    window.localStorage.removeItem(DEMO_DB_KEY);
    window.sessionStorage.removeItem("sidekick.demo.session");
  } catch {
    /* ignore */
  }
}

// ── seed (sample records that exist only inside demo mode) ─────────────────

async function seed(): Promise<DemoDB> {
  const demoId = "u_demo";
  const users: DUser[] = [
    {
      id: demoId,
      full_name: "Demo User",
      username: DEMO_ACCOUNT.username,
      email: DEMO_ACCOUNT.email,
      phone: "+919800000000",
      roles: ["employer", "seeker"],
      onboarded: true,
      created_at: hoursAgo(24 * 30),
      password: await hashPassword(DEMO_ACCOUNT.password),
    },
  ];
  const profiles: DProfile[] = [
    {
      user_id: demoId,
      headline: "Product-minded generalist · design & front-end",
      bio: "Exploring Sidekick in demo mode. I take on design and front-end projects, and hire for a small studio.",
      location: "Bengaluru",
      skills: ["Figma", "React", "Communication", "Excel"],
      portfolio_links: [],
      availability: "FLEXIBLE",
      preferred_categories: ["Design & Creative", "Software & IT"],
      company_name: "Sidekick Demo Studio",
      company_website: "https://example.com",
      company_description: "A small creative studio used to showcase hiring in demo mode.",
    },
  ];

  const companies = [
    { id: "u_brewline", name: "Brewline Coffee Co.", owner: "Kavya Rao", desc: "Specialty coffee bars across Bengaluru." },
    { id: "u_northstar", name: "Northstar Learning", owner: "Rahul Verma", desc: "Online and in-person tutoring for school students." },
    { id: "u_swiftdrop", name: "SwiftDrop Logistics", owner: "Imran Shaikh", desc: "Same-day parcel delivery in Mumbai." },
    { id: "u_pixelcraft", name: "Pixelcraft Studio", owner: "Ananya Ghosh", desc: "Brand and product design studio, remote-first." },
    { id: "u_urban", name: "Urban Threads", owner: "Sameer Joshi", desc: "Contemporary fashion retail in Pune." },
    { id: "u_helio", name: "Helio Labs", owner: "Divya Menon", desc: "B2B software for small businesses." },
    { id: "u_carewell", name: "CareWell Clinics", owner: "Dr. Lakshmi Narayanan", desc: "Neighbourhood family clinics in Chennai." },
    { id: "u_eventsphere", name: "EventSphere", owner: "Karan Malhotra", desc: "Live events and festival production." },
  ];
  for (const [i, c] of companies.entries()) {
    users.push({
      id: c.id,
      full_name: c.owner,
      username: c.id.slice(2),
      email: `${c.id.slice(2)}@example.com`,
      phone: null,
      roles: ["employer"],
      onboarded: true,
      created_at: hoursAgo(24 * (60 + i)),
      password: null,
    });
    profiles.push({
      user_id: c.id,
      skills: [],
      portfolio_links: [],
      preferred_categories: [],
      company_name: c.name,
      company_description: c.desc,
      location: null,
    });
  }

  const seekers = [
    { id: "u_priya", name: "Priya Sharma", headline: "Final-year B.Com student", location: "Bengaluru", skills: ["Excel", "Communication", "Data entry"] },
    { id: "u_arjun", name: "Arjun Mehta", headline: "Photographer & video editor", location: "Bengaluru", skills: ["Photography", "Lightroom", "Premiere Pro"] },
    { id: "u_neha", name: "Neha Iyer", headline: "Operations & admin · 2 years", location: "Bengaluru", skills: ["Scheduling", "Excel", "Customer service"] },
  ];
  for (const [i, s] of seekers.entries()) {
    users.push({
      id: s.id,
      full_name: s.name,
      username: s.name.split(" ")[0].toLowerCase() + "_" + s.name.split(" ")[1].toLowerCase(),
      email: `${s.name.split(" ")[0].toLowerCase()}@example.com`,
      phone: null,
      roles: ["seeker"],
      onboarded: true,
      created_at: hoursAgo(24 * (20 + i)),
      password: null,
    });
    profiles.push({
      user_id: s.id,
      headline: s.headline,
      location: s.location,
      skills: s.skills,
      portfolio_links: [],
      availability: "PART_TIME",
      preferred_categories: [],
    });
  }

  const company = (id: string) => companies.find((c) => c.id === id)?.name ?? "Sidekick Demo Studio";
  const J = (j: Omit<DJob, "status" | "updated_at" | "company_name"> & { status?: "open" | "closed" }): DJob => ({
    ...j,
    status: j.status ?? "open",
    company_name: company(j.employer_id),
    updated_at: j.created_at,
  });

  const jobs: DJob[] = [
    J({
      id: "j_barista", employer_id: "u_brewline", title: "Barista — weekend shifts", category: "Food & Hospitality", job_type: "Part-time",
      experience_level: "Entry", hourly_rate: 180, location_name: "Indiranagar, Bengaluru", is_remote: false, lat: 12.9784, lng: 77.6408,
      working_hours: "Sat–Sun, 8 am – 2 pm", skills_required: "Customer service, Coffee preparation, Cash handling",
      description: "Join our Indiranagar bar for weekend morning shifts. You'll prepare espresso drinks, keep the bar spotless and give every guest a warm welcome. Full barista training is provided — no prior coffee experience needed.",
      responsibilities: "Prepare coffee and tea to our recipes\nHandle orders and payments\nKeep the bar clean and stocked",
      benefits: "Free drinks on shift\nPaid training\nFlexible swaps", created_at: hoursAgo(5), deadline: daysAhead(14),
    }),
    J({
      id: "j_tutor", employer_id: "u_northstar", title: "Maths & Physics Tutor (Grades 9–12)", category: "Tutoring & Education", job_type: "Part-time",
      experience_level: "Intermediate", hourly_rate: 450, location_name: "Remote", is_remote: true,
      working_hours: "Weekday evenings, 6–9 pm", skills_required: "Mathematics, Physics, Teaching",
      description: "Teach small online batches of CBSE students preparing for board exams. We provide lesson plans and practice material; you bring clear explanations and patience.",
      responsibilities: "Run 1-hour live sessions\nReview homework and give feedback\nShare monthly progress notes with parents",
      benefits: "Fully remote\nCurriculum provided\nPerformance bonus", created_at: hoursAgo(9), deadline: daysAhead(21),
    }),
    J({
      id: "j_delivery", employer_id: "u_swiftdrop", title: "Delivery Partner — evening slots", category: "Delivery & Logistics", job_type: "Part-time",
      experience_level: "Entry", hourly_rate: 160, location_name: "Andheri, Mumbai", is_remote: false, lat: 19.1136, lng: 72.8697,
      working_hours: "Choose 4-hour slots, 5–11 pm", skills_required: "Two-wheeler licence, Navigation, Time management",
      description: "Deliver parcels within Andheri and nearby areas during evening slots. Pick your own schedule each week in the partner app.",
      responsibilities: "Collect parcels from the hub\nDeliver on time with proof of delivery\nKeep customers updated",
      benefits: "Weekly payouts\nFuel allowance\nAccident insurance", created_at: hoursAgo(14),
    }),
    J({
      id: "j_ui", employer_id: "u_pixelcraft", title: "Junior UI Designer (contract)", category: "Design & Creative", job_type: "Contract",
      experience_level: "Intermediate", hourly_rate: 650, location_name: "Remote", is_remote: true,
      working_hours: "~20 hours a week", skills_required: "Figma, UI design, Prototyping",
      description: "Help our team design web and mobile screens for early-stage startups. You'll work from existing design systems and present your work in weekly reviews.",
      responsibilities: "Design screens and flows in Figma\nBuild clickable prototypes\nPrepare clean hand-off files",
      benefits: "Remote\nMentorship from senior designers\nPortfolio-ready projects", created_at: hoursAgo(20), deadline: daysAhead(10),
    }),
    J({
      id: "j_retail", employer_id: "u_urban", title: "Retail Sales Associate", category: "Retail & Sales", job_type: "Part-time",
      experience_level: "Entry", hourly_rate: 170, location_name: "Koregaon Park, Pune", is_remote: false, lat: 18.5362, lng: 73.8939,
      working_hours: "Fri–Sun, flexible shifts", skills_required: "Sales, Customer service, Visual merchandising",
      description: "Help shoppers find the right fit, keep the floor looking sharp and run the billing counter during busy weekends.",
      responsibilities: "Assist customers on the floor\nMaintain displays\nProcess billing and returns",
      benefits: "Staff discount\nSales incentives", created_at: hoursAgo(30),
    }),
    J({
      id: "j_frontend", employer_id: "u_helio", title: "Frontend Developer Intern (React)", category: "Software & IT", job_type: "Internship",
      experience_level: "Entry", hourly_rate: 350, location_name: "Koramangala, Bengaluru", is_remote: false, lat: 12.9352, lng: 77.6245,
      working_hours: "Mon–Fri, 4 hours a day", skills_required: "React, TypeScript, CSS",
      description: "Build real features in our customer dashboard alongside senior engineers. Ideal for students who have built a couple of React projects and want production experience.",
      responsibilities: "Implement UI components\nWrite tests for your code\nJoin code reviews",
      benefits: "Certificate and recommendation\nPre-placement offer for top interns", created_at: hoursAgo(40), deadline: daysAhead(18),
    }),
    J({
      id: "j_clinic", employer_id: "u_carewell", title: "Clinic Front Desk Assistant", category: "Healthcare & Care", job_type: "Part-time",
      experience_level: "Entry", hourly_rate: 200, location_name: "Adyar, Chennai", is_remote: false, lat: 13.0012, lng: 80.2565,
      working_hours: "Mornings, 8 am – 1 pm", skills_required: "Scheduling, Communication, MS Office",
      description: "Be the first point of contact for patients: manage appointments, answer calls and keep records up to date.",
      responsibilities: "Schedule appointments\nRegister new patients\nAnswer phone queries",
      benefits: "Health check-ups for staff\nPredictable hours", created_at: hoursAgo(52),
    }),
    J({
      id: "j_events", employer_id: "u_eventsphere", title: "Event Promoter — music festival", category: "Events & Promotions", job_type: "Temporary",
      experience_level: "Entry", hourly_rate: 220, location_name: "Connaught Place, Delhi", is_remote: false, lat: 28.6315, lng: 77.2167,
      working_hours: "Two weekends, 10 am – 6 pm", skills_required: "Communication, Promotions, Crowd engagement",
      description: "Promote our winter music festival at malls and colleges across central Delhi. Energetic people who love talking to crowds will thrive.",
      responsibilities: "Run promotion stalls\nShare offers and collect sign-ups\nReport daily numbers",
      benefits: "Festival passes\nDaily meals", created_at: hoursAgo(70), deadline: daysAhead(7),
    }),
    J({
      id: "j_content", employer_id: "u_pixelcraft", title: "Social Media Content Writer", category: "Marketing & Content", job_type: "Freelance",
      experience_level: "Intermediate", hourly_rate: 400, location_name: "Remote", is_remote: true,
      working_hours: "Flexible, ~10 hours a week", skills_required: "Copywriting, Instagram, Content planning",
      description: "Write captions, carousels and short scripts for our clients' Instagram and LinkedIn pages. You'll work from a monthly content calendar.",
      responsibilities: "Draft weekly posts\nResearch trends\nCollaborate with designers",
      benefits: "Remote\nFlexible hours", created_at: hoursAgo(90),
    }),
    J({
      id: "j_support", employer_id: "u_helio", title: "Customer Support Associate (chat)", category: "Customer Support", job_type: "Part-time",
      experience_level: "Entry", hourly_rate: 210, location_name: "Hitech City, Hyderabad", is_remote: false, lat: 17.4435, lng: 78.3772,
      working_hours: "Evening shift, 5–10 pm", skills_required: "Written English, Zendesk, Problem solving",
      description: "Answer customer questions over chat and email, troubleshoot common issues and escalate bugs to the product team.",
      responsibilities: "Resolve chat tickets\nDocument common issues\nEscalate bugs with clear notes",
      benefits: "Paid training\nNight-shift allowance", created_at: hoursAgo(110),
    }),
    J({
      id: "j_ops", employer_id: demoId, title: "Operations Assistant", category: "Administrative", job_type: "Part-time",
      experience_level: "Entry", hourly_rate: 230, location_name: "HSR Layout, Bengaluru", is_remote: false, lat: 12.9116, lng: 77.6474,
      working_hours: "Weekdays, 10 am – 2 pm", skills_required: "Excel, Organisation, Communication",
      description: "Keep our studio running smoothly: manage schedules, track supplies and keep client records organised in spreadsheets.",
      responsibilities: "Maintain project schedules\nTrack invoices and supplies\nCoordinate with freelancers",
      benefits: "Flexible hours\nLearning budget", created_at: hoursAgo(26), deadline: daysAhead(12),
    }),
    J({
      id: "j_photo", employer_id: demoId, title: "Weekend Event Photographer", category: "Design & Creative", job_type: "Freelance",
      experience_level: "Intermediate", hourly_rate: 500, location_name: "Jayanagar, Bengaluru", is_remote: false, lat: 12.925, lng: 77.5938,
      working_hours: "Saturdays, 4–6 hours", skills_required: "Photography, Lightroom, Editing",
      description: "Photograph product launches and studio events, then deliver an edited gallery within 48 hours.",
      responsibilities: "Shoot events on location\nEdit and deliver galleries\nBack up all raw files",
      benefits: "Credit on published work\nRepeat bookings", created_at: hoursAgo(60),
    }),
  ];

  const applications: DApplication[] = [
    {
      id: "a_priya_ops", job_id: "j_ops", applicant_id: "u_priya", employer_id: demoId, status: "pending",
      cover_letter: "I'm a final-year B.Com student who manages my college fest's budget sheets. I'm very comfortable with Excel and can work weekday mornings.",
      expected_rate: 230, availability: "Weekdays, mornings", phone: "+919811111111", created_at: hoursAgo(6), updated_at: hoursAgo(6),
    },
    {
      id: "a_neha_ops", job_id: "j_ops", applicant_id: "u_neha", employer_id: demoId, status: "reviewing",
      cover_letter: "I've spent two years coordinating schedules and vendors for a design agency. Happy to start next week and can share references.",
      expected_rate: 250, availability: "Weekdays", phone: "+919822222222", created_at: hoursAgo(18), updated_at: hoursAgo(10),
    },
    {
      id: "a_arjun_photo", job_id: "j_photo", applicant_id: "u_arjun", employer_id: demoId, status: "shortlisted",
      cover_letter: "I shoot product and event photography and deliver edited galleries within a day. Portfolio link included — happy to do a short test shoot.",
      expected_rate: 520, availability: "Saturdays", portfolio_links: "https://example.com/arjun-portfolio", phone: "+919833333333",
      created_at: hoursAgo(40), updated_at: hoursAgo(20),
    },
    {
      id: "a_demo_ui", job_id: "j_ui", applicant_id: demoId, employer_id: "u_pixelcraft", status: "reviewing",
      cover_letter: "I design product screens in Figma and build them in React, so my hand-off files are developer-friendly. I'd love to help your startup clients.",
      expected_rate: 650, availability: "~20 hours a week", created_at: hoursAgo(15), updated_at: hoursAgo(8),
    },
  ];

  return {
    version: 1,
    seeded_at: nowIso(),
    users,
    profiles,
    jobs,
    applications,
    saved: [{ user_id: demoId, job_id: "j_frontend", created_at: hoursAgo(12) }],
    notifications: [
      { id: uid("n_"), user_id: demoId, type: "application_received", title: "New application for “Operations Assistant”", body: "Priya Sharma applied.", link: "/employer/applicants?job=j_ops", is_read: false, created_at: hoursAgo(6) },
      { id: uid("n_"), user_id: demoId, type: "application_reviewing", title: "Your application for “Junior UI Designer (contract)” is being reviewed", body: "Pixelcraft Studio updated your application status.", link: "/applications", is_read: false, created_at: hoursAgo(8) },
      { id: uid("n_"), user_id: demoId, type: "application_received", title: "New application for “Operations Assistant”", body: "Neha Iyer applied.", link: "/employer/applicants?job=j_ops", is_read: true, created_at: hoursAgo(18) },
    ],
    messages: [
      { id: uid("m_"), application_id: "a_arjun_photo", sender_id: "u_arjun", recipient_id: demoId, body: "Hi! Thanks for shortlisting me. I'm free for a short test shoot this Saturday if that helps.", created_at: hoursAgo(19), read_at: null },
    ],
    sessions: [],
  };
}
