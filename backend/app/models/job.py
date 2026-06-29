import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Enum, Text, Integer, Float, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
import uuid

class JobStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class ApplicationStatusEnum(str, enum.Enum):
    APPLIED = "APPLIED"
    INTERVIEW = "INTERVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, index=True)
    salary_min = Column(Float)
    salary_max = Column(Float)
    location = Column(String)
    remote = Column(Boolean, default=False)
    status = Column(Enum(JobStatusEnum), default=JobStatusEnum.OPEN)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    worker_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.APPLIED)
    ai_match_score = Column(Integer)
    cover_letter = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
