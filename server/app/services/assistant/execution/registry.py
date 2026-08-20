from dataclasses import dataclass
from typing import Any

from sqlmodel import Session

from app.services.assistant.nlu.intents import INTENTS_BY_NAME
from app.services.calculations import calculate_net_worth, calculate_safe_to_spend
from app.services.forecasting import forecast_goal, weekly_net_savings
from app.services.habit_clustering import get_cached_habits
from app.services.queries.spending import get_largest_transaction, get_spending_by_category
from app.services.queries.buckets import get_bucket_by_name, list_bucket_names

# whitelist function it is the middleware that maps the built functions to the chatbot.
# If the function doesnt exist here, or theres info missing from the query, the backedn will return null
# need to remember to add edge cases in UI/UX

@dataclass
class DispatchResult:
    status: str
    intent: str
    data: Any = None
    slots: dict | None = None
    missing_slot: str | None = None
    detail: str | None = None


def _handle_spending_by_category(db: Session, user_id: str, slots: dict) -> DispatchResult:
    category = slots["category"]
    rows = get_spending_by_category(db, user_id, slots["start"], slots["end"])
    total = next((r["total_cents"] for r in rows if r["category"] == category), 0)
    return DispatchResult(
        status="ok",
        intent="spending_by_category",
        data={
            "category": category,
            "total_cents": total,
            "start": slots["start"],
            "end": slots["end"],
        },
        slots=slots,
    )


def _handle_total_spending(db: Session, user_id: str, slots: dict) -> DispatchResult:
    rows = get_spending_by_category(db, user_id, slots["start"], slots["end"])
    total = sum(r["total_cents"] for r in rows)
    return DispatchResult(
        status="ok",
        intent="get_total_spending",
        data={"total_cents": total, "categories": rows, "start": slots["start"], "end": slots["end"]},
        slots=slots,
    )


def _handle_largest_transaction(db: Session, user_id: str, slots: dict) -> DispatchResult:
    result = get_largest_transaction(db, user_id, slots["year"], slots["month"])
    return DispatchResult(status="ok", intent="largest_transaction", data=result, slots=slots)


def _handle_safe_to_spend(db: Session, user_id: str, slots: dict) -> DispatchResult:
    result = calculate_safe_to_spend(db, user_id, None, slots["timeframe"])
    return DispatchResult(status="ok", intent="safe_to_spend", data=result, slots=slots)


def _handle_net_worth(db: Session, user_id: str, slots: dict) -> DispatchResult:
    result = calculate_net_worth(db, user_id)
    return DispatchResult(status="ok", intent="net_worth", data=result, slots=slots)


def _handle_goal_forecast(db: Session, user_id: str, slots: dict) -> DispatchResult:
    bucket = get_bucket_by_name(db, user_id, slots["goal"])
    if bucket is None:
        return DispatchResult(
            status="not_found",
            intent="goal_forecast",
            slots=slots,
            detail=slots["goal"],
            data={"available": list_bucket_names(db, user_id)},
        )
    history = weekly_net_savings(db, user_id)
    forecast = forecast_goal(history, bucket["currentToCent"], bucket["targetToCent"])
    return DispatchResult(
        status="ok",
        intent="goal_forecast",
        data={"bucket": bucket, "forecast": forecast},
        slots=slots,
    )


def _handle_habits(db: Session, user_id: str, slots: dict) -> DispatchResult:
    result = get_cached_habits(db, user_id)
    return DispatchResult(status="ok", intent="habits", data=result, slots=slots)


_HANDLERS = {
    "spending_by_category": _handle_spending_by_category,
    "get_total_spending": _handle_total_spending,
    "largest_transaction": _handle_largest_transaction,
    "safe_to_spend": _handle_safe_to_spend,
    "net_worth": _handle_net_worth,
    "goal_forecast": _handle_goal_forecast,
    "habits": _handle_habits,
}


def dispatch(db: Session, user_id: str, intent_name: str, slots: dict) -> DispatchResult:
    if not user_id:
        raise ValueError("user_id is required and must come from the authenticated session")

    handler = _HANDLERS.get(intent_name)
    intent = INTENTS_BY_NAME.get(intent_name)
    if handler is None or intent is None:
        return DispatchResult(status="unknown", intent=intent_name, slots=slots)

    for slot_name in intent.required_slots:
        if slots.get(slot_name) in (None, ""):
            return DispatchResult(
                status="need_slot", intent=intent_name, slots=slots, missing_slot=slot_name
            )

    return handler(db, user_id, slots)