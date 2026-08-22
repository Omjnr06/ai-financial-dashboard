import numpy as np
from fastembed import TextEmbedding

# file to represent user input text as vector to put similar sentences with near same meaning near each other
_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model: TextEmbedding | None = None


def _get_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding(model_name=_MODEL_NAME)
    return _model


def embed(texts: list[str]) -> np.ndarray:
    model = _get_model()
    vectors = np.array(list(model.embed(texts)), dtype=np.float32)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


def embed_one(text: str) -> np.ndarray:
    return embed([text])[0]