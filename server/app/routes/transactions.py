from typing import Literal

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
    search: str | None = Query(default=None),
    type: Literal["income", "expense"] | None = Query(default=None),
    category: str | None = Query(default=None),
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> TransactionsPage:
    """
    Return a paginated page of the authenticated user's transactions,
    newest first.

    All filters below are optional and combine — provide any mix of them
    to narrow the results, or omit all of them to get the unfiltered,
    newest-first page (the original behavior).

    - **accountId**: restrict to a single account.
    - **search**: case-insensitive substring match on merchant name.
    - **type**: "income" (negative amounts) or "expense" (positive amounts),
      per the Plaid sign convention.
    - **category**: exact match on transaction category.
    - **startDate** / **endDate**: restrict to transactions dated within
      this range, inclusive on both ends.
    """
    filters = [Transactions.userId == user_id]
    if account_id is not None:
        filters.append(Transactions.accountId == account_id)
    if search is not None:
        filters.append(Transactions.merchantName.ilike(f"%{search}%"))
    if type == "income":
        filters.append(Transactions.amountToCent < 0)
    elif type == "expense":
        filters.append(Transactions.amountToCent > 0)
    if category is not None:
        filters.append(Transactions.category == category)
    if start_date is not None:
        filters.append(Transactions.dateOf >= start_date)
    if end_date is not None:
        filters.append(Transactions.dateOf <= end_date)

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