
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

/**
 * Transform backend API response into frontend MarketEvent format.
 */
function transformBackendOdds(raw: any[], category: MarketCategory): MarketEvent[] {
  return raw.map((item: any, idx: number) => {
    const expiry = new Date(item.expiry_date || item.expiryDate || "2026-12-31T23:59:59Z");

    const lines: MarketLine[] = (item.platforms || item.lines || []).map((p: any) => ({
      platform: (p.platform || p.name) as Platform,
      yesPrice: { price: p.yes_price ?? (p.yesPriceCents ? p.yesPriceCents / 100 : p.yesPrice?.price ?? 0.5), timestamp: Date.now() },
      noPrice: { price: p.no_price ?? (p.noPriceCents ? p.noPriceCents / 100 : p.noPrice?.price ?? 0.5), timestamp: Date.now() },
      url: p.url || p.directUrl || getSearchUrl((p.platform || p.name) as Platform, `${item.title} ${item.outcome || ''}`),
      liquidity: p.liquidity ?? p.volumeUSD ?? 0
    }));

    let bestYes = { price: 1.0, platform: Platform.POLYMARKET };
    let bestNo = { price: 1.0, platform: Platform.POLYMARKET };
    lines.forEach(l => {
      if (l.yesPrice.price < bestYes.price) bestYes = { price: l.yesPrice.price, platform: l.platform };
      if (l.noPrice.price < bestNo.price) bestNo = { price: l.noPrice.price, platform: l.platform };
    });

    const event: MarketEvent = {
      id: item.id || `api-${category}-${idx}-${Date.now()}`,
      category: (item.category as MarketCategory) || category,
      title: item.title || 'Untitled Market',
      outcome: item.outcome || item.outcomes?.[0] || '',
      description: item.description || 'Market data from OddsAxiom API.',
      expiry,
      lastScraped: Date.now(),
      bestYes,
      bestNo,
      lines
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
  // Try backend API first
  try {
    const params = new URLSearchParams({ category });
    const apiPromise = apiGet<any>(`/odds/live?${params}`);
    const response = await withTimeout(apiPromise, 15000);

    // Backend might return { items: [...] } or an array directly
    const items = Array.isArray(response) ? response : (response.items || response.data || []);
    if (items.length > 0) {
      return { data: transformBackendOdds(items, category), source: 'live' };
    }
  } catch (err: any) {
    console.debug("Backend API unavailable, falling back:", err.message);
  }

  // Fallback to mock data (previously was Gemini AI)
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
    const params = new URLSearchParams({ q: query });
    const apiPromise = apiGet<any>(`/markets?${params}`);
    const response = await withTimeout(apiPromise, 15000);
    const items = Array.isArray(response) ? response : (response.items || response.data || []);
    if (items.length > 0) {
      return transformBackendOdds(items, MarketCategory.POLITICS);
    }
  } catch (err: any) {
    console.debug("Backend search unavailable:", err.message);
  }
  return [];
};
