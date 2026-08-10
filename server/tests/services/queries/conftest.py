"""
Self-contained test DB fixture — this is the first test in the project,
so there's no shared conftest to reuse yet. Uses an in-memory SQLite
engine via SQLModel so tests don't touch the real database.
 
If the project later grows a shared fixture (e.g. a top-level
tests/conftest.py), this local one should be deleted in favor of that.
"""
 
import pytest
from sqlmodel import Session, SQLModel, create_engine
 
 
@pytest.fixture()
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
 
    with Session(engine) as session:
        yield session
 
    SQLModel.metadata.drop_all(engine)
 