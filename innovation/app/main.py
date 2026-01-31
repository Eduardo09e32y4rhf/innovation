from fastapi import FastAPI

from app.api import (
    auth,
    plans,
    payments,
    terms,
    companies,
    jobs,
    applications,
    candidates,
    subscriptions,
    audit_logs,
    ai,
)

app = FastAPI(title="Innovation SaaS")

app.include_router(auth.router)
app.include_router(plans.router)
app.include_router(payments.router)
app.include_router(terms.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(candidates.router)
app.include_router(subscriptions.router)
app.include_router(audit_logs.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {"status": "API rodando"}
