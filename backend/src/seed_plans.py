import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from infrastructure.database.sql.session import SessionLocal
from domain.models.plan import Plan

PLANS = [
    {
        "name": "FREE",
        "price": "0.00",
        "features": "Acesso básico, sem IA.",
    },
    {
        "name": "BASIC",
        "price": "59.99",
        "features": "Recursos essenciais, acesso limitado à IA.",
    },
    {
        "name": "COMPLETE",
        "price": "199.99",
        "features": "Acesso total aos recursos, gerador de posts, ATS e Financeiro.",
    },
    {
        "name": "ENTERPRISE",
        "price": "0.00",  # Sob consulta, mas o banco requer string.
        "features": "Recursos ilimitados, Whitelabel, Service Desk.",
    },
]


def seed_plans():
    db = SessionLocal()
    try:
        print("🌱 Seeding Plans...")

        for p_data in PLANS:
            existing = db.query(Plan).filter(Plan.name == p_data["name"]).first()
            if existing:
                print(f"Plan {p_data['name']} already exists. Updating...")
                existing.price = p_data["price"]
                existing.features = p_data["features"]
            else:
                print(f"Creating Plan {p_data['name']}...")
                new_plan = Plan(**p_data)
                db.add(new_plan)

        db.commit()
        print("✅ Plans seeded successfully!")
    except Exception as e:
        print(f"❌ Error seeding plans: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_plans()
