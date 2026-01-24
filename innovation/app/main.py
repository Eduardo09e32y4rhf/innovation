from fastapi import FastAPI
from app.api.auth import router as auth_router

app = FastAPI(title="Innovation SaaS")

app.include_router(auth_router)

@app.get("/")
def root():
    return {"status": "API rodando"}

from fastapi import FastAPI
from app.api import auth, plans, payments, terms

app = FastAPI()
app.include_router(auth.router)
app.include_router(plans.router)
app.include_router(payments.router)
app.include_router(terms.router)
