import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# Serve Production Single-Page React App directly from FastAPI (Zero Node.js needed on client machine)
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(DIST_DIR):
    assets_path = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="static-assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        candidate = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Param Pharma ERP API active. Frontend dist not built."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
