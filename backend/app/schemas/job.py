from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import EmployerSettableStatus, ExperienceLevel, JobCategory, JobStatus, JobType


class JobBase(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=20, max_length=8000)
    responsibilities: Optional[str] = Field(default=None, max_length=4000)
    benefits: Optional[str] = Field(default=None, max_length=4000)
    category: JobCategory = "Other"
    job_type: JobType = "Part-time"
    experience_level: ExperienceLevel = "Entry"
    hourly_rate: float = Field(gt=0, le=100000)
    skills_required: Optional[str] = Field(default=None, max_length=500)
    working_hours: Optional[str] = Field(default=None, max_length=120)
    location_name: Optional[str] = Field(default=None, max_length=120)
    is_remote: bool = False
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    deadline: Optional[datetime] = None

    @field_validator("title", "description")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def _location(self):
        if not self.is_remote and not (self.location_name or "").strip():
            raise ValueError("Location is required for on-site jobs.")
        return self


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=120)
    description: Optional[str] = Field(default=None, min_length=20, max_length=8000)
    responsibilities: Optional[str] = Field(default=None, max_length=4000)
    benefits: Optional[str] = Field(default=None, max_length=4000)
    category: Optional[JobCategory] = None
    job_type: Optional[JobType] = None
    experience_level: Optional[ExperienceLevel] = None
    hourly_rate: Optional[float] = Field(default=None, gt=0, le=100000)
    skills_required: Optional[str] = Field(default=None, max_length=500)
    working_hours: Optional[str] = Field(default=None, max_length=120)
    location_name: Optional[str] = Field(default=None, max_length=120)
    is_remote: Optional[bool] = None
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    deadline: Optional[datetime] = None
    status: Optional[JobStatus] = None


class JobOut(BaseModel):
    id: str
    title: str
    description: str
    responsibilities: Optional[str] = None
    benefits: Optional[str] = None
    category: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    hourly_rate: float
    skills_required: Optional[str] = None
    working_hours: Optional[str] = None
    location_name: Optional[str] = None
    is_remote: bool = False
    lat: Optional[float] = None
    lng: Optional[float] = None
    deadline: Optional[datetime] = None
    status: str = "open"
    employer_id: str
    company_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Viewer-specific / aggregate fields (only populated where relevant)
    applicant_count: Optional[int] = None
    is_saved: Optional[bool] = None
    has_applied: Optional[bool] = None
    is_owner: Optional[bool] = None


class JobList(BaseModel):
    items: List[JobOut]
    total: int


class ApplicationCreate(BaseModel):
    cover_letter: str = Field(min_length=20, max_length=5000)
    expected_rate: Optional[float] = Field(default=None, gt=0, le=100000)
    availability: Optional[str] = Field(default=None, max_length=200)
    portfolio_links: Optional[str] = Field(default=None, max_length=500)
    phone: Optional[str] = Field(default=None, max_length=20)


class ApplicationStatusUpdate(BaseModel):
    status: EmployerSettableStatus


class ApplicantSummary(BaseModel):
    id: str
    full_name: str
    username: str
    email: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    avatar_url: Optional[str] = None


class ApplicationOut(BaseModel):
    id: str
    job_id: str
    applicant_id: str
    employer_id: Optional[str] = None
    cover_letter: Optional[str] = None
    expected_rate: Optional[float] = None
    availability: Optional[str] = None
    portfolio_links: Optional[str] = None
    phone: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    job: Optional[JobOut] = None
    applicant: Optional[ApplicantSummary] = None


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool = False
    created_at: datetime


class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)

    @field_validator("body")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty.")
        return v


class MessageOut(BaseModel):
    id: str
    application_id: str
    sender_id: str
    body: str
    created_at: datetime
    read_at: Optional[datetime] = None


class ThreadOut(BaseModel):
    application_id: str
    job_id: str
    job_title: str
    counterpart_id: str
    counterpart_name: str
    counterpart_avatar: Optional[str] = None
    my_side: str  # "applicant" | "employer"
    application_status: str
    last_message: Optional[MessageOut] = None
    unread_count: int = 0
    updated_at: datetime
