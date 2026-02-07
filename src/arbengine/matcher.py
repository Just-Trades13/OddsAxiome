"""Cross-platform market title matching using fuzzy string comparison.

Markets on different platforms often describe the same event with different
wording. This module clusters titles that likely refer to the same market.
"""
import re

import structlog
from rapidfuzz import fuzz

logger = structlog.get_logger()

# Minimum similarity score (0-100) to consider two titles as matching
MATCH_THRESHOLD = 82

# Common words/phrases to strip before comparing (reduce noise)
STRIP_PATTERNS = [
    r"\?$",                     # trailing question mark
    r"^will\s+",                # leading "Will"
    r"\s+by\s+\d{1,2}/\d{1,2}.*$",  # date suffixes like "by 3/31"
    r"\s*\(.*?\)\s*",           # parenthetical remarks
]


def _normalize_title(title: str) -> str:
    """Normalize a market title for comparison."""
    t = title.lower().strip()
    for pattern in STRIP_PATTERNS:
        t = re.sub(pattern, "", t, flags=re.IGNORECASE).strip()
    # Collapse whitespace
    t = re.sub(r"\s+", " ", t)
    return t


def cluster_titles(titles: list[str]) -> dict[str, str]:
    """
    Given a list of market titles, return a mapping from each title to its
    canonical (cluster representative) title.

    Titles that are similar enough are mapped to the same canonical title
    (the first one seen in that cluster).

    Returns: {original_title: canonical_title}
    """
    if not titles:
        return {}

    canonical_map: dict[str, str] = {}
    # List of (canonical_title, normalized_canonical)
    clusters: list[tuple[str, str]] = []

    for title in titles:
        norm = _normalize_title(title)
        if not norm:
            canonical_map[title] = title
            continue

        matched = False
        for canon_title, canon_norm in clusters:
            score = fuzz.token_sort_ratio(norm, canon_norm)
            if score >= MATCH_THRESHOLD:
                canonical_map[title] = canon_title
                matched = True
                break

        if not matched:
            clusters.append((title, norm))
            canonical_map[title] = title

    return canonical_map
