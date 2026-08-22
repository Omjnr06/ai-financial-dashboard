import re
from calendar import monthrange
from datetime import date

# categories that are tracked in backend, may need updating as more categories are made
KNOWN_CATEGORIES = ["Bills", "Dining", "Entertainment", "Groceries", "Shopping", "Transport"]

# key value pair of anything that folds into a broader category
_CATEGORY_SYNONYMS = {
    "dining": "Dining",
    "food": "Dining",
    "eating out": "Dining",
    "restaurant": "Dining",
    "restaurants": "Dining",
    "meals": "Dining",
    "takeout": "Dining",
    "groceries": "Groceries",
    "grocery": "Groceries",
    "entertainment": "Entertainment",
    "movies": "Entertainment",
    "games": "Entertainment",
    "fun": "Entertainment",
    "shopping": "Shopping",
    "shop": "Shopping",
    "clothes": "Shopping",
    "clothing": "Shopping",
    "retail": "Shopping",
    "transport": "Transport",
    "transportation": "Transport",
    "transit": "Transport",
    "commute": "Transport",
    "gas": "Transport",
    "uber": "Transport",
    "bills": "Bills",
    "bill": "Bills",
    "rent": "Bills",
    "utilities": "Bills",
    "subscriptions": "Bills",
    "subscription": "Bills",
}

_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

# what the query looks for to match for goal based functions
_GOAL_STOPWORDS = {
    "when", "will", "i", "afford", "my", "the", "a", "an", "can", "could",
    "how", "long", "until", "til", "till", "reach", "hit", "on", "track",
    "for", "to", "is", "be", "ready", "going", "am", "get", "getting",
    "goal", "fund", "by", "of", "have", "enough", "saved", "save", "saving",
    "close", "near", "there", "yet", "would", "it", "take", "does", "do",
}

# what the query looks for to match on account based functions
_ACCOUNT_STOPWORDS = {
    "what", "whats", "how", "much", "is", "in", "my", "the", "a", "an",
    "balance", "account", "of", "on", "s", "do", "i", "have", "left",
    "money", "available", "current", "show", "me", "for", "check", "whats",
    "there", "hold", "holding",
}

_AMOUNT_RE = re.compile(
    r"\$\s?([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?)"
)


def extract_category(question: str) -> str | None:
    q = question.lower()
    for phrase in sorted(_CATEGORY_SYNONYMS, key=len, reverse=True):
        if re.search(rf"\b{re.escape(phrase)}\b", q):
            return _CATEGORY_SYNONYMS[phrase]
    return None


def _resolve_month(question: str, today: date) -> tuple[int, int]:
    q = question.lower()
    if "last month" in q:
        y, m = today.year, today.month
        m -= 1
        if m == 0:
            m = 12
            y -= 1
        return y, m
    for name, num in _MONTHS.items():
        if re.search(rf"\b{name}\b", q):
            year = today.year if num <= today.month else today.year - 1
            return year, num
    return today.year, today.month


def period_range(question: str, today: date | None = None) -> tuple[date, date]:
    today = today or date.today()
    y, m = _resolve_month(question, today)
    start = date(y, m, 1)
    end = date(y, m, monthrange(y, m)[1])
    return start, end


def extract_timeframe(question: str) -> str:
    q = question.lower()
    if re.search(r"\btoday\b", q) or re.search(r"\bday\b", q):
        return "day"
    if re.search(r"\bmonth\b", q):
        return "month"
    if re.search(r"\bweek\b", q):
        return "week"
    return "week"


def extract_goal_phrase(question: str) -> str | None:
    q = re.sub(r"[^a-z0-9\s]", " ", question.lower())
    words = [w for w in q.split() if w not in _GOAL_STOPWORDS]
    phrase = " ".join(words).strip()
    return phrase or None


def extract_account_phrase(question: str) -> str | None:
    q = re.sub(r"[^a-z0-9\s]", " ", question.lower())
    words = [w for w in q.split() if w not in _ACCOUNT_STOPWORDS]
    phrase = " ".join(words).strip()
    return phrase or None


def extract_amount(question: str) -> int | None:
    m = _AMOUNT_RE.search(question.lower())
    if not m:
        return None
    raw = m.group(1) or m.group(2)
    raw = raw.replace(",", "")
    try:
        value = float(raw)
    except ValueError:
        return None
    return round(value * 100)


def extract_slots(intent_name: str, question: str, today: date | None = None) -> dict:
    today = today or date.today()
    if intent_name == "spending_by_category":
        start, end = period_range(question, today)
        return {"category": extract_category(question), "start": start, "end": end}
    if intent_name == "get_total_spending":
        start, end = period_range(question, today)
        return {"start": start, "end": end}
    if intent_name == "largest_transaction":
        year, month = _resolve_month(question, today)
        return {"year": year, "month": month}
    if intent_name == "safe_to_spend":
        return {"timeframe": extract_timeframe(question)}
    if intent_name == "goal_forecast":
        return {"goal": extract_goal_phrase(question)}
    return {}


# if __name__ == "__main__":
#     samples = [
#         ("spending_by_category", "how much did I spend on dining last month?"),
#         ("spending_by_category", "what did groceries cost me?"),
#         ("largest_transaction", "what was my biggest purchase in July?"),
#         ("largest_transaction", "biggest expense this month"),
#         ("safe_to_spend", "what's safe to spend today?"),
#         ("safe_to_spend", "how much can I spend this month?"),
#         ("goal_forecast", "when will I afford my new laptop?"),
#         ("goal_forecast", "am I on track for my textbooks goal?"),
#         ("goal_forecast", "when will my laptop fund be ready?"),
#         ("net_worth", "what's my net worth?"),
#         ("habits", "what are my spending habits?"),
#     ]
#     for intent_name, q in samples:
#         print(f"{intent_name:<22} {q}")
#         print(f"    -> {extract_slots(intent_name, q)}\n")

#     print("--- standalone extractors (for future intents) ---")
#     for q in ["can I afford a $1,200 laptop?", "is 50 dollars safe to spend?"]:
#         print(f"amount  {q!r:40} -> {extract_amount(q)}")
#     for q in ["what's my chequing balance?", "how much is in my wealthsimple cash?"]:
#         print(f"account {q!r:40} -> {extract_account_phrase(q)}")