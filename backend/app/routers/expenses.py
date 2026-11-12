from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.expense import Expense, ExpenseCategory

router = APIRouter(prefix="/api/expenses", tags=["Business Expense Management"])

class ExpenseCategoryCreateSchema(BaseModel):
    name: str

class ExpenseCreateSchema(BaseModel):
    category_id: int
    amount: float
    expense_date: date = date.today()
    description: str
    payment_mode: str = "Cash"
    vendor_name: Optional[str] = ""
    reference_no: Optional[str] = ""
    notes: Optional[str] = ""

@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return db.query(ExpenseCategory).order_by(ExpenseCategory.name.asc()).all()

@router.post("/categories")
def create_category(data: ExpenseCategoryCreateSchema, db: Session = Depends(get_db)):
    name_clean = data.name.strip()
    if db.query(ExpenseCategory).filter(ExpenseCategory.name == name_clean).first():
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = ExpenseCategory(name=name_clean, is_default=False)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.get("")
def list_expenses(
    category_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Expense)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if from_date:
        query = query.filter(Expense.expense_date >= from_date)
    if to_date:
        query = query.filter(Expense.expense_date <= to_date)

    total_amount = sum(e.amount for e in query.all())
    expenses = query.order_by(desc(Expense.expense_date), desc(Expense.id)).offset(skip).limit(limit).all()

    return {
        "total_amount": round(total_amount, 2),
        "expenses": expenses
    }

@router.post("")
def create_expense(data: ExpenseCreateSchema, db: Session = Depends(get_db)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Expense amount must be greater than zero")

    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Expense category not found")

    expense = Expense(
        category_id=category.id,
        category_name=category.name,
        amount=round(data.amount, 2),
        expense_date=data.expense_date,
        description=data.description.strip(),
        payment_mode=data.payment_mode,
        vendor_name=data.vendor_name,
        reference_no=data.reference_no,
        notes=data.notes
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense
