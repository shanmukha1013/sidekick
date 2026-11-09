from typing import Literal

ROLE_SEEKER = "seeker"
ROLE_EMPLOYER = "employer"
Role = Literal["seeker", "employer"]

JOB_CATEGORIES = [
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
]
JobCategory = Literal[
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
]

JOB_TYPES = ["Part-time", "Full-time", "Internship", "Contract", "Freelance", "Temporary"]
JobType = Literal["Part-time", "Full-time", "Internship", "Contract", "Freelance", "Temporary"]

EXPERIENCE_LEVELS = ["Entry", "Intermediate", "Expert"]
ExperienceLevel = Literal["Entry", "Intermediate", "Expert"]

JobStatus = Literal["open", "closed"]

APPLICATION_STATUSES = ["pending", "reviewing", "shortlisted", "accepted", "rejected", "withdrawn"]
EmployerSettableStatus = Literal["reviewing", "shortlisted", "accepted", "rejected"]

AVAILABILITY_OPTIONS = ["PART_TIME", "FULL_TIME", "WEEKENDS", "FLEXIBLE"]
Availability = Literal["PART_TIME", "FULL_TIME", "WEEKENDS", "FLEXIBLE"]
