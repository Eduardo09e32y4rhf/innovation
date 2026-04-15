import os
from sqlalchemy import create_url
from sqlalchemy.orm import Session
from infrastructure.database.sql.session import engine, SessionLocal
from domain.models.user import User
import bcrypt

# Configurações
email = "eduardo998468@gmail.com"
password = "senha123"


def get_password_hash(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed_root_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Creating user {email}...")
            user = User(
                email=email,
                name="Eduardo Admin",
                hashed_password=get_password_hash(password),
                role="admin",
                is_active=True,
                subscription_status="active",
            )
            db.add(user)
            db.commit()
            print("User created successfully!")
        else:
            print(f"User {email} already exists. Updating password...")
            user.hashed_password = get_password_hash(password)
            db.commit()
            print("Password updated successfully!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_root_user()
