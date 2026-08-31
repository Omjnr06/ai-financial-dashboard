from fastapi import APIRouter, Depends
from sqlmodel import Session, select, delete
from sqlalchemy import text
import logging

from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.integrations.plaid_client import plaid_client, decrypt_token
from app.models import (PlaidItem, Accounts, Transactions, Bucket, Bills, IncomeSource, HabitProfile, Profiles,)
from plaid.model.item_remove_request import ItemRemoveRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/account", tags=["account"])


@router.delete(
    "",
    summary="\u26a0\ufe0f Permanently delete the user's account and ALL associated data",
    response_description="Confirmation that the account and all data were deleted",
)
def delete_account(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """
    **IRREVERSIBLE.** Permanently delete the authenticated user's
    account and every piece of associated data.

    The caller (frontend) must verify the user's password via Better Auth
    immediately before calling this endpoint; this endpoint trusts the
    authenticated session and performs no additional password check.

    Order of operations:
    1. Revoke every Plaid connection (`/item/remove`) so access tokens are
       invalidated on Plaid's side and no further webhooks arrive.
    2. Delete all app-owned rows in foreign-key-safe order: Transactions ->
       Bucket / Bills / IncomeSource -> Accounts -> PlaidItem -> HabitProfile
       -> Profiles.
    3. Delete the Better Auth user row (`ba_user`); its `ba_session` and
       `ba_account` rows are removed automatically via ON DELETE CASCADE.
    """
    
    items = db.exec(select(PlaidItem).where(PlaidItem.userId == user_id)).all()
    for item in items:
        try:
            token = decrypt_token(item.accessTokenEncrypted)
            plaid_client.item_remove(ItemRemoveRequest(access_token=token))
        except Exception as e:
            logger.error(f"Plaid item_remove failed during account deletion for {item.itemId}: {e}")

    account_ids = [a.id for a in db.exec(select(Accounts).where(Accounts.userId == user_id)).all()]

    if account_ids:
        db.exec(delete(Transactions).where(Transactions.accountId.in_(account_ids)))

    db.exec(delete(Transactions).where(Transactions.userId == user_id))
    db.exec(delete(Bucket).where(Bucket.userId == user_id))
    db.exec(delete(Bills).where(Bills.userId == user_id))
    db.exec(delete(IncomeSource).where(IncomeSource.userId == user_id))
    db.exec(delete(Accounts).where(Accounts.userId == user_id))
    db.exec(delete(PlaidItem).where(PlaidItem.userId == user_id))
    db.exec(delete(HabitProfile).where(HabitProfile.userId == user_id))
    db.exec(delete(Profiles).where(Profiles.userId == user_id))
    db.exec(text('DELETE FROM ba_user WHERE id = :uid'), params={"uid": user_id})

    db.commit()

    return {"deleted": True}