from sqlalchemy.orm import Session
from infrastructure.database.sql.database import SessionLocal, engine
from domain.models.user import User
from core.security import get_password_hash
from api.v1.endpoints.payments import router  # Just to ensure models are loaded
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_users():
    db = SessionLocal()
    try:
        users_to_create = [
            {
                "email": "admin@innovation.ia",
                "full_name": "Admin System",
                "password": "admin_innovation_secure",
                "role": "admin",
                "company_name": "Innovation.ia HQ",
                "plan": "enterprise",  # Assuming plan logic exists or will assume enterprise behavior
                "points": 9999,
            },
            {
                "email": "test@innovation.ia",
                "full_name": "User Test (Basic)",
                "password": "user_test_basic",
                "role": "company",
                "company_name": "Test Company Ltd",
                "plan": "starter",
                "points": 100,
            },
            {
                "email": "pro@innovation.ia",
                "full_name": "User Pro (Advanced)",
                "password": "user_pro_secure",
                "role": "company",
                "company_name": "Pro Corp Global",
                "plan": "pro",
                "points": 500,
            },
        ]

        for user_data in users_to_create:
            user = db.query(User).filter(User.email == user_data["email"]).first()
            if not user:
                logger.info(f"Creating user: {user_data['email']}")
                new_user = User(
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    hashed_password=get_password_hash(user_data["password"]),
                    role=user_data["role"],
                    company_name=user_data["company_name"],
                    is_active=True,
                    points=user_data["points"],
                    # field 'subscription_status' might need to be added to User model if not presents,
                    # but based in payments.py it seems to expect it.
                    # For now using existing fields.
                )
                # Monkey patching subscription status if model doesn't support it directly in constructor or if it's dynamic
                # Assuming simple string field or relationship based on previous analysis
                # new_user.subscription_status = "active"

                db.add(new_user)
            else:
                logger.info(f"User already exists: {user_data['email']}")

        db.commit()
        logger.info("Seeding completed successfully!")

    except Exception as e:
        logger.error(f"Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
