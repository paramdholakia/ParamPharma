from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(30), unique=True, index=True, nullable=False)
    medicine_name = Column(String(200), nullable=False, index=True)
    generic_name = Column(String(200), nullable=True, index=True)
    brand_name = Column(String(150), nullable=True)
    manufacturer = Column(String(150), nullable=False, index=True)
    hsn_code = Column(String(20), default="30049099", nullable=False, index=True)
    packing = Column(String(50), default="10x10 Tablets", nullable=False)
    unit = Column(String(20), default="BOX", nullable=False)  # STRIP, BOX, BOTTLE, VIAL, AMP, TUBE
    mrp = Column(Float, default=0.0, nullable=False)
    ptr = Column(Float, default=0.0, nullable=False)  # Price to Retailer
    pts = Column(Float, default=0.0, nullable=False)  # Price to Stockist
    gst_rate = Column(Float, default=12.0, nullable=False)  # 5.0, 12.0, 18.0
    min_stock_level = Column(Integer, default=10, nullable=False)
    reorder_level = Column(Integer, default=20, nullable=False)
    product_description = Column(Text, nullable=True)
    status = Column(String(20), default="Active", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batches = relationship("ProductBatch", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_product_search", "medicine_name", "generic_name", "manufacturer"),
    )


class ProductBatch(Base):
    __tablename__ = "product_batches"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_number = Column(String(50), nullable=False, index=True)
    mfg_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=False, index=True)  # Key for FEFO sorting
    purchase_rate = Column(Float, default=0.0, nullable=False)
    mrp = Column(Float, default=0.0, nullable=False)
    ptr = Column(Float, default=0.0, nullable=False)
    pts = Column(Float, default=0.0, nullable=False)
    gst_rate = Column(Float, default=12.0, nullable=False)
    
    opening_stock = Column(Integer, default=0, nullable=False)
    purchased_qty = Column(Integer, default=0, nullable=False)
    free_purchased_qty = Column(Integer, default=0, nullable=False)
    sold_qty = Column(Integer, default=0, nullable=False)
    free_sold_qty = Column(Integer, default=0, nullable=False)
    returned_customer_qty = Column(Integer, default=0, nullable=False)
    returned_supplier_qty = Column(Integer, default=0, nullable=False)
    available_qty = Column(Integer, default=0, nullable=False, index=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="batches")

    __table_args__ = (
        Index("idx_batch_product_fefo", "product_id", "expiry_date", "available_qty"),
        Index("idx_batch_unique_per_prod", "product_id", "batch_number"),
    )
