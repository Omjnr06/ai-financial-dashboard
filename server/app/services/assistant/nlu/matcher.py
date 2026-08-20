import numpy as np

from app.services.assistant.nlu.embeddings import embed, embed_one
from app.services.assistant.nlu.intents import INTENTS

# reduce or increase this number to tighten the confidence of what model thinks user is asking
CONFIDENCE_THRESHOLD = 0.45

# builds matrix based on example phrases x example intent
# run, then each question checked where vector is on matrix or how close
# highest score then wins

_example_texts: list[str] = []
_example_labels: list[str] = []
_example_matrix: np.ndarray | None = None


def _build() -> None:
    global _example_matrix
    for intent in INTENTS:
        for phrase in intent.examples:
            _example_texts.append(phrase)
            _example_labels.append(intent.name)
    _example_matrix = embed(_example_texts)


_build()


def match(question: str) -> tuple[str | None, float]:
    query_vec = embed_one(question)
    sims = _example_matrix @ query_vec
    best_idx = int(np.argmax(sims))
    best_score = float(sims[best_idx])
    if best_score < CONFIDENCE_THRESHOLD:
        return None, best_score
    return _example_labels[best_idx], best_score


# if __name__ == "__main__":
#     probes = [
#         "how much did I spend on dining?",
#         "what was my biggest purchase this month?",
#         "when will I afford my new laptop?",
#         "what's safe to spend this week?",
#         "what's my net worth?",
#         "what are my spending habits?",
#         "what's the weather?",
#     ]
#     for q in probes:
#         name, score = match(q)
#         print(f"{score:.3f}  {name or 'UNKNOWN':<22}  {q}")