import jwt
import hashlib
import hmac
from jwt.algorithms import ECAlgorithm
from plaid.model.webhook_verification_key_get_request import WebhookVerificationKeyGetRequest
from app.plaid_client import plaid_client

_key_cache: dict[str, dict] = {}


def _get_verification_key(kid: str) -> dict:
    if kid in _key_cache:
        return _key_cache[kid]
    resp = plaid_client.webhook_verification_key_get(
        WebhookVerificationKeyGetRequest(key_id=kid)
    )
    key = resp["key"].to_dict()
    _key_cache[kid] = key
    return key


def verify_webhook(raw_body: bytes, plaid_verification_header: str) -> bool:
    if not plaid_verification_header:
        return False

    try:
        unverified = jwt.get_unverified_header(plaid_verification_header)
        if unverified.get("alg") != "ES256":
            return False
        kid = unverified["kid"]
        key_dict = _get_verification_key(kid)
        public_key = ECAlgorithm.from_jwk(key_dict)
        claims = jwt.decode(
            plaid_verification_header,
            public_key,
            algorithms=["ES256"],
        )
        body_hash = hashlib.sha256(raw_body).hexdigest()
        expected = claims["request_body_sha256"]
        return hmac.compare_digest(body_hash, expected)

    except Exception:
        return False