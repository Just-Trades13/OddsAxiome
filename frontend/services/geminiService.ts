import { GoogleGenAI } from "@google/genai";
import { MarketEvent, AnalysisResult } from "../types.ts";

export const analyzeMarket = async (event: MarketEvent): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const platforms = event.lines.map(l => `${l.platform}: Yes ${(l.yesPrice.price * 100).toFixed(1)}c / No ${(l.noPrice.price * 100).toFixed(1)}c`).join('\n    ');

  const prompt = `You are an analyst for a prediction market arbitrage platform. Analyze this contract:

Contract: "${event.title}" — Outcome: "${event.outcome}"
Expiry: ${event.expiry.toDateString()}
Best Yes: ${(event.bestYes.price * 100).toFixed(1)}c on ${event.bestYes.platform}
Best No: ${(event.bestNo.price * 100).toFixed(1)}c on ${event.bestNo.platform}
${event.arbPercent ? `Arb Spread: ${event.arbPercent.toFixed(2)}%` : 'No arbitrage detected'}

Platform prices:
    ${platforms}

Tasks:
1. Verify if the settlement dates match across platforms
2. Check if contract terms define the outcome identically
3. Assess if liquidity supports these prices
4. Factor in time-value-of-money vs risk-free rate

IMPORTANT: Respond with ONLY a valid JSON object (no markdown, no code fences, no explanation outside the JSON). Use these exact keys:
{
  "analysis": "2-4 sentence executive summary in plain English. No markdown, no bullet points, no special formatting.",
  "recommendation": "exactly one of: STRONG BUY, BUY, HOLD, AVOID",
  "riskLevel": "exactly one of: LOW, MEDIUM, HIGH"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = (response.text || "").trim();
    let result: any = {
      analysis: text,
      recommendation: "HOLD",
      riskLevel: "MEDIUM"
    };

    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = { ...result, ...parsed };
      }
    } catch (e) {
      console.warn("AI response parsing warning: Falling back to raw text analysis.");
    }

    // Normalize riskLevel to enum
    const riskRaw = (result.riskLevel || "MEDIUM").toUpperCase();
    if (riskRaw.includes("HIGH")) result.riskLevel = "HIGH";
    else if (riskRaw.includes("LOW")) result.riskLevel = "LOW";
    else result.riskLevel = "MEDIUM";

    // Normalize recommendation to enum
    const recRaw = (result.recommendation || "HOLD").toUpperCase();
    if (recRaw.includes("STRONG BUY")) result.recommendation = "STRONG BUY";
    else if (recRaw.includes("BUY")) result.recommendation = "BUY";
    else if (recRaw.includes("AVOID")) result.recommendation = "AVOID";
    else result.recommendation = "HOLD";

    // Clean analysis text — strip any leftover markdown/JSON artifacts
    let analysis = result.analysis || "";
    analysis = analysis.replace(/\\n/g, ' ').replace(/\*\*/g, '').replace(/#{1,3}\s/g, '').trim();
    if (analysis.length > 800) analysis = analysis.substring(0, 800) + '...';

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => {
        if (chunk.web) {
          return {
            title: chunk.web.title || 'Market Source',
            uri: chunk.web.uri
          };
        }
        return null;
      })
      .filter((s): s is { title: string; uri: string } => s !== null) || [];

    return {
      analysis,
      recommendation: result.recommendation as any,
      riskLevel: result.riskLevel as any,
      sources
    };
  } catch (error) {
    console.error("Gemini Grounding Error:", error);
    return {
      analysis: "Unable to verify live contract terms and pricing via web search. Please manually check platform settlement rules and calculate annualized yields against risk-free benchmarks.",
      recommendation: "HOLD",
      riskLevel: "MEDIUM"
    };
  }
};
