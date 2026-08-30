from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from sqlmodel import Session, select,func
from pydantic import BaseModel
import logging
import resend
from sqlalchemy import text, delete

from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.model.sandbox_public_token_create_request_options import SandboxPublicTokenCreateRequestOptions
from plaid.model.sandbox_item_reset_login_request import SandboxItemResetLoginRequest

from app.integrations.plaid_client import plaid_client, encrypt_token
from app.core.dependencies import get_current_user
from app.core.database import get_session, engine
from app.models import PlaidItem, Accounts, Status
from app.utils.account_types import normalize_account_type
from app.integrations.plaid_webhook_verify import verify_webhook
from app.services.ingestion import sync_transactions
from app.core.config import settings
from app.services.anomaly_detection import detect_anomalies
from app.services.habit_clustering import cluster_habits

from app.security.rate_limit import rate_limit

router = APIRouter(prefix="/api/plaid", tags=["plaid"])
logger = logging.getLogger(__name__)


class LinkTokenResponse(BaseModel):
    linkToken: str
    expiration: str

class ExchangeBody(BaseModel):
    publicToken: str

class ExchangeResponse(BaseModel):
    success: bool
    institutionName: str

class StatusResponse(BaseModel):
    status: str
    accountCount: int

class SandboxLinkResponse(BaseModel):
    success: bool
    institutionName: str

class UpdateTokenRequest(BaseModel):
    item_id: str

class RemoveItemRequest(BaseModel):
    item_id: str

class SandboxResetRequest(BaseModel):
    item_id: str

class PlaidItemResponse(BaseModel):
    id: str
    institutionName: str
    status: str
    lastSyncedAt: str | None
    accountsCount: int

class SyncRequest(BaseModel):
    item_id: str | None = None


@router.post(
    "/link_token",
    response_model=LinkTokenResponse,
    summary="Create a Plaid Link token",
    response_description="A short-lived token used to initialize Plaid Link",
)
def create_link_token(user_id: str = Depends(rate_limit("plaid_link", max_requests=5))) -> LinkTokenResponse:
    """
    Create a Plaid `link_token` for the authenticated user.

    The frontend passes this token to Plaid Link to open the bank-connection
    modal. The token is scoped to the current user and expires shortly after
    creation.
    """
    req = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        client_name="The Vault",
        products=[Products("transactions")],
        transactions={"days_requested": 730},
        country_codes=[CountryCode("US"), CountryCode("CA")],
        language="en",
        webhook=settings.PLAID_WEBHOOK_URL,
    )
    resp = plaid_client.link_token_create(req)
    return LinkTokenResponse(
        linkToken=resp["link_token"],
        expiration=resp["expiration"].isoformat(),
    )

# for update mode when bank cred time out
@router.post(
    "/link_token/update",
    response_model=LinkTokenResponse,
    summary="Create a Plaid Link token in update mode",
    response_description="A short lived token used to open Plaid Link for credential or MFA updates",
)
def create_update_link_token(
    body: UpdateTokenRequest,
    user_id: str = Depends(rate_limit("plaid_link", max_requests=5)),
    db: Session = Depends(get_session)
) -> LinkTokenResponse:
    """
    Generate a Plaid `link_token` initialized in **Update Mode** for an existing connection.

    This endpoint retrieves and decrypts the stored `access_token` for the specified `item_id` 
    and passes it directly to Plaid's `link_token_create`. 

    When opened in the frontend, Plaid Link bypasses institution selection and prompts 
    the user directly for re authentication, MFA resolution, or updated credentials. 
    Completing update mode restores connection health without producing a duplicate item 
    or altering existing account mappings.
    """
    item = db.exec(select(PlaidItem).where(PlaidItem.itemId == body.item_id, PlaidItem.userId == user_id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    from app.integrations.plaid_client import decrypt_token
    decrypted_token = decrypt_token(item.accessTokenEncrypted)

    req = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        client_name="The Vault",
        access_token=decrypted_token,
        country_codes=[CountryCode("US"), CountryCode("CA")],
        language="en",
        webhook=settings.PLAID_WEBHOOK_URL,
    )
    resp = plaid_client.link_token_create(req)
    return LinkTokenResponse(
        linkToken=resp["link_token"],
        expiration=resp["expiration"].isoformat(),
    )


# list all the users connected bank institutions
@router.get(
    "/items",
    response_model=list[PlaidItemResponse],
    summary="List the user's connected bank institutions",
    response_description="One entry per linked institution, with connection status and account count",
)
def list_plaid_items(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[PlaidItemResponse]:
    """
    List every bank institution the authenticated user has connected.
    a single institution may contain several accounts
    (e.g. chequing, savings, credit), reported here as `accountsCount`.

    The `status` field reflects the health of the connection:
    - `active` — the connection is healthy and syncing normally.
    - `login_required` — the bank has invalidated the connection and the user
      must re-authenticate via Plaid Link update mode before syncing resumes.
    - `error` — the connection is in an unrecoverable error state.
    """
    items = db.exec(
        select(PlaidItem).where(PlaidItem.userId == user_id)
    ).all()

    result: list[PlaidItemResponse] = []
    for item in items:
        count = db.exec(
            select(func.count(Accounts.id)).where(Accounts.plaidItemId == item.id)
        ).one()
        result.append(
            PlaidItemResponse(
                id=item.id,
                institutionName=item.institutionName or "Unknown Institution",
                status=item.status.value if hasattr(item.status, "value") else item.status,
                lastSyncedAt=item.lastSyncedAt.isoformat() if item.lastSyncedAt else None,
                accountsCount=count,
            )
        )
    return result


# for instant user based resync of any connection
@router.post(
    "/sync",
    summary="Sync transactions for one or all of the user's connected banks",
    response_description="Per item counts of added, modified, and removed transactions",
)
def sync_plaid_items(
    body: SyncRequest,
    user_id: str = Depends(rate_limit("plaid_sync", max_requests=10)),
    db: Session = Depends(get_session),
):
    """
    Trigger a transaction sync outside the normal webhook cadence.

    If `item_id` is provided, only that single institution is synced. If it is
    omitted, every institution the user has connected is synced in turn. Each
    item is synced via the same cursor based, idempotent `sync_transactions`
    routine used by the Plaid webhook, so repeated calls never double count.

    Returns a per item breakdown of how many transactions were added, modified,
    and removed. Individual item failures are captured in the response rather
    than aborting the whole batch, so one broken connection does not block the
    others.
    """
    query = select(PlaidItem).where(PlaidItem.userId == user_id)
    if body.item_id:
        query = query.where(PlaidItem.itemId == body.item_id)

    items = db.exec(query).all()
    if not items:
        raise HTTPException(status_code=404, detail="No matching connections found")

    results = []
    for item in items:
        try:
            result = sync_transactions(db, item.itemId)
            results.append({
                "itemId": item.itemId,
                "institutionName": item.institutionName,
                **result,
            })
        except Exception as e:
            logger.error(f"Manual sync failed for item {item.itemId}: {e}")
            results.append({
                "itemId": item.itemId,
                "institutionName": item.institutionName,
                "error": "sync failed",
            })

    return {"synced": results}

# for deleting a bank account connection or can be used when user deleting account
@router.post(
    "/item/remove",
    summary="Disconnect a bank connection and purge associated data",
    response_description="Revokes Plaid consent, cascade deletes local records, and triggers ML model refresh",
)
def remove_plaid_item(
    body: RemoveItemRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(rate_limit("plaid_remove", max_requests=3)),
    db: Session = Depends(get_session)
):
    """
    Permanently disconnect a bank institution and purge all local relational data.

    It Follows these steps:
    -  **Consent Revocation**: Decrypts the stored `access_token` and calls Plaid's 
       `/item/remove` endpoint to invalidate access and stop future webhooks.
    -  **Local Cascade Deletion**: Deletes records in relational order to respect foreign key 
       constraints: `Transactions` -> `Accounts` -> `PlaidItem`.
    - **Background Re computation**: Schedules background tasks to re run Isolation Forest 
       anomaly detection (`detect_anomalies`) and K Means habit clustering (`cluster_habits`) 
       so that analytical models immediately reflect the remaining active dataset.
    """
    item = db.exec(select(PlaidItem).where(PlaidItem.itemId == body.item_id, PlaidItem.userId == user_id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    from app.integrations.plaid_client import decrypt_token
    from plaid.model.item_remove_request import ItemRemoveRequest

    decrypted_token = decrypt_token(item.accessTokenEncrypted)
    
    try:
        plaid_client.item_remove(ItemRemoveRequest(access_token=decrypted_token))
    except Exception as e:
        logger.error(f"Failed to remove item from Plaid: {e}")

    accounts = db.exec(select(Accounts).where(Accounts.plaidItemId == item.id)).all()
    account_ids = [acct.id for acct in accounts]
    
    if account_ids:
        db.exec(delete(Transactions).where(Transactions.accountId.in_(account_ids)))
        db.exec(delete(Accounts).where(Accounts.plaidItemId == item.id))
        
    db.delete(item)
    db.commit()

    background_tasks.add_task(detect_anomalies, user_id)
    background_tasks.add_task(cluster_habits, user_id)

    return {"success": True}

@router.post(
    "/sandbox/reset_login",
    summary="Force an item into ITEM_LOGIN_REQUIRED (Sandbox only)",
    response_description="Forces a sandbox item into an error state to trigger the ITEM webhook",
)
def sandbox_reset_item_login(
    body: SandboxResetRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    if settings.PLAID_ENV != "sandbox":
        raise HTTPException(status_code=403, detail="Only available in sandbox")

    item = db.exec(select(PlaidItem).where(PlaidItem.itemId == body.item_id, PlaidItem.userId == user_id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    from app.integrations.plaid_client import decrypt_token
    decrypted = decrypt_token(item.accessTokenEncrypted)
    
    plaid_client.sandbox_item_reset_login(SandboxItemResetLoginRequest(access_token=decrypted))
    
    return {"status": "Item reset successfully. Plaid should fire an ITEM webhook momentarily."}


@router.post(
    "/exchange",
    response_model=ExchangeResponse,
    summary="Exchange a public token and store the bank connection",
    response_description="Whether the connection succeeded and the bank name",
)
def exchange_public_token(
    body: ExchangeBody,
    user_id: str = Depends(rate_limit("plaid_link", max_requests=5)),
    db: Session = Depends(get_session),
) -> ExchangeResponse:
    """
    Exchange a Plaid `public_token` for a permanent access token and persist
    the bank connection.

    After the user completes Plaid Link, the frontend sends the returned
    `public_token` here. This endpoint exchanges it for an access token
    (stored **encrypted**), fetches the linked accounts, and saves both the
    item and its accounts against the authenticated user.
    """
    exchange = plaid_client.item_public_token_exchange(
        ItemPublicTokenExchangeRequest(public_token=body.publicToken)
    )
    access_token = exchange["access_token"]
    item_id = exchange["item_id"]

    accounts_resp = plaid_client.accounts_get(
        AccountsGetRequest(access_token=access_token)
    )
    institution_name = accounts_resp["item"].get("institution_name") or "Bank"
    plaid_item = PlaidItem(
        userId=user_id,
        accessTokenEncrypted=encrypt_token(access_token),
        itemId=item_id,
        institutionName=institution_name,
        status=Status.active,
    )
    db.add(plaid_item)
    db.commit()
    db.refresh(plaid_item)
    for acct in accounts_resp["accounts"]:
        balances = acct["balances"]
        current = balances["current"] or 0
        available = balances.get("available")
        limit = balances.get("limit")
        plaid_type = str(acct["type"])
        plaid_subtype = str(acct["subtype"]) if acct.get("subtype") else None
        db.add(Accounts(
            userId=user_id,
            plaidItemId=plaid_item.id,
            plaidAccountId=acct["account_id"],
            name=acct["name"],
            accountType=normalize_account_type(plaid_type, plaid_subtype),
            plaidType=plaid_type,
            plaidSubtype=plaid_subtype,
            currentBalanceToCent=int(round(current * 100)),
            availableBalanceToCent=int(round(available * 100)) if available is not None else None,
            limitToCent=int(round(limit * 100)) if limit is not None else None,
        ))
    db.commit()
    return ExchangeResponse(success=True, institutionName=institution_name)


# health check that auto returns 200 so plaid can access plaid receipts
@router.get(
    "/webhook",
    summary="health check for webhooks",
    response_description="Returns 200 so that Plaid knows my webhook is good"
)
async def plaid_webhook_verify():
    return {"status": "ok"}


def process_transactions_background(item_id: str):
    """Helper function to run the database sync outside the main request thread."""
    with Session(engine) as db:
        result = sync_transactions(db, item_id)
        # for dev, to be changed to logger later by me
        print(f"Sync result: {result}")


@router.post(
    "/webhook",
    summary="Receive and acknowledge Plaid webhooks asynchronously",
    response_description="Immediately acknowledges receipt to prevent timeouts, queueing heavy data syncs in the background",
)
async def plaid_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_session)):
    """
Receive, verify, and process asynchronous webhooks from Plaid.

    Every request is verified against Plaid's JWT signature via headers before 
    anything in the payload is trusted so unsigned or invalid requests are 
    rejected immediately with a 401 Unauthorized.

    Supported Webhook Types:
    - **TRANSACTIONS**: Queues a background cursor based transaction sync. 
      New transactions are inserted, changed ones are updated, and removed 
      ones are deleted. The cursor makes this sync idempotent.
    - **ITEM**: Handles connection health state changes.
      - On `ITEM_LOGIN_REQUIRED` errors, flips `PlaidItem.status` to `login_required`. 
        If transitioning from `active`, retrieves the user's details from Better Auth 
        and dispatches a notification email via Resend. Redundant webhooks while already 
        in `login_required` state are ignored to prevent email spam.
      - On re authentication or acknowledgment webhooks, restores `PlaidItem.status` 
        back to `active`.   """
    raw_body = await request.body()
    verification_header = request.headers.get("plaid-verification", "")
    
    if not verify_webhook(raw_body, verification_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()
    webhook_type = payload.get("webhook_type")
    webhook_code = payload.get("webhook_code")
    item_id = payload.get("item_id")
    
    print(f"Verified webhook: type={webhook_type} code={webhook_code} item={item_id}")

    if webhook_type == "TRANSACTIONS":
        background_tasks.add_task(process_transactions_background, item_id)
    elif webhook_type == "ITEM":
        item = db.exec(select(PlaidItem).where(PlaidItem.itemId == item_id)).first()
        if item:
            error_obj = payload.get("error")
            if webhook_code == "ERROR" and error_obj and error_obj.get("error_code") == "ITEM_LOGIN_REQUIRED":
                if item.status != Status.loginReq:
                    item.status = Status.loginReq
                    db.commit()
                    
                    user_record = db.exec(
                        text('SELECT email, name FROM "user" WHERE id = :uid'), 
                        params={"uid": item.userId}
                    ).first()
                    
                    if user_record:
                        resend.api_key = settings.RESEND_API_KEY
                        resend.Emails.send({
                            "from": "The Vault <onboarding@resend.dev>",
                            "to": user_record.email,
                            "subject": "Action Required: Reconnect your bank account",
                            "html": f"<p>Hi {user_record.name},</p><p>Your connection to {item.institutionName} requires attention. Please log into The Vault to reconnect it.</p>"
                        })
            elif webhook_code == "WEBHOOK_UPDATE_ACKNOWLEDGED" or not error_obj:
                if item.status != Status.active:
                    item.status = Status.active
                    db.commit()

    return {"acknowledged": True}


@router.post(
    "/sandbox/link",
    response_model=SandboxLinkResponse,
    summary="Link a Sandbox test user (testing only)",
    response_description="Whether the sandbox link succeeded and the bank name",
)
def sandbox_link(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> SandboxLinkResponse:
    """
    Link a Plaid **Sandbox** test user to the authenticated account without going
    through Plaid Link.

    Creates a sandbox public token for the ``user_transactions_dynamic`` test
    user — which comes with six months of recurring transaction history — then
    exchanges it and stores the item and its accounts exactly like the real
    exchange flow, finishing with an initial transaction sync. Intended for local
    testing of ingestion and bill detection; only available while running against
    the Sandbox environment.
    """
    if settings.PLAID_ENV != "sandbox":
        raise HTTPException(status_code=403, detail="Sandbox linking is only available in sandbox")

    create_resp = plaid_client.sandbox_public_token_create(
        SandboxPublicTokenCreateRequest(
            institution_id="ins_109508",
            initial_products=[Products("transactions")],
            options=SandboxPublicTokenCreateRequestOptions(
                override_username="user_transactions_dynamic",
                override_password="pass_good",
            ),
        )
    )
    public_token = create_resp["public_token"]

    exchange = plaid_client.item_public_token_exchange(
        ItemPublicTokenExchangeRequest(public_token=public_token)
    )
    access_token = exchange["access_token"]
    item_id = exchange["item_id"]

    accounts_resp = plaid_client.accounts_get(
        AccountsGetRequest(access_token=access_token)
    )
    institution_name = accounts_resp["item"].get("institution_name") or "Sandbox Bank"
    plaid_item = PlaidItem(
        userId=user_id,
        accessTokenEncrypted=encrypt_token(access_token),
        itemId=item_id,
        institutionName=institution_name,
        status=Status.active,
    )
    db.add(plaid_item)
    db.commit()
    db.refresh(plaid_item)
    for acct in accounts_resp["accounts"]:
        balances = acct["balances"]
        current = balances["current"] or 0
        available = balances.get("available")
        limit = balances.get("limit")
        plaid_type = str(acct["type"])
        plaid_subtype = str(acct["subtype"]) if acct.get("subtype") else None
        db.add(Accounts(
            userId=user_id,
            plaidItemId=plaid_item.id,
            plaidAccountId=acct["account_id"],
            name=acct["name"],
            accountType=normalize_account_type(plaid_type, plaid_subtype),
            plaidType=plaid_type,
            plaidSubtype=plaid_subtype,
            currentBalanceToCent=int(round(current * 100)),
            availableBalanceToCent=int(round(available * 100)) if available is not None else None,
            limitToCent=int(round(limit * 100)) if limit is not None else None,
        ))
    db.commit()

    sync_transactions(db, item_id)

    return SandboxLinkResponse(success=True, institutionName=institution_name)

# check if account connected to live bank endpoint
@router.get(
    "/status",
    response_model=StatusResponse,
    summary="Check bank connection status",
    response_description="Returns 'ready' if accounts have been created for the user",
)
def check_connection_status(
    user_id: str = Depends(rate_limit("plaid_status", max_requests=60)),
    db: Session = Depends(get_session),
) -> StatusResponse:
    """
    Poll to see if the user's initial bank connection has succeeded and 
    accounts are populated.
    """
    # 1. Check for an active PlaidItem for this user
    item_stmt = select(PlaidItem).where(
        PlaidItem.userId == user_id, 
        PlaidItem.status == Status.active
    )
    item = db.exec(item_stmt).first()

    if not item:
        return StatusResponse(status="pending", accountCount=0)

    # 2. Check if accounts have been generated for this item
    acct_stmt = select(Accounts).where(Accounts.plaidItemId == item.id)
    accounts = db.exec(acct_stmt).all()

    if accounts:
        return StatusResponse(status="ready", accountCount=len(accounts))

    return StatusResponse(status="pending", accountCount=0)