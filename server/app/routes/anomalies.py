from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.services.anomaly_detection import detect_anomalies

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])


# post method for detecting a user anomaly transaction
@router.post(
    "/detect",
    summary="Detect anomalous transactions",
    response_description="How many transactions were scanned and flagged as anomalies",
)
def detect(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """
    Scan the user's recent transactions and flag unusual ones.

    Runs an Isolation Forest over each transaction's amount, its size relative
    to its category's norm, and the total spent at that merchant on that day, so
    that unusually large charges and single-day splurges are flagged while small
    or ordinary spending is left alone. Flags are written to each transaction's
    **isAnomaly** field. Safe to re-run; each run reflects the latest data.
    """
    return detect_anomalies(db, user_id)