from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)

    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    name = Column(String(120), nullable=True)
    email = Column(String(120), nullable=True)
    address = Column(Text, nullable=True)

    histories = relationship("History", back_populates="user")

class History(Base):
    __tablename__ = "histories"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    input_json = Column(Text, nullable=False)
    predicted_class = Column(String(20), nullable=False)
    confidence = Column(Float, nullable=False)

    user = relationship("User", back_populates="histories")