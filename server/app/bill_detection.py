from sqlmodel import Session, select
from plaid.model.transactions_recurring_get_request import TransactionsRecurringGetRequest

from app.plaid_client import plaid_client, decrypt_token
from app.models import PlaidItem, Accounts, Bills
from app.utils.bill_names import clean_bill_name


def detect_bills(db: Session, user_id: str) -> dict:
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

        for stream in resp["outflow_streams"]:
            stream_id = stream["stream_id"]

            existing = db.exec(
                select(Bills).where(
                    Bills.userId == user_id,
                    Bills.streamId == stream_id,
                )
            ).first()
            if existing is not None:
                skipped_count += 1
                continue

            account = account_by_plaid_id.get(stream["account_id"])
            raw_name = stream.get("merchant_name") or stream.get("description")
            amount = int(round(stream["average_amount"]["amount"] * 100))
            predicted = stream.get("predicted_next_date")
            due_day = predicted.day if predicted is not None else 1

            db.add(Bills(
                userId=user_id,
                accountId=account.id if account is not None else None,
                streamId=stream_id,
                rawName=raw_name,
                name=clean_bill_name(raw_name),
                amountToCent=abs(amount),
                dueDay=due_day,
                isAuto=True,
                reviewed=False,
                active=True,
                dismissed=False,
            ))
            detected_count += 1

    db.commit()
    return {"detected": detected_count, "skipped": skipped_count}