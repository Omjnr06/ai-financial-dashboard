from sqlmodel import Session, select
from sqlalchemy import func
from datetime import date, timedelta

from app.models import Accounts, Bills, Bucket, AccountType, PlaidItem, IncomeSource, IncomeFrequency

# how many days each timeframe window spans
_WINDOW_DAYS = {"day": 1, "week": 7, "month": 30}


# counts how many times a source pays out strictly after today, up to the horizon
def _paydays_in_window(source: IncomeSource, today: date, horizon: date) -> int:
    step = {
        IncomeFrequency.weekly: 7,
        IncomeFrequency.biweekly: 14,
        IncomeFrequency.monthly: None,
    }[source.frequency]

    count = 0
    if step is not None:
        payday = source.anchorDate
        if payday <= today:
            gap = (today - payday).days
            payday = payday + timedelta(days=((gap // step) + 1) * step)
        while payday <= horizon:
            if payday > today:
                count += 1
            payday += timedelta(days=step)
    else:
        day_of_month = source.anchorDate.day
        cursor = today
        while cursor <= horizon:
            try:
                payday = cursor.replace(day=day_of_month)
            except ValueError:
                payday = None
            if payday is not None and today < payday <= horizon:
                count += 1
            if cursor.month == 12:
                cursor = cursor.replace(year=cursor.year + 1, month=1, day=1)
            else:
                cursor = cursor.replace(month=cursor.month + 1, day=1)
    return count

# finds the next calendar date a given day-of-month falls on, from today forward
def _next_due_date(due_day: int, today: date) -> date:
    month = today.month
    year = today.year
    for _ in range(13):
        try:
            candidate = date(year, month, due_day)
        except ValueError:
            candidate = None
        if candidate is not None and candidate >= today:
            return candidate
        if month == 12:
            month = 1
            year += 1
        else:
            month += 1
    return date(year, month, min(due_day, 28))


# projects net income landing within the timeframe window that hasnt arrived yet (using income sources and time windows)
def income_in_window(db: Session, user_id: str, timeframe: str, account_id: str | None = None) -> int:
    today = date.today()
    window_days = _WINDOW_DAYS.get(timeframe, 7)
    horizon = today + timedelta(days=window_days)

    sources = db.exec(
        select(IncomeSource).where(
            IncomeSource.userId == user_id,
            IncomeSource.active == True,
        )
    ).all()

    total = 0
    for source in sources:
        payouts = _paydays_in_window(source, today, horizon)
        if payouts == 0:
            continue
        amount = source.amountToCent * payouts

        if account_id is None:
            #internal transfers are money already counted, so skip them
            if source.isInternalTransfer:
                continue
            total += amount
        else:
            # money landing in this account counts as arriving
            if source.accountId == account_id:
                total += amount
            # money leaving this account reduces it
            if source.isInternalTransfer and source.sourceAccountId == account_id:
                total -= amount

    return total


# function for calculating the amount safe for each user to spend
def calculate_safe_to_spend(db: Session, user_id: str, account_id: str | None = None, timeframe: str = "week") -> dict:
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
    window_days = _WINDOW_DAYS.get(timeframe, 7)
    horizon = today + timedelta(days=window_days)
    bills_rows_query = select(Bills).where(
        Bills.userId == user_id,
        Bills.active == True,
    )
    if account_id is not None:
        bills_rows_query = bills_rows_query.where(Bills.accountId == account_id)
    bill_rows = db.exec(bills_rows_query).all()
    upcoming_bills = sum(
        b.amountToCent for b in bill_rows
        if today <= _next_due_date(b.dueDay, today) <= horizon
    )

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

    income = income_in_window(db, user_id, timeframe, account_id)

 # safe to spend formula 
    safe_to_spend = balance + income - upcoming_bills - goal_allocations - threshold

    return {
        "accountId": account_id,
        "safeToSpendCent": safe_to_spend,
        "balanceCent": balance,
        "incomeCent": income,
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

# method for returning all a users accounts, returns a lists of all the accounts
def get_accounts(db: Session, user_id: str) -> list[dict]:
    rows = db.exec(
        select(Accounts, PlaidItem.institutionName)
        .join(PlaidItem, Accounts.plaidItemId == PlaidItem.id)
        .where(Accounts.userId == user_id)
        .order_by(Accounts.createdAt)
    ).all()
    return [
        {
            "id": account.id,
            "institutionName": institution_name,
            "name": account.name,
            "accountType": account.accountType,
            "currentBalanceToCent": account.currentBalanceToCent,
            "availableBalanceToCent": account.availableBalanceToCent,
            "limitToCent": account.limitToCent,
        }
        for account, institution_name in rows
    ]