from enum import Enum
from pydantic import BaseModel, EmailStr

class RoleEnum(str, Enum):
    WORKER = "WORKER"
    EMPLOYER = "EMPLOYER"

class UserCreate(BaseModel):
    username: str
    phone_number: str
    email: EmailStr
    role: RoleEnum

class UserLogin(BaseModel):
    username: str
    phone_number: str
    email: EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str
