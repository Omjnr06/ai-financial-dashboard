from fastapi import APIRouter, Depends, Request, HTTPException
from sqlmodel import Session
from pydantic import BaseModel
import logging
from sqlmodel import select

from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.model.sandbox_public_token_create_request_options import SandboxPublicTokenCreateRequestOptions

from app.integrations.plaid_client import plaid_client, encrypt_token
from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.models import PlaidItem, Accounts, Status
from app.utils.account_types import normalize_account_type
from app.integrations.plaid_webhook_verify import verify_webhook
from app.services.ingestion import sync_transactions
from app.core.config import settings

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
        country_codes=[CountryCode("US"), CountryCode("CA")],
        language="en",
        webhook=settings.PLAID_WEBHOOK_URL,
    )
    resp = plaid_client.link_token_create(req)
    return LinkTokenResponse(
        linkToken=resp["link_token"],
        expiration=resp["expiration"].isoformat(),
    )


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



@router.post(
    "/webhook",
    summary="Receive Plaid webhooks",
    response_description="Acknowledges receipt",
)
async def plaid_webhook(request: Request):
    """
    Receive and process webhooks from Plaid.

    Every request is verified against Plaid's JWT signature before anything in
    the payload is trusted — unsigned or invalid requests are rejected with 401.

    For `TRANSACTIONS` webhooks, this triggers a cursor-based sync that pulls
    the item's transaction changes from Plaid and applies them to the database:
    new transactions are inserted, settled/changed ones are updated in place,
    and removed ones are deleted. The cursor makes this **idempotent** — repeated
    webhooks never double-count.
    """
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
        from app.core.database import engine
        with Session(engine) as db:
            result = sync_transactions(db, item_id)
            # for dev, to be changed to logger later by me
            print(f"Sync result: {result}")

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