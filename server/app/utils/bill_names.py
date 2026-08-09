import re

_GATEWAY_PREFIXES = ["SQ *", "SQ*", "TST* ", "TST*", "PAYPAL *", "PAYPAL*", "PP*", "PP *", "SP *", "SP*"]


def clean_bill_name(raw: str | None) -> str:
    if not raw:
        return "Unknown"
    name = raw.strip()
    upper = name.upper()
    for prefix in _GATEWAY_PREFIXES:
        if upper.startswith(prefix):
            name = name[len(prefix):]
            break
    name = re.sub(r"[#*].*$", "", name)
    name = re.sub(r"\s+\d{3,}$", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    if not name:
        return "Unknown"
    return name.title()