"""
Plain SQL query functions that power the spending assistant.
"""

from calendar import monthrange
from datetime import date

from sqlmodel import Session, select, func

from app.models import Transactions


def get_largest_transaction(session: Session, user_id: str, year: int, month: int) -> dict | None:
    """
    Return the single largest spending transaction for `user_id` in the
    given calendar month, or None if there were no spending transactions
    that month.

    Amounts are returned as integer cents (never floats).
    """
    month_start = date(year, month, 1)
    month_end = date(year, month, monthrange(year, month)[1])

    statement = (
        select(Transactions)
        .where(Transactions.userId == user_id)
        .where(Transactions.amountToCent > 0)
        .where(Transactions.dateOf >= month_start)
        .where(Transactions.dateOf <= month_end)
        .order_by(Transactions.amountToCent.desc())
        .limit(1)
    )

    result = session.exec(statement).first()

    if result is None:
        return None

    return {
        "merchant_name": result.merchantName,
        "amount_cents": int(result.amountToCent),
        "category": result.category,
        "date": result.dateOf,
    }


def get_spending_by_category(session: Session, user_id: str, start: date, end: date) -> list[dict]:
    """
    Return total spending per category for `user_id` between `start` and
    `end` (inclusive), sorted by total spend descending. Returns [] if
    there is no spending in the range.

    Amounts are returned as integer cents (never floats).
    """
    statement = (
        select(
            Transactions.category,
            func.sum(Transactions.amountToCent).label("total_cents"),
        )
        .where(Transactions.userId == user_id)
        .where(Transactions.amountToCent > 0)
        .where(Transactions.dateOf >= start)
        .where(Transactions.dateOf <= end)
        .group_by(Transactions.category)
        .order_by(func.sum(Transactions.amountToCent).desc())
    )

    rows = session.exec(statement).all()

    return [
        {"category": category, "total_cents": int(total_cents)}
        for category, total_cents in rows
    ]