from sqlmodel import create_engine, Session
from app.core.config import settings

# the engine is the connection pool
# we pre ping because of neon scaling down when no users or active connections to db
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)

def get_session():
    with Session(engine) as session:
        yield session