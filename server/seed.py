import random
from datetime import date, timedelta
from sqlmodel import Session, delete
from app.database import engine
from app.models import (
    Profiles, PlaidItem, Accounts, Transactions, Bucket, Bills, Status, AccountType
)


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
        db.execute(delete(Bills).where(Bills.userId == TEST_USER_ID))
        db.execute(delete(Bucket).where(Bucket.userId == TEST_USER_ID))
        db.execute(delete(Accounts).where(Accounts.userId == TEST_USER_ID))
        db.execute(delete(PlaidItem).where(PlaidItem.userId == TEST_USER_ID))
        db.execute(delete(Profiles).where(Profiles.userId == TEST_USER_ID))
        db.commit()

        db.add(Profiles(userId=TEST_USER_ID))

        cibc = PlaidItem(
            userId=TEST_USER_ID,
            accessTokenEncrypted="seed-token-not-real",
            itemId="seed-item-cibc",
            institutionName="CIBC",
            status=Status.active,
        )
        wealthsimple = PlaidItem(
            userId=TEST_USER_ID,
            accessTokenEncrypted="seed-token-not-real",
            itemId="seed-item-ws",
            institutionName="Wealthsimple",
            status=Status.active,
        )
        nslsc = PlaidItem(
            userId=TEST_USER_ID,
            accessTokenEncrypted="seed-token-not-real",
            itemId="seed-item-nslsc",
            institutionName="NSLSC",
            status=Status.active,
        )
        db.add(cibc)
        db.add(wealthsimple)
        db.add(nslsc)
        db.commit()

        chequing = Accounts(
            userId=TEST_USER_ID,
            plaidItemId=cibc.id,
            plaidAccountId="seed-acct-chequing",
            name="Chequing",
            accountType=AccountType.spending,
            plaidType="depository",
            plaidSubtype="checking",
            currentBalanceToCent=570000,
            availableBalanceToCent=570000,
            safeToSpendThresholdCent=400000,
        )
        everyday = Accounts(
            userId=TEST_USER_ID,
            plaidItemId=cibc.id,
            plaidAccountId="seed-acct-everyday",
            name="Everyday Chequing",
            accountType=AccountType.spending,
            plaidType="depository",
            plaidSubtype="checking",
            currentBalanceToCent=120000,
            availableBalanceToCent=120000,
            safeToSpendThresholdCent=50000,
        )
        credit = Accounts(
            userId=TEST_USER_ID,
            plaidItemId=cibc.id,
            plaidAccountId="seed-acct-credit",
            name="Dividend Visa",
            accountType=AccountType.credit,
            plaidType="credit",
            plaidSubtype="credit card",
            currentBalanceToCent=120000,
            availableBalanceToCent=180000,
            limitToCent=300000,
        )
        savings = Accounts(
            userId=TEST_USER_ID,
            plaidItemId=wealthsimple.id,
            plaidAccountId="seed-acct-savings",
            name="Cash",
            accountType=AccountType.savings,
            plaidType="depository",
            plaidSubtype="savings",
            currentBalanceToCent=800000,
            availableBalanceToCent=800000,
        )
        investment = Accounts(
            userId=TEST_USER_ID,
            plaidItemId=wealthsimple.id,
            plaidAccountId="seed-acct-investment",
            name="TFSA",
            accountType=AccountType.investment,
            plaidType="investment",
            plaidSubtype="tfsa",
            currentBalanceToCent=1200000,
        )
        loan = Accounts(
            userId=TEST_USER_ID,
            plaidItemId=nslsc.id,
            plaidAccountId="seed-acct-loan",
            name="Student Loan",
            accountType=AccountType.loan,
            plaidType="loan",
            plaidSubtype="student",
            currentBalanceToCent=1500000,
        )
        db.add(chequing)
        db.add(everyday)
        db.add(credit)
        db.add(savings)
        db.add(investment)
        db.add(loan)
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
                    accountId=chequing.id,
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
            accountId=chequing.id,
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
            accountId=savings.id,
            name="MacBook Pro",
            targetToCent=250000,
            currentToCent=200000,
        ))
        db.add(Bucket(
            userId=TEST_USER_ID,
            accountId=savings.id,
            name="Emergency Fund",
            targetToCent=500000,
            currentToCent=25000,
        ))

        db.add(Bills(
            userId=TEST_USER_ID,
            accountId=chequing.id,
            name="Rent",
            amountToCent=140000,
            dueDay=1,
            isAuto=False,
            active=True,
        ))
        db.add(Bills(
            userId=TEST_USER_ID,
            accountId=chequing.id,
            name="Spotify",
            rawName="SPOTIFY P0F3A2",
            amountToCent=1099,
            dueDay=15,
            isAuto=True,
            active=True,
            streamId="seed-stream-spotify",
        ))

        db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    seed()