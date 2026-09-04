import numpy as np
from pathlib import Path

from app.services.assistant.nlu.embeddings import embed_one

# Loads precomputed intent vectors (generated offline by precompute_intents.py)
# and matches an incoming query against them. Only the query is embedded at
# runtime via OpenAI; intents are never re-embedded here.

# OPENAI model threshold better then miniLM embed model but might need adjustment
CONFIDENCE_THRESHOLD = 0.35

_VECTORS_PATH = Path(__file__).parent / "intent_vectors.npz"

_example_matrix: np.ndarray | None = None
_example_labels: list[str] | None = None


def _ensure_loaded() -> None:
    global _example_matrix, _example_labels
    if _example_matrix is not None:
        return
    data = np.load(_VECTORS_PATH, allow_pickle=True)
    _example_matrix = data["matrix"].astype(np.float32)
    _example_labels = list(data["labels"])


def match(question: str) -> tuple[str | None, float]:
    _ensure_loaded()
    query_vec = embed_one(question)
    sims = _example_matrix @ query_vec
    best_idx = int(np.argmax(sims))
    best_score = float(sims[best_idx])
    if best_score < CONFIDENCE_THRESHOLD:
        return None, best_score
    return _example_labels[best_idx], best_score