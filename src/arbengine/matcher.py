"""Cross-platform market title matching using fuzzy comparison.

Markets on different platforms describe the same event with very different wording:
  - Polymarket: "Will Claudia López win the 2026 Colombian presidential election?"
  - PredictIt:  "Who will win the 2026 Colombian presidential election?"
  - Kalshi:     "Will Democratic win the Presidency in 2028?"

Key insight: Markets from the SAME platform with similar titles are usually
different markets (e.g. different candidates for the same election).
Markets from DIFFERENT platforms with similar titles are likely the same event.

So we use platform-aware matching:
  - Cross-platform: fuzzy threshold 82  (catch different wording)
  - Same-platform:  exact match only    (don't merge different candidates)
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


def _normalize_title(title: str) -> str:
    """Lower-case + strip noise from a market title."""
    t = title.lower().strip()
    for pattern in _STRIP_PATTERNS:
        t = re.sub(pattern, "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"\s+", " ", t)
    return t


def _years_in(text: str) -> set[str]:
    return set(_YEAR_RE.findall(text))


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
                # Cross-platform → use fuzzy matching
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
