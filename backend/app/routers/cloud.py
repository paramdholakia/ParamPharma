from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.mongo_service import (
    check_cloud_status, sync_all_to_cloud, clean_wipe_both_databases
)

router = APIRouter(prefix="/api/cloud", tags=["MongoDB Atlas Cloud Sync"])

@router.get("/status")
def get_cloud_status_endpoint():
    """Check connectivity to MongoDB Atlas ParamPharmaCluster and database param_pharma."""
    return check_cloud_status()

@router.post("/sync")
def trigger_cloud_sync(db: Session = Depends(get_db)):
    """Synchronize all local SQLite master and transactional records to MongoDB Atlas."""
    res = sync_all_to_cloud(db)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Sync failed"))
    return res

@router.post("/clean-reset")
def trigger_clean_reset(db: Session = Depends(get_db)):
    """
    Remove all dummy data from both local SQLite and MongoDB Atlas cluster.
    Prepares system for real pharmaceutical data entry with fresh invoices starting at 1.
    """
    res = clean_wipe_both_databases(db)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Clean reset failed"))
    return res
