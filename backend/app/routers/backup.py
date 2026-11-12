import os
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from backend.app.services.backup_service import BackupService
from backend.app.config import BACKUP_DIR

router = APIRouter(prefix="/api/backup", tags=["Database Backup & Restore"])

class RestoreRequest(BaseModel):
    filename: str

@router.get("")
def list_backups():
    return BackupService.list_backups()

@router.post("")
def trigger_backup():
    filename = BackupService.create_backup()
    return {"message": "Backup created successfully", "filename": filename}

@router.post("/restore")
def restore_backup(data: RestoreRequest):
    try:
        BackupService.restore_backup(data.filename)
        return {"message": f"Database successfully restored from '{data.filename}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore backup: {str(e)}")

@router.post("/upload")
async def upload_backup(file: UploadFile = File(...), restore_now: bool = Query(True)):
    if not file.filename.endswith(".db"):
        raise HTTPException(status_code=400, detail="Only .db SQLite database files are allowed.")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename).name
    dest_path = BACKUP_DIR / safe_name

    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Quick validation of SQLite header
        with open(dest_path, "rb") as f:
            header = f.read(16)
            if not header.startswith(b"SQLite format 3\x00"):
                dest_path.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="Uploaded file is not a valid SQLite database.")

        if restore_now:
            BackupService.restore_backup(safe_name)
            return {
                "message": f"File '{safe_name}' uploaded and database restored successfully!",
                "filename": safe_name,
                "restored": True
            }

        return {
            "message": f"Backup file '{safe_name}' uploaded successfully. You can restore it anytime.",
            "filename": safe_name,
            "restored": False
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload/restore backup: {str(e)}")
