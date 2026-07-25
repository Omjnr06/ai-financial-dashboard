
import random
from datetime import date, timedelta
from sqlmodel import Session, delete
from app.database import engine
from app.models import Profiles, PlaidItem, Accounts, Transactions, Bucket, Status, Type


TEST_USER_ID = "seed-user-0001"

CATEGORIES = ["Groceries", "Dining", "Transport", "Shopping", "Bills", "Entertainment"]
MERCHANTS = {
    "Groceries": ["Loblaws", "Metro", "No Frills"],
    "Dining": ["Uber Eats", "Tim Hortons", "Subway"],
    "Transport": ["Uber", "Presto", "Petro-Canada"],
    "Shopping": ["Amazon", "Aritzia", "Best Buy"],
    "Bills": ["Rogers", "Hydro One", "Spotify"],
    "Entertainment": ["Cineplex", "Steam", "Netflix"],
}

# realistic spend ranges per category, in CENTS (min, max)
AMOUNT_RANGES = {
    "Groceries": (2000, 12000),
    "Dining": (1000, 6000),
    "Transport": (500, 8000),
    "Shopping": (2000, 25000),
    "Bills": (4000, 15000),
    "Entertainment": (1000, 3000),
}


def seed():
    with Session(engine) as db:
        db.execute(delete(Transactions).where(Transactions.userId == TEST_USER_ID))
        db.execute(delete(Accounts).where(Accounts.userId == TEST_USER_ID))
        db.execute(delete(Bucket).where(Bucket.userId == TEST_USER_ID))
        db.execute(delete(PlaidItem).where(PlaidItem.userId == TEST_USER_ID))
        db.execute(delete(Profiles).where(Profiles.userId == TEST_USER_ID))
        db.commit()
        db.add(Profiles(userId=TEST_USER_ID))
        item = PlaidItem(
            userId=TEST_USER_ID,
            accessTokenEncrypted="seed-token-not-real",
            itemId="seed-item-0001",
            institutionName="Scotiabank",
            status=Status.active,
        )
        db.add(item)
        db.commit()
        account = Accounts(
            userId=TEST_USER_ID,
            plaidItemId=item.id,
            plaidAccountId="seed-acct-0001",
            name="Chequing",
            type=Type.checking,
            currentBalanceToCent=570000,  # $5,700
        )
        db.add(account)
        db.commit()  
        today = date.today()
        gap_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
        gap_month = (gap_month.replace(day=1) - timedelta(days=1)).replace(day=1)

        for days_ago in range(180):
            day = today - timedelta(days=days_ago)
            if day.year == gap_month.year and day.month == gap_month.month:
                continue
            for _ in range(random.randint(0, 3)):
                category = random.choice(CATEGORIES)
                merchant = random.choice(MERCHANTS[category])
                low, high = AMOUNT_RANGES[category]
                amount = random.randint(low, high)
                db.add(Transactions(
                    userId=TEST_USER_ID,
                    accountId=account.id,
                    plaidTransactionId=f"seed-txn-{days_ago}-{random.randint(1000,9999)}",
                    dateOf=day,
                    amountToCent=amount,
                    merchantName=merchant,
                    category=category,
                    pending=False,
                    isManual=False,
                ))

        db.add(Transactions(
            userId=TEST_USER_ID,
            accountId=account.id,
            plaidTransactionId="seed-txn-outlier",
            dateOf=today - timedelta(days=10),
            amountToCent=120000,
            merchantName="Uber Eats",
            category="Dining",
            pending=False,
            isManual=False,
        ))

        db.add(Bucket(
            userId=TEST_USER_ID,
            name="MacBook Pro",
            targetToCent=250000,   # $2,500
            currentToCent=200000,  # 80%
        ))
        db.add(Bucket(
            userId=TEST_USER_ID,
            name="Emergency Fund",
            targetToCent=500000,   # $5,000
            currentToCent=25000,   # 5%
        ))

        db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    seed()