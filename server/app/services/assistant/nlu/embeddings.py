import numpy as np
from openai import OpenAI

from app.core.config import settings

# represents text as vectors via OpenAI's embedding API (no local model loaded).
# same downstream use: cosine similarity against precomputed intent vectors.

_MODEL_NAME = "text-embedding-3-small"
_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def embed(texts: list[str]) -> np.ndarray:
    client = _get_client()
    resp = client.embeddings.create(model=_MODEL_NAME, input=texts)
    vectors = np.array([d.embedding for d in resp.data], dtype=np.float32)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


def embed_one(text: str) -> np.ndarray:
    return embed([text])[0]