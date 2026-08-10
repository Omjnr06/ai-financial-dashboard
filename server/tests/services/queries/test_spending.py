from datetime import date

from app.models import Transactions
from app.services.queries.spending import (
    get_largest_transaction,
    get_spending_by_category,
)

USER_ID = "user_1"
OTHER_USER_ID = "user_2"


def _txn(**overrides) -> Transactions:
    defaults = dict(
        userId=USER_ID,
        accountId="account_1",
        amountToCent=1000,
        category="groceries",
        dateOf=date(2026, 3, 15),
        merchantName="Test Merchant",
    )
    defaults.update(overrides)
    return Transactions(**defaults)


# ---- get_largest_transaction ----------------------------------------------


def test_get_largest_transaction_returns_the_biggest_spend_in_month(session):
    session.add(_txn(amountToCent=500, category="coffee", merchantName="Cafe"))
    session.add(_txn(amountToCent=9000, category="electronics", merchantName="Big Store"))
    session.add(_txn(amountToCent=2500, category="groceries", merchantName="Market"))
    # different month -> should be excluded
    session.add(_txn(amountToCent=50000, dateOf=date(2026, 4, 1)))
    # different user -> should be excluded
    session.add(_txn(amountToCent=99999, userId=OTHER_USER_ID))
    # income (negative) -> should be excluded
    session.add(_txn(amountToCent=-100000, category="income"))
    session.commit()

    result = get_largest_transaction(session, USER_ID, 2026, 3)

    assert result == {
        "merchant_name": "Big Store",
        "amount_cents": 9000,
        "category": "electronics",
        "date": date(2026, 3, 15),
    }


def test_get_largest_transaction_returns_none_when_no_transactions(session):
    # only a transaction in a different month for the same user
    session.add(_txn(amountToCent=1000, dateOf=date(2026, 2, 1)))
    session.commit()

    result = get_largest_transaction(session, USER_ID, 2026, 3)

    assert result is None


# ---- get_spending_by_category ---------------------------------------------


def test_get_spending_by_category_sums_and_sorts_descending(session):
    session.add(_txn(amountToCent=1000, category="groceries", dateOf=date(2026, 3, 1)))
    session.add(_txn(amountToCent=500, category="groceries", dateOf=date(2026, 3, 10)))
    session.add(_txn(amountToCent=3000, category="electronics", dateOf=date(2026, 3, 5)))
    session.add(_txn(amountToCent=200, category="coffee", dateOf=date(2026, 3, 20)))
    # outside range -> excluded
    session.add(_txn(amountToCent=999999, category="groceries", dateOf=date(2026, 4, 1)))
    # different user -> excluded
    session.add(_txn(amountToCent=999999, category="groceries", userId=OTHER_USER_ID))
    # income (negative) -> excluded
    session.add(_txn(amountToCent=-5000, category="groceries"))
    session.commit()

    result = get_spending_by_category(
        session, USER_ID, date(2026, 3, 1), date(2026, 3, 31)
    )

    assert result == [
        {"category": "electronics", "total_cents": 3000},
        {"category": "groceries", "total_cents": 1500},
        {"category": "coffee", "total_cents": 200},
    ]


def test_get_spending_by_category_returns_empty_list_when_no_spending(session):
    result = get_spending_by_category(
        session, USER_ID, date(2026, 3, 1), date(2026, 3, 31)
    )

    assert result == []