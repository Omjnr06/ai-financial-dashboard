from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

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

