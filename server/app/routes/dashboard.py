from fastapi import APIRouter, Depends
from sqlmodel import Session
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.database import get_session
from app.calculations import calculate_safe_to_spend

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class SafeToSpendResponse(BaseModel):
    safeToSpendCent: int
    balanceCent: int
    upcomingBillsCent: int
    goalAllocationsCent: int
    thresholdCent: int


# get endpoint for the safe to spend of the user
@router.get(
    "/safe-to-spend",
    response_model=SafeToSpendResponse,
    summary="Get the user's safe-to-spend figure",
    response_description="Safe to spend plus its component breakdown, in cents",
)
def safe_to_spend(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> SafeToSpendResponse:
    """
    Compute the hero metric: how much the user can safely spend right now.

    Returns **balance + upcoming bills this month + goal allocations +
    threshold**, all in integer cents, along with each component so the
    dashboard can display properly. Safe to spend is calculated by balance - upcoming bills - goal allocations - user set threshold
    """
    return calculate_safe_to_spend(db, user_id)