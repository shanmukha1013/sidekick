from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JobBase(BaseModel):
    title: str
    description: str
    responsibilities: Optional[str] = None
    benefits: Optional[str] = None
    hourly_rate: float
    job_type: Optional[str] = "Part-time"
    experience_level: Optional[str] = "Entry"
    skills_required: Optional[str] = None
    working_hours: Optional[str] = None
    location_name: Optional[str] = None
    is_remote: Optional[bool] = False
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = "open"
    deadline: Optional[datetime] = None

class JobCreate(JobBase):
    pass

class JobInDB(JobBase):
    id: str
    employer_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationCreate(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None
    expected_salary: Optional[float] = None
    portfolio_links: Optional[str] = None
    availability: Optional[str] = None
    phone: Optional[str] = None

class ApplicationInDB(BaseModel):
    id: str
    job_id: str
    applicant_id: str
    cover_letter: Optional[str] = None
    expected_salary: Optional[float] = None
    portfolio_links: Optional[str] = None
    availability: Optional[str] = None
    phone: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationWithDetails(ApplicationInDB):
    job_title: Optional[str] = None
    job_location: Optional[str] = None
    applicant_name: Optional[str] = None
    applicant_avatar: Optional[str] = None
    applicant_skills: Optional[str] = None
    applicant_bio: Optional[str] = None

class NotificationInDB(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    body: Optional[str] = None
    is_read: bool
    related_job_id: Optional[str] = None
    related_application_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
