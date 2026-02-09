"""Cross-platform market title matching using event-key extraction + fuzzy comparison.

Markets on different platforms describe the same event with very different wording:
  - Polymarket: "Will Claudia López win the 2026 Colombian presidential election?"
  - PredictIt:  "Who will win the 2026 Colombian presidential election?"
  - Kalshi:     "2026 Colombia president — Claudia López"

This module extracts the core "event key" from each title, then clusters
titles by similarity within the same category.
"""
import re

import structlog
from rapidfuzz import fuzz

logger = structlog.get_logger()

# ---------- thresholds ----------
# Score for extracted event keys (more normalised → can be lower)
EVENT_KEY_THRESHOLD = 78
# Score for raw normalised titles (fallback)
TITLE_THRESHOLD = 82

# ---------- prefix / suffix patterns to strip ----------
# Order matters — applied sequentially
_STRIP_PATTERNS = [
    r"\?$",                                         # trailing ?
    r"^will\s+",                                    # "Will …"
    r"^who\s+will\s+",                              # "Who will …"
    r"^which\s+party\s+will\s+",                    # "Which party will …"
    r"^which\s+of\s+these\s+\w+\s+",               # "Which of these 10 …"
    r"^what\s+will\s+",                             # "What will …"
    r"^how\s+many\s+",                              # "How many …"
    r"\s+by\s+\d{1,2}/\d{1,2}[/\d]*.*$",           # date suffix " by 3/31"
    r"\s+by\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}.*$",
    r"\s+by\s+end\s+of\s+\d{4}.*$",                # "by end of 2026"
    r"\s+by\s+(march|june|september|december)\s+\d{1,2},?\s*\d{4}.*$",
    r"\s+before\s+.{3,30}$",                        # "before GTA VI"
    r"\s*\(.*?\)\s*",                               # (parenthetical)
    r"\s*\[.*?\]\s*",                               # [bracketed]
    r"^yes\s+",                                     # Kalshi parlay prefix
    r"^no\s+",                                      # Kalshi parlay prefix
]

# ---------- event-key extraction ----------
# These patterns pull out the core event, discarding the subject/candidate.
_EVENT_EXTRACTORS = [
    # "… win the YYYY <event>" / "… win the <event>"
    re.compile(r"win\s+the\s+(.+)", re.I),
    # "… win <event>" (no "the")
    re.compile(r"win\s+(\d{4}.+)", re.I),
    # "… win <Proper Noun> <event>" (e.g. "win Super Bowl 2026")
    re.compile(r"win\s+([A-Z].+)", re.I),
    # "… control the <body> after the <event>"
    re.compile(r"control\s+the\s+(.+)", re.I),
    # "… leave office …" / "… out as …"
    re.compile(r"(.+?leave\s+(?:the\s+)?office.*)$", re.I),
    re.compile(r"(.+?out\s+as\s+.+)$", re.I),
    # "<topic> ceasefire …"
    re.compile(r"^(.+?ceasefire)", re.I),
    # "<topic> snap election …"
    re.compile(r"^(.+?(?:snap\s+)?election.*)$", re.I),
]

_YEAR_RE = re.compile(r"\b(20\d{2})\b")


def _normalize_title(title: str) -> str:
    """Lower-case + strip noise from a market title."""
    t = title.lower().strip()
    for pattern in _STRIP_PATTERNS:
        t = re.sub(pattern, "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"\s+", " ", t)
    return t


def _extract_event_key(title: str) -> str:
    """Extract the core event from a market title.

    Returns a short, normalised string representing the event
    (e.g. "2026 colombian presidential election").
    Falls back to the normalised title if no extractor matches.
    """
    norm = _normalize_title(title)

    for rx in _EVENT_EXTRACTORS:
        m = rx.search(norm)
        if m:
            key = m.group(1).strip()
            if len(key) >= 10:
                return key

    return norm


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

    # Cluster structure: [(canonical_title, norm_title, event_key, category, years)]
    clusters: list[tuple[str, str, str, str, set[str]]] = []

    for title in titles:
        norm = _normalize_title(title)
        ekey = _extract_event_key(title)
        cat = (categories or {}).get(title, "")
        years = _years_in(ekey)

        if not norm:
            canonical_map[title] = title
            continue

        matched = False
        for canon_title, canon_norm, canon_ekey, canon_cat, canon_years in clusters:
            # Category gate — skip if categories are known and different
            if categories and cat and canon_cat and cat != canon_cat:
                continue

            # Year gate — if both have years, at least one must overlap
            if years and canon_years and not years & canon_years:
                continue

            # Try event-key matching first (more lenient threshold)
            if ekey and canon_ekey:
                score = fuzz.token_sort_ratio(ekey, canon_ekey)
                if score >= EVENT_KEY_THRESHOLD:
                    canonical_map[title] = canon_title
                    matched = True
                    break

            # Fallback to full-title matching (stricter threshold)
            score = fuzz.token_sort_ratio(norm, canon_norm)
            if score >= TITLE_THRESHOLD:
                canonical_map[title] = canon_title
                matched = True
                break

        if not matched:
            clusters.append((title, norm, ekey, cat, years))
            canonical_map[title] = title

    return canonical_map
