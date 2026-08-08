from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.database import get_session
from app.models import Bills
from app.bill_detection import detect_bills

router = APIRouter(prefix="/api/bills", tags=["bills"])

# shape of endpoint response
class BillResponse(BaseModel):
    id: str
    accountId: str | None
    name: str
    rawName: str | None
    amountToCent: int
    dueDay: int
    isAuto: bool
    reviewed: bool
    active: bool

# predefined shape of what the bill req looks like
class BillCreate(BaseModel):
    name: str
    amountToCent: int
    dueDay: int

# update param requests
class BillUpdate(BaseModel):
    name: str | None = None
    amountToCent: int | None = None
    dueDay: int | None = None
    active: bool | None = None


# get method for getting all a users bills
@router.get(
    "",
    response_model=list[BillResponse],
    summary="List the user's bills",
)
def list_bills(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[BillResponse]:
    """Return all active (non-dismissed) bills belonging to the authenticated user."""
    bills = db.exec(
        select(Bills).where(Bills.userId == user_id, Bills.dismissed == False)
    ).all()
    return bills


# post method for creating a new bill
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
    """Create a manual recurring bill for the authenticated user."""
    if not (1 <= body.dueDay <= 31):
        raise HTTPException(status_code=400, detail="dueDay must be 1-31")
    bill = Bills(
        userId=user_id,
        name=body.name,
        amountToCent=body.amountToCent,
        dueDay=body.dueDay,
        reviewed=True,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill

# post method for using plaids api to try and autodetect a user recurring bill from transactions
@router.post(
    "/detect",
    summary="Detect recurring bills from Plaid",
    response_description="How many bills were newly detected and how many already existed",
)
def detect(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """
    Scan the user's connected accounts for recurring charges and surface them
    as suggested bills.

    Reads Plaid's recurring **outflow streams**, cleans each merchant name, and
    writes any new streams as auto-detected bills (**isAuto=true, reviewed=false**)
    for the user to confirm. Streams already tracked in any state — confirmed,
    edited, or previously dismissed — are skipped, so re-running never
    duplicates a bill or resurrects a dismissed one.
    """
    return detect_bills(db, user_id)


# update method for a bill
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
    """
    Update a bill. Only the owner can update their own bills.

    Any edit marks the bill as **user-modified** and **reviewed**, so future
    detection runs never overwrite the user's changes.
    """
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
    bill.userModified = True
    bill.reviewed = True
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


# confirm a auto detected suggested bill
@router.post(
    "/{bill_id}/confirm",
    response_model=BillResponse,
    summary="Confirm a detected bill",
)
def confirm_bill(
    bill_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> BillResponse:
    """
    Confirm an auto-detected bill without editing it.

    Marks the bill **reviewed** so it is no longer flagged as an unreviewed
    suggestion, while leaving its detected values intact.
    """
    bill = db.exec(
        select(Bills).where(Bills.id == bill_id, Bills.userId == user_id)
    ).first()
    if bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    bill.reviewed = True
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


# soft delete for plaid detected bills, hard delete for manually inputted bills
@router.delete(
    "/{bill_id}",
    summary="Delete a bill",
)
def delete_bill(
    bill_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """
    Delete a bill. Only the owner can delete their own bills.

    Manual bills are removed outright. Auto-detected bills are instead
    **dismissed** (tombstoned by their stream id) so that future detection runs
    do not resurrect them.
    """
    bill = db.exec(
        select(Bills).where(Bills.id == bill_id, Bills.userId == user_id)
    ).first()
    if bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill.streamId is not None:
        bill.dismissed = True
        bill.active = False
        db.add(bill)
        db.commit()
        return {"dismissed": True}
    db.delete(bill)
    db.commit()
    return {"deleted": True}