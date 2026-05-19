"""
Camada de configuração de banco de dados.

Suporta múltiplos backends:
- SQLite (desenvolvimento local)
- PostgreSQL (Render)
- PostgreSQL via Supabase (produção)

Características:
- Pool de conexões otimizado
- SSL obrigatório em produção
- Retry automático em falhas transitórias
- Tratamento de timeouts
"""

import logging
import time
from typing import Optional
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool, StaticPool

from app.core.config import get_settings

logger = logging.getLogger("apolo.database")

settings = get_settings()
DATABASE_URL = settings["database_url"]
is_production = settings["is_production"]


def _get_engine_config() -> dict:
    """
    Retorna configuração otimizada para o engine SQLAlchemy.
    
    Ajusta pool, SSL e timeouts baseado no tipo de banco e ambiente.
    """
    config = {}
    
    # SQLite: usa StaticPool para melhor compatibilidade em testes
    if DATABASE_URL.startswith("sqlite"):
        config["connect_args"] = {"check_same_thread": False}
        config["poolclass"] = StaticPool
        logger.info("Database engine: SQLite (local)")
        
    # PostgreSQL (Render ou Supabase)
    elif DATABASE_URL.startswith("postgresql"):
        # SSL obrigatório em produção
        ssl_mode = "require" if is_production else "prefer"
        config["connect_args"] = {
            "sslmode": ssl_mode,
            "connect_timeout": 10,
        }
        
        # Pool de conexões: otimizado para Supabase
        # Supabase tem limite de conexões, então keepalive é importante
        config["poolclass"] = QueuePool
        config["pool_size"] = 5  # conexões mantidas no pool
        config["max_overflow"] = 10  # conexões adicionais permitidas
        config["pool_pre_ping"] = True  # validar conexão antes de usar
        config["pool_recycle"] = 3600  # reciclar conexões a cada 1 hora
        
        logger.info(f"Database engine: PostgreSQL ({ssl_mode} SSL)")
    
    # Pool pre-ping: executa SELECT 1 antes de usar conexão (detecta conexões mortas)
    config["pool_pre_ping"] = True
    
    return config


def _create_engine():
    """Cria engine SQLAlchemy com configurações otimizadas."""
    engine_config = _get_engine_config()
    
    try:
        engine = create_engine(DATABASE_URL, **engine_config)
        
        # Event listener: log para conexões
        @event.listens_for(engine, "connect")
        def receive_connect(dbapi_conn, connection_record):
            logger.debug("Database connection established")
        
        @event.listens_for(engine, "close")
        def receive_close(dbapi_conn, connection_record):
            logger.debug("Database connection closed")
        
        logger.info("SQLAlchemy engine created successfully")
        return engine
        
    except Exception as e:
        logger.error(f"Failed to create database engine: {e}")
        raise


# Criar engine com retry
retry_count = 0
max_retries = 3
engine = None

while retry_count < max_retries and engine is None:
    try:
        engine = _create_engine()
    except Exception as e:
        retry_count += 1
        if retry_count < max_retries:
            wait_time = 2 ** retry_count  # exponential backoff
            logger.warning(
                f"Database connection attempt {retry_count} failed. "
                f"Retrying in {wait_time}s... Error: {e}"
            )
            time.sleep(wait_time)
        else:
            logger.critical("Failed to connect to database after all retries")
            raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db_session():
    """
    Dependency injection para obter sessão de banco de dados.
    
    Uso em rotas:
    ```
    from app.database import get_db_session
    
    @router.get("/")
    def my_route(db = Depends(get_db_session)):
        ...
    ```
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


async def check_database_health() -> bool:
    """
    Verifica se o banco de dados está acessível.
    
    Útil para health checks e startup validation.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            logger.info("Database health check: OK")
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

