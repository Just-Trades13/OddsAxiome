
import { MarketCategory, MarketEvent, Platform, MarketLine } from '../types.ts';
import { calculateArb, calculateAPY, getSearchUrl } from '../constants.ts';
import { generateMockEvents } from './mockData.ts';
import { apiGet } from './api.ts';

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

/** Map backend platform_slug to frontend Platform enum */
const SLUG_TO_PLATFORM: Record<string, Platform> = {
  polymarket: Platform.POLYMARKET,
  kalshi: Platform.KALSHI,
  predictit: Platform.PREDICTIT,
  draftkings: Platform.DRAFTKINGS,
  theoddsapi: Platform.DRAFTKINGS,
  gemini: Platform.GEMINI,
  coinbase: Platform.COINBASE,
  robinhood: Platform.ROBINHOOD,
  limitless: Platform.LIMITLESS,
};

/** Map backend category string to frontend MarketCategory enum */
const CATEGORY_MAP: Record<string, MarketCategory> = {
  politics: MarketCategory.POLITICS,
  economics: MarketCategory.ECONOMICS,
  crypto: MarketCategory.CRYPTO,
  science: MarketCategory.SCIENCE,
  culture: MarketCategory.CULTURE,
  sports: MarketCategory.SPORTS,
};

/**
 * Transform backend /odds/live response into frontend MarketEvent format.
 * Backend shape: { market_id, market_title, category, platforms: [{ platform_slug, outcomes: [{ outcome_name, price }], volume_24h, liquidity_usd }] }
 */
function transformBackendOdds(raw: any[], category: MarketCategory): MarketEvent[] {
  return raw.map((item: any, idx: number) => {
    const expiry = new Date(item.expiry_date || item.end_date || "2026-12-31T23:59:59Z");
    const marketTitle = item.market_title || item.title || 'Untitled Market';

    const lines: MarketLine[] = (item.platforms || []).map((p: any) => {
      const slug = p.platform_slug || p.platform || '';
      const platform = SLUG_TO_PLATFORM[slug] || Platform.POLYMARKET;

      // Extract yes/no prices from outcomes array
      const outcomes = p.outcomes || [];
      const yesOutcome = outcomes.find((o: any) => o.outcome_name === 'Yes' || o.outcome_index === 0);
      const noOutcome = outcomes.find((o: any) => o.outcome_name === 'No' || o.outcome_index === 1);

      const yesPrice = yesOutcome ? yesOutcome.price : 0.5;
      const noPrice = noOutcome ? noOutcome.price : (yesOutcome ? 1 - yesOutcome.price : 0.5);

      return {
        platform,
        yesPrice: { price: yesPrice, timestamp: Date.now() },
        noPrice: { price: noPrice, timestamp: Date.now() },
        url: p.market_url || getSearchUrl(platform, marketTitle),
        liquidity: p.liquidity_usd ?? p.volume_24h ?? 0,
      };
    }).filter((l: MarketLine) => l.yesPrice.price > 0);

    let bestYes = { price: 1.0, platform: Platform.POLYMARKET };
    let bestNo = { price: 1.0, platform: Platform.POLYMARKET };
    lines.forEach((l: MarketLine) => {
      if (l.yesPrice.price < bestYes.price) bestYes = { price: l.yesPrice.price, platform: l.platform };
      if (l.noPrice.price < bestNo.price) bestNo = { price: l.noPrice.price, platform: l.platform };
    });

    const backendCategory = CATEGORY_MAP[(item.category || '').toLowerCase()] || category;

    // First outcome name as the "outcome" label
    const firstPlatform = item.platforms?.[0];
    const firstOutcome = firstPlatform?.outcomes?.[0]?.outcome_name || 'Yes';

    const event: MarketEvent = {
      id: item.market_id || item.id || `api-${idx}-${Date.now()}`,
      category: backendCategory,
      title: marketTitle,
      outcome: firstOutcome,
      description: item.description || '',
      expiry,
      lastScraped: Date.now(),
      bestYes,
      bestNo,
      lines,
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
}

/**
 * Fetches market data for a category.
 * Tries backend API first, falls back to Gemini AI, then mock data.
 */
export const fetchRealTimeMarkets = async (category: MarketCategory, forceRefresh = false): Promise<FetchResponse> => {
  // Map frontend category enum value to backend category string
  const categoryLower = category.toLowerCase();

  // Try backend API first
  try {
    const params = new URLSearchParams({ category: categoryLower, per_page: '200' });
    const apiPromise = apiGet<any>(`/odds/live?${params}`);
    const response = await withTimeout(apiPromise, 15000);

    // Backend returns { data: [...], meta: { page, per_page, total, total_pages } }
    const items = Array.isArray(response) ? response : (response.data || response.items || []);
    if (items.length > 0) {
      const events = transformBackendOdds(items, category);
      console.info(`[OddsAxiom] Loaded ${events.length} live markets for ${category}`);
      return { data: events, source: 'live' };
    }
  } catch (err: any) {
    console.debug("Backend API unavailable, falling back:", err.message);
  }

  // Fallback to mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: generateMockEvents(category),
        source: 'fallback'
      });
    }, 300);
  });
};

export const refreshSingleMarket = async (event: MarketEvent): Promise<MarketEvent | null> => {
  try {
    const apiPromise = apiGet<any>(`/odds/live/${event.id}`);
    const response = await withTimeout(apiPromise, 10000);
    if (response) {
      const transformed = transformBackendOdds([response], event.category);
      return transformed[0] || null;
    }
  } catch {
    // Backend unavailable — return null (no update)
  }
  return null;
};

export const searchMarketsByQuery = async (query: string): Promise<MarketEvent[]> => {
  try {
    const params = new URLSearchParams({ search: query, per_page: '100' });
    const apiPromise = apiGet<any>(`/markets?${params}`);
    const response = await withTimeout(apiPromise, 15000);
    const items = Array.isArray(response) ? response : (response.data || response.items || []);
    if (items.length > 0) {
      // Markets endpoint returns different shape — transform it
      const events = items.map((m: any, idx: number) => ({
        market_id: m.id,
        market_title: m.title,
        category: m.category,
        description: m.description,
        end_date: m.end_date,
        platforms: [], // No live odds in market list
      }));
      return transformBackendOdds(events, MarketCategory.POLITICS);
    }
  } catch (err: any) {
    console.debug("Backend search unavailable:", err.message);
  }
  return [];
};
