from fastapi import FastAPI
from app.api import auth, payments
from app.db.base import Base
from app.db.session import engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth.router)
app.include_router(payments.router)
