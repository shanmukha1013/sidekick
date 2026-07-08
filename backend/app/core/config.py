from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sidekick API"
    API_V1_STR: str = "/api/v1"
    
    MONGODB_URL: str
    DATABASE_NAME: str = "sidekick"
    
    JWT_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    CLOUDINARY_URL: Optional[str] = None
    
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()
