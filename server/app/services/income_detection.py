from sqlmodel import Session, select
from plaid.model.transactions_recurring_get_request import TransactionsRecurringGetRequest

from app.integrations.plaid_client import plaid_client, decrypt_token
from app.models import PlaidItem, Accounts, IncomeSource, IncomeFrequency
from app.utils.bill_names import clean_bill_name


_FREQUENCY_MAP = {
    "WEEKLY": IncomeFrequency.weekly,
    "BIWEEKLY": IncomeFrequency.biweekly,
    "SEMI_MONTHLY": IncomeFrequency.biweekly,
    "MONTHLY": IncomeFrequency.monthly,
}


def _map_frequency(plaid_freq: str) -> IncomeFrequency:
    return _FREQUENCY_MAP.get(str(plaid_freq).upper(), IncomeFrequency.monthly)


def detect_income_sources(db: Session, user_id: str) -> dict:
    items = db.exec(select(PlaidItem).where(PlaidItem.userId == user_id)).all()
    if not items:
        return {"detected": 0, "skipped": 0}

    detected_count = skipped_count = 0

    for item in items:
        access_token = decrypt_token(item.accessTokenEncrypted)
        accounts = db.exec(
            select(Accounts).where(Accounts.plaidItemId == item.id)
        ).all()
        account_by_plaid_id = {a.plaidAccountId: a for a in accounts}

        try:
            resp = plaid_client.transactions_recurring_get(
                TransactionsRecurringGetRequest(access_token=access_token)
            )
        except Exception:
            continue

        for stream in resp["inflow_streams"]:
            stream_id = stream["stream_id"]

            existing = db.exec(
                select(IncomeSource).where(
                    IncomeSource.userId == user_id,
                    IncomeSource.streamId == stream_id,
                )
            ).first()
            if existing is not None:
                skipped_count += 1
                continue

            account = account_by_plaid_id.get(stream["account_id"])
            raw_name = stream.get("merchant_name") or stream.get("description")
            amount = int(round(stream["average_amount"]["amount"] * 100))
            predicted = stream.get("predicted_next_date")

            db.add(IncomeSource(
                userId=user_id,
                accountId=account.id if account is not None else None,
                sourceAccountId=None,
                isInternalTransfer=False,
                streamId=stream_id,
                name=clean_bill_name(raw_name),
                amountToCent=abs(amount),
                frequency=_map_frequency(stream.get("frequency", "MONTHLY")),
                anchorDate=predicted if predicted is not None else None,
                isAuto=True,
                reviewed=False,
                dismissed=False,
                active=True,
            ))
            detected_count += 1

    db.commit()
    return {"detected": detected_count, "skipped": skipped_count}