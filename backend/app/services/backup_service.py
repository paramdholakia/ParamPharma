import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from backend.app.config import DB_PATH, BACKUP_DIR

class BackupService:
    @staticmethod
    def create_backup() -> str:
        """
        Creates an online, transaction-safe SQLite backup using sqlite3.backup API.
        Does not corrupt active read/write transactions.
        """
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"param_pharma_backup_{timestamp}.db"
        backup_file_path = BACKUP_DIR / backup_filename

        # Online transaction-safe SQLite backup
        source_conn = sqlite3.connect(str(DB_PATH))
        dest_conn = sqlite3.connect(str(backup_file_path))
        with dest_conn:
            source_conn.backup(dest_conn, pages=100)
        dest_conn.close()
        source_conn.close()

        return backup_filename

    @staticmethod
    def list_backups() -> list[dict]:
        """Lists all available backup files with size and timestamp"""
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        backups = []
        for file in sorted(BACKUP_DIR.glob("*.db"), key=os.path.getmtime, reverse=True):
            stat = file.stat()
            backups.append({
                "filename": file.name,
                "size_kb": round(stat.st_size / 1024, 2),
                "created_at": datetime.fromtimestamp(stat.st_mtime).strftime("%d/%m/%Y %H:%M:%S"),
            })
        return backups

    @staticmethod
    def restore_backup(backup_filename: str) -> bool:
        """Restores a backup safely by first taking a safety snapshot of current DB"""
        target_backup = BACKUP_DIR / backup_filename
        if not target_backup.exists():
            raise FileNotFoundError(f"Backup file '{backup_filename}' does not exist.")

        # First take a quick safety copy of current db
        safety_name = f"pre_restore_safety_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        shutil.copy2(str(DB_PATH), str(BACKUP_DIR / safety_name))

        # Copy the selected backup over the live database
        shutil.copy2(str(target_backup), str(DB_PATH))
        return True
