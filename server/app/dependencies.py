
from fastapi import Request, HTTPException, Depends
from datetime import datetime, timezone
from sqlmodel import Session
from sqlalchemy import text
from app.database import get_session

# reads the Better Auth session cookie, validates it against ba_session, and returns the user_id.
async def get_current_user( request: Request, db: Session = Depends(get_session)) -> str:

# read the session cookie Better Auth gives and if its null or empty throw a http exception 401 error saying that your not authenticated
    cookie = request.cookies.get("better-auth.session_token")
    if not cookie:
        raise HTTPException(status_code=401, detail="Not authenticated")

# get the right part of the token we need
    token = cookie.split(".")[0]

# look up the session by token. we use raw sql instead of SQLmodel because ba session is managed by better auth and not in the ORM
    row = db.connection().execute(
        text('SELECT "userId", "expiresAt" FROM ba_session WHERE token = :t'),
        {"t": token},
    ).first()
    if row is None:
        raise HTTPException(status_code=401, detail="Invalid session")

# This rejects expired tokens
    user_id, expires_at = row
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    return user_id