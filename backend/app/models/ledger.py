from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base

class CustomerLedger(Base):
    __tablename__ = "customer_ledger"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    transaction_date = Column(Date, default=date.today, nullable=False, index=True)
    reference_type = Column(String(50), nullable=False)  # Invoice, Payment, Sales Return, Credit Note, Opening Balance
    reference_id = Column(Integer, nullable=True)
    reference_number = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    debit_amount = Column(Float, default=0.0, nullable=False)   # Increases customer debt (e.g. Invoice)
    credit_amount = Column(Float, default=0.0, nullable=False)  # Decreases customer debt (e.g. Payment/Return)
    running_balance = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer")

    __table_args__ = (
        Index("idx_cust_ledger_date", "customer_id", "transaction_date", "id"),
    )


class SupplierLedger(Base):
    __tablename__ = "supplier_ledger"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    transaction_date = Column(Date, default=date.today, nullable=False, index=True)
    reference_type = Column(String(50), nullable=False)  # Purchase, Payment, Purchase Return, Debit Note, Opening Balance
    reference_id = Column(Integer, nullable=True)
    reference_number = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    debit_amount = Column(Float, default=0.0, nullable=False)   # Decreases payable (e.g. Payment/Return)
    credit_amount = Column(Float, default=0.0, nullable=False)  # Increases payable (e.g. Purchase)
    running_balance = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    supplier = relationship("Supplier")

    __table_args__ = (
        Index("idx_supp_ledger_date", "supplier_id", "transaction_date", "id"),
    )
