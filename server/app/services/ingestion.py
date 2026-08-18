from sqlmodel import Session, select
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.exceptions import ApiException

import logging

from app.integrations.plaid_client import plaid_client, decrypt_token
from app.models import PlaidItem, Accounts, Transactions
from app.services.anomaly_detection import detect_anomalies
from app.services.habit_clustering import cluster_habits

logger = logging.getLogger(__name__)

def sync_transactions(db: Session, item_id: str) -> dict:
    item = db.exec(select(PlaidItem).where(PlaidItem.itemId == item_id)).first()
    if item is None:
        return {"error": "unknown item"}

    access_token = decrypt_token(item.accessTokenEncrypted)

    for attempt in range(5):
        cursor = item.cursor

        added_count = modified_count = removed_count = 0
        has_more = True
        try:
            while has_more:
                req = TransactionsSyncRequest(
                    access_token=access_token,
                    cursor=cursor or "",
                )
                resp = plaid_client.transactions_sync(req)


                for txn in resp["added"]:
                    existing = db.exec(
                        select(Transactions).where(
                            Transactions.plaidTransactionId == txn["transaction_id"]
                        )
                    ).first()
                    if existing:
                        continue
                    account = db.exec(
                        select(Accounts).where(Accounts.plaidAccountId == txn["account_id"])
                    ).first()
                    if account is None:
                        continue
                    db.add(Transactions(
                        userId=item.userId,
                        accountId=account.id,
                        plaidTransactionId=txn["transaction_id"],
                        dateOf=txn["date"],
                        amountToCent=int(round(txn["amount"] * 100)),
                        merchantName=txn.get("merchant_name") or txn.get("name"),
                        category=(txn.get("personal_finance_category") or {}).get("primary"),
                        pending=txn["pending"],
                        isManual=False,
                    ))
                    added_count += 1

                for txn in resp["modified"]:
                    existing = db.exec(
                        select(Transactions).where(
                            Transactions.plaidTransactionId == txn["transaction_id"]
                        )
                    ).first()
                    if existing:
                        existing.amountToCent = int(round(txn["amount"] * 100))
                        existing.pending = txn["pending"]
                        existing.merchantName = txn.get("merchant_name") or txn.get("name")
                        existing.dateOf = txn["date"]
                        db.add(existing)
                        modified_count += 1


                for txn in resp["removed"]:
                    existing = db.exec(
                        select(Transactions).where(
                            Transactions.plaidTransactionId == txn["transaction_id"]
                        )
                    ).first()
                    if existing:
                        db.delete(existing)
                        removed_count += 1

                for acct in resp["accounts"]:
                    account = db.exec(
                        select(Accounts).where(Accounts.plaidAccountId == acct["account_id"])
                    ).first()
                    if account is None:
                        continue
                    balances = acct["balances"]
                    current = balances["current"] or 0
                    account.currentBalanceToCent = int(round(current * 100))
                    available = balances.get("available")
                    limit = balances.get("limit")
                    account.availableBalanceToCent = int(round(available * 100)) if available is not None else None
                    account.limitToCent = int(round(limit * 100)) if limit is not None else None
                    db.add(account)

                cursor = resp["next_cursor"]
                has_more = resp["has_more"]
        except ApiException as e:
            if e.body is not None and "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" in str(e.body):
                db.rollback()
                continue
            raise

        item.cursor = cursor
        db.add(item)
        db.commit()

        try:
            detect_anomalies(db, item.userId)
            cluster_habits(db, item.userId)
        except Exception as e:
            logger.error(f"post-sync ML refresh failed for user {item.userId}: {e}")

        return {
            "added": added_count,
            "modified": modified_count,
            "removed": removed_count,
        }

    return {"error": "sync failed after retries"}