from typing import Any
from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import all models here so they are registered with Base.metadata
from app.models.user import User
from app.models.profile import WorkerProfile, EmployerProfile
from app.models.job import Job, Application
from app.models.wallet import Wallet, Transaction
from app.models.communication import Message, Review
