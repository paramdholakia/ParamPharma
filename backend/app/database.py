from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import DATABASE_URL, SQLITE_WAL_MODE, CACHE_SIZE_PAGES

is_sqlite = "sqlite" in DATABASE_URL

engine_kwargs = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(
    DATABASE_URL,
    **engine_kwargs,
    echo=False
)

if is_sqlite:
    # Apply SQLite low-end hardware performance PRAGMAs on every connection
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        # Enable WAL mode for high concurrency & HDD performance
        if SQLITE_WAL_MODE:
            cursor.execute("PRAGMA journal_mode=WAL;")
        # Synchronous NORMAL is fully safe with WAL and gives huge speed boost on 5400 RPM HDDs
        cursor.execute("PRAGMA synchronous=NORMAL;")
        # Enforce foreign key constraints
        cursor.execute("PRAGMA foreign_keys=ON;")
        # In-memory temporary storage
        cursor.execute("PRAGMA temp_store=MEMORY;")
        # Set cache size (~2MB)
        cursor.execute(f"PRAGMA cache_size={CACHE_SIZE_PAGES};")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
