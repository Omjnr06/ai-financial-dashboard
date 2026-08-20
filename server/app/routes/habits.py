from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.services.habit_clustering import cluster_habits, get_cached_habits
from app.security.rate_limit import rate_limit

router = APIRouter(prefix="/api/habits", tags=["habits"])


# get method to return a users spending habit clusters 
@router.get(
    "",
    summary="Get the user's spending habit clusters",
    response_description="Labeled week type clusters and the current week's type",
)
def get_habits(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """
    Return the user's spending habits as clustered week-types.

    Reads the cached clustering result if present; otherwise computes it. Each
    cluster is a recurring kind of week (e.g. "Shopping-heavy weeks"), labeled by
    its dominant spending categories, with the proportional profile and how many
    weeks fall into it. Also reports which type the user's most recent week matches.
    """
    cached = get_cached_habits(db, user_id)
    if cached is not None:
        return cached
    return cluster_habits(db, user_id)


# a reload of a users habit clusters (re runs k-means)
@router.post(
    "/recompute",
    summary="Recompute the user's habit clusters",
    response_description="The freshly computed clusters",
)
def recompute_habits(
    user_id: str = Depends(rate_limit("habits")),
    db: Session = Depends(get_session),
) -> dict:
    """Force a fresh K-Means run and update the cache. Use after new data lands."""
    return cluster_habits(db, user_id)