import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Ajuste seguro com fallback local para desenvolvimento
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./apolo_codex.db")

# Para PostgreSQL não precisamos de check_same_thread
# para SQLite mantemos como fallback local (dev only)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

