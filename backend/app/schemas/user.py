from enum import Enum
from pydantic import BaseModel, EmailStr

class RoleEnum(str, Enum):
    developer = "developer"
    employer = "employer"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: RoleEnum

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
