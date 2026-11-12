from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Index
from backend.app.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String(30), unique=True, index=True, nullable=False)
    party_name = Column(String(150), nullable=False, index=True)
    customer_category = Column(String(50), default="Chemist", nullable=False)  # Chemist, Doctor, Medical Store, Retailer, Wholesaler, Distributor, Hospital, Clinic, Nursing Home, Other
    doctor_name = Column(String(100), nullable=True)
    store_name = Column(String(150), nullable=True)
    contact_person = Column(String(100), nullable=True)
    mobile = Column(String(20), nullable=False, index=True)
    alt_mobile = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    billing_address = Column(Text, nullable=False)
    shipping_address = Column(Text, nullable=True)
    gstin = Column(String(15), nullable=True, index=True)
    pan = Column(String(10), nullable=True)
    dl_number = Column(String(50), nullable=True)
    state = Column(String(50), default="Gujarat", nullable=False)
    state_code = Column(String(10), default="24", nullable=False)
    city = Column(String(50), default="Ahmedabad", nullable=False)
    pincode = Column(String(10), nullable=True)
    opening_balance = Column(Float, default=0.0, nullable=False)
    current_balance = Column(Float, default=0.0, nullable=False)  # positive = receivable from customer
    credit_limit = Column(Float, default=50000.0, nullable=False)
    payment_terms_days = Column(Integer, default=21, nullable=False)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_customer_search", "party_name", "mobile", "gstin"),
    )
