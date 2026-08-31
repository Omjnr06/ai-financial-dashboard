from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import date

from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.models import IncomeSource, IncomeFrequency
from app.services.income_detection import detect_income_sources

router = APIRouter(prefix="/api/income", tags=["income"])


class IncomeResponse(BaseModel):
    id: str
    accountId: str | None
    sourceAccountId: str | None
    isInternalTransfer: bool
    name: str
    amountToCent: int
    frequency: IncomeFrequency
    anchorDate: date | None
    active: bool
    isAuto: bool
    reviewed: bool
    dismissed: bool


class IncomeCreate(BaseModel):
    name: str
    amountToCent: int
    frequency: IncomeFrequency
    anchorDate: date
    accountId: str | None = None
    sourceAccountId: str | None = None
    isInternalTransfer: bool = False


class IncomeUpdate(BaseModel):
    name: str | None = None
    amountToCent: int | None = None
    frequency: IncomeFrequency | None = None
    anchorDate: date | None = None
    accountId: str | None = None
    sourceAccountId: str | None = None
    isInternalTransfer: bool | None = None
    active: bool | None = None


@router.get(
    "",
    response_model=list[IncomeResponse],
    summary="List the user's income sources",
    response_description="Every income source for the user, including auto-detected suggestions",
)
def list_income(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[IncomeResponse]:
    """
    Return all income sources for the authenticated user.

    This includes both manually-entered sources (trusted, `reviewed=True`) and
    Plaid-detected suggestions (`isAuto=True`, `reviewed=False`) that the user
    has not yet confirmed or dismissed. The frontend separates confirmed income
    from unreviewed suggestions using the `reviewed`/`isAuto`/`dismissed` flags.
    Dismissed suggestions are still returned; the frontend filters them out.
    """
    sources = db.exec(select(IncomeSource).where(IncomeSource.userId == user_id)).all()
    return sources

# for creating a new income source for a user
@router.post(
    "",
    response_model=IncomeResponse,
    summary="Create an income source",
    response_description="The newly created income source",
)
def create_income(
    body: IncomeCreate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> IncomeResponse:
    """
    Create a recurring income source for the authenticated user.

    Manually created sources are trusted immediately (`reviewed=True`,
    `isAuto=False`). Set `isInternalTransfer=True` with a `sourceAccountId`
    for money moved between the user's own accounts (e.g. a self-funded weekly
    allowance from savings)  these count toward Safe-to-Spend but not net
    worth, since no new money enters the user's total holdings.
    """
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
        isAuto=False,
        reviewed=True,
        dismissed=False,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.patch(
    "/{income_id}",
    response_model=IncomeResponse,
    summary="Update an income source",
    response_description="The updated income source",
)
def update_income(
    income_id: str,
    body: IncomeUpdate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> IncomeResponse:
    """
    Update an income source. Only the owner may update their own sources.

    Editing an auto detected suggestion also marks it `reviewed=True`, since a
    user who edits a detected source has implicitly confirmed it.
    """
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
    source.reviewed = True
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.post(
    "/{income_id}/confirm",
    response_model=IncomeResponse,
    summary="Confirm an auto-detected income source",
    response_description="The confirmed income source",
)
def confirm_income(
    income_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> IncomeResponse:
    """
    Confirm an auto detected income source without editing it.

    Marks the source `reviewed=True` so it is no longer shown as an unreviewed
    suggestion, while leaving its detected values intact.
    """
    source = db.exec(
        select(IncomeSource).where(IncomeSource.id == income_id, IncomeSource.userId == user_id)
    ).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Income source not found")
    source.reviewed = True
    source.dismissed = False
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.post(
    "/{income_id}/dismiss",
    summary="Dismiss an auto-detected income source suggestion",
    response_description="Confirmation the suggestion was dismissed",
)
def dismiss_income(
    income_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """
    Dismiss an auto detected income suggestion the user does not want tracked.

    Marks it `dismissed=True` and `active=False` rather than deleting it, so the
    same Plaid stream is not re-suggested on the next detection run (the
    `streamId` dedup keeps it from reappearing).
    """
    source = db.exec(
        select(IncomeSource).where(IncomeSource.id == income_id, IncomeSource.userId == user_id)
    ).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Income source not found")
    source.dismissed = True
    source.active = False
    source.reviewed = True
    db.add(source)
    db.commit()
    return {"dismissed": True}


@router.delete(
    "/{income_id}",
    summary="Delete an income source",
    response_description="Confirmation the source was deleted",
)
def delete_income(
    income_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Delete an income source. Only the owner may delete their own sources."""
    source = db.exec(
        select(IncomeSource).where(IncomeSource.id == income_id, IncomeSource.userId == user_id)
    ).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Income source not found")
    db.delete(source)
    db.commit()
    return {"deleted": True}


@router.post(
    "/detect",
    summary="Run Plaid inflow detection to suggest income sources",
    response_description="Counts of newly detected and skipped income streams",
)
def detect_income(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """
    Scan the user's Plaid recurring inflow streams and create unreviewed
    income source suggestions for any not manually inputted.

    Detected sources are inserted with `isAuto=True, reviewed=False` so they
    appear as suggestions the user can confirm or dismiss. Dedupes on
    `streamId`, so running repeatedly never creates duplicates.
    """
    return detect_income_sources(db, user_id)