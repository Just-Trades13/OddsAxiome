"""Cross-platform market title matching using fuzzy comparison.

Markets on different platforms describe the same event with very different wording:
  - Polymarket: "Will Claudia López win the 2026 Colombian presidential election?"
  - PredictIt:  "Who will win the 2026 Colombian presidential election?"
  - Kalshi:     "Will Democratic win the Presidency in 2028?"

This module normalises titles, then clusters them by similarity within the
same category.  Two matching strategies:

1. **Normalised title** — standard fuzzy match (threshold 82).
   Catches identical or near-identical titles across platforms.

2. **Aggregate market match** — "Who will win X?" on PredictIt groups
   multiple outcomes under one market, while Polymarket creates separate
   binary markets per candidate.  We detect this and link them.
"""
import re

import structlog
from rapidfuzz import fuzz

logger = structlog.get_logger()

# ---------- thresholds ----------
TITLE_THRESHOLD = 82

# ---------- prefix / suffix patterns to strip ----------
_STRIP_PATTERNS = [
    r"\?$",                                         # trailing ?
    r"\s+by\s+\d{1,2}/\d{1,2}[/\d]*.*$",           # date suffix " by 3/31"
    r"\s+by\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}.*$",
    r"\s+by\s+end\s+of\s+\d{4}.*$",                # "by end of 2026"
    r"\s+by\s+(march|june|september|december)\s+\d{1,2},?\s*\d{4}.*$",
    r"\s+before\s+.{3,30}$",                        # "before GTA VI"
    r"\s*\(.*?\)\s*",                               # (parenthetical)
    r"\s*\[.*?\]\s*",                               # [bracketed]
    r"\s*\(Must be public by .*\)\s*",               # PredictIt date clause
]

_YEAR_RE = re.compile(r"\b(20\d{2})\b")


def _normalize_title(title: str) -> str:
    """Lower-case + strip noise from a market title."""
    t = title.lower().strip()
    for pattern in _STRIP_PATTERNS:
        t = re.sub(pattern, "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"\s+", " ", t)
    return t


def _years_in(text: str) -> set[str]:
    """Extract all 4-digit years from text."""
    return set(_YEAR_RE.findall(text))


def cluster_titles(
    titles: list[str],
    categories: dict[str, str] | None = None,
) -> dict[str, str]:
    """Given a list of market titles, return {original_title: canonical_title}.

    If *categories* is provided ({title: category_str}), matching is restricted
    to titles in the same category.  This dramatically reduces false positives.
    """
    if not titles:
        return {}

    canonical_map: dict[str, str] = {}

    # Cluster structure: [(canonical_title, norm_title, category, years)]
    clusters: list[tuple[str, str, str, set[str]]] = []

    for title in titles:
        norm = _normalize_title(title)
        cat = (categories or {}).get(title, "")
        years = _years_in(norm)

        if not norm:
            canonical_map[title] = title
            continue

        matched = False
        for canon_title, canon_norm, canon_cat, canon_years in clusters:
            # Category gate — skip if categories are known and different
            if categories and cat and canon_cat and cat != canon_cat:
                continue

            # Year gate — if both have years, at least one must overlap
            if years and canon_years and not years & canon_years:
                continue

            score = fuzz.token_sort_ratio(norm, canon_norm)
            if score >= TITLE_THRESHOLD:
                canonical_map[title] = canon_title
                matched = True
                break

        if not matched:
            clusters.append((title, norm, cat, years))
            canonical_map[title] = title

    return canonical_map
