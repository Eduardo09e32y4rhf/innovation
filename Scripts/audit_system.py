import sys
import os
import json
import asyncio
from sqlalchemy import func

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "innovation")))

# --- IMPORT ALL MODELS ---
# Critical for SQLAlchemy registry
from app.models.user import User
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application
from app.models.application_status_history import ApplicationStatusHistory
from app.models.audit_log import AuditLog
from app.models.candidate import Candidate
# from app.models.compliance import Compliance # Doesn't exist
from app.models.compliance import PulseSurvey 
from app.models.document import Document
# from app.models.finance import Finance # Might not exist as class
from app.models.leave_request import LeaveRequest
from app.models.onboarding import Onboarding
from app.models.performance_review import PerformanceReview
from app.models.plan import Plan
from app.models.project import Project
from app.models.refresh_token import RefreshToken
from app.models.subscription import Subscription
from app.models.task import Task
from app.models.ticket import Ticket
from app.models.time_entry import TimeEntry
from app.models.two_factor_code import TwoFactorCode

from app.db.session import SessionLocal
from app.services.gemini_service import GeminiService

async def run_audit():
    print("Initializing System Audit...")
    try:
        db = SessionLocal()
    except Exception as e:
        print(f"DB Connection Error: {e}")
        return

    try:
        # 1. Gather Metrics
        user_count = db.query(func.count(User.id)).scalar()
        job_count = db.query(func.count(Job.id)).scalar()
        app_count = db.query(func.count(Application.id)).scalar()
        company_count = db.query(func.count(Company.id)).scalar()
        
        # Safe query for Project
        try:
            project_count = db.query(func.count(Project.id)).scalar()
        except:
            project_count = 0
            
        stats = {
            "total_users": user_count,
            "total_companies": company_count,
            "total_jobs": job_count,
            "total_applications": app_count,
            "total_projects": project_count,
            "system_status": "ONLINE",
            "environment": os.getenv("ENV", "development"),
            "notes": "Audit running via Gemini Agent"
        }
        
        print(f"Metrics gathered: {json.dumps(stats, indent=2)}")
        
        # 2. Call Gemini IA
        print("\nConsulting Gemini Admin IA...")
        gemini = GeminiService()
        audit_report = await gemini.admin_audit(stats)
        
        # 3. Print Report to STDOUT (for Agent to capture)
        print("\n=== SYSTEM_REPORT_START ===")
        print(json.dumps(audit_report, indent=2, ensure_ascii=False))
        print("=== SYSTEM_REPORT_END ===")
        
        # Save report
        with open("audit_report.json", "w", encoding="utf-8") as f:
            json.dump(audit_report, f, indent=2, ensure_ascii=False)
            print("\nReport saved to audit_report.json")

    except Exception as e:
        print(f"Critical Error during audit: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(run_audit())
