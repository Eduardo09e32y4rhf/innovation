import asyncio
import os
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
from app.models.job import Job
from app.models.application import Application
from app.services.gemini_service import GeminiService

async def run_audit():
    print("🔍 Starting System Audit with Gemini AI Admin...")
    
    db = SessionLocal()
    gemini = GeminiService()
    
    try:
        # Gather Metrics
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        total_jobs = db.query(Job).count()
        total_applications = db.query(Application).count()
        
        # Simulating more complex metrics for the AI
        db_stats = {
            "users": {
                "total": total_users,
                "active": active_users,
                "new_this_week": 3 # Mock
            },
            "recruitment": {
                "active_jobs": total_jobs,
                "total_applications": total_applications,
                "avg_applications_per_job": total_applications / total_jobs if total_jobs > 0 else 0
            },
            "system": {
                "database_status": "Connected",
                "api_latency_ms": 120, # Mock
                "error_rate_percent": 0.05
            }
        }
        
        print("\n📊 Metrics gathered. Sending to AI...")
        
        # Ask AI Admin
        report = await gemini.admin_audit(db_stats)
        
        print("\n🤖 === ADMIN AI REPORT === 🤖")
        print(f"Status: {report.get('1. Estado de saúde do sistema (Crítico/Alerta/Saudável)', 'Unknown')}")
        # Note: The keys depend on what Gemini actually returns based on the prompt "1. ...", "2. ...".
        # Since I'm parsing the raw JSON, I'll print the whole thing nicely.
        
        for key, value in report.items():
            print(f"\n[{key}]:\n{value}")
            
        print("\n✅ Audit Complete.")
        
    except Exception as e:
        print(f"❌ Audit Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_audit())
