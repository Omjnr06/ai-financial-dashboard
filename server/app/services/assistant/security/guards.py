MAX_QUESTION_LENGTH = 500

# input guards for chatbot
def validate_question(raw: object) -> str:
    if not isinstance(raw, str):
        raise ValueError("Question must be text.")
    question = raw.strip()
    if not question:
        raise ValueError("Question cannot be empty.")
    if len(question) > MAX_QUESTION_LENGTH:
        raise ValueError(f"Question is too long (max {MAX_QUESTION_LENGTH} characters).")
    return question