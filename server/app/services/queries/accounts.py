from sqlmodel import Session, select

from app.models import Accounts

# companion functions for getting a specific account. Used for chatbot

def _norm_words(text: str) -> set[str]:
    cleaned = "".join(c if c.isalnum() or c.isspace() else " " for c in text.lower())
    return {w for w in cleaned.split() if w}


def get_account_by_name(session: Session, user_id: str, name: str) -> dict | None:
    accounts = session.exec(
        select(Accounts).where(Accounts.userId == user_id)
    ).all()
    if not accounts:
        return None

    needle = name.strip().lower()
    query_words = _norm_words(name)

    exact = None
    best = None
    best_score = 0
    for a in accounts:
        acct_name = a.name or ""
        if acct_name.strip().lower() == needle:
            exact = a
            break
        overlap = len(query_words & _norm_words(acct_name))
        if overlap > best_score:
            best_score = overlap
            best = a

    chosen = exact or (best if best_score > 0 else None)
    if chosen is None:
        return None

    return {
        "id": chosen.id,
        "name": chosen.name,
        "accountType": chosen.accountType,
        "currentBalanceToCent": chosen.currentBalanceToCent,
        "availableBalanceToCent": chosen.availableBalanceToCent,
        "limitToCent": chosen.limitToCent,
    }