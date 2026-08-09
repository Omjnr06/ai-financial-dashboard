from sqlmodel import Session, select
from datetime import date, timedelta
from collections import defaultdict

from app.models import Transactions

# for monte carlo methodw

# returns a list of weekly net savings (income - spending) in cents, one per week
def weekly_net_savings(db: Session, user_id: str, weeks_back: int = 26) -> list[int]:
    cutoff = date.today() - timedelta(weeks=weeks_back)

    txns = db.exec(
        select(Transactions).where(
            Transactions.userId == user_id,
            Transactions.dateOf >= cutoff,
        )
    ).all()

    # bucket each transaction into the Monday of its week, sum net per week
    weekly = defaultdict(int)
    for t in txns:
        week_start = t.dateOf - timedelta(days=t.dateOf.weekday())
        weekly[week_start] += t.amountToCent

    # in plaid spending is positive, income negative.
    # net savings = income - spending = -(sum of amounts)
    return [-v for v in weekly.values()]

# testing
if __name__ == "__main__":
    from app.core.database import engine

    TEST_USER_ID = "2wL0la6KMpuywFOSWCBChzM1XGVfsL5h"

    with Session(engine) as db:
        history = weekly_net_savings(db, TEST_USER_ID)
        print(f"weeks of data: {len(history)}")
        print(f"raw cents: {history}")
        print(f"in dollars: {[round(c / 100, 2) for c in history]}")