from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.company import CompanySettings

router = APIRouter(prefix="/api/company", tags=["Company Profile"])

class CompanyUpdateSchema(BaseModel):
    company_name: str
    legal_name: str
    address_line1: str
    address_line2: Optional[str] = ""
    city: str
    state: str
    state_code: str
    pincode: str
    phone: str
    email: str
    gstin: str
    pan: str
    dl_number_20b: str
    dl_number_21b: str
    bank_name: str
    bank_account_no: str
    bank_ifsc: str
    bank_branch: str
    invoice_prefix: str
    financial_year: str
    terms_conditions: str
    upi_id: Optional[str] = "aldholakia72@okicici"

@router.get("")
def get_company(db: Session = Depends(get_db)):
    company = db.query(CompanySettings).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not configured")
    return company

@router.put("")
def update_company(data: CompanyUpdateSchema, db: Session = Depends(get_db)):
    company = db.query(CompanySettings).first()
    if not company:
        company = CompanySettings()
        db.add(company)

    for field, val in data.model_dump().items():
        setattr(company, field, val)

    db.commit()
    db.refresh(company)
    return {"message": "Company profile updated successfully", "company": company}
