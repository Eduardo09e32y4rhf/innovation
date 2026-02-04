import os

from fastapi import FastAPI
from app.api import auth, payments, documents, jobs, applications, companies
from app.db.base import Base
from app.db.session import engine

# 👇 IMPORTA TODOS OS MODELS ANTES DO create_all
from app.models.user import User
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.document import Document  # se existir
from app.models.job import Job
from app.models.application import Application

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth.router)
app.include_router(payments.router)
app.include_router(documents.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(companies.router)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
