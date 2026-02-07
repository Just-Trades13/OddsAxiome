
import { MarketCategory, MarketEvent, Platform, MarketLine } from '../types.ts';
import { calculateArb, calculateAPY, getSearchUrl } from '../constants.ts';
import { generateMockEvents } from './mockData.ts';
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

export interface FetchResponse {
  data: MarketEvent[];
  source: 'live' | 'cache' | 'fallback';
  errorReason?: 'QUOTA_EXHAUSTED' | 'NETWORK_ERROR' | 'TIMEOUT';
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
  ]);
};

/**
 * Fetches market data for a category.
 * Uses Gemini AI + Search to perform cross-platform comparison.
 */
export const fetchRealTimeMarkets = async (category: MarketCategory, forceRefresh = false): Promise<FetchResponse> => {
  if (!forceRefresh) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ 
          data: generateMockEvents(category), 
          source: 'fallback' 
        });
      }, 300);
    });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    TASK: Find and compare current prediction market odds for the "${category}" category.
    PLATFORMS: 
    - Polymarket
    - Kalshi
    - PredictIt
    - Gemini (exchange.gemini.com/predictions)
    - DraftKings (predictions.draftkings.com/en/)
    - Robinhood (robinhood.com/us/en/prediction-markets/)
    - Limitless (limitless.exchange/markets)
    
    REQUIREMENTS:
    1. Group matching outcomes across all platforms.
    2. Provide prices in cents (0-100).
    3. DISCOVER DEEP LINKS:
       - KALSHI: Find full paths: "/markets/{series}/{event}/{market}". 
       - DRAFTKINGS: Search specifically within "predictions.draftkings.com".
       - GEMINI: Search specifically within "exchange.gemini.com/predictions".
       - ROBINHOOD: Search specifically within "robinhood.com/us/en/prediction-markets/".
       - LIMITLESS: Search specifically within "limitless.exchange/markets".
    4. Provide valid ISO expiry dates.
    
    Output exactly as a JSON array of objects.
  `;

  try {
    const fetchPromise = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              outcome: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              platforms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    yesPriceCents: { type: Type.NUMBER },
                    noPriceCents: { type: Type.NUMBER },
                    volumeUSD: { type: Type.NUMBER },
                    directUrl: { type: Type.STRING }
                  },
                  required: ["name", "yesPriceCents", "noPriceCents"]
                }
              }
            },
            required: ["title", "outcome", "expiryDate", "platforms"]
          }
        }
      }
    });

    // Increased timeout to 120 seconds as multi-platform search grounding is intensive
    const response = await withTimeout(fetchPromise, 120000) as GenerateContentResponse;
    const results = JSON.parse(response.text || "[]");
    
    const events: MarketEvent[] = results.map((topic: any, idx: number) => {
      const expiry = new Date(topic.expiryDate || "2025-12-31T23:59:59Z");
      const lines: MarketLine[] = topic.platforms.map((p: any) => ({
        platform: p.name as Platform,
        yesPrice: { price: p.yesPriceCents / 100, timestamp: Date.now() },
        noPrice: { price: p.noPriceCents / 100, timestamp: Date.now() },
        url: p.directUrl || getSearchUrl(p.name as Platform, `${topic.title} ${topic.outcome}`),
        liquidity: p.volumeUSD || 0
      }));

      let bestYes = { price: 1.0, platform: Platform.POLYMARKET };
      let bestNo = { price: 1.0, platform: Platform.POLYMARKET };
      lines.forEach(l => {
        if (l.yesPrice.price < bestYes.price) bestYes = { price: l.yesPrice.price, platform: l.platform };
        if (l.noPrice.price < bestNo.price) bestNo = { price: l.noPrice.price, platform: l.platform };
      });

      const event: MarketEvent = {
        id: `live-${category}-${idx}-${Date.now()}`,
        category, title: topic.title, outcome: topic.outcome,
        description: `Aggregated data.`, expiry, lastScraped: Date.now(),
        bestYes, bestNo, lines
      };

      const arb = calculateArb(bestYes.price, bestNo.price);
      if (arb > 0) {
        event.arbPercent = arb;
        const { apy, days } = calculateAPY(arb, expiry);
        event.apy = apy;
        event.daysToExpiry = days;
      } else {
        event.daysToExpiry = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      }
      return event;
    });

    return { data: events, source: 'live' };
  } catch (error: any) {
    console.error("AI Fetch Error:", error);
    return { 
      data: generateMockEvents(category), 
      source: 'fallback',
      errorReason: error.message === 'TIMEOUT' ? 'TIMEOUT' : 'NETWORK_ERROR'
    };
  }
};

export const refreshSingleMarket = async (event: MarketEvent): Promise<MarketEvent | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Refresh odds for: "${event.title}" - "${event.outcome}". Search Polymarket, Kalshi, PredictIt, Gemini, DraftKings, Robinhood, and Limitless. Prioritize deep links on all platforms.`;

  try {
    const refreshPromise = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            outcome: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            platforms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  yesPriceCents: { type: Type.NUMBER },
                  noPriceCents: { type: Type.NUMBER },
                  volumeUSD: { type: Type.NUMBER },
                  directUrl: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const response = await withTimeout(refreshPromise, 45000) as GenerateContentResponse;
    const topic = JSON.parse(response.text || "{}");
    if (!topic.title) return null;

    const expiry = new Date(topic.expiryDate || event.expiry.toISOString());
    const lines: MarketLine[] = (topic.platforms || []).map((p: any) => ({
      platform: p.name as Platform,
      yesPrice: { price: p.yesPriceCents / 100, timestamp: Date.now() },
      noPrice: { price: p.noPriceCents / 100, timestamp: Date.now() },
      url: p.directUrl || getSearchUrl(p.name as Platform, `${topic.title} ${topic.outcome}`),
      liquidity: p.volumeUSD || 0
    }));

    let bestYes = { price: 1.0, platform: Platform.POLYMARKET };
    let bestNo = { price: 1.0, platform: Platform.POLYMARKET };
    lines.forEach(l => {
      if (l.yesPrice.price < bestYes.price) bestYes = { price: l.yesPrice.price, platform: l.platform };
      if (l.noPrice.price < bestNo.price) bestNo = { price: l.noPrice.price, platform: l.platform };
    });

    const updated: MarketEvent = { ...event, expiry, lastScraped: Date.now(), bestYes, bestNo, lines };
    const arb = calculateArb(bestYes.price, bestNo.price);
    if (arb > 0) {
      updated.arbPercent = arb;
      const { apy, days } = calculateAPY(arb, expiry);
      updated.apy = apy;
      updated.daysToExpiry = days;
    }
    return updated;
  } catch (e) {
    return null;
  }
};

export const searchMarketsByQuery = async (query: string): Promise<MarketEvent[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Search for prediction markets matching: "${query}" across Polymarket, Kalshi, PredictIt, Gemini, DraftKings, Robinhood, and Limitless. Return a JSON array of grouped market results with deep links.`;

  try {
    const searchPromise = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              outcome: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              relevanceScore: { type: Type.NUMBER },
              platforms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    yesPriceCents: { type: Type.NUMBER },
                    noPriceCents: { type: Type.NUMBER },
                    volumeUSD: { type: Type.NUMBER },
                    directUrl: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    });

    const response = await withTimeout(searchPromise, 120000) as GenerateContentResponse;
    const results = JSON.parse(response.text || "[]");
    return results.map((topic: any, idx: number) => {
      const expiry = new Date(topic.expiryDate || "2025-12-31T23:59:59Z");
      const lines: MarketLine[] = (topic.platforms || []).map((p: any) => ({
        platform: p.name as Platform,
        yesPrice: { price: p.yesPriceCents / 100, timestamp: Date.now() },
        noPrice: { price: p.noPriceCents / 100, timestamp: Date.now() },
        url: p.directUrl || getSearchUrl(p.name as Platform, `${topic.title} ${topic.outcome}`),
        liquidity: p.volumeUSD || 0
      }));

      let bestYes = { price: 1.0, platform: Platform.POLYMARKET };
      let bestNo = { price: 1.0, platform: Platform.POLYMARKET };
      lines.forEach(line => {
        if (line.yesPrice.price < bestYes.price) bestYes = { price: line.yesPrice.price, platform: line.platform };
        if (line.noPrice.price < bestNo.price) bestNo = { price: line.noPrice.price, platform: line.platform };
      });

      const event: MarketEvent = {
        id: `search-${idx}-${Date.now()}`,
        category: MarketCategory.POLITICS, title: topic.title, outcome: topic.outcome,
        description: `Search result.`, expiry, lastScraped: Date.now(), relevanceScore: topic.relevanceScore,
        bestYes, bestNo, lines
      };

      const arb = calculateArb(bestYes.price, bestNo.price);
      if (arb > 0) {
        event.arbPercent = arb;
        const { apy, days } = calculateAPY(arb, expiry);
        event.apy = apy;
        event.daysToExpiry = days;
      }
      return event;
    });
  } catch (e) {
    return [];
  }
};
