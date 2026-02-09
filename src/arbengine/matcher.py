"""Cross-platform market title matching using fuzzy comparison.

Markets on different platforms describe the same event with very different wording:
  - Polymarket: "Will Gavin Newsom win the 2028 Democratic presidential nomination?"
  - PredictIt:  "Will Gavin Newsom win the 2028 Democratic presidential nomination?"
  - Kalshi:     "Will Gavin Newsom win the next presidential election?"

Key insight: Markets from the SAME platform with similar titles are usually
different markets (e.g. different candidates for the same election).
Markets from DIFFERENT platforms with similar titles are likely the same event.

So we use platform-aware matching:
  - Cross-platform: fuzzy threshold 82  (catch different wording)
  - Same-platform:  exact match only    (don't merge different candidates)

Semantic gates prevent matching fundamentally different questions:
  - "Will X run for president?" ≠ "Will X win the presidency?"
  - "Which party will win?" ≠ "Will [person] win?"
"""
import re

import structlog
from rapidfuzz import fuzz

logger = structlog.get_logger()

CROSS_PLATFORM_THRESHOLD = 82

# Patterns to strip before comparison (keep date suffixes — they differentiate
# time-variant markets like "by March 31" vs "by December 31" on the same platform)
_STRIP_PATTERNS = [
    r"\?$",
    r"\s*\(.*?\)\s*",
    r"\s*\[.*?\]\s*",
]

_YEAR_RE = re.compile(r"\b(20\d{2})\b")

# --- Semantic conflict detection ---
# If title A contains a term from one group and title B contains a term
# from another group in the same pair, they are asking different questions.
_VERB_CONFLICTS = [
    # "run for / announce / file" vs "win / become / elected"
    (
        {"run for", "run in", "announce", "file for", "enter the race",
         "seek the nomination", "declare candidacy"},
        {"win", "become", "elected", "prevail", "capture"},
    ),
]

# Titles containing these phrases are aggregate/party-level markets
# and must NOT match individual candidate markets.
_AGGREGATE_PHRASES = {
    "which party",
    "what party",
    "party win",
    "party control",
    "party to win",
}


def _normalize_title(title: str) -> str:
    """Lower-case + strip noise from a market title."""
    t = title.lower().strip()
    for pattern in _STRIP_PATTERNS:
        t = re.sub(pattern, "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"\s+", " ", t)
    return t


def _years_in(text: str) -> set[str]:
    return set(_YEAR_RE.findall(text))


def _has_semantic_conflict(norm_a: str, norm_b: str) -> bool:
    """Return True if the two normalised titles ask fundamentally
    different questions (e.g. 'run for' vs 'win')."""

    # Verb conflict gate
    for group_a, group_b in _VERB_CONFLICTS:
        a_in_a = any(phrase in norm_a for phrase in group_a)
        a_in_b = any(phrase in norm_a for phrase in group_b)
        b_in_a = any(phrase in norm_b for phrase in group_a)
        b_in_b = any(phrase in norm_b for phrase in group_b)
        # One title has a "run for" verb, the other has a "win" verb
        if (a_in_a and b_in_b) or (a_in_b and b_in_a):
            return True

    # Aggregate vs specific gate
    a_agg = any(phrase in norm_a for phrase in _AGGREGATE_PHRASES)
    b_agg = any(phrase in norm_b for phrase in _AGGREGATE_PHRASES)
    if a_agg != b_agg:
        return True

    return False


def cluster_titles(
    titles: list[str],
    categories: dict[str, str] | None = None,
    platforms: dict[str, str] | None = None,
) -> dict[str, str]:
    """Given a list of market titles, return {original_title: canonical_title}.

    Args:
        titles: List of market titles to cluster.
        categories: Optional {title: category} dict.  Titles in different
                    categories are never matched.
        platforms: Optional {title: platform_slug} dict.  Titles from the
                   SAME platform require exact normalised match.  Titles from
                   different platforms use fuzzy matching (threshold 82).
    """
    if not titles:
        return {}

    canonical_map: dict[str, str] = {}

    # Cluster: [(canonical_title, norm_title, category, years, platform_set)]
    clusters: list[tuple[str, str, str, set[str], set[str]]] = []

    for title in titles:
        norm = _normalize_title(title)
        cat = (categories or {}).get(title, "")
        plat = (platforms or {}).get(title, "")
        years = _years_in(norm)

        if not norm:
            canonical_map[title] = title
            continue

        matched = False
        for canon_title, canon_norm, canon_cat, canon_years, canon_plats in clusters:
            # Category gate
            if categories and cat and canon_cat and cat != canon_cat:
                continue

            # Year gate
            if years and canon_years and not years & canon_years:
                continue

            same_platform = plat and plat in canon_plats

            if same_platform:
                # Same platform → require exact normalised title match
                if norm == canon_norm:
                    canonical_map[title] = canon_title
                    canon_plats.add(plat)
                    matched = True
                    break
            else:
                # Cross-platform → use fuzzy matching + semantic gates
                if _has_semantic_conflict(norm, canon_norm):
                    continue

                score = fuzz.token_sort_ratio(norm, canon_norm)
                if score >= CROSS_PLATFORM_THRESHOLD:
                    canonical_map[title] = canon_title
                    if plat:
                        canon_plats.add(plat)
                    matched = True
                    break

        if not matched:
            plat_set = {plat} if plat else set()
            clusters.append((title, norm, cat, years, plat_set))
            canonical_map[title] = title

    return canonical_map
