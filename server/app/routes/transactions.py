from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, and_
from sqlmodel import Session, select
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import date

from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.models import Transactions
from app.services.queries.spending import spend_summary

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# shape of response of a transaction
class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    accountId: str
    dateOf: date
    amountToCent: int
    merchantName: str | None
    category: str | None
    pending: bool
    isAnomaly: bool


# paginated envelope for the transactions list
class TransactionsPage(BaseModel):
    items: list[TransactionResponse]
    total: int
    limit: int
    offset: int
    hasMore: bool

class SpendWeekly(CamelModel):
    week_start: date
    spent_cents: int


class SpendMonthly(CamelModel):
    month: str
    spent_cents: int


class SpendMerchant(CamelModel):
    name: str
    spent_cents: int


class SpendCategory(CamelModel):
    category: str
    spent_cents: int
    merchants: list[SpendMerchant]


class SpendPoint(CamelModel):
    date_of: date
    amount_to_cent: int
    merchant_name: str | None
    is_anomaly: bool


class SpendSummaryResponse(CamelModel):
    weekly: list[SpendWeekly]
    monthly: list[SpendMonthly]
    categories: list[SpendCategory]
    recent_points: list[SpendPoint]
    has_spend: bool


# paginated list of the user's transactions, newest first
@router.get(
    "",
    response_model=TransactionsPage,
    summary="List the user's transactions (paginated)",
    response_description="A page of the user's transactions, most recent first",
)
def list_transactions(
    account_id: str | None = Query(default=None, alias="accountId"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> TransactionsPage:
    
    filters = [Transactions.userId == user_id]
    if account_id is not None:
        filters.append(Transactions.accountId == account_id)

    total = db.exec(
        select(func.count(Transactions.id)).where(and_(*filters))
    ).one()

    items = db.exec(
        select(Transactions)
        .where(and_(*filters))
        .order_by(Transactions.dateOf.desc(), Transactions.id)
        .limit(limit)
        .offset(offset)
    ).all()

    return TransactionsPage(
        items=items,
        total=int(total),
        limit=limit,
        offset=offset,
        hasMore=offset + len(items) < int(total),
    )


#  group by aggreagation done server side so transactions can be read as small payload
@router.get(
    "/summary",
    response_model=SpendSummaryResponse,
    summary="Aggregated spend rollups for the graph tile",
    response_description="Weekly / monthly / category spend plus recent points for charts",
)
def transactions_summary(
    account_id: str | None = Query(default=None, alias="accountId"),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> SpendSummaryResponse:
    return spend_summary(session=db, user_id=user_id, account_id=account_id)