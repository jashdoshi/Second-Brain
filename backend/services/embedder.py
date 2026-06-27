import logging

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2"
_model: SentenceTransformer | None = None

# Max chars sent to the model — avoids tokenizer overflow on very long docs.
# all-MiniLM-L6-v2 has a 256-token limit; ~1500 chars is a safe ceiling.
_MAX_CHARS = 1500


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading sentence transformer model: %s", _MODEL_NAME)
        _model = SentenceTransformer(_MODEL_NAME)
        logger.info("Model loaded")
    return _model


def embed(text: str) -> list[float]:
    """Embed a single string, returning a 384-dim float list."""
    truncated = text[:_MAX_CHARS]
    vector = _get_model().encode(truncated, convert_to_numpy=True)
    return vector.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of strings, returning one 384-dim vector per input."""
    truncated = [t[:_MAX_CHARS] for t in texts]
    vectors = _get_model().encode(truncated, convert_to_numpy=True)
    return [v.tolist() for v in vectors]
