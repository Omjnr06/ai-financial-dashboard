"""
Plain SQL query functions that power the spending assistant.
"""

from calendar import monthrange
from datetime import date, timedelta

from sqlmodel import Session, select, func
from sqlalchemy import and_

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


def _month_floor(d: date, months_back: int) -> date:
    m = d.month - months_back
    y = d.year + (m - 1) // 12
    m = (m - 1) % 12 + 1
    return date(y, m, 1)


def _as_date(v):
    return v.date() if hasattr(v, "date") else v


def spend_summary(
    session: Session,
    user_id: str,
    account_id: str | None = None,
    weeks: int = 12,
    months: int = 6,
    recent_days: int = 90,
    recent_limit: int = 400,
) -> dict:
    """
    Pre-aggregated spend rollups for the dashboard graph tile: weekly and
    monthly spend, a category + merchant breakdown, and a bounded set of recent
    spend points for the anomaly scatter.

    Amounts follow Plaid's convention (spending positive), as integer cents.
    Keys are snake_case; the API layer serialises them to camelCase.
    """
    today = date.today()

    def spend_where(extra: list | None = None):
        f = [Transactions.userId == user_id, Transactions.amountToCent > 0]
        if account_id:
            f.append(Transactions.accountId == account_id)
        if extra:
            f.extend(extra)
        return and_(*f)

    wk = func.date_trunc("week", Transactions.dateOf).label("bucket")
    weekly_rows = session.exec(
        select(wk, func.sum(Transactions.amountToCent).label("total_cents"))
        .where(spend_where([Transactions.dateOf >= today - timedelta(weeks=weeks)]))
        .group_by(wk)
        .order_by(wk)
    ).all()
    weekly = [
        {"week_start": _as_date(bucket).isoformat(), "spent_cents": int(total_cents or 0)}
        for bucket, total_cents in weekly_rows
    ]

    mo = func.date_trunc("month", Transactions.dateOf).label("bucket")
    monthly_rows = session.exec(
        select(mo, func.sum(Transactions.amountToCent).label("total_cents"))
        .where(spend_where([Transactions.dateOf >= _month_floor(today, months - 1)]))
        .group_by(mo)
        .order_by(mo)
    ).all()
    monthly = [
        {"month": _as_date(bucket).strftime("%Y-%m"), "spent_cents": int(total_cents or 0)}
        for bucket, total_cents in monthly_rows
    ]

    cat_rows = session.exec(
        select(
            Transactions.category,
            Transactions.merchantName,
            func.sum(Transactions.amountToCent).label("total_cents"),
        )
        .where(spend_where([Transactions.dateOf >= today - timedelta(weeks=weeks)]))
        .group_by(Transactions.category, Transactions.merchantName)
    ).all()

    cat_map: dict[str, dict] = {}
    for category, merchant, total_cents in cat_rows:
        c = category or "Other"
        m = merchant or "Unknown"
        entry = cat_map.setdefault(c, {"category": c, "spent_cents": 0, "_m": {}})
        entry["spent_cents"] += int(total_cents or 0)
        entry["_m"][m] = entry["_m"].get(m, 0) + int(total_cents or 0)

    categories = []
    for entry in cat_map.values():
        merchants = sorted(
            ({"name": k, "spent_cents": v} for k, v in entry["_m"].items()),
            key=lambda x: -x["spent_cents"],
        )
        categories.append(
            {"category": entry["category"], "spent_cents": entry["spent_cents"], "merchants": merchants}
        )
    categories.sort(key=lambda x: -x["spent_cents"])

    points = session.exec(
        select(Transactions)
        .where(spend_where([Transactions.dateOf >= today - timedelta(days=recent_days)]))
        .order_by(Transactions.dateOf.desc())
        .limit(recent_limit)
    ).all()
    recent_points = [
        {
            "date_of": p.dateOf.isoformat(),
            "amount_to_cent": p.amountToCent,
            "merchant_name": p.merchantName,
            "is_anomaly": p.isAnomaly,
        }
        for p in points
    ]

    return {
        "weekly": weekly,
        "monthly": monthly,
        "categories": categories,
        "recent_points": recent_points,
        "has_spend": bool(weekly or categories),
    }