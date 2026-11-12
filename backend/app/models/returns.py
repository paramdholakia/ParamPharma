from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base

class SalesReturn(Base):
    __tablename__ = "sales_returns"

    id = Column(Integer, primary_key=True, index=True)
    return_number = Column(String(50), unique=True, index=True, nullable=False)
    return_date = Column(Date, default=date.today, nullable=False, index=True)
    original_invoice_id = Column(Integer, ForeignKey("sales_invoices.id"), nullable=True)
    original_invoice_number = Column(String(50), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    customer_name = Column(String(150), nullable=False)
    credit_note_number = Column(String(50), unique=True, index=True, nullable=False)
    total_taxable_amount = Column(Float, default=0.0, nullable=False)
    total_gst_amount = Column(Float, default=0.0, nullable=False)
    total_return_amount = Column(Float, default=0.0, nullable=False)
    status = Column(String(30), default="Pending Inspection", nullable=False)  # Pending Inspection, Approved, Rejected
    return_reason = Column(String(100), default="Expired / Damaged", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer")
    invoice = relationship("SalesInvoice")
    items = relationship("SalesReturnItem", back_populates="sales_return", cascade="all, delete-orphan")


class SalesReturnItem(Base):
    __tablename__ = "sales_return_items"

    id = Column(Integer, primary_key=True, index=True)
    return_id = Column(Integer, ForeignKey("sales_returns.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=False)
    product_name = Column(String(200), nullable=False)
    batch_number = Column(String(50), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    rate = Column(Float, default=0.0, nullable=False)
    gst_rate = Column(Float, default=12.0, nullable=False)
    taxable_amount = Column(Float, default=0.0, nullable=False)
    gst_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    condition = Column(String(50), default="Damaged", nullable=False)  # Sellable, Damaged, Expired
    approved_to_stock = Column(Boolean, default=False, nullable=False)  # Must be inspected before re-entering sellable stock

    sales_return = relationship("SalesReturn", back_populates="items")
    product = relationship("Product")
    batch = relationship("ProductBatch")


class PurchaseReturn(Base):
    __tablename__ = "purchase_returns"

    id = Column(Integer, primary_key=True, index=True)
    return_number = Column(String(50), unique=True, index=True, nullable=False)
    return_date = Column(Date, default=date.today, nullable=False, index=True)
    original_purchase_id = Column(Integer, ForeignKey("purchase_invoices.id"), nullable=True)
    original_purchase_number = Column(String(50), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    supplier_name = Column(String(150), nullable=False)
    debit_note_number = Column(String(50), unique=True, index=True, nullable=False)
    total_taxable_amount = Column(Float, default=0.0, nullable=False)
    total_gst_amount = Column(Float, default=0.0, nullable=False)
    total_return_amount = Column(Float, default=0.0, nullable=False)
    status = Column(String(30), default="Finalized", nullable=False)  # Draft, Finalized
    return_reason = Column(String(100), default="Expired / Damaged Return to Manufacturer", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    supplier = relationship("Supplier")
    purchase = relationship("PurchaseInvoice")
    items = relationship("PurchaseReturnItem", back_populates="purchase_return", cascade="all, delete-orphan")


class PurchaseReturnItem(Base):
    __tablename__ = "purchase_return_items"

    id = Column(Integer, primary_key=True, index=True)
    return_id = Column(Integer, ForeignKey("purchase_returns.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=False)
    product_name = Column(String(200), nullable=False)
    batch_number = Column(String(50), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    rate = Column(Float, default=0.0, nullable=False)
    gst_rate = Column(Float, default=12.0, nullable=False)
    taxable_amount = Column(Float, default=0.0, nullable=False)
    gst_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    condition = Column(String(50), default="Damaged", nullable=False)  # Damaged, Expired, Excess, Other

    purchase_return = relationship("PurchaseReturn", back_populates="items")
    product = relationship("Product")
    batch = relationship("ProductBatch")
