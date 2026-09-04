"""
embed all intent example phrases via OpenAI and save the
vectors + labels to a file the matcher loads at runtime.

Run this whenever you add or change intents:
    docker compose exec backend uv run python -m app.services.assistant.nlu.precompute_intents)

"""

import numpy as np
from pathlib import Path

from app.services.assistant.nlu.embeddings import embed
from app.services.assistant.nlu.intents import INTENTS

OUTPUT_PATH = Path(__file__).parent / "intent_vectors.npz"


def main() -> None:
    texts: list[str] = []
    labels: list[str] = []
    for intent in INTENTS:
        for phrase in intent.examples:
            texts.append(phrase)
            labels.append(intent.name)

    print(f"Embedding {len(texts)} example phrases via OpenAI...")
    matrix = embed(texts)

    np.savez(OUTPUT_PATH, matrix=matrix, labels=np.array(labels))
    print(f"Saved {matrix.shape[0]} vectors ({matrix.shape[1]} dims) to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()