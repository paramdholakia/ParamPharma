from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    expense_date = Column(Date, default=date.today, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False, index=True)
    category_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), default="Cash", nullable=False)  # Cash, Bank Transfer, UPI, Cheque, Other
    vendor_name = Column(String(150), nullable=True)
    reference_no = Column(String(100), nullable=True)
    bill_attachment = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    category = relationship("ExpenseCategory")

    __table_args__ = (
        Index("idx_expense_date_cat", "expense_date", "category_id"),
    )
