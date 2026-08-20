from sqlmodel import Session, select
from datetime import date, timedelta, datetime, timezone
from collections import defaultdict
import json
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from app.models import Transactions, HabitProfile


# builds one proportional vector per week (fraction of spend per category) for clustering
def weekly_category_vectors(
    db: Session, user_id: str, weeks_back: int = 52
) -> tuple[list[str], list[date], np.ndarray]:
    cutoff = date.today() - timedelta(weeks=weeks_back)

    txns = db.exec(
        select(Transactions).where(
            Transactions.userId == user_id,
            Transactions.dateOf >= cutoff,
            Transactions.amountToCent > 0,
        )
    ).all()

    if not txns:
        return [], [], np.empty((0, 0))

    categories = sorted({t.category or "Uncategorized" for t in txns})
    cat_index = {c: i for i, c in enumerate(categories)}

    weeks: dict[date, np.ndarray] = defaultdict(lambda: np.zeros(len(categories)))
    for t in txns:
        week_start = t.dateOf - timedelta(days=t.dateOf.weekday())
        cat = t.category or "Uncategorized"
        weeks[week_start][cat_index[cat]] += t.amountToCent

    week_dates = sorted(weeks.keys())
    matrix = np.array([weeks[d] for d in week_dates])

    row_totals = matrix.sum(axis=1, keepdims=True)
    row_totals[row_totals == 0] = 1
    proportions = matrix / row_totals

    return categories, week_dates, proportions


# names a cluster by the category where it most stands out from the average week
def label_cluster(profile: dict[str, float], overall_mean: dict[str, float]) -> str:
    distinctiveness = {cat: (profile[cat] - overall_mean.get(cat, 0)) for cat in profile}
    top, top_diff = max(distinctiveness.items(), key=lambda x: x[1])
    dominant = max(profile.items(), key=lambda x: x[1])[0]
    if top_diff <= 0.02:
        return f"{dominant}-focused weeks"
    return f"{top}-heavy weeks"


# clusters weeks by proportional shape, labels each by what makes it distinct, caches per user
def cluster_habits(db: Session, user_id: str, k: int = 4, seed: int | None = 42) -> dict:
    categories, week_dates, matrix = weekly_category_vectors(db, user_id)
    if len(week_dates) < k:
        return {"insufficientData": True, "weeks": len(week_dates)}

    scaler = StandardScaler()
    scaled = scaler.fit_transform(matrix)

    model = KMeans(n_clusters=k, random_state=seed, n_init=10)
    labels = model.fit_predict(scaled)
    centers = scaler.inverse_transform(model.cluster_centers_)

    overall_mean = {categories[j]: float(matrix[:, j].mean()) for j in range(len(categories))}

    clusters = []
    for c in range(k):
        member_weeks = [str(week_dates[i]) for i in range(len(labels)) if labels[i] == c]
        profile = {categories[j]: round(float(centers[c][j]), 3) for j in range(len(categories))}
        clusters.append({
            "cluster": c,
            "label": label_cluster(profile, overall_mean),
            "weekCount": len(member_weeks),
            "avgProfile": profile,
        })

    current_cluster = int(labels[-1])
    current_label = clusters[current_cluster]["label"]

    result = {
        "insufficientData": False,
        "k": k,
        "categories": categories,
        "categoryMeans": {c: round(v, 3) for c, v in overall_mean.items()},
        "clusters": clusters,
        "currentClusterLabel": current_label,
    }

    existing = db.exec(
        select(HabitProfile).where(HabitProfile.userId == user_id)
    ).first()
    if existing is None:
        existing = HabitProfile(userId=user_id)
    existing.clustersJson = json.dumps(result)
    existing.currentClusterLabel = current_label
    existing.computedAt = datetime.now(timezone.utc)
    db.add(existing)
    db.commit()

    return result


# reads the cached result without recomputing; returns None if never computed
def get_cached_habits(db: Session, user_id: str) -> dict | None:
    row = db.exec(
        select(HabitProfile).where(HabitProfile.userId == user_id)
    ).first()
    if row is None:
        return None
    return json.loads(row.clustersJson)


if __name__ == "__main__":
    from app.core.database import engine

    TEST_USER_ID = "2wL0la6KMpuywFOSWCBChzM1XGVfsL5h"

    with Session(engine) as db:
        result = cluster_habits(db, TEST_USER_ID, k=4)
        print(f"k={result['k']}, current week: {result['currentClusterLabel']}\n")
        for c in result["clusters"]:
            print(f"[{c['label']}] — {c['weekCount']} weeks:")
            for cat, frac in sorted(c["avgProfile"].items(), key=lambda x: -x[1]):
                print(f"    {cat:>14}: {frac:.0%}")
            print()