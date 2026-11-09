from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import Availability, Role


def _clean_list(values: Optional[List[str]], limit: int = 30) -> Optional[List[str]]:
    if values is None:
        return None
    seen, out = set(), []
    for v in values:
        v = (v or "").strip()
        if v and v.lower() not in seen:
            seen.add(v.lower())
            out.append(v[:60])
    return out[:limit]


def normalize_website(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = v.strip()
    if not v:
        return None
    if not v.lower().startswith(("http://", "https://")):
        if ":" in v.split("/")[0]:
            raise ValueError("Website must be an http:// or https:// address.")
        v = f"https://{v}"
    if " " in v or "." not in v:
        raise ValueError("Enter a valid website address.")
    return v


class ProfileUpdate(BaseModel):
    headline: Optional[str] = Field(default=None, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=2000)
    location: Optional[str] = Field(default=None, max_length=120)
    skills: Optional[List[str]] = None
    experience: Optional[str] = Field(default=None, max_length=4000)
    education: Optional[str] = Field(default=None, max_length=2000)
    portfolio_links: Optional[List[str]] = None
    availability: Optional[Availability] = None
    preferred_categories: Optional[List[str]] = None
    company_name: Optional[str] = Field(default=None, max_length=120)
    company_website: Optional[str] = Field(default=None, max_length=200)
    company_description: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("skills", "preferred_categories")
    @classmethod
    def _list(cls, v):
        return _clean_list(v)

    @field_validator("company_website")
    @classmethod
    def _website(cls, v):
        return normalize_website(v)

    @field_validator("portfolio_links")
    @classmethod
    def _links(cls, v):
        v = _clean_list(v, limit=10)
        if v:
            for link in v:
                if not link.startswith(("http://", "https://")):
                    raise ValueError("Portfolio links must start with http:// or https://")
        return v


class ProfileOut(BaseModel):
    user_id: str
    full_name: str
    username: str
    roles: List[Role] = []
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    experience: Optional[str] = None
    education: Optional[str] = None
    portfolio_links: List[str] = []
    availability: Optional[str] = None
    preferred_categories: List[str] = []
    avatar_url: Optional[str] = None
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    company_description: Optional[str] = None
    member_since: Optional[datetime] = None
