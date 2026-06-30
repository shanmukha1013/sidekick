from app.db.base_class import Base

# Import all models here so they are registered with Base.metadata
from app.models.user import User
from app.models.profile import WorkerProfile, EmployerProfile
from app.models.job import Job, Application, Notification, SavedJob
from app.models.wallet import Wallet, Transaction
from app.models.communication import Message, Review
