from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base

class SalesInvoice(Base):
    __tablename__ = "sales_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    invoice_date = Column(Date, default=date.today, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    customer_name = Column(String(150), nullable=False)
    customer_category = Column(String(50), default="Chemist")
    billing_address = Column(Text, nullable=False)
    gstin = Column(String(15), nullable=True)
    dl_number = Column(String(50), nullable=True)
    pan = Column(String(10), nullable=True)
    state = Column(String(50), default="Gujarat", nullable=False)
    state_code = Column(String(10), default="24", nullable=False)
    place_of_supply = Column(String(50), default="Gujarat", nullable=False)
    is_interstate = Column(Boolean, default=False, nullable=False)
    payment_terms = Column(String(50), default="21 Days")
    due_date = Column(Date, nullable=True)
    salesperson = Column(String(100), nullable=True)
    
    # Financial breakdown
    total_gross_amount = Column(Float, default=0.0, nullable=False)
    total_discount_amount = Column(Float, default=0.0, nullable=False)
    total_taxable_amount = Column(Float, default=0.0, nullable=False)
    cgst_amount = Column(Float, default=0.0, nullable=False)
    sgst_amount = Column(Float, default=0.0, nullable=False)
    igst_amount = Column(Float, default=0.0, nullable=False)
    total_gst_amount = Column(Float, default=0.0, nullable=False)
    round_off = Column(Float, default=0.0, nullable=False)
    net_invoice_amount = Column(Float, default=0.0, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    balance_amount = Column(Float, default=0.0, nullable=False)
    
    payment_mode = Column(String(50), default="Credit", nullable=False)  # Cash, Credit, Bank Transfer, UPI, Cheque
    payment_status = Column(String(20), default="Unpaid", nullable=False, index=True)  # Unpaid, Partial, Paid
    status = Column(String(20), default="Finalized", nullable=False, index=True)  # Draft, Finalized, Cancelled
    cancellation_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    include_upi_qr = Column(Boolean, default=True, nullable=False)
    is_non_gst = Column(Boolean, default=False, nullable=False)
    upi_id = Column(String(100), default="aldholakia72-1@okaxis", nullable=True)
    created_by = Column(String(50), default="admin")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer")
    items = relationship("SalesInvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_sales_inv_search", "invoice_date", "customer_id", "status"),
    )


class SalesInvoiceItem(Base):
    __tablename__ = "sales_invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("sales_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=False, index=True)
    product_name = Column(String(200), nullable=False)
    hsn_code = Column(String(20), nullable=False)
    manufacturer = Column(String(150), nullable=False)
    packing = Column(String(50), nullable=False)
    batch_number = Column(String(50), nullable=False)
    expiry_date = Column(Date, nullable=False)
    mrp = Column(Float, default=0.0, nullable=False)
    ptr = Column(Float, default=0.0, nullable=False)
    pts = Column(Float, default=0.0, nullable=False)
    rate = Column(Float, default=0.0, nullable=False)  # Effective selling price per unit
    quantity = Column(Integer, default=1, nullable=False)
    free_quantity = Column(Integer, default=0, nullable=False)  # Scheme free units e.g. 10 + 1
    discount_percent = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    taxable_amount = Column(Float, default=0.0, nullable=False)
    gst_rate = Column(Float, default=12.0, nullable=False)
    cgst_rate = Column(Float, default=6.0, nullable=False)
    cgst_amount = Column(Float, default=0.0, nullable=False)
    sgst_rate = Column(Float, default=6.0, nullable=False)
    sgst_amount = Column(Float, default=0.0, nullable=False)
    igst_rate = Column(Float, default=0.0, nullable=False)
    igst_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)

    invoice = relationship("SalesInvoice", back_populates="items")
    product = relationship("Product")
    batch = relationship("ProductBatch")
