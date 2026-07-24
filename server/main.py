from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


# so frontend and backend dont get blocked tryna talk to each other
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# first route @ "{url}"/health
@app.get("/health")
def health():
    return {"status": "ok"}

