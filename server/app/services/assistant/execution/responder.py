import random
from datetime import date

from app.services.assistant.execution.registry import DispatchResult

# file to turn dispatch result from whitelist registry to a set of english answers that one is randomly then selected

def _money(cents: int) -> str:
    sign = "-" if cents < 0 else ""
    return f"{sign}${abs(cents) / 100:,.2f}"


def _date_label(d: date) -> str:
    return f"{d:%b} {d.day}"


def _month_label(start: date) -> str:
    return f"{start:%B %Y}"


def _pick(options: list[str]) -> str:
    return random.choice(options)


_SLOT_PROMPTS = {
    "category": [
        "Which category did you mean — Dining, Groceries, Transport, Shopping, Entertainment, or Bills?",
        "Sure — which category? Dining, Groceries, Transport, Shopping, Entertainment, or Bills.",
    ],
    "goal": [
        "Which savings goal do you mean?",
        "Which goal are you asking about?",
    ],
}

_UNKNOWN = [
    "I can't answer that one yet.",
    "That's outside what I can help with right now.",
]

_FOLLOWUPS = {
    "get_total_spending": ["Want a single category broken out?"],
    "spending_by_category": ["Want last month's number too?", "I can break that down by merchant if useful."],
    "safe_to_spend": ["Want the full breakdown of bills and buffer?"],
    "net_worth": ["Want to see it split by account?"],
    "goal_forecast": ["Want to check another goal?"],
    "largest_transaction": ["Want your top few for the month?"],
}


def _maybe_followup(intent: str) -> str:
    opts = _FOLLOWUPS.get(intent)
    if opts and random.random() < 0.4:
        return " " + _pick(opts)
    return ""


def _say_spending_by_category(data: dict) -> str:
    cat = data["category"]
    total = data["total_cents"]
    when = _month_label(data["start"])
    if total == 0:
        return _pick([
            f"You haven't spent anything on {cat} in {when}.",
            f"Nothing on {cat} in {when} — that category's clear.",
        ])
    amount = _money(total)
    return _pick([
        f"You've spent {amount} on {cat} in {when}.",
        f"{cat} came to {amount} in {when}.",
        f"So far in {when}, {cat} adds up to {amount}.",
    ])


def _say_total_spending(data: dict) -> str:
    total = data["total_cents"]
    when = _month_label(data["start"])
    cats = data["categories"]
    if total == 0:
        return _pick([
            f"You haven't spent anything in {when} yet.",
            f"No spending on record for {when}.",
        ])
    top = ", ".join(f"{c['category']} ({_money(c['total_cents'])})" for c in cats[:2])
    return _pick([
        f"You've spent {_money(total)} in {when} — mostly {top}.",
        f"Total spending in {when} is {_money(total)}. Top categories: {top}.",
        f"In {when} you've spent {_money(total)}, led by {top}.",
    ])


def _say_largest_transaction(data: dict | None) -> str:
    if data is None:
        return _pick([
            "I don't see any spending for that month.",
            "No purchases on record for that month.",
        ])
    amount = _money(data["amount_cents"])
    merchant = data["merchant_name"] or "an unknown merchant"
    cat = data["category"] or "Uncategorized"
    when = _date_label(data["date"])
    return _pick([
        f"Your biggest purchase was {amount} at {merchant} ({cat}) on {when}.",
        f"The largest was {amount} — {merchant}, {cat}, on {when}.",
    ])


def _say_safe_to_spend(data: dict, slots: dict) -> str:
    amount = data["safeToSpendCent"]
    tf = slots.get("timeframe", "week")
    window = {"day": "today", "week": "this week", "month": "this month"}.get(tf, "this week")
    if amount <= 0:
        return _pick([
            f"You're stretched thin {window} — after bills and your buffer there's nothing safe to spend.",
            f"Nothing safe to spend {window}; your commitments already cover your available balance.",
        ])
    return _pick([
        f"You've got {_money(amount)} safe to spend {window}.",
        f"Safe to spend {window}: {_money(amount)}.",
        f"After bills and your buffer, {_money(amount)} is free {window}.",
    ])


def _say_net_worth(data: dict) -> str:
    nw = data["netWorthCent"]
    assets = _money(data["assetsCent"])
    debts = _money(data["debtsCent"])
    if nw < 0:
        return _pick([
            f"Your net worth is {_money(nw)} — debts ({debts}) currently outweigh assets ({assets}).",
            f"Right now you're at {_money(nw)}: {assets} in assets against {debts} in debts.",
        ])
    return _pick([
        f"Your net worth is {_money(nw)} — {assets} in assets minus {debts} in debts.",
        f"You're worth {_money(nw)} net: {assets} in assets, {debts} in debts.",
    ])


def _say_goal_forecast(data: dict) -> str:
    bucket = data["bucket"]
    f = data["forecast"]
    name = bucket["name"]
    if f["alreadyReached"]:
        return _pick([
            f"You've already hit your {name} goal — nicely done.",
            f"{name} is fully funded. Done!",
        ])
    if f["insufficientHistory"]:
        return _pick([
            f"I don't have enough saving history yet to forecast {name}.",
            f"Not enough data yet to project {name} — check back after a few more weeks.",
        ])
    prob = f["probabilityWithinHorizon"]
    median = f["medianWeeks"]
    if not prob or median is None:
        return _pick([
            f"At your current pace, {name} isn't reachable within a year.",
            f"{name} looks out of reach on your next-year trajectory.",
        ])
    pct = round(prob * 100)
    if prob >= 0.8:
        vibe = _pick(["you're on track", "you're in good shape"])
    elif prob >= 0.5:
        vibe = _pick(["it's likely", "you're more likely than not"])
    else:
        vibe = _pick(["it's a stretch", "it'll be tight"])
    return _pick([
        f"For {name}, {vibe} — about {median} weeks at the median, with a {pct}% chance within a year.",
        f"{name}: {vibe}. Median around {median} weeks, {pct}% likely within the year.",
    ])


def _say_habits(data: dict | None) -> str:
    if data is None or data.get("insufficientData"):
        return _pick([
            "I don't have enough history yet to describe your spending habits.",
            "Not enough data yet to map out your habits.",
        ])
    current = data.get("currentClusterLabel")
    labels = [c["label"] for c in data.get("clusters", [])]
    unique = ", ".join(labels)
    return _pick([
        f"Your weeks sort into a few patterns: {unique}. Lately you're in {current.lower()}.",
        f"I see these spending patterns: {unique}. This past week looks like {current.lower()}.",
    ])


def _say_not_found(result: DispatchResult) -> str:
    phrase = result.detail
    names = (result.data or {}).get("available")
    if names:
        listed = ", ".join(names)
        return _pick([
            f'I couldn\'t find a goal called "{phrase}". Your goals are: {listed}.',
            f'No goal named "{phrase}" — you\'ve got: {listed}.',
        ])
    return f'I couldn\'t find a goal called "{phrase}".'


def build_answer(result: DispatchResult) -> str:
    if result.status == "unknown":
        return _pick(_UNKNOWN)
    if result.status == "need_slot":
        prompts = _SLOT_PROMPTS.get(result.missing_slot)
        return _pick(prompts) if prompts else "I need a bit more detail to answer that."
    if result.status == "not_found":
        return _say_not_found(result)

    intent = result.intent
    data = result.data
    slots = result.slots or {}

    if intent == "spending_by_category":
        answer = _say_spending_by_category(data)
    elif intent == "get_total_spending":
        answer = _say_total_spending(data)
    elif intent == "largest_transaction":
        answer = _say_largest_transaction(data)
    elif intent == "safe_to_spend":
        answer = _say_safe_to_spend(data, slots)
    elif intent == "net_worth":
        answer = _say_net_worth(data)
    elif intent == "goal_forecast":
        answer = _say_goal_forecast(data)
    elif intent == "habits":
        answer = _say_habits(data)
    else:
        return "I can't answer that one yet."

    return answer + _maybe_followup(intent)