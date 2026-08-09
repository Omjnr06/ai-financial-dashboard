from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import date

from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.models import IncomeSource, IncomeFrequency

router = APIRouter(prefix="/api/income", tags=["income"])


# response shape for income 
class IncomeResponse(BaseModel):
    id: str
    accountId: str | None
    sourceAccountId: str | None
    isInternalTransfer: bool
    name: str
    amountToCent: int
    frequency: IncomeFrequency
    anchorDate: date
    active: bool

# when a user creates an income source in future settings page
class IncomeCreate(BaseModel):
    name: str
    amountToCent: int
    frequency: IncomeFrequency
    anchorDate: date
    accountId: str | None = None
    sourceAccountId: str | None = None
    isInternalTransfer: bool = False


# for updating a possibile income source if changed 
class IncomeUpdate(BaseModel):
    name: str | None = None
    amountToCent: int | None = None
    frequency: IncomeFrequency | None = None
    anchorDate: date | None = None
    accountId: str | None = None
    sourceAccountId: str | None = None
    isInternalTransfer: bool | None = None
    active: bool | None = None

# get methof for getting a users income sources
@router.get(
    "",
    response_model=list[IncomeResponse],
    summary="List the user's income sources",
)
def list_income(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[IncomeResponse]:
    """Return all income sources belonging to the authenticated user."""
    sources = db.exec(select(IncomeSource).where(IncomeSource.userId == user_id)).all()
    return sources

# for creating a new income source for a user
@router.post(
    "",
    response_model=IncomeResponse,
    summary="Create an income source",
)
def create_income(
    body: IncomeCreate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> IncomeResponse:
    """Create a recurring income source for the authenticated user."""
    if body.amountToCent <= 0:
        raise HTTPException(status_code=400, detail="amountToCent must be positive")
    source = IncomeSource(
        userId=user_id,
        name=body.name,
        amountToCent=body.amountToCent,
        frequency=body.frequency,
        anchorDate=body.anchorDate,
        accountId=body.accountId,
        sourceAccountId=body.sourceAccountId,
        isInternalTransfer=body.isInternalTransfer,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source

# for updating a users income source

@router.patch(
    "/{income_id}",
    response_model=IncomeResponse,
    summary="Update an income source",
)
def update_income(
    income_id: str,
    body: IncomeUpdate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> IncomeResponse:
    """Update an income source. Only the owner can update their own sources."""
    source = db.exec(
        select(IncomeSource).where(IncomeSource.id == income_id, IncomeSource.userId == user_id)
    ).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Income source not found")
    if body.name is not None:
        source.name = body.name
    if body.amountToCent is not None:
        source.amountToCent = body.amountToCent
    if body.frequency is not None:
        source.frequency = body.frequency
    if body.anchorDate is not None:
        source.anchorDate = body.anchorDate
    if body.accountId is not None:
        source.accountId = body.accountId
    if body.sourceAccountId is not None:
        source.sourceAccountId = body.sourceAccountId
    if body.isInternalTransfer is not None:
        source.isInternalTransfer = body.isInternalTransfer
    if body.active is not None:
        source.active = body.active
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


# endpoint for deleting a a users income source
@router.delete(
    "/{income_id}",
    summary="Delete an income source",
)
def delete_income(
    income_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Delete an income source. Only the owner can delete their own sources."""
    source = db.exec(
        select(IncomeSource).where(IncomeSource.id == income_id, IncomeSource.userId == user_id)
    ).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Income source not found")
    db.delete(source)
    db.commit()
    return {"deleted": True}