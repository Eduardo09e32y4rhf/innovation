from fastapi import FastAPI
from innovation.backend.api import auth

app = FastAPI()

app.include_router(auth.router)
