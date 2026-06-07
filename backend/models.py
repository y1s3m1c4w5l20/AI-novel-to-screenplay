from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()


class ScreenplayHistory(Base):
    __tablename__ = "screenplay_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default")
    title = Column(String)
    novel_content = Column(Text)
    yaml_content = Column(Text)
    analysis_data = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


engine = create_engine("sqlite:///screenplay_history.db", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()