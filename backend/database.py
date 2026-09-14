from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
from passlib.context import CryptContext
import os
import sys

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lunadx.db")

# Handle SQLite specific configuration
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Models
class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String, primary_key=True, default=lambda: f"org-{datetime.now().timestamp()}")
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    admin_email = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    scan_limit = Column(Integer, default=10)
    plan = Column(String, default="trial")  # trial, clinic, hospital
    
    # Relationships
    users = relationship("User", back_populates="organization")
    patients = relationship("Patient", back_populates="organization")
    scans = relationship("Scan", back_populates="organization")

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: f"user-{datetime.now().timestamp()}")
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Admin, Radiologist, Clinician
    password_hash = Column(String, nullable=False)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    scans = relationship("Scan", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(String, primary_key=True, default=lambda: f"patient-{datetime.now().timestamp()}")
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    sex = Column(String, nullable=False)  # Male, Female, Other
    hospital_id = Column(String, nullable=False, unique=True, index=True)
    symptoms = Column(Text)
    visit_date = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="patients")
    scans = relationship("Scan", back_populates="patient")

class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(String, primary_key=True, default=lambda: f"scan-{datetime.now().timestamp()}")
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id"), nullable=False)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    
    # AI Analysis Results
    tb_risk = Column(Float, default=0.0)
    pneumonia_risk = Column(Float, default=0.0)
    lung_opacity_risk = Column(Float, default=0.0)
    pleural_effusion_risk = Column(Float, default=0.0)
    lung_nodules_risk = Column(Float, default=0.0)
    abnormality_score = Column(Float, default=0.0)
    risk_level = Column(String, default="Low")  # Low, Medium, High
    
    # Findings and reports
    findings = Column(Text)  # JSON array
    suggestions = Column(Text)  # JSON array
    ai_summary = Column(Text)
    heatmap_overlay_url = Column(String)
    image_url = Column(String)
    scan_date = Column(DateTime, default=func.now())
    doctor_notes = Column(Text)
    view_position = Column(String, default="PA")  # PA, AP, LAT
    clinical_notes = Column(Text)
    
    # Processing info
    processing_time_ms = Column(Integer)
    model_version = Column(String)
    used_simulation = Column(Boolean, default=False)
    
    # Relationships
    patient = relationship("Patient", back_populates="scans")
    doctor = relationship("User", back_populates="scans")
    organization = relationship("Organization", back_populates="scans")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: f"audit-{datetime.now().timestamp()}")
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # login, scan_created, patient_added, etc.
    details = Column(Text)  # JSON with additional details
    ip_address = Column(String)
    user_agent = Column(String)
    timestamp = Column(DateTime, default=func.now())
    
    # Relationship
    user = relationship("User")

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Database initialization
def init_db():
    """Initialize database with default organization and users"""
    db = SessionLocal()
    try:
        # Check if we already have data
        if db.query(Organization).first():
            return
        
        # Create default organization
        org = Organization(
            id="org-metro",
            name="Metro Health Clinic",
            location="Kampala, Uganda",
            admin_email="admin@lunadx.com",
            scan_limit=1000,
            plan="hospital"
        )
        db.add(org)
        
        # Create default users
        users = [
            {
                "email": "admin@lunadx.com",
                "name": "James Wilson",
                "role": "Admin",
                "password": "admin123"
            },
            {
                "email": "doctor@lunadx.com", 
                "name": "Dr. Sarah Chen",
                "role": "Radiologist",
                "password": "doctor123"
            },
            {
                "email": "clinician@lunadx.com",
                "name": "Dr. Amara Osei", 
                "role": "Clinician",
                "password": "clinician123"
            }
        ]
        
        for user_data in users:
            user = User(
                email=user_data["email"],
                name=user_data["name"],
                role=user_data["role"],
                password_hash=get_password_hash(user_data["password"]),
                org_id=org.id
            )
            db.add(user)
        
        db.commit()
        print("✅ Database initialized with default organization and users")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
    init_db()
