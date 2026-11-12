from datetime import date
from sqlalchemy.orm import Session
from backend.app.models.customer import Customer
from backend.app.models.supplier import Supplier
from backend.app.models.ledger import CustomerLedger, SupplierLedger

class AccountingService:
    @staticmethod
    def post_customer_transaction(
        db: Session,
        customer_id: int,
        transaction_date: date,
        reference_type: str,
        reference_id: int,
        reference_number: str,
        description: str,
        debit_amount: float = 0.0,
        credit_amount: float = 0.0
    ):
        """
        Posts an entry into customer ledger and updates customer's current balance.
        Debit increases customer receivable.
        Credit decreases customer receivable.
        """
        customer = db.query(Customer).filter(Customer.id == customer_id).with_for_update().first()
        if not customer:
            raise ValueError(f"Customer ID {customer_id} not found.")

        # Calculate new running balance
        new_balance = round(customer.current_balance + debit_amount - credit_amount, 2)
        customer.current_balance = new_balance

        entry = CustomerLedger(
            customer_id=customer_id,
            transaction_date=transaction_date,
            reference_type=reference_type,
            reference_id=reference_id,
            reference_number=reference_number,
            description=description,
            debit_amount=round(debit_amount, 2),
            credit_amount=round(credit_amount, 2),
            running_balance=new_balance
        )
        db.add(entry)
        return entry

    @staticmethod
    def post_supplier_transaction(
        db: Session,
        supplier_id: int,
        transaction_date: date,
        reference_type: str,
        reference_id: int,
        reference_number: str,
        description: str,
        debit_amount: float = 0.0,
        credit_amount: float = 0.0
    ):
        """
        Posts an entry into supplier ledger and updates supplier's current payable balance.
        Credit increases payable to supplier.
        Debit decreases payable to supplier.
        """
        supplier = db.query(Supplier).filter(Supplier.id == supplier_id).with_for_update().first()
        if not supplier:
            raise ValueError(f"Supplier ID {supplier_id} not found.")

        new_balance = round(supplier.current_balance + credit_amount - debit_amount, 2)
        supplier.current_balance = new_balance

        entry = SupplierLedger(
            supplier_id=supplier_id,
            transaction_date=transaction_date,
            reference_type=reference_type,
            reference_id=reference_id,
            reference_number=reference_number,
            description=description,
            debit_amount=round(debit_amount, 2),
            credit_amount=round(credit_amount, 2),
            running_balance=new_balance
        )
        db.add(entry)
        return entry
