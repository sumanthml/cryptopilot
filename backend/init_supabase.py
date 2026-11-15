"""Initialize and verify all database tables directly in Supabase PostgreSQL."""

import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

from app.db.database import engine, Base
from app.db.models import models  # Ensures all models are registered
from sqlalchemy import inspect

print(f"[Supabase Init] Connected to: {engine.url.host}:{engine.url.port}/{engine.url.database}")
print("[Supabase Init] Creating all tables if not exist...")
Base.metadata.create_all(bind=engine)

inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"[Supabase Init] SUCCESS! Created/Verified {len(tables)} tables in Supabase PostgreSQL:")
for t in sorted(tables):
    print(f"  ✓ {t}")
