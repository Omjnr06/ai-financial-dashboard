from sqlmodel import Session, select
from sqlalchemy import func
from datetime import date

from app.models import Accounts, Bills, Bucket, AccountType


# function for calculating the amount safe for each user to spend
def calculate_safe_to_spend(db: Session, user_id: str, account_id: str | None = None) -> dict:
    today = date.today()

    # calculate balance(ignore credit cards)
    balance_query = select(func.sum(Accounts.currentBalanceToCent)).where(
        Accounts.userId == user_id,
        Accounts.accountType == AccountType.spending,
    )
    if account_id is not None:
        balance_query = balance_query.where(Accounts.id == account_id)
    balance = db.exec(balance_query).one() or 0

    # get the upcoming bills
    bills_query = select(func.sum(Bills.amountToCent)).where(
        Bills.userId == user_id,
        Bills.active == True,
        Bills.dueDay >= today.day,
    )
    if account_id is not None:
        bills_query = bills_query.where(Bills.accountId == account_id)
    upcoming_bills = db.exec(bills_query).one() or 0

    # get the goal amounts
    buckets_query = select(func.sum(Bucket.currentToCent)).where(
        Bucket.userId == user_id,
    )
    if account_id is not None:
        buckets_query = buckets_query.where(Bucket.accountId == account_id)
    goal_allocations = db.exec(buckets_query).one() or 0

    # the users safety buffer (amount they dont want their account to go under)
    threshold_query = select(func.sum(Accounts.safeToSpendThresholdCent)).where(
        Accounts.userId == user_id,
        Accounts.accountType == AccountType.spending,
    )
    if account_id is not None:
        threshold_query = threshold_query.where(Accounts.id == account_id)
    threshold = db.exec(threshold_query).one() or 0

 # safe to spend formula 
    safe_to_spend = balance - upcoming_bills - goal_allocations - threshold

    return {
        "accountId": account_id,
        "safeToSpendCent": safe_to_spend,
        "balanceCent": balance,
        "upcomingBillsCent": upcoming_bills,
        "goalAllocationsCent": goal_allocations,
        "thresholdCent": threshold,
    }


def calculate_net_worth(db: Session, user_id: str) -> dict:
    assets = db.exec(
        select(func.sum(Accounts.currentBalanceToCent)).where(
            Accounts.userId == user_id,
            Accounts.accountType.in_([
                AccountType.spending, AccountType.savings, AccountType.investment
            ]),
        )
    ).one() or 0
    debts = db.exec(
        select(func.sum(Accounts.currentBalanceToCent)).where(
            Accounts.userId == user_id,
            Accounts.accountType.in_([AccountType.credit, AccountType.loan]),
        )
    ).one() or 0
    return {
        "netWorthCent": assets - debts,
        "assetsCent": assets,
        "debtsCent": debts,
    }