from fastapi import FastAPI
from app.api import auth, payments, documents
from app.db.base import Base
from app.db.session import engine

# 👇 IMPORTA TODOS OS MODELS ANTES DO create_all
from app.models.user import User
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.document import Document  # se existir

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth.router)
app.include_router(payments.router)
app.include_router(documents.router)