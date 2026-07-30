from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.database import get_session
from app.models import Bills

router = APIRouter(prefix="/api/bills", tags=["bills"])

class BillResponse(BaseModel):
    id: str
    name: str
    amountToCent: int
    dueDay: int
    isAuto: bool
    active: bool

class BillCreate(BaseModel):
    name: str
    amountToCent: int
    dueDay: int

class BillUpdate(BaseModel):
    name: str | None = None
    amountToCent: int | None = None
    dueDay: int | None = None
    active: bool | None = None


@router.get(
    "",
    response_model=list[BillResponse],
    summary="List the user's bills",
)
def list_bills(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[BillResponse]:
    """Return all bills belonging to the authenticated user."""
    bills = db.exec(select(Bills).where(Bills.userId == user_id)).all()
    return bills


@router.post(
    "",
    response_model=BillResponse,
    summary="Create a bill",
)
def create_bill(
    body: BillCreate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> BillResponse:
    """Create a recurring bill for the authenticated user."""
    if not (1 <= body.dueDay <= 31):
        raise HTTPException(status_code=400, detail="dueDay must be 1-31")
    bill = Bills(
        userId=user_id,
        name=body.name,
        amountToCent=body.amountToCent,
        dueDay=body.dueDay,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.patch(
    "/{bill_id}",
    response_model=BillResponse,
    summary="Update a bill",
)
def update_bill(
    bill_id: str,
    body: BillUpdate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> BillResponse:
    """Update a bill. Only the owner can update their own bills."""
    bill = db.exec(
        select(Bills).where(Bills.id == bill_id, Bills.userId == user_id)
    ).first()
    if bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    # only update fields that were provided
    if body.name is not None:
        bill.name = body.name
    if body.amountToCent is not None:
        bill.amountToCent = body.amountToCent
    if body.dueDay is not None:
        bill.dueDay = body.dueDay
    if body.active is not None:
        bill.active = body.active
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.delete(
    "/{bill_id}",
    summary="Delete a bill",
)
def delete_bill(
    bill_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Delete a bill. Only the owner can delete their own bills."""
    bill = db.exec(
        select(Bills).where(Bills.id == bill_id, Bills.userId == user_id)
    ).first()
    if bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    db.delete(bill)
    db.commit()
    return {"deleted": True}