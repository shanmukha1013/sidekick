import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.common import Role
from app.schemas.profile import normalize_website

USERNAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$")
PHONE_RE = re.compile(r"^\+?[0-9]{10,15}$")


def normalize_phone(value: str) -> str:
    cleaned = re.sub(r"[\s\-().]", "", value or "")
    if not PHONE_RE.match(cleaned):
        raise ValueError("Enter a valid phone number (10–15 digits, optional leading +).")
    return cleaned


def validate_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 characters.")
    if not re.search(r"[A-Za-z]", value) or not re.search(r"[0-9]", value):
        raise ValueError("Password must contain at least one letter and one number.")
    return value


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=80)
    username: str
    email: EmailStr
    phone: str
    password: str

    @field_validator("full_name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return v

    @field_validator("username")
    @classmethod
    def _username(cls, v: str) -> str:
        v = v.strip().lower()
        if not USERNAME_RE.match(v) or ".." in v:
            raise ValueError(
                "Username must be 3–30 characters: letters, numbers, dots or underscores, "
                "starting and ending with a letter or number."
            )
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password_strength(v)


class UserLogin(BaseModel):
    """Login with either email or username in `identifier`. `username` is accepted for older clients."""

    identifier: Optional[str] = None
    username: Optional[str] = None
    password: str = Field(min_length=1)

    @model_validator(mode="after")
    def _require_identifier(self):
        ident = (self.identifier or self.username or "").strip()
        if not ident:
            raise ValueError("Enter your email or username.")
        self.identifier = ident
        return self


class UserOut(BaseModel):
    id: str
    full_name: str
    username: str
    email: str
    phone: Optional[str] = None
    roles: List[Role] = []
    onboarded: bool = False
    created_at: Optional[datetime] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserOut


class OnboardingIn(BaseModel):
    roles: List[Role] = Field(min_length=1)
    headline: Optional[str] = Field(default=None, max_length=120)
    location: Optional[str] = Field(default=None, max_length=120)
    skills: Optional[List[str]] = None
    preferred_categories: Optional[List[str]] = None
    company_name: Optional[str] = Field(default=None, max_length=120)
    company_website: Optional[str] = Field(default=None, max_length=200)
    company_description: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("company_website")
    @classmethod
    def _website(cls, v: Optional[str]) -> Optional[str]:
        return normalize_website(v)

    @model_validator(mode="after")
    def _employer_needs_company(self):
        self.roles = sorted(set(self.roles))  # type: ignore[assignment]
        if "employer" in self.roles and not (self.company_name or "").strip():
            raise ValueError("Company or organization name is required to hire on Sidekick.")
        return self


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    phone: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: Optional[str]) -> Optional[str]:
        return normalize_phone(v) if v is not None else v


class RolesUpdate(BaseModel):
    roles: List[Role] = Field(min_length=1)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=10)
    password: str

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password_strength(v)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password_strength(v)
