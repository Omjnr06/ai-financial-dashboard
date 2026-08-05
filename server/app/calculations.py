from sqlmodel import Session, select
from sqlalchemy import func
from datetime import date

from app.models import Accounts, Bills, Bucket, Profiles, AccountType


# function for calculating the amount safe for each user to spend
def calculate_safe_to_spend(db: Session, user_id: str) -> dict:
    today = date.today()

    # calculate balance(ignore credit cards)
    balance = db.exec(
        select(func.sum(Accounts.currentBalanceToCent)).where(
            Accounts.userId == user_id,
            Accounts.accountType == AccountType.spending,
        )
    ).one() or 0

    # get the upcoming bills
    upcoming_bills = db.exec(
        select(func.sum(Bills.amountToCent)).where(
            Bills.userId == user_id,
            Bills.active == True, 
            Bills.dueDay >= today.day,
        )
    ).one() or 0

    # get the goal amounts
    goal_allocations = db.exec(
        select(func.sum(Bucket.currentToCent)).where(
            Bucket.userId == user_id,
        )
    ).one() or 0

    # the users safety buffer (amount they dont want their account to go under)
    profile = db.exec(
        select(Profiles).where(Profiles.userId == user_id)
    ).first()
    threshold = profile.safeToSpendThresholdCent if profile else 0

 # safe to spend formula 
    safe_to_spend = balance - upcoming_bills - goal_allocations - threshold

    return {
        "safeToSpendCent": safe_to_spend,
        "balanceCent": balance,
        "upcomingBillsCent": upcoming_bills,
        "goalAllocationsCent": goal_allocations,
        "thresholdCent": threshold,
    }