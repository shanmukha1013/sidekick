from enum import Enum
from pydantic import BaseModel, EmailStr

class RoleEnum(str, Enum):
    WORKER = "WORKER"
    EMPLOYER = "EMPLOYER"

class UserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr
    phone_number: str
    role: RoleEnum

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
