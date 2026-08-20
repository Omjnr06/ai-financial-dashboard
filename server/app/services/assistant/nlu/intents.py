from dataclasses import dataclass


# file for determining a users intent by a question
@dataclass(frozen=True)
class Intent:
    name: str
    description: str
    examples: tuple[str, ...]
    required_slots: tuple[str, ...]


INTENTS: list[Intent] = [
    Intent(
        name="spending_by_category",
        description="How much you spent in a category over a period",
        examples=(
            "how much did I spend on dining",
            "what did I spend on groceries last month",
            "how much have I spent eating out",
            "my spending on transport this month",
            "total shopping spend",
            "how much money went to entertainment",
            "what did bills cost me",
        ),
        required_slots=("category",),
    ),
    Intent(
        name="get_total_spending",
        description="Your total spending over a period, with a category breakdown",
        examples=(
            "how much have I spent",
            "what's my total spending this month",
            "how much did I spend in total",
            "total spending",
            "what did I spend overall",
            "how much have I spent by category",
            "how much money have I spent this month",
        ),
        required_slots=(),
    ),
    Intent(
        name="largest_transaction",
        description="Your single biggest purchase in a month",
        examples=(
            "what was my biggest purchase this month",
            "what's my largest transaction",
            "what's the most I spent",
            "biggest expense in July",
            "what was my single largest purchase",
            "show me my priciest transaction",
        ),
        required_slots=(),
    ),
    Intent(
        name="safe_to_spend",
        description="How much you can safely spend right now",
        examples=(
            "what's safe to spend this week",
            "how much can I spend right now",
            "how much can I afford to spend today",
            "what's my safe to spend this month",
            "how much money is safe to spend",
            "what can I safely spend",
        ),
        required_slots=(),
    ),
    Intent(
        name="net_worth",
        description="Your assets minus your debts",
        examples=(
            "what's my net worth",
            "how much am I worth",
            "what's my total net worth",
            "what are my assets minus my debts",
            "how much money do I have overall",
            "net worth",
        ),
        required_slots=(),
    ),
    Intent(
        name="goal_forecast",
        description="When you'll reach a savings goal",
        examples=(
            "when will I afford my new laptop",
            "when will I hit my savings goal",
            "how long until I reach my spring trip goal",
            "when can I afford the car down payment",
            "am I on track for my textbooks goal",
            "when will my laptop fund be ready",
        ),
        required_slots=("goal",),
    ),
    Intent(
        name="habits",
        description="What your spending habits look like",
        examples=(
            "what are my spending habits",
            "what kind of spender am I",
            "describe my spending patterns",
            "what do my spending habits look like",
            "what's my spending personality",
            "tell me about my habits",
        ),
        required_slots=(),
    ),
]

INTENTS_BY_NAME: dict[str, Intent] = {i.name: i for i in INTENTS}