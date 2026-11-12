from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from backend.app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(100), default="admin", nullable=False)
    action_type = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE, CANCEL, ADJUST, LOGIN, BACKUP
    entity_type = Column(String(50), nullable=False)  # INVOICE, PURCHASE, PRODUCT, BATCH, CUSTOMER, SUPPLIER, PAYMENT, RETURN, EXPENSE
    entity_id = Column(String(50), nullable=True)
    description = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_audit_search", "action_time", "entity_type", "action_type"),
    )
