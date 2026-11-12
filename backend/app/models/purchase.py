from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base

class PurchaseInvoice(Base):
    __tablename__ = "purchase_invoices"

    id = Column(Integer, primary_key=True, index=True)
    purchase_entry_number = Column(String(50), unique=True, index=True, nullable=False)
    supplier_invoice_number = Column(String(100), nullable=False, index=True)
    purchase_date = Column(Date, default=date.today, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    supplier_name = Column(String(150), nullable=False)
    supplier_address = Column(Text, nullable=False)
    gstin = Column(String(15), nullable=True)
    dl_number = Column(String(50), nullable=True)
    pan = Column(String(10), nullable=True)
    state = Column(String(50), default="Gujarat", nullable=False)
    state_code = Column(String(10), default="24", nullable=False)
    is_interstate = Column(Boolean, default=False, nullable=False)
    payment_terms = Column(String(50), default="30 Days")
    due_date = Column(Date, nullable=True)
    
    # Financial breakdown
    total_gross_amount = Column(Float, default=0.0, nullable=False)
    total_discount_amount = Column(Float, default=0.0, nullable=False)
    total_taxable_amount = Column(Float, default=0.0, nullable=False)
    cgst_amount = Column(Float, default=0.0, nullable=False)
    sgst_amount = Column(Float, default=0.0, nullable=False)
    igst_amount = Column(Float, default=0.0, nullable=False)
    total_gst_amount = Column(Float, default=0.0, nullable=False)
    round_off = Column(Float, default=0.0, nullable=False)
    net_purchase_amount = Column(Float, default=0.0, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    balance_amount = Column(Float, default=0.0, nullable=False)
    
    payment_status = Column(String(20), default="Unpaid", nullable=False, index=True)  # Unpaid, Partial, Paid
    status = Column(String(20), default="Finalized", nullable=False, index=True)  # Draft, Finalized, Cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = relationship("Supplier")
    items = relationship("PurchaseInvoiceItem", back_populates="purchase", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_purchase_dup_check", "supplier_id", "supplier_invoice_number"),
        Index("idx_purchase_date_search", "purchase_date", "supplier_id", "status"),
    )


class PurchaseInvoiceItem(Base):
    __tablename__ = "purchase_invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchase_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=True, index=True)
    product_name = Column(String(200), nullable=False)
    hsn_code = Column(String(20), nullable=False)
    manufacturer = Column(String(150), nullable=False)
    packing = Column(String(50), nullable=False)
    batch_number = Column(String(50), nullable=False)
    mfg_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=False)
    mrp = Column(Float, default=0.0, nullable=False)
    purchase_rate = Column(Float, default=0.0, nullable=False)
    ptr = Column(Float, default=0.0, nullable=False)
    pts = Column(Float, default=0.0, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    free_quantity = Column(Integer, default=0, nullable=False)
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

    purchase = relationship("PurchaseInvoice", back_populates="items")
    product = relationship("Product")
    batch = relationship("ProductBatch")
