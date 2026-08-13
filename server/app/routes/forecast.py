from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel
from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.models import Bucket
from app.services.forecasting import  weekly_net_savings, forecast_goal, forecast_goal_distribution

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


class GoalForecastResponse(BaseModel):
    alreadyReached: bool
    insufficientHistory: bool
    medianWeeks: int | None
    p90Weeks: int | None
    probabilityWithinHorizon: float | None




class CompletionBin(BaseModel):
    week: int
    count: int
 
 
class GoalDistributionResponse(BaseModel):
    alreadyReached: bool
    insufficientHistory: bool
    p10Weeks: int | None
    medianWeeks: int | None
    p90Weeks: int | None
    probabilityWithinHorizon: float | None
    horizonWeeks: int
    simulations: int
    savingsDeltaCent: int
    histogram: list[CompletionBin]
    historySample: list[int]


# get method that calls monte carlo (forecast.py) to check when a user will hit a savings bucket target
@router.get(
    "/goal/{bucket_id}",
    response_model=GoalForecastResponse,
    summary="Forecast when a savings goal will be reached",
    response_description="Probabilistic timeline for hitting a savings bucket's target",
)
def forecast_bucket_goal(
    bucket_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> GoalForecastResponse:
    """
    Estimate when the user will reach a savings goal using a Monte Carlo
    simulation over their historical net savings.

    Rather than assuming a fixed weekly savings rate, this resamples the user's
    real week-to-week savings history thousands of times to produce a
    distribution of outcomes: the median and 90th-percentile number of weeks to
    reach the goal, and the probability of reaching it within a year. Returns
    flags for goals already met or users with too little history to forecast.
    """
    bucket = db.exec(
        select(Bucket).where(Bucket.id == bucket_id, Bucket.userId == user_id)
    ).first()
    if bucket is None:
        raise HTTPException(status_code=404, detail="Bucket not found")

    history = weekly_net_savings(db, user_id)
    result = forecast_goal(
        history_cents=history,
        current_cents=bucket.currentToCent,
        target_cents=bucket.targetToCent,
    )
    return result




# on demand endpoint for monte carlo distribution in graph tile.
@router.get(
    "/goal/{bucket_id}/distribution",
    response_model=GoalDistributionResponse,
    summary="Completion-time distribution for a savings goal",
    response_description="Monte Carlo distribution of weeks-to-goal, with optional extra-savings what-if",
)
def forecast_bucket_goal_distribution(
    bucket_id: str,
    savingsDeltaCent: int = Query(
        0,
        description="Extra weekly savings to model, in cents (can be negative). Shifts every simulated weekly draw.",
    ),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> GoalDistributionResponse:
    bucket = db.exec(
        select(Bucket).where(Bucket.id == bucket_id, Bucket.userId == user_id)
    ).first()
    if bucket is None:
        raise HTTPException(status_code=404, detail="Bucket not found")
 
    history = weekly_net_savings(db, user_id)
    result = forecast_goal_distribution(
        history_cents=history,
        current_cents=bucket.currentToCent,
        target_cents=bucket.targetToCent,
        savings_delta_cents=savingsDeltaCent,
    )
    return result