from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.dependencies import get_current_user
from fastapi import Depends
from app.routes.plaid import router as plaid_router

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