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


def _bootstrap_hit_weeks(
    history_cents: list[int],
    current_cents: int,
    target_cents: int,
    rng: np.random.Generator,
    savings_delta_cents: int = 0,
    horizon_weeks: int = 52,
    simulations: int = 10000,
    block_weeks: int = 8,
):
    history = np.asarray(history_cents, dtype=np.int64) + savings_delta_cents
    n = history.shape[0]
    block = max(1, min(block_weeks, n))
    blocks_needed = -(-horizon_weeks // block)  # ceil

    # (simulations x blocks_needed) random block start indices, wrapped circularly
    starts = rng.integers(0, n, size=(simulations, blocks_needed))
    offsets = np.arange(block)
    idx = (starts[:, :, None] + offsets[None, None, :]) % n  # (sims, blocks, block)

    draws = history[idx].reshape(simulations, blocks_needed * block)[:, :horizon_weeks]
    balances = current_cents + np.cumsum(draws, axis=1)

    reached = balances >= target_cents
    ever_reached = reached.any(axis=1)
    first_week = np.argmax(reached, axis=1) + 1
    return first_week[ever_reached], ever_reached


# forecasts when a savings goal is reached, as a distribution of possible outcomes
def forecast_goal(
    history_cents: list[int],
    current_cents: int,
    target_cents: int,
    horizon_weeks: int = 52,
    simulations: int = 10000,
    min_weeks: int = 8,
    seed: int | None = None,
    block_weeks: int = 8,
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

    # if there's not enough history to do monte carlo edge case
    if len(history_cents) < min_weeks:
        return {
            "alreadyReached": False,
            "insufficientHistory": True,
            "medianWeeks": None,
            "p90Weeks": None,
            "probabilityWithinHorizon": None,
        }

    rng = np.random.default_rng(seed)
    hit_weeks, ever_reached = _bootstrap_hit_weeks(
        history_cents,
        current_cents,
        target_cents,
        rng,
        savings_delta_cents=0,
        horizon_weeks=horizon_weeks,
        simulations=simulations,
        block_weeks=block_weeks,
    )

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


# function that powers monte carlo graph visualization in graph tile in dashboard page.
def forecast_goal_distribution(
    history_cents: list[int],
    current_cents: int,
    target_cents: int,
    savings_delta_cents: int = 0,
    horizon_weeks: int = 52,
    simulations: int = 10000,
    min_weeks: int = 8,
    seed: int | None = None,
    block_weeks: int = 8,
) -> dict:
    base = {
        "horizonWeeks": horizon_weeks,
        "savingsDeltaCent": savings_delta_cents,
        "historySample": list(history_cents),
    }

    # already met
    if target_cents <= current_cents:
        return {
            **base,
            "alreadyReached": True,
            "insufficientHistory": False,
            "p10Weeks": 0,
            "medianWeeks": 0,
            "p90Weeks": 0,
            "probabilityWithinHorizon": 1.0,
            "simulations": 0,
            "histogram": [],
        }

    # not enough history to simulate
    if len(history_cents) < min_weeks:
        return {
            **base,
            "alreadyReached": False,
            "insufficientHistory": True,
            "p10Weeks": None,
            "medianWeeks": None,
            "p90Weeks": None,
            "probabilityWithinHorizon": None,
            "simulations": 0,
            "histogram": [],
        }

    rng = np.random.default_rng(seed)
    hit_weeks, ever_reached = _bootstrap_hit_weeks(
        history_cents,
        current_cents,
        target_cents,
        rng,
        savings_delta_cents=savings_delta_cents,
        horizon_weeks=horizon_weeks,
        simulations=simulations,
        block_weeks=block_weeks,
    )

    if hit_weeks.size == 0:
        return {
            **base,
            "alreadyReached": False,
            "insufficientHistory": False,
            "p10Weeks": None,
            "medianWeeks": None,
            "p90Weeks": None,
            "probabilityWithinHorizon": 0.0,
            "simulations": simulations,
            "histogram": [],
        }

    counts = np.bincount(hit_weeks, minlength=horizon_weeks + 1)
    histogram = [
        {"week": int(w), "count": int(counts[w])}
        for w in range(1, horizon_weeks + 1)
        if counts[w] > 0
    ]

    return {
        **base,
        "alreadyReached": False,
        "insufficientHistory": False,
        "p10Weeks": int(np.percentile(hit_weeks, 10)),
        "medianWeeks": int(np.percentile(hit_weeks, 50)),
        "p90Weeks": int(np.percentile(hit_weeks, 90)),
        "probabilityWithinHorizon": round(float(ever_reached.mean()), 3),
        "simulations": simulations,
        "histogram": histogram,
    }