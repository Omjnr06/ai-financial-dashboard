from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from pydantic import BaseModel

from app.core.database import get_session
from app.security.rate_limit import rate_limit
from app.services.assistant.security.guards import validate_question
from app.services.assistant.nlu.intents import INTENTS
from app.services.assistant.nlu.matcher import match
from app.services.assistant.nlu.slots import extract_slots
from app.services.assistant.execution.registry import dispatch, DispatchResult
from app.services.assistant.execution.responder import build_answer

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    intent: str | None
    confidence: float
    suggestions: list[str] | None = None


class SuggestionsResponse(BaseModel):
    suggestions: list[str]


def _suggestions() -> list[str]:
    return [intent.examples[0] for intent in INTENTS]

# post method for asking the assistant questions
@router.post(
    "/ask",
    response_model=AskResponse,
    summary="Ask the assistant a natural-language finance question",
    response_description="A templated answer plus the matched intent and confidence",
)
def ask(
    payload: AskRequest,
    user_id: str = Depends(rate_limit("assistant")),
    db: Session = Depends(get_session),
) -> AskResponse:
    """
    Answer a natural-language question about the authenticated user's finances.

    The question is matched to a known intent by sentence-embedding similarity;
    below the confidence threshold the assistant declines rather than guessing.
    Recognised questions have their parameters extracted, are dispatched to a
    single whitelisted query function with the user_id injected from the
    session, and the numeric result is rendered into a templated answer. Numbers
    always come straight from the data and are never generated.
    """
    try:
        question = validate_question(payload.question)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    intent_name, confidence = match(question)

    if intent_name is None:
        answer = build_answer(DispatchResult(status="unknown", intent="unknown"))
        return AskResponse(
            answer=answer, intent=None, confidence=confidence, suggestions=_suggestions()
        )

    slots = extract_slots(intent_name, question)
    result = dispatch(db, user_id, intent_name, slots)
    answer = build_answer(result)

    return AskResponse(answer=answer, intent=intent_name, confidence=confidence)


# get method that will suggest possibile user specific questions
@router.get(
    "/suggestions",
    response_model=SuggestionsResponse,
    summary="List example questions for the assistant",
    response_description="One representative question per supported intent",
)
def suggestions() -> SuggestionsResponse:
    """
    Return a representative question for each supported intent, for the
    frontend's suggestion chips.
    """
    return SuggestionsResponse(suggestions=_suggestions())