from __future__ import annotations

import math


def estimate_token_count(text: str) -> int:
    """Rough token estimator (heuristic based on GPT-style 4 chars/token)."""
    if not text:
        return 0
    return max(1, math.ceil(len(text) / 4))
