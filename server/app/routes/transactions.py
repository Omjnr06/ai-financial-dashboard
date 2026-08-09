from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import date
from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.models import Transactions

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

# shape of response of a transaction
class TransactionResponse(BaseModel):
    id: str
    accountId: str
    dateOf: date
    amountToCent: int
    merchantName: str | None
    category: str | None
    pending: bool
    isAnomaly: bool


# get method for getting all of a users transactions
@router.get(
    "",
    response_model=list[TransactionResponse],
    summary="List the user's transactions",
    response_description="The user's transactions, most recent first",
)
def list_transactions(
    account_id: str | None = Query(default=None, alias="accountId"),
    limit: int = Query(default=50, le=200),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[TransactionResponse]:
    """
    List the authenticated user's transactions, newest first.

    Optionally filter to a single account with **accountId**, and cap the number
    returned with **limit** (default 50, max 200). Amounts follow Plaid's
    convention: spending is positive, income negative.
    """
    query = select(Transactions).where(Transactions.userId == user_id)
    if account_id is not None:
        query = query.where(Transactions.accountId == account_id)
    query = query.order_by(Transactions.dateOf.desc()).limit(limit)
    return db.exec(query).all()