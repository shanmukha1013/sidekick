import enum
from sqlalchemy import Column, String, Float, ForeignKey, Enum, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
import uuid

class TransactionTypeEnum(str, enum.Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    ESCROW = "ESCROW"
    PAYMENT = "PAYMENT"

class TransactionStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Wallet(Base):
    __tablename__ = "wallets"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    balance = Column(Float, default=0.0)
    pending_clearance = Column(Float, default=0.0)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.user_id"), nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(Enum(TransactionTypeEnum), nullable=False)
    status = Column(Enum(TransactionStatusEnum), default=TransactionStatusEnum.PENDING)
    razorpay_id = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
