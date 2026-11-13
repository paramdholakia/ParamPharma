import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    # Load .env.local first, then .env
    root_env_local = Path(__file__).resolve().parent.parent.parent / ".env.local"
    root_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if root_env_local.exists():
        load_dotenv(root_env_local)
    if root_env.exists():
        load_dotenv(root_env)
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

BACKUP_DIR = BASE_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "param_pharma.db"
# Prefer pooled connection for Neon serverless concurrency if available
DATABASE_URL = os.getenv("DATABASE_URL_POOLED") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{DB_PATH}"
elif DATABASE_URL.startswith("postgres://"):
    # Render and Supabase provide postgres://, SQLAlchemy requires postgresql://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", "param_pharma_secure_secret_key_2026_wholesale_erp")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days for desktop convenience

# Low-end hardware optimization flags
SQLITE_WAL_MODE = True
CACHE_SIZE_PAGES = -2000  # ~2MB cache
TEMP_STORE_MEMORY = True
