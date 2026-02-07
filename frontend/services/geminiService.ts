import { GoogleGenAI } from "@google/genai";
import { MarketEvent, AnalysisResult } from "../types.ts";

export const analyzeMarket = async (event: MarketEvent): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Find the CURRENT real-time market odds for this specific event contract: "${event.title}"
    
    Verification Task:
    1. SETTLEMENT DATE CHECK: Compare the resolution dates across all platforms. If one platform settles in 2025 and another in 2026, flag this as an "INVALID COMPARISON".
    2. CONTRACT TERMS: Do the platforms define the outcome identically? (e.g. Does "Strike" mean a declaration or physical military action?)
    3. LIQUIDITY: Are these prices based on actual tradeable volume or just wide spreads?
    
    Current System Data:
    - Displayed Expiry: ${event.expiry.toDateString()}
    - Best Yes: ${event.bestYes.price * 100}¢ on ${event.bestYes.platform}
    - Best No: ${event.bestNo.price * 100}¢ on ${event.bestNo.platform}
    
    Analysis Requirements:
    - If you find a date mismatch (e.g. User suspected a 2026 date was wrong for Kalshi), explain the actual Rulebook date from the platform.
    - Factor in Time-Value-of-Money.
    
    Return the analysis in a JSON block with exactly these keys: "analysis", "recommendation", "riskLevel".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "";
    let result: any = {
      analysis: text,
      recommendation: "HOLD",
      riskLevel: "MEDIUM"
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = { ...result, ...parsed };
      }
    } catch (e) {
      console.warn("AI response parsing warning: Falling back to raw text analysis.");
    }
    
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
      analysis: result.analysis,
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