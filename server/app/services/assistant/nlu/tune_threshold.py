"""
Run after precompute_intents.py to recalibrate CONFIDENCE_THRESHOLD for
OpenAI embeddings. Prints the match + score for good questions (should match
with high scores) and off-topic ones (should score low / return None).
    to run:
    docker compose exec backend uv run python -m app.services.assistant.nlu.tune_threshold


"""

from app.services.assistant.nlu.matcher import match

GOOD = [
    "how much did I spend on dining",
    "what was my biggest purchase this month",
    "when will I afford my new laptop",
    "what's safe to spend this week",
    "what's my net worth",
    "what are my spending habits",
    "how much have I spent total",
]

OFF_TOPIC = [
    "what's the weather today",
    "tell me a joke",
    "who is the president",
    "how do I cook pasta",
    "what time is it",
]


def main() -> None:
    print("=== SHOULD MATCH (want high scores) ===")
    for q in GOOD:
        name, score = match(q)
        print(f"  {score:.3f}  {name or 'UNKNOWN':<24}  {q}")

    print("\n=== SHOULD NOT MATCH (want low scores) ===")
    for q in OFF_TOPIC:
        name, score = match(q)
        print(f"  {score:.3f}  {name or 'UNKNOWN':<24}  {q}")

    print("\nSet CONFIDENCE_THRESHOLD between the highest OFF-TOPIC score")
    print("and the lowest SHOULD-MATCH score.")


if __name__ == "__main__":
    main()