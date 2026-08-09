from app.models import AccountType

_SUBTYPE_MAP = {
    "checking": AccountType.spending,
    "prepaid": AccountType.spending,
    "savings": AccountType.savings,
    "cd": AccountType.savings,
    "money market": AccountType.savings,
    "hsa": AccountType.savings,
}

_TYPE_MAP = {
    "depository": AccountType.spending,
    "credit": AccountType.credit,
    "loan": AccountType.loan,
    "investment": AccountType.investment,
    "brokerage": AccountType.investment,
}


def normalize_account_type(plaid_type: str | None, plaid_subtype: str | None) -> AccountType:
    if plaid_subtype and plaid_subtype.lower() in _SUBTYPE_MAP:
        return _SUBTYPE_MAP[plaid_subtype.lower()]
    return _TYPE_MAP.get((plaid_type or "").lower(), AccountType.spending)