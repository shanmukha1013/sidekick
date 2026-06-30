from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sidekick API"
    API_V1_STR: str = "/api/v1"
    
    MONGODB_URL: str = "mongodb+srv://sidekick:sidekick10@cluster0.dzplpsn.mongodb.net/?appName=Cluster0"
    DATABASE_NAME: str = "sidekick"
    
    class Config:
        env_file = ".env"

settings = Settings()
