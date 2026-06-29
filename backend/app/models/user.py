import enum
from sqlalchemy import Column, String, Enum, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base import Base

class RoleEnum(str, enum.Enum):
    WORKER = "WORKER"
    EMPLOYER = "EMPLOYER"
    ADMIN = "ADMIN"

class AuthProviderEnum(str, enum.Enum):
    EMAIL = "EMAIL"
    GOOGLE = "GOOGLE"
    PHONE = "PHONE"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    role = Column(Enum(RoleEnum), nullable=False)
    auth_provider = Column(Enum(AuthProviderEnum), default=AuthProviderEnum.EMAIL)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
