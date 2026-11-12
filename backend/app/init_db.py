from datetime import datetime
from passlib.hash import pbkdf2_sha256
from backend.app.database import engine, SessionLocal, Base
from backend.app.models import (
    User, CompanySettings, ExpenseCategory
)

def init_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Default Admin User
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                password_hash=pbkdf2_sha256.hash("admin123"),
                full_name="Param Pharma Administrator",
                role="admin",
                is_active=True
            )
            db.add(admin_user)

        # 2. Default Company Settings - PARAM PHARMA
        company = db.query(CompanySettings).first()
        if not company:
            company = CompanySettings(
                company_name="PARAM PHARMA",
                legal_name="Param Pharma Wholesale & Distribution",
                address_line1="Station Road, Pharmaceutical Wholesale Market",
                address_line2="Opp. Civil Hospital",
                city="Bhuj, Kutch",
                state="Gujarat",
                state_code="24",
                pincode="370001",
                phone="9429041051",
                email="paramdholakia@gmail.com",
                upi_id="aldholakia72-1@okaxis",
                gstin="24AABCP1234F1Z5",
                pan="AABCP1234F",
                dl_number_20b="GUJ-DL-20B-12345",
                dl_number_21b="GUJ-DL-21B-12346",
                bank_name="State Bank of India",
                bank_account_no="300123456789",
                bank_ifsc="SBIN0001234",
                bank_branch="Main Branch",
                invoice_prefix="PP26/",
                next_invoice_num=1,
                purchase_prefix="PUR26/",
                next_purchase_num=1,
                credit_note_prefix="CN26/",
                next_credit_note_num=1,
                debit_note_prefix="DN26/",
                next_debit_note_num=1,
                receipt_prefix="RCP26/",
                next_receipt_num=1,
                voucher_prefix="VCH26/",
                next_voucher_num=1,
                financial_year="2026-2027",
                terms_conditions="1. Goods once sold will not be taken back without prior inspection.\n2. Interest @ 18% p.a. will be charged if payment not received within due date.\n3. Subject to Bhuj, Kutch (Gujarat) - 370001 jurisdiction only.\n4. Certified that all drugs mentioned comply with provisions of the Drugs & Cosmetics Act."
            )
            db.add(company)

        # 3. Default Expense Categories (18 standard pharma overhead categories)
        default_categories = [
            "Employee Salary", "Office Rent", "Electricity", "Internet", "Telephone",
            "Transportation", "Delivery Charges", "Fuel", "Vehicle Maintenance",
            "Loading and Unloading", "Packaging", "Office Supplies", "Bank Charges",
            "Interest", "Marketing", "Repairs and Maintenance", "Software Subscriptions",
            "Miscellaneous Expenses"
        ]
        for cat_name in default_categories:
            if not db.query(ExpenseCategory).filter(ExpenseCategory.name == cat_name).first():
                db.add(ExpenseCategory(name=cat_name, is_default=True))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[InitDB] Error: {e}")
    finally:
        db.close()
