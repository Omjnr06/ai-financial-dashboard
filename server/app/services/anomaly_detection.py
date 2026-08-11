from sqlmodel import Session, select
from datetime import date, timedelta
from collections import defaultdict
import numpy as np
from sklearn.ensemble import IsolationForest

from app.models import Transactions


def build_features(db: Session, user_id: str, days_back: int = 365) -> tuple[list[str], np.ndarray, list[bool]]:
    cutoff = date.today() - timedelta(days=days_back)

    txns = db.exec(
        select(Transactions).where(
            Transactions.userId == user_id,
            Transactions.dateOf >= cutoff,
            Transactions.amountToCent > 0,
        )
    ).all()

    if not txns:
        return [], np.empty((0, 3)), []

    category_totals: dict[str, int] = defaultdict(int)
    category_counts: dict[str, int] = defaultdict(int)
    # total spent at one merchant on one day -> captures splurges (spree), not small-charge counts
    merchant_day_spend: dict[tuple[str, date], int] = defaultdict(int)
    for t in txns:
        cat = t.category or "Uncategorized"
        category_totals[cat] += t.amountToCent
        category_counts[cat] += 1
        merchant_day_spend[(t.merchantName or "Unknown", t.dateOf)] += t.amountToCent
    category_mean = {
        cat: category_totals[cat] / category_counts[cat] for cat in category_totals
    }

    ids: list[str] = []
    rows: list[list[float]] = []
    above_category: list[bool] = []
    for t in txns:
        cat = t.category or "Uncategorized"
        mean = category_mean[cat] or 1
        amount = float(t.amountToCent)
        category_ratio = amount / mean
        day_spend = float(merchant_day_spend[(t.merchantName or "Unknown", t.dateOf)])
        ids.append(t.id)
        rows.append([amount, category_ratio, day_spend])
        # "significant" if the charge itself is large OR the day's spend at this merchant is large
        above_category.append(amount >= mean or day_spend >= 2 * mean)

    return ids, np.array(rows), above_category


def detect_anomalies(db: Session, user_id: str, contamination: float = 0.02) -> dict:
    ids, features, above_category = build_features(db, user_id)
    if len(ids) < 20:
        return {"flagged": 0, "scanned": len(ids), "insufficientData": True}

    model = IsolationForest(contamination=contamination, random_state=42)
    predictions = model.fit_predict(features)

    flagged_ids = {
        ids[i]
        for i in range(len(ids))
        if predictions[i] == -1 and above_category[i]
    }

    txns = db.exec(
        select(Transactions).where(Transactions.userId == user_id)
    ).all()
    flagged_count = 0
    for t in txns:
        should_flag = t.id in flagged_ids
        if t.isAnomaly != should_flag:
            t.isAnomaly = should_flag
            db.add(t)
        if should_flag:
            flagged_count += 1
    db.commit()

    return {"flagged": flagged_count, "scanned": len(ids), "insufficientData": False}


# if __name__ == "__main__":
#     from app.core.database import engine

#     TEST_USER_ID = "2wL0la6KMpuywFOSWCBChzM1XGVfsL5h"

#     with Session(engine) as db:
#         ids, features, above = build_features(db, TEST_USER_ID)
#         print(f"transactions: {len(ids)}, feature shape: {features.shape}\n")

#         result = detect_anomalies(db, TEST_USER_ID)
#         print(f"DETECTION: {result}\n")

#         flagged = db.exec(
#             select(Transactions).where(
#                 Transactions.userId == TEST_USER_ID,
#                 Transactions.isAnomaly == True,
#             )
#         ).all()
#         print(f"FLAGGED {len(flagged)} transactions:")
#         for t in flagged:
#             planted = "  <-- PLANTED" if (t.plaidTransactionId or "").startswith("seed-anomaly") else ""
#             print(f"  {t.merchantName} ${t.amountToCent/100:.0f} ({t.category}) [{t.dateOf}]{planted}")