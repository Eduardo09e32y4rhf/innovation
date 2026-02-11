from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
APP_ROOT = PROJECT_ROOT / "innovation"

if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from passlib.context import CryptContext
from app.db.session import SessionLocal
import app.models.company  # noqa: F401
from app.models.user import User


def ensure_admin(email: str, password: str) -> None:
    db = SessionLocal()
    try:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password_hash = pwd_context.hash(password)
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.password_hash = password_hash
            user.role = "ADM"
            if not user.name:
                user.name = "Admin"
            db.add(user)
            print(f"Updated admin user: {email}")
        else:
            user = User(
                name="Admin",
                email=email,
                password_hash=password_hash,
                role="ADM",
            )
            db.add(user)
            print(f"Created admin user: {email}")
        db.commit()
    except Exception as exc:
        print(f"Error ensuring admin user {email}: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    ensure_admin("admin@innovation.ia", "admin123")
