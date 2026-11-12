import os
import time
import pymongo
from typing import Dict, Any, Optional
from datetime import datetime, date

# Configure reliable public DNS for Atlas SRV resolution on Windows
try:
    import dns.resolver
    custom_resolver = dns.resolver.Resolver(configure=False)
    custom_resolver.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
    dns.resolver.default_resolver = custom_resolver
except Exception as dns_err:
    pass

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://paramdholakia:PARAM1694@parampharmacluster.ftvhhpr.mongodb.net/?retryWrites=true&w=majority"
)
DB_NAME = "param_pharma"
CLUSTER_NAME = "ParamPharmaCluster"

_mongo_client: Optional[pymongo.MongoClient] = None

def get_mongo_client() -> Optional[pymongo.MongoClient]:
    global _mongo_client
    if _mongo_client is None:
        try:
            _mongo_client = pymongo.MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=15000,
                connectTimeoutMS=15000,
                socketTimeoutMS=15000
            )
        except Exception as e:
            print(f"[MongoDB] Connection initialization warning: {e}")
            return None
    return _mongo_client

def get_mongo_db():
    client = get_mongo_client()
    if client is not None:
        return client[DB_NAME]
    return None

def check_cloud_status() -> Dict[str, Any]:
    start = time.time()
    client = get_mongo_client()
    if client is None:
        return {
            "connected": False,
            "cluster": CLUSTER_NAME,
            "database": DB_NAME,
            "error": "Client not initialized",
            "latency_ms": 0,
            "collections": {}
        }
    try:
        # Ping cluster
        client.admin.command('ping')
        latency_ms = round((time.time() - start) * 1000, 1)
        db = client[DB_NAME]
        colls = db.list_collection_names()
        coll_counts = {}
        for c in colls:
            try:
                coll_counts[c] = db[c].count_documents({})
            except Exception:
                coll_counts[c] = 0

        return {
            "connected": True,
            "cluster": CLUSTER_NAME,
            "database": DB_NAME,
            "latency_ms": latency_ms,
            "collections": coll_counts,
            "last_checked": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "connected": False,
            "cluster": CLUSTER_NAME,
            "database": DB_NAME,
            "error": str(e),
            "latency_ms": 0,
            "collections": {}
        }

def serialize_for_mongo(val: Any) -> Any:
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val

def sync_all_to_cloud(db_session) -> Dict[str, Any]:
    """Sync all active SQLite tables to MongoDB Atlas cluster."""
    cloud_db = get_mongo_db()
    if cloud_db is None:
        return {"success": False, "error": "MongoDB Atlas connection unavailable"}

    from backend.app.models import (
        CompanySettings, ExpenseCategory, Customer, Supplier,
        Product, ProductBatch, SalesInvoice, PurchaseInvoice,
        CustomerPayment, SupplierPayment, Expense,
        CustomerLedger, SupplierLedger
    )

    synced_counts = {}

    try:
        # 1. Company Settings
        comp = db_session.query(CompanySettings).first()
        if comp:
            comp_dict = {c.name: serialize_for_mongo(getattr(comp, c.name)) for c in comp.__table__.columns}
            comp_dict["_id"] = "primary_company"
            cloud_db["company_settings"].replace_one({"_id": "primary_company"}, comp_dict, upsert=True)
            synced_counts["company_settings"] = 1

        # 2. Expense Categories
        cats = db_session.query(ExpenseCategory).all()
        for cat in cats:
            c_dict = {c.name: serialize_for_mongo(getattr(cat, c.name)) for c in cat.__table__.columns}
            c_dict["_id"] = cat.id
            cloud_db["expense_categories"].replace_one({"_id": cat.id}, c_dict, upsert=True)
        synced_counts["expense_categories"] = len(cats)

        # 3. Customers
        custs = db_session.query(Customer).all()
        for cust in custs:
            c_dict = {c.name: serialize_for_mongo(getattr(cust, c.name)) for c in cust.__table__.columns}
            c_dict["_id"] = cust.id
            cloud_db["customers"].replace_one({"_id": cust.id}, c_dict, upsert=True)
        synced_counts["customers"] = len(custs)

        # 4. Suppliers
        supps = db_session.query(Supplier).all()
        for supp in supps:
            s_dict = {c.name: serialize_for_mongo(getattr(supp, c.name)) for c in supp.__table__.columns}
            s_dict["_id"] = supp.id
            cloud_db["suppliers"].replace_one({"_id": supp.id}, s_dict, upsert=True)
        synced_counts["suppliers"] = len(supps)

        # 5. Products
        prods = db_session.query(Product).all()
        for prod in prods:
            p_dict = {c.name: serialize_for_mongo(getattr(prod, c.name)) for c in prod.__table__.columns}
            p_dict["_id"] = prod.id
            cloud_db["products"].replace_one({"_id": prod.id}, p_dict, upsert=True)
        synced_counts["products"] = len(prods)

        # 6. Batches
        batches = db_session.query(ProductBatch).all()
        for b in batches:
            b_dict = {c.name: serialize_for_mongo(getattr(b, c.name)) for c in b.__table__.columns}
            b_dict["_id"] = b.id
            cloud_db["batches"].replace_one({"_id": b.id}, b_dict, upsert=True)
        synced_counts["batches"] = len(batches)

        # 7. Sales Invoices
        invoices = db_session.query(SalesInvoice).all()
        for inv in invoices:
            i_dict = {c.name: serialize_for_mongo(getattr(inv, c.name)) for c in inv.__table__.columns}
            i_dict["_id"] = inv.id
            cloud_db["sales_invoices"].replace_one({"_id": inv.id}, i_dict, upsert=True)
        synced_counts["sales_invoices"] = len(invoices)

        # 8. Purchase Invoices
        purchases = db_session.query(PurchaseInvoice).all()
        for pur in purchases:
            p_dict = {c.name: serialize_for_mongo(getattr(pur, c.name)) for c in pur.__table__.columns}
            p_dict["_id"] = pur.id
            cloud_db["purchase_invoices"].replace_one({"_id": pur.id}, p_dict, upsert=True)
        synced_counts["purchase_invoices"] = len(purchases)

        # 9. Payments
        cpays = db_session.query(CustomerPayment).all()
        for cp in cpays:
            cp_dict = {c.name: serialize_for_mongo(getattr(cp, c.name)) for c in cp.__table__.columns}
            cp_dict["_id"] = cp.id
            cloud_db["customer_payments"].replace_one({"_id": cp.id}, cp_dict, upsert=True)

        spays = db_session.query(SupplierPayment).all()
        for sp in spays:
            sp_dict = {c.name: serialize_for_mongo(getattr(sp, c.name)) for c in sp.__table__.columns}
            sp_dict["_id"] = sp.id
            cloud_db["supplier_payments"].replace_one({"_id": sp.id}, sp_dict, upsert=True)
        synced_counts["payments"] = len(cpays) + len(spays)

        # 10. Expenses
        exps = db_session.query(Expense).all()
        for exp in exps:
            e_dict = {c.name: serialize_for_mongo(getattr(exp, c.name)) for c in exp.__table__.columns}
            e_dict["_id"] = exp.id
            cloud_db["expenses"].replace_one({"_id": exp.id}, e_dict, upsert=True)
        synced_counts["expenses"] = len(exps)

        # 11. Ledgers
        cledgers = db_session.query(CustomerLedger).all()
        for cl in cledgers:
            cl_dict = {c.name: serialize_for_mongo(getattr(cl, c.name)) for c in cl.__table__.columns}
            cl_dict["_id"] = cl.id
            cloud_db["customer_ledger"].replace_one({"_id": cl.id}, cl_dict, upsert=True)

        sledgers = db_session.query(SupplierLedger).all()
        for sl in sledgers:
            sl_dict = {c.name: serialize_for_mongo(getattr(sl, c.name)) for c in sl.__table__.columns}
            sl_dict["_id"] = sl.id
            cloud_db["supplier_ledger"].replace_one({"_id": sl.id}, sl_dict, upsert=True)
        synced_counts["ledger_entries"] = len(cledgers) + len(sledgers)

        return {"success": True, "cluster": CLUSTER_NAME, "synced_counts": synced_counts}
    except Exception as e:
        return {"success": False, "error": str(e)}

def clean_wipe_both_databases(db_session) -> Dict[str, Any]:
    """
    Completely wipe dummy master and transactional data from SQLite AND MongoDB Atlas.
    Leaves clean company profile with user's Param Pharma credentials, phone 9429041051,
    UPI aldholakia72-1@okaxis, admin user, and standard expense categories.
    """
    from backend.app.models import (
        CompanySettings, Customer, Supplier, Product, ProductBatch,
        SalesInvoice, SalesInvoiceItem, PurchaseInvoice, PurchaseInvoiceItem,
        CustomerPayment, SupplierPayment, CustomerLedger, SupplierLedger,
        SalesReturn, SalesReturnItem, PurchaseReturn, PurchaseReturnItem,
        StockMovement, StockAdjustment, Expense, ExpenseCategory, User
    )
    from sqlalchemy import text
    from passlib.hash import pbkdf2_sha256

    # 1. Truncate SQLite tables safely with foreign keys disabled
    try:
        db_session.execute(text("PRAGMA foreign_keys = OFF;"))
        db_session.query(SalesReturnItem).delete()
        db_session.query(SalesReturn).delete()
        db_session.query(PurchaseReturnItem).delete()
        db_session.query(PurchaseReturn).delete()
        db_session.query(SalesInvoiceItem).delete()
        db_session.query(SalesInvoice).delete()
        db_session.query(PurchaseInvoiceItem).delete()
        db_session.query(PurchaseInvoice).delete()
        db_session.query(CustomerPayment).delete()
        db_session.query(SupplierPayment).delete()
        db_session.query(CustomerLedger).delete()
        db_session.query(SupplierLedger).delete()
        db_session.query(StockMovement).delete()
        db_session.query(StockAdjustment).delete()
        db_session.query(Expense).delete()
        db_session.query(ProductBatch).delete()
        db_session.query(Product).delete()
        db_session.query(Customer).delete()
        db_session.query(Supplier).delete()
        db_session.execute(text("PRAGMA foreign_keys = ON;"))
        db_session.query(ProductBatch).delete()
        db_session.query(Product).delete()
        db_session.query(Customer).delete()
        db_session.query(Supplier).delete()

        # Reset / Upsert clean CompanySettings
        comp = db_session.query(CompanySettings).first()
        if not comp:
            comp = CompanySettings()
            db_session.add(comp)

        comp.company_name = "PARAM PHARMA"
        comp.legal_name = "Param Pharma Wholesale & Distribution"
        comp.phone = "9429041051"
        comp.email = "paramdholakia@gmail.com"
        comp.upi_id = "aldholakia72-1@okaxis"
        comp.address_line1 = "Pharmaceutical Wholesale Market"
        comp.address_line2 = "Opp. Civil Hospital"
        comp.city = "Ahmedabad"
        comp.state = "Gujarat"
        comp.state_code = "24"
        comp.pincode = "380001"
        comp.gstin = "24AABCP1234F1Z5"
        comp.pan = "AABCP1234F"
        comp.dl_number_20b = "GUJ-DL-20B-12345"
        comp.dl_number_21b = "GUJ-DL-21B-12346"
        comp.bank_name = "State Bank of India"
        comp.bank_account_no = "300123456789"
        comp.bank_ifsc = "SBIN0001234"
        comp.bank_branch = "Main Branch"
        comp.invoice_prefix = "PP26/"
        comp.next_invoice_num = 1
        comp.purchase_prefix = "PUR26/"
        comp.next_purchase_num = 1
        comp.credit_note_prefix = "CN26/"
        comp.next_credit_note_num = 1
        comp.debit_note_prefix = "DN26/"
        comp.next_debit_note_num = 1
        comp.receipt_prefix = "RCP26/"
        comp.next_receipt_num = 1
        comp.voucher_prefix = "VCH26/"
        comp.next_voucher_num = 1
        comp.financial_year = "2026-2027"

        # Ensure admin user
        admin = db_session.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                password_hash=pbkdf2_sha256.hash("admin123"),
                full_name="Param Pharma Administrator",
                role="admin",
                is_active=True
            )
            db_session.add(admin)

        # Standard expense categories
        default_categories = [
            "Employee Salary", "Office Rent", "Electricity", "Internet", "Telephone",
            "Transportation", "Delivery Charges", "Fuel", "Vehicle Maintenance",
            "Loading and Unloading", "Packaging", "Office Supplies", "Bank Charges",
            "Interest", "Marketing", "Repairs and Maintenance", "Software Subscriptions",
            "Miscellaneous Expenses"
        ]
        for cname in default_categories:
            if not db_session.query(ExpenseCategory).filter(ExpenseCategory.name == cname).first():
                db_session.add(ExpenseCategory(name=cname, is_default=True))

        db_session.commit()
    except Exception as e:
        db_session.rollback()
        return {"success": False, "error": f"SQLite wipe failed: {e}"}

    # 2. Wipe and sync to MongoDB Atlas
    cloud_db = get_mongo_db()
    if cloud_db is not None:
        try:
            collections_to_drop = [
                "customers", "suppliers", "products", "batches",
                "sales_invoices", "purchase_invoices", "customer_payments",
                "supplier_payments", "customer_ledger", "supplier_ledger",
                "expenses", "returns"
            ]
            for c in collections_to_drop:
                cloud_db[c].drop()

            # Now push the clean company profile & categories
            sync_all_to_cloud(db_session)
        except Exception as e:
            print(f"[MongoDB] Atlas wipe warning: {e}")

    return {
        "success": True,
        "message": "All dummy data removed cleanly. Database reset to clean state for real data entry.",
        "company": "PARAM PHARMA",
        "phone": "9429041051",
        "upi_id": "aldholakia72-1@okaxis",
        "cluster": CLUSTER_NAME
    }
