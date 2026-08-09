import random
from datetime import date, timedelta
from sqlmodel import Session, delete
from app.core.database import engine
from app.models import (
    Profiles, PlaidItem, Accounts, Transactions, Bucket, Bills, Status, AccountType,
    IncomeSource, IncomeFrequency
)


TEST_USER_ID = "2wL0la6KMpuywFOSWCBChzM1XGVfsL5h"

# fixed seed so the 2 years of data is reproducible across reseeds
RNG = random.Random(42)

WEEKS = 104

CATEGORIES = ["Groceries", "Dining", "Transport", "Shopping", "Bills", "Entertainment"]
MERCHANTS = {
    "Groceries": ["Loblaws", "Metro", "No Frills"],
    "Dining": ["Uber Eats", "Tim Hortons", "Subway"],
    "Transport": ["Uber", "Presto", "Petro-Canada"],
    "Shopping": ["Amazon", "Aritzia", "Best Buy"],
    "Bills": ["Rogers", "Hydro One", "Spotify"],
    "Entertainment": ["Cineplex", "Steam", "Netflix"],
}

# realistic spend ranges per category, in CENTS (min, max). plaid convention: spending POSITIVE
# widened / raised so a tight-budget student often spends most of their income
AMOUNT_RANGES = {
    "Groceries": (3000, 14000),
    "Dining": (1500, 8000),
    "Transport": (800, 9000),
    "Shopping": (2500, 30000),
    "Bills": (5000, 16000),
    "Entertainment": (1500, 5000),
}

# how many transactions per category tend to appear per week (cluster intensity for K-Means)
# bumped up so total weekly spend is high relative to income
CATEGORY_WEEKLY_FREQ = {
    "Groceries": (1, 3),
    "Dining": (2, 5),
    "Transport": (1, 4),
    "Shopping": (0, 2),
    "Bills": (0, 1),
    "Entertainment": (1, 2),
}


def _seasonal_multiplier(d: date) -> float:
    if d.month == 12:
        return 1.4
    if d.month == 9:
        return 1.25
    return 1.0


def seed():
    manifest = {"anomalies": [], "buckets": [], "notes": []}

    with Session(engine) as db:
        db.execute(delete(Transactions).where(Transactions.userId == TEST_USER_ID))
        db.execute(delete(Bills).where(Bills.userId == TEST_USER_ID))
        db.execute(delete(IncomeSource).where(IncomeSource.userId == TEST_USER_ID))
        db.execute(delete(Bucket).where(Bucket.userId == TEST_USER_ID))
        db.execute(delete(Accounts).where(Accounts.userId == TEST_USER_ID))
        db.execute(delete(PlaidItem).where(PlaidItem.userId == TEST_USER_ID))
        db.execute(delete(Profiles).where(Profiles.userId == TEST_USER_ID))
        db.commit()

        db.add(Profiles(userId=TEST_USER_ID))

        cibc = PlaidItem(
            userId=TEST_USER_ID, accessTokenEncrypted="seed-token-not-real",
            itemId="seed-item-cibc", institutionName="CIBC", status=Status.active,
        )
        wealthsimple = PlaidItem(
            userId=TEST_USER_ID, accessTokenEncrypted="seed-token-not-real",
            itemId="seed-item-ws", institutionName="Wealthsimple", status=Status.active,
        )
        nslsc = PlaidItem(
            userId=TEST_USER_ID, accessTokenEncrypted="seed-token-not-real",
            itemId="seed-item-nslsc", institutionName="NSLSC", status=Status.active,
        )
        db.add(cibc)
        db.add(wealthsimple)
        db.add(nslsc)
        db.commit()

        chequing = Accounts(
            userId=TEST_USER_ID, plaidItemId=cibc.id, plaidAccountId="seed-acct-chequing",
            name="Chequing", accountType=AccountType.spending, plaidType="depository",
            plaidSubtype="checking", currentBalanceToCent=280000,
            availableBalanceToCent=280000, safeToSpendThresholdCent=50000,
        )
        everyday = Accounts(
            userId=TEST_USER_ID, plaidItemId=cibc.id, plaidAccountId="seed-acct-everyday",
            name="Everyday Chequing", accountType=AccountType.spending, plaidType="depository",
            plaidSubtype="checking", currentBalanceToCent=60000,
            availableBalanceToCent=60000, safeToSpendThresholdCent=20000,
        )
        credit = Accounts(
            userId=TEST_USER_ID, plaidItemId=cibc.id, plaidAccountId="seed-acct-credit",
            name="Dividend Visa", accountType=AccountType.credit, plaidType="credit",
            plaidSubtype="credit card", currentBalanceToCent=120000,
            availableBalanceToCent=180000, limitToCent=300000,
        )
        savings = Accounts(
            userId=TEST_USER_ID, plaidItemId=wealthsimple.id, plaidAccountId="seed-acct-savings",
            name="Cash", accountType=AccountType.savings, plaidType="depository",
            plaidSubtype="savings", currentBalanceToCent=190000, availableBalanceToCent=190000,
        )
        investment = Accounts(
            userId=TEST_USER_ID, plaidItemId=wealthsimple.id, plaidAccountId="seed-acct-investment",
            name="TFSA", accountType=AccountType.investment, plaidType="investment",
            plaidSubtype="tfsa", currentBalanceToCent=1200000,
        )
        loan = Accounts(
            userId=TEST_USER_ID, plaidItemId=nslsc.id, plaidAccountId="seed-acct-loan",
            name="Student Loan", accountType=AccountType.loan, plaidType="loan",
            plaidSubtype="student", currentBalanceToCent=1500000,
        )
        for a in (chequing, everyday, credit, savings, investment, loan):
            db.add(a)
        db.commit()

        today = date.today()
        start = today - timedelta(weeks=WEEKS)
        txn_counter = 0

        # ---- background spending ----
        for week in range(WEEKS):
            week_start = start + timedelta(weeks=week)
            for category in CATEGORIES:
                lo_f, hi_f = CATEGORY_WEEKLY_FREQ[category]
                count = RNG.randint(lo_f, hi_f)
                for _ in range(count):
                    day = week_start + timedelta(days=RNG.randint(0, 6))
                    if day > today:
                        continue
                    merchant = RNG.choice(MERCHANTS[category])
                    low, high = AMOUNT_RANGES[category]
                    base = RNG.randint(low, high)
                    if category in ("Dining", "Entertainment") and day.weekday() >= 4:
                        base = int(base * RNG.uniform(1.3, 1.8))
                    amount = int(base * _seasonal_multiplier(day))
                    db.add(Transactions(
                        userId=TEST_USER_ID, accountId=chequing.id,
                        plaidTransactionId=f"seed-txn-{txn_counter}", dateOf=day,
                        amountToCent=amount, merchantName=merchant, category=category,
                        pending=False, isManual=False,
                    ))
                    txn_counter += 1

        # ---- income (plaid convention: money in = NEGATIVE) ----
        # tight budget: modest biweekly job (~$900) so spending eats most of it
        payday = start
        while payday <= today:
            amt = -int(115000 * RNG.uniform(0.9, 1.1))
            db.add(Transactions(
                userId=TEST_USER_ID, accountId=chequing.id,
                plaidTransactionId=f"seed-income-job-{txn_counter}", dateOf=payday,
                amountToCent=amt, merchantName="Payroll Deposit", category="Income",
                pending=False, isManual=False,
            ))
            txn_counter += 1
            payday += timedelta(days=14)

        # weekly loan draw $250
        draw = start
        while draw <= today:
            db.add(Transactions(
                userId=TEST_USER_ID, accountId=chequing.id,
                plaidTransactionId=f"seed-income-loan-{txn_counter}", dateOf=draw,
                amountToCent=-25000, merchantName="Loan Disbursement", category="Income",
                pending=False, isManual=False,
            ))
            txn_counter += 1
            draw += timedelta(days=7)

        # ---- planted anomalies ----
        planted = [
            ("seed-anomaly-electronics", today - timedelta(days=40), 140000, "Best Buy", "Shopping", "large-amount outlier"),
            ("seed-anomaly-merchant", today - timedelta(days=75), 89000, "Luxury Watches Intl", "Shopping", "unusual one-off merchant"),
            ("seed-anomaly-bigfood", today - timedelta(days=20), 42000, "Uber Eats", "Dining", "category-mismatch large charge"),
        ]
        for pid, pdate, pamt, pmerch, pcat, note in planted:
            db.add(Transactions(
                userId=TEST_USER_ID, accountId=chequing.id, plaidTransactionId=pid,
                dateOf=pdate, amountToCent=pamt, merchantName=pmerch, category=pcat,
                pending=False, isManual=False,
            ))
            manifest["anomalies"].append({"id": pid, "amountCent": pamt, "merchant": pmerch, "note": note})

        freq_day = today - timedelta(days=15)
        for i in range(5):
            db.add(Transactions(
                userId=TEST_USER_ID, accountId=chequing.id,
                plaidTransactionId=f"seed-anomaly-freq-{i}", dateOf=freq_day,
                amountToCent=RNG.randint(3000, 8000), merchantName="Amazon",
                category="Shopping", pending=False, isManual=False,
            ))
        manifest["anomalies"].append({"id": "seed-anomaly-freq-*", "note": "5 charges same day", "date": str(freq_day)})

        # ---- buckets tuned to four distinct stories for a tight-budget saver ----
        buckets_spec = [
            ("Textbooks", 40000, 37000, "nearly done"),
            ("New Laptop", 250000, 190000, "on track"),
            ("Spring Trip", 300000, 130000, "stretch"),
            ("Car Down Payment", 800000, 120000, "out of reach"),
        ]
        for name, target, current, note in buckets_spec:
            db.add(Bucket(
                userId=TEST_USER_ID, accountId=savings.id, name=name,
                targetToCent=target, currentToCent=current,
            ))
            manifest["buckets"].append({"name": name, "targetCent": target, "currentCent": current, "designed": note})

        # ---- bills ----
        db.add(Bills(userId=TEST_USER_ID, accountId=chequing.id, name="Rent",
            amountToCent=140000, dueDay=1, isAuto=False, reviewed=True, active=True))
        db.add(Bills(userId=TEST_USER_ID, accountId=chequing.id, name="Spotify",
            rawName="SPOTIFY P0F3A2", amountToCent=1099, dueDay=15,
            isAuto=True, reviewed=False, active=True, streamId="seed-stream-spotify"))
        db.add(Bills(userId=TEST_USER_ID, accountId=chequing.id, name="Netflix",
            rawName="NETFLIX.COM", amountToCent=1699, dueDay=8,
            isAuto=True, reviewed=True, active=True, streamId="seed-stream-netflix"))

        # ---- income sources ----
        db.add(IncomeSource(userId=TEST_USER_ID, accountId=chequing.id, sourceAccountId=savings.id,
            isInternalTransfer=True, name="Weekly allowance from savings",
            amountToCent=25000, frequency=IncomeFrequency.weekly,
            anchorDate=today - timedelta(days=3), active=True))
        db.add(IncomeSource(userId=TEST_USER_ID, accountId=chequing.id, isInternalTransfer=False,
            name="Part-time Job", amountToCent=45000, frequency=IncomeFrequency.biweekly,
            anchorDate=today - timedelta(days=5), active=True))

        db.commit()
        manifest["notes"].append(f"total transactions: {txn_counter}")
        manifest["notes"].append(f"weeks: {WEEKS}")

    print("Seed complete.")
    # print("---- GROUND TRUTH MANIFEST ----")
    # print("ANOMALIES (Isolation Forest should flag):")
    # for a in manifest["anomalies"]:
    #     print(f"  {a}")
    # print("BUCKETS (Monte Carlo designed outcomes):")
    # for b in manifest["buckets"]:
    #     print(f"  {b['name']}: {b['designed']}")
    # for n in manifest["notes"]:
    #     print(f"  {n}")


if __name__ == "__main__":
    seed()