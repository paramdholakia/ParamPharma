from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Index
from backend.app.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    supplier_code = Column(String(30), unique=True, index=True, nullable=False)
    supplier_name = Column(String(150), nullable=False, index=True)
    contact_person = Column(String(100), nullable=True)
    mobile = Column(String(20), nullable=False, index=True)
    email = Column(String(100), nullable=True)
    address = Column(Text, nullable=False)
    gstin = Column(String(15), nullable=True, index=True)
    pan = Column(String(10), nullable=True)
    dl_number = Column(String(50), nullable=True)
    state = Column(String(50), default="Gujarat", nullable=False)
    state_code = Column(String(10), default="24", nullable=False)
    city = Column(String(50), default="Ahmedabad", nullable=False)
    pincode = Column(String(10), nullable=True)
    opening_balance = Column(Float, default=0.0, nullable=False)
    current_balance = Column(Float, default=0.0, nullable=False)  # positive = payable to supplier
    credit_terms_days = Column(Integer, default=30, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_supplier_search", "supplier_name", "mobile", "gstin"),
    )
