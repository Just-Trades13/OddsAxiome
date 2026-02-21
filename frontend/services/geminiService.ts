import { MarketEvent, AnalysisResult } from "../types.ts";
import { apiPost } from "./api.ts";

export const analyzeMarket = async (event: MarketEvent): Promise<AnalysisResult> => {
  try {
    const platforms = event.lines.map(l => ({
      platform: l.platform,
      yes_price: l.yesPrice.price,
      no_price: l.noPrice.price,
    }));

    const body = {
      title: event.title,
      outcome: event.outcome,
      expiry: event.expiry.toDateString(),
      best_yes_price: event.bestYes.price,
      best_yes_platform: event.bestYes.platform,
      best_no_price: event.bestNo.price,
      best_no_platform: event.bestNo.platform,
      arb_percent: event.arbPercent || null,
      platforms,
    };

    const res = await apiPost<any>('/analysis/market', body);

    return {
      analysis: res.analysis || "No analysis available.",
      recommendation: res.recommendation || "HOLD",
      riskLevel: res.risk_level || "MEDIUM",
      sources: res.sources || [],
    };
  } catch (error: any) {
    console.error("Analysis API Error:", error);
    return {
      analysis: "Unable to verify live contract terms and pricing via web search. Please manually check platform settlement rules and calculate annualized yields against risk-free benchmarks.",
      recommendation: "HOLD",
      riskLevel: "MEDIUM",
    };
  }
};
