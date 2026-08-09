from sqlmodel import Session, select
from datetime import date, timedelta
from collections import defaultdict
import numpy as np

from app.models import Transactions

# for monte carlo methods

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


# forecasts when a savings goal is reached, as a distribution of 10,000 possibile outcomes
def forecast_goal(
    history_cents: list[int],
    current_cents: int,
    target_cents: int,
    horizon_weeks: int = 52,
    simulations: int = 10000,
    min_weeks: int = 8,
    seed: int | None = None,
) -> dict:
    # if the target is already met edge case
    if target_cents <= current_cents:
        return {
            "alreadyReached": True,
            "insufficientHistory": False,
            "medianWeeks": 0,
            "p90Weeks": 0,
            "probabilityWithinHorizon": 1.0,
        }

    # if  theres not enough history to do monte carlo edge casr
    if len(history_cents) < min_weeks:
        return {
            "alreadyReached": False,
            "insufficientHistory": True,
            "medianWeeks": None,
            "p90Weeks": None,
            "probabilityWithinHorizon": None,
        }

    rng = np.random.default_rng(seed)
    history = np.array(history_cents)

    # (simulations x horizon_weeks): each row a simulated future, each cell a resampled week
    draws = rng.choice(history, size=(simulations, horizon_weeks), replace=True)

    # running balance across each future, starting from current savings
    balances = current_cents + np.cumsum(draws, axis=1)

    reached = balances >= target_cents
    ever_reached = reached.any(axis=1)
    first_week = np.argmax(reached, axis=1) + 1
    hit_weeks = first_week[ever_reached]

    if hit_weeks.size == 0:
        return {
            "alreadyReached": False,
            "insufficientHistory": False,
            "medianWeeks": None,
            "p90Weeks": None,
            "probabilityWithinHorizon": 0.0,
        }

    return {
        "alreadyReached": False,
        "insufficientHistory": False,
        "medianWeeks": int(np.percentile(hit_weeks, 50)),
        "p90Weeks": int(np.percentile(hit_weeks, 90)),
        "probabilityWithinHorizon": round(float(ever_reached.mean()), 3),
    }


# testing
if __name__ == "__main__":
    from app.core.database import engine
    from app.models import Bucket
    from sqlmodel import select

    TEST_USER_ID = "2wL0la6KMpuywFOSWCBChzM1XGVfsL5h"

    with Session(engine) as db:
        history = weekly_net_savings(db, TEST_USER_ID)
        print(f"weeks of history: {len(history)}\n")

        buckets = db.exec(select(Bucket).where(Bucket.userId == TEST_USER_ID)).all()
        for b in buckets:
            result = forecast_goal(
                history_cents=history,
                current_cents=b.currentToCent,
                target_cents=b.targetToCent,
                seed=42,
            )
            print(f"{b.name} (${b.currentToCent/100:.0f} -> ${b.targetToCent/100:.0f}):")
            print(f"   {result}\n")