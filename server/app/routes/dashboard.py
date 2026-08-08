from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.database import get_session
from app.models import AccountType
from app.calculations import calculate_safe_to_spend, calculate_net_worth, get_accounts

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class SafeToSpendResponse(BaseModel):
    accountId: str | None
    safeToSpendCent: int
    balanceCent: int
    incomeCent: int
    upcomingBillsCent: int
    goalAllocationsCent: int
    thresholdCent: int


class AccountResponse(BaseModel):
    id: str
    institutionName: str | None
    name: str
    accountType: AccountType
    currentBalanceToCent: int
    availableBalanceToCent: int | None
    limitToCent: int | None


class NetWorthResponse(BaseModel):
    netWorthCent: int
    assetsCent: int
    debtsCent: int


class AccountsSummaryResponse(BaseModel):
    netWorth: NetWorthResponse
    aggregateSafeToSpend: SafeToSpendResponse
    accounts: list[AccountResponse]


# get endpoint for the safe to spend of the user
@router.get(
    "/safe-to-spend",
    response_model=SafeToSpendResponse,
    summary="Get the user's safe-to-spend figure",
    response_description="Safe to spend plus its component breakdown, in cents",
)
def safe_to_spend(
    account_id: str | None = Query(default=None, alias="accountId"),
    timeframe: str = Query(default="week", pattern="^(day|week|month)$"),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> SafeToSpendResponse:
    """
    Compute the hero metric: how much the user can safely spend right now.

    Returns **balance + projected income − upcoming bills − goal allocations −
    threshold**, all in integer cents, with each component broken out for the
    dashboard. Income is projected over a timeframe window (day, week, or
    month) and only counts paydays that have not yet arrived, so it never
    counts the money already in the balance twice. Internal transfers between the
    user's own accounts are excluded from the aggregate but count toward the
    destination account's per account figure.
    """
    return calculate_safe_to_spend(db, user_id, account_id, timeframe)

# endpoint for getting all authenticated users asscounts
@router.get(
    "/accounts",
    response_model=list[AccountResponse],
    summary="List the user's connected accounts",
    response_description="Every connected account with its institution and type",
)
def accounts(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[AccountResponse]:
    """
    List every account the authenticated user has connected across all
    institutions.

    Each account carries its normalized **type** (spending, credit, savings,
    investment, loan) and its institution name, so the dashboard can render the
    cross-account view and pick the right hero metric per account.
    """
    return get_accounts(db, user_id)

# end point for networth, lals the helper net worth function from calculations
@router.get(
    "/net-worth",
    response_model=NetWorthResponse,
    summary="Get the user's net worth",
    response_description="Assets minus debts across all accounts, in cents",
)
def net_worth(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> NetWorthResponse:
    """
    Compute the user's net worth across every connected account.

    Net worth is **assets − debts**: spending, savings, and investment balances
    count as assets; credit and loan balances count as debts. All values are in
    integer cents.
    """
    return calculate_net_worth(db, user_id)

# endpoint for getting an account summary for each account
@router.get(
    "/summary",
    response_model=AccountsSummaryResponse,
    summary="Get the cross-account dashboard summary",
    response_description="Net worth, aggregate safe-to-spend, and the account list",
)
def summary(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> AccountsSummaryResponse:
    """
    The single cross-account dashboard payload.

    Bundles **net worth**, the **aggregate safe-to-spend** across all spending
    accounts, and the full **account list** into one response so the dashboard
    can render the summary view in a single request.
    """
    return {
        "netWorth": calculate_net_worth(db, user_id),
        "aggregateSafeToSpend": calculate_safe_to_spend(db, user_id),
        "accounts": get_accounts(db, user_id),
    }