from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=False, index=True)
    movement_date = Column(Date, default=date.today, nullable=False, index=True)
    movement_type = Column(String(50), nullable=False)  # PURCHASE, PURCHASE_FREE, SALE, SALE_FREE, SALES_RETURN, PURCHASE_RETURN, ADJUSTMENT_IN, ADJUSTMENT_OUT
    reference_id = Column(Integer, nullable=True)
    reference_number = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)  # Positive for addition, negative for deduction
    batch_number = Column(String(50), nullable=False)
    balance_after = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product")
    batch = relationship("ProductBatch")

    __table_args__ = (
        Index("idx_stock_mov_date", "movement_date", "product_id", "batch_id"),
    )


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    adjustment_date = Column(Date, default=date.today, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=False, index=True)
    adjustment_type = Column(String(50), nullable=False)  # INCREASE, DECREASE, EXPIRED_SCRAP, DAMAGE_WRITE_OFF
    quantity = Column(Integer, nullable=False)
    previous_quantity = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    authorized_by = Column(String(100), default="Admin", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product")
    batch = relationship("ProductBatch")
