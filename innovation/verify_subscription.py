from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User

def verify_subscription(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Check if subscription_status attribute exists (dynamic or added)
            status = getattr(user, 'subscription_status', 'N/A')
            print(f"User: {user.email}")
            print(f"Subscription Status: {status}")
            
            # Since User model in my view didn't explicitly have subscription_status column in the earlier `view_file` (it had `is_active` and `role`), 
            # I might need to check if I need to add migration or if it was added in a previous step I missed?
            #
            # Re-reading `models/user.py` from Step 252:
            # No `subscription_status` column.
            # 
            # Re-reading `payments.py` from Step 253:
            # It tries to set `user.subscription_status = "active"`.
            # This would fail if the column doesn't exist on the SQLAlchemy model instance!
            # Python allows setting arbitrary attributes on objects, but SQLAlchemy won't persist them if not mapped.
            #
            # The previous run of `simulate_payment.py` might have "succeeded" in HTTP 200 (if exception handled or not raised until commit/flush),
            # but the DB wouldn't update.
            # 
            # I need to CHECK if the `User` model has this field.
            # The file I read in step 252 did NOT show it.
            # 
            # I must ADD this column to User model to make payments work properly!
            pass
        else:
            print(f"User {email} not found.")
    except Exception as e:
        print(f"Verification Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_subscription("test@innovation.ia")
