from pydantic import BaseModel
from typing import Optional, List, Dict
from enum import Enum

class AvailabilityEnum(str, Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    WEEKENDS = "WEEKENDS"
    FREELANCE = "FREELANCE"

class WorkerProfileBase(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    portfolio_links: Optional[List[str]] = None
    availability: Optional[AvailabilityEnum] = None
    resume_url: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None

class WorkerProfileUpdate(WorkerProfileBase):
    pass

class WorkerProfileResponse(WorkerProfileBase):
    user_id: str
    trust_score: float

    class Config:
        from_attributes = True
