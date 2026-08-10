from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi import Depends
import logging

from app.core.dependencies import get_current_user
from app.routes.plaid import router as plaid_router
from app.routes.bills import router as bills_router
from app.routes.dashboard import router as dashboard_router
from app.routes.income import router as income_router
from app.routes.forecast import router as forecast_router
from app.routes.transactions import router as transactions_router
from app.routes.buckets import router as buckets_router
from app.routes.anomalies import router as anomalies_router

# to run locally
# uv run uvicorn main:app --reload

logging.basicConfig(level=logging.INFO)

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app = FastAPI()


# so frontend and backend dont get blocked tryna talk to each other
app.add_middleware(
    CORSMiddleware,
    allow_origins= origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# first route @ "{url}"/health
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/me")
def me(user_id: str = Depends(get_current_user)):
    return {"user_id": user_id}


# plaid api routes 
app.include_router(plaid_router)

# bills routes
app.include_router(bills_router)

# dashboard routes
app.include_router(dashboard_router)

# income routes
app.include_router(income_router)

# monte carlo /forecast routes
app.include_router(forecast_router)

# transaction route (only get)
app.include_router(transactions_router)

# buckets routes
app.include_router(buckets_router)

# anomaly detection route
app.include_router(anomalies_router)