from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import engine, Base
from backend.app.init_db import init_database
from backend.app.routers import (
    auth, company, customers, suppliers, products, batches,
    sales, purchases, registers, payments, ledgers, returns,
    expenses, profit_loss, dashboard, backup, cloud
)

app = FastAPI(
    title="Param Pharma - Wholesale ERP & GST Billing API",
    description="High-performance, offline-first Pharmaceutical Wholesale Management System",
    version="1.0.0"
)

# Enable CORS for local desktop and web UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Routers
app.include_router(auth.router)
app.include_router(company.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(products.router)
app.include_router(batches.router)
app.include_router(sales.router)
app.include_router(purchases.router)
app.include_router(registers.router)
app.include_router(payments.router)
app.include_router(ledgers.router)
app.include_router(returns.router)
app.include_router(expenses.router)
app.include_router(profit_loss.router)
app.include_router(dashboard.router)
app.include_router(backup.router)
app.include_router(cloud.router)

@app.on_event("startup")
def on_startup():
    init_database()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app": "Param Pharma ERP",
        "version": "1.0.0",
        "database": "SQLite WAL Mode"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
