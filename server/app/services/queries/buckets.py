from sqlmodel import Session, select

from app.models import Bucket


def _norm_words(text: str) -> set[str]:
    cleaned = "".join(c if c.isalnum() or c.isspace() else " " for c in text.lower())
    return {w for w in cleaned.split() if w}


def get_bucket_by_name(session: Session, user_id: str, name: str) -> dict | None:
    buckets = session.exec(
        select(Bucket).where(Bucket.userId == user_id)
    ).all()
    if not buckets:
        return None

    needle = name.strip().lower()
    query_words = _norm_words(name)

    exact = None
    best = None
    best_score = 0
    for b in buckets:
        bucket_name = b.name or ""
        if bucket_name.strip().lower() == needle:
            exact = b
            break
        overlap = len(query_words & _norm_words(bucket_name))
        if overlap > best_score:
            best_score = overlap
            best = b

    chosen = exact or (best if best_score > 0 else None)
    if chosen is None:
        return None

    return {
        "id": chosen.id,
        "name": chosen.name,
        "targetToCent": int(chosen.targetToCent),
        "currentToCent": int(chosen.currentToCent),
        "targetDate": chosen.targetDate,
    }

def list_bucket_names(session: Session, user_id: str) -> list[str]:
    rows = session.exec(
        select(Bucket.name).where(Bucket.userId == user_id)
    ).all()
    return [r for r in rows if r]