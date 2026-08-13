from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import date
from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.models import Bucket

router = APIRouter(prefix="/api/buckets", tags=["buckets"])

# shape of bucket response from backend
class BucketResponse(BaseModel):
    id: str
    accountId: str | None
    name: str
    targetToCent: int
    currentToCent: int
    targetDate: date | None

# shape for create req for a bucket
class BucketCreate(BaseModel):
    name: str
    targetToCent: int
    currentToCent: int = 0
    accountId: str | None = None
    targetDate: date | None = None

# shape for update params for updating a bucket
class BucketUpdate(BaseModel):
    name: str | None = None
    targetToCent: int | None = None
    currentToCent: int | None = None
    accountId: str | None = None
    targetDate: date | None = None

# get method to list all a users buckets
@router.get(
    "",
    response_model=list[BucketResponse],
    summary="List the user's savings buckets",
)
def list_buckets(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[BucketResponse]:
    """Return all savings buckets belonging to the authenticated user."""
    return db.exec(select(Bucket).where(Bucket.userId == user_id)).all()


# creating a new saving bucket for a user
@router.post(
    "",
    response_model=BucketResponse,
    summary="Create a savings bucket",
)
def create_bucket(
    body: BucketCreate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> BucketResponse:
    """Create a savings goal bucket for the authenticated user."""
    if body.targetToCent <= 0:
        raise HTTPException(status_code=400, detail="targetToCent must be positive")
    bucket = Bucket(
        userId=user_id,
        name=body.name,
        targetToCent=body.targetToCent,
        currentToCent=body.currentToCent,
        accountId=body.accountId,
        targetDate=body.targetDate,
    )
    db.add(bucket)
    db.commit()
    db.refresh(bucket)
    return bucket

# update a currently existing bucket
@router.patch(
    "/{bucket_id}",
    response_model=BucketResponse,
    summary="Update a savings bucket",
)
def update_bucket(
    bucket_id: str,
    body: BucketUpdate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> BucketResponse:
    """Update a savings bucket. Only the owner can update their own buckets."""
    bucket = db.exec(
        select(Bucket).where(Bucket.id == bucket_id, Bucket.userId == user_id)
    ).first()
    if bucket is None:
        raise HTTPException(status_code=404, detail="Bucket not found")
    if body.name is not None:
        bucket.name = body.name
    if body.targetToCent is not None:
        bucket.targetToCent = body.targetToCent
    if body.currentToCent is not None:
        bucket.currentToCent = body.currentToCent
    if body.accountId is not None:
        bucket.accountId = body.accountId
    if body.targetDate is not None:
        bucket.targetDate = body.targetDate
    db.add(bucket)
    db.commit()
    db.refresh(bucket)
    return bucket


# delete a savings bucket delete method
@router.delete(
    "/{bucket_id}",
    summary="Delete a savings bucket",
)
def delete_bucket(
    bucket_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Delete a savings bucket. Only the owner can delete their own buckets."""
    bucket = db.exec(
        select(Bucket).where(Bucket.id == bucket_id, Bucket.userId == user_id)
    ).first()
    if bucket is None:
        raise HTTPException(status_code=404, detail="Bucket not found")
    db.delete(bucket)
    db.commit()
    return {"deleted": True}