"""AI-powered market analysis via Google Gemini."""
import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.core.config import settings
from src.core.dependencies import get_current_user
from src.models.user import User

logger = structlog.get_logger()
router = APIRouter()


class AnalysisRequest(BaseModel):
    title: str
    outcome: str
    expiry: str
    best_yes_price: float
    best_yes_platform: str
    best_no_price: float
    best_no_platform: str
    arb_percent: float | None = None
    platforms: list[dict] = []


class AnalysisResponse(BaseModel):
    analysis: str
    recommendation: str
    risk_level: str
    sources: list[dict] = []


@router.post("/market", response_model=AnalysisResponse)
async def analyze_market(
    body: AnalysisRequest,
    user: User = Depends(get_current_user),
):
    """Run AI analysis on a market using Gemini with web grounding."""
    api_key = settings.google_ai_api_key
    if not api_key:
        return AnalysisResponse(
            analysis="AI analysis is not configured. Please contact support.",
            recommendation="HOLD",
            risk_level="MEDIUM",
            sources=[],
        )

    platforms_text = "\n    ".join(
        f"{p.get('platform', '?')}: Yes {p.get('yes_price', 0)*100:.1f}c / No {p.get('no_price', 0)*100:.1f}c"
        for p in body.platforms
    )

    prompt = f"""You are an analyst for a prediction market arbitrage platform. Analyze this contract:

Contract: "{body.title}" — Outcome: "{body.outcome}"
Expiry: {body.expiry}
Best Yes: {body.best_yes_price*100:.1f}c on {body.best_yes_platform}
Best No: {body.best_no_price*100:.1f}c on {body.best_no_platform}
{f'Arb Spread: {body.arb_percent:.2f}%' if body.arb_percent else 'No arbitrage detected'}

Platform prices:
    {platforms_text}

Tasks:
1. Verify if the settlement dates match across platforms
2. Check if contract terms define the outcome identically
3. Assess if liquidity supports these prices
4. Factor in time-value-of-money vs risk-free rate

IMPORTANT: Respond with ONLY a valid JSON object (no markdown, no code fences, no explanation outside the JSON). Use these exact keys:
{{
  "analysis": "2-4 sentence executive summary in plain English. No markdown, no bullet points, no special formatting.",
  "recommendation": "exactly one of: STRONG BUY, BUY, HOLD, AVOID",
  "riskLevel": "exactly one of: LOW, MEDIUM, HIGH"
}}"""

    try:
        from google import genai

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                tools=[genai.types.Tool(google_search=genai.types.GoogleSearch())],
            ),
        )

        text = (response.text or "").strip()

        # Parse JSON from response
        import json
        import re

        result = {"analysis": text, "recommendation": "HOLD", "riskLevel": "MEDIUM"}

        try:
            cleaned = re.sub(r"^```(?:json)?\s*", "", text)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()
            json_match = re.search(r"\{[\s\S]*\}", cleaned)
            if json_match:
                parsed = json.loads(json_match.group())
                result.update(parsed)
        except (json.JSONDecodeError, ValueError):
            logger.warning("ai_response_parse_fallback", text_length=len(text))

        # Normalize fields
        risk_raw = (result.get("riskLevel") or "MEDIUM").upper()
        if "HIGH" in risk_raw:
            risk_level = "HIGH"
        elif "LOW" in risk_raw:
            risk_level = "LOW"
        else:
            risk_level = "MEDIUM"

        rec_raw = (result.get("recommendation") or "HOLD").upper()
        if "STRONG BUY" in rec_raw:
            recommendation = "STRONG BUY"
        elif "BUY" in rec_raw:
            recommendation = "BUY"
        elif "AVOID" in rec_raw:
            recommendation = "AVOID"
        else:
            recommendation = "HOLD"

        analysis = result.get("analysis") or ""
        analysis = analysis.replace("\\n", " ").replace("**", "").strip()
        if len(analysis) > 800:
            analysis = analysis[:800] + "..."

        # Extract grounding sources
        sources = []
        try:
            chunks = response.candidates[0].grounding_metadata.grounding_chunks
            for chunk in chunks or []:
                if chunk.web:
                    sources.append({"title": chunk.web.title or "Source", "uri": chunk.web.uri})
        except (AttributeError, IndexError, TypeError):
            pass

        return AnalysisResponse(
            analysis=analysis,
            recommendation=recommendation,
            risk_level=risk_level,
            sources=sources,
        )

    except Exception as e:
        logger.error("ai_analysis_failed", error=str(e))
        return AnalysisResponse(
            analysis="Unable to verify live contract terms and pricing via web search. Please manually check platform settlement rules and calculate annualized yields against risk-free benchmarks.",
            recommendation="HOLD",
            risk_level="MEDIUM",
            sources=[],
        )
