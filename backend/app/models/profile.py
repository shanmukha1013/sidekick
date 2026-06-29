from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base
import enum

class AvailabilityEnum(str, enum.Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    WEEKENDS = "WEEKENDS"
    FREELANCE = "FREELANCE"

class WorkerProfile(Base):
    __tablename__ = "worker_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, index=True)
    bio = Column(Text)
    location = Column(String)
    skills = Column(JSONB)
    languages = Column(JSONB)
    experience = Column(Text)
    education = Column(Text)
    portfolio_links = Column(JSONB)
    availability = Column(Enum(AvailabilityEnum))
    resume_url = Column(String)
    avatar_url = Column(String)
    trust_score = Column(Float, default=0.0)

class EmployerProfile(Base):
    __tablename__ = "employer_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    company_name = Column(String, nullable=False)
    description = Column(Text)
    logo_url = Column(String)
    verified_badge = Column(Boolean, default=False)
    response_time = Column(String)
