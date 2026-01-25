from app.db.session import SessionLocal
from app.models.plan import Plan

def seed_plans():
    db = SessionLocal()

    if db.query(Plan).count() > 0:
        return

    plans = [
        Plan(
            name="FREE",
            price=0,
            features=["dashboard"]
        ),
        Plan(
            name="BASIC",
            price=49,
            features=["dashboard", "pdf", "history"]
        ),
        Plan(
            name="PRO",
            price=99,
            features=["dashboard", "pdf", "history", "ia"]
        ),
    ]

    db.add_all(plans)
    db.commit()
    db.close()
