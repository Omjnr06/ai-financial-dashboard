from fastapi import APIRouter, Depends
from sqlmodel import Session
from pydantic import BaseModel
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from app.plaid_client import plaid_client, encrypt_token
from app.dependencies import get_current_user
from app.database import get_session
from app.models import PlaidItem, Accounts, Status, Type
from fastapi import Request
import logging
from fastapi import Request, HTTPException
from app.plaid_webhook_verify import verify_webhook

router = APIRouter(prefix="/api/plaid", tags=["plaid"])


class LinkTokenResponse(BaseModel):
    linkToken: str
    expiration: str

class ExchangeBody(BaseModel):
    publicToken: str

class ExchangeResponse(BaseModel):
    success: bool
    institutionName: str


@router.post(
    "/link_token",
    response_model=LinkTokenResponse,
    summary="Create a Plaid Link token",
    response_description="A short-lived token used to initialize Plaid Link",
)
def create_link_token(user_id: str = Depends(get_current_user)) -> LinkTokenResponse:
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
    user_id: str = Depends(get_current_user),
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
    type_map = {"depository": Type.checking, "credit": Type.credit}
    for acct in accounts_resp["accounts"]:
        balance = acct["balances"]["current"] or 0
        db.add(Accounts(
            userId=user_id,
            plaidItemId=plaid_item.id,
            plaidAccountId=acct["account_id"],
            name=acct["name"],
            type=type_map.get(str(acct["type"]), Type.checking),
            currentBalanceToCent=int(round(balance * 100)),
        ))
    db.commit()
    return ExchangeResponse(success=True, institutionName=institution_name)



logger = logging.getLogger(__name__)
@router.post(
    "/webhook",
    summary="Receive Plaid webhooks",
    response_description="Acknowledges receipt",
)
async def plaid_webhook(request: Request):
    """Receives and verifies webhooks from Plaid."""
    raw_body = await request.body()
    verification_header = request.headers.get("plaid-verification", "")
    if not verify_webhook(raw_body, verification_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()
    webhook_type = payload.get("webhook_type")
    webhook_code = payload.get("webhook_code")
    item_id = payload.get("item_id")
    print(f"Verified webhook: type={webhook_type} code={webhook_code} item={item_id}")

    # TODO (J10): if transactions webhook, trigger ingestion
    return {"acknowledged": True}


