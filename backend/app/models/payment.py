from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base

class CustomerPayment(Base):
    __tablename__ = "customer_payments"

    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(50), unique=True, index=True, nullable=False)
    payment_date = Column(Date, default=date.today, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    customer_name = Column(String(150), nullable=False)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), default="Cash", nullable=False)  # Cash, Bank Transfer, UPI, Cheque, Other
    reference_no = Column(String(100), nullable=True)  # UTR / Cheque No / UPI Ref
    bank_name = Column(String(100), nullable=True)
    cheque_date = Column(Date, nullable=True)
    invoice_id = Column(Integer, ForeignKey("sales_invoices.id"), nullable=True)  # Optional specific invoice allocation
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer")
    invoice = relationship("SalesInvoice")

    __table_args__ = (
        Index("idx_cust_pay_search", "payment_date", "customer_id"),
    )


class SupplierPayment(Base):
    __tablename__ = "supplier_payments"

    id = Column(Integer, primary_key=True, index=True)
    voucher_number = Column(String(50), unique=True, index=True, nullable=False)
    payment_date = Column(Date, default=date.today, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    supplier_name = Column(String(150), nullable=False)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), default="Bank Transfer", nullable=False)  # Cash, Bank Transfer, UPI, Cheque, Other
    reference_no = Column(String(100), nullable=True)
    bank_name = Column(String(100), nullable=True)
    cheque_date = Column(Date, nullable=True)
    purchase_id = Column(Integer, ForeignKey("purchase_invoices.id"), nullable=True)  # Optional specific purchase allocation
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    supplier = relationship("Supplier")
    purchase = relationship("PurchaseInvoice")

    __table_args__ = (
        Index("idx_supp_pay_search", "payment_date", "supplier_id"),
    )
