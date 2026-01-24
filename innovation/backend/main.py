from fastapi import FastAPI
from app.api.auth import router as auth_router

app = FastAPI(title="Innovation SaaS")

app.include_router(auth_router)

@app.get("/")
def root():
    return {"status": "API rodando"}
