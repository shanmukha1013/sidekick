export type Role = "seeker" | "employer";

export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone?: string | null;
  roles: Role[];
  onboarded: boolean;
  created_at?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: User;
}

export interface Profile {
  user_id: string;
  full_name: string;
  username: string;
  roles: Role[];
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
  member_since?: string | null;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  responsibilities?: string | null;
  benefits?: string | null;
  category?: string | null;
  job_type?: string | null;
  experience_level?: string | null;
  hourly_rate: number;
  skills_required?: string | null;
  working_hours?: string | null;
  location_name?: string | null;
  is_remote: boolean;
  lat?: number | null;
  lng?: number | null;
  deadline?: string | null;
  status: "open" | "closed" | string;
  employer_id: string;
  company_name?: string | null;
  created_at: string;
  updated_at?: string | null;
  applicant_count?: number | null;
  is_saved?: boolean | null;
  has_applied?: boolean | null;
  is_owner?: boolean | null;
}

export interface JobList {
  items: Job[];
  total: number;
}

export interface JobMeta {
  categories: string[];
  job_types: string[];
  experience_levels: string[];
}

export type ApplicationStatus = "pending" | "reviewing" | "shortlisted" | "accepted" | "rejected" | "withdrawn";

export interface ApplicantSummary {
  id: string;
  full_name: string;
  username: string;
  email?: string | null;
  headline?: string | null;
  location?: string | null;
  skills: string[];
  avatar_url?: string | null;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  employer_id?: string | null;
  cover_letter?: string | null;
  expected_rate?: number | null;
  availability?: string | null;
  portfolio_links?: string | null;
  phone?: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at?: string | null;
  job?: Job | null;
  applicant?: ApplicantSummary | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  application_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
}

export interface Thread {
  application_id: string;
  job_id: string;
  job_title: string;
  counterpart_id: string;
  counterpart_name: string;
  counterpart_avatar?: string | null;
  my_side: "applicant" | "employer";
  application_status: ApplicationStatus;
  last_message?: Message | null;
  unread_count: number;
  updated_at: string;
}

export const JOB_CATEGORIES = [
  "Retail & Sales",
  "Food & Hospitality",
  "Tutoring & Education",
  "Delivery & Logistics",
  "Customer Support",
  "Software & IT",
  "Design & Creative",
  "Marketing & Content",
  "Administrative",
  "Events & Promotions",
  "Healthcare & Care",
  "Other",
] as const;

export const JOB_TYPES = ["Part-time", "Full-time", "Internship", "Contract", "Freelance", "Temporary"] as const;
export const EXPERIENCE_LEVELS = ["Entry", "Intermediate", "Expert"] as const;

export const AVAILABILITY_LABELS: Record<string, string> = {
  PART_TIME: "Part-time",
  FULL_TIME: "Full-time",
  WEEKENDS: "Weekends",
  FLEXIBLE: "Flexible",
};
