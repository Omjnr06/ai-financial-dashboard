import numpy as np

from app.services.assistant.nlu.embeddings import embed, embed_one
from app.services.assistant.nlu.intents import INTENTS

# reduce or increase this number to tighten the confidence of what model thinks user is asking
CONFIDENCE_THRESHOLD = 0.45

# builds matrix based on example phrases x example intent, lazily on first use so
# the embedding model is never loaded at import/boot (keeps idle memory low)

_example_labels: list[str] = []
_example_matrix: np.ndarray | None = None


def _ensure_built() -> None:
    global _example_matrix
    if _example_matrix is not None:
        return
    texts: list[str] = []
    labels: list[str] = []
    for intent in INTENTS:
        for phrase in intent.examples:
            texts.append(phrase)
            labels.append(intent.name)
    _example_labels.extend(labels)
    _example_matrix = embed(texts)


def match(question: str) -> tuple[str | None, float]:
    _ensure_built()
    query_vec = embed_one(question)
    sims = _example_matrix @ query_vec
    best_idx = int(np.argmax(sims))
    best_score = float(sims[best_idx])
    if best_score < CONFIDENCE_THRESHOLD:
        return None, best_score
    return _example_labels[best_idx], best_score