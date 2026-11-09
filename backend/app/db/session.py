from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=4000)
db = client[settings.DATABASE_NAME]

async def get_db():
    yield db
