
import { Platform } from './types.ts';

/**
 * Updated default platform order:
 * 1. POLYMARKET
 * 2. KALSHI
 * 3. DRAFTKINGS
 * 4. GEMINI
 * 5. ROBINHOOD
 * 6. LIMITLESS
 * 7. COINBASE
 * 8. PREDICTIT
 */
export const PLATFORMS = [
  Platform.POLYMARKET,
  Platform.KALSHI,
  Platform.DRAFTKINGS,
  Platform.GEMINI,
  Platform.ROBINHOOD,
  Platform.LIMITLESS,
  Platform.COINBASE,
  Platform.PREDICTIT
];

/**
 * Generates a clean URL slug from a string.
 */
const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getSearchUrl = (platform: Platform, query: string): string => {
  // 1. Remove generic outcome words that clutter search results
  let clean = query.replace(/\s(Yes|No|Impeached|Democratic Party|Republican Party|Will|Won't|True|False|Agreement|Disagree|Powell out as chair)$/i, '');
  clean = clean.trim().replace(/[?\.!]+$/, '');

  const q = encodeURIComponent(clean);

  // 2. Platform specific clean URL construction
  if (platform === Platform.POLYMARKET) {
    const slug = slugify(clean);
    return `https://polymarket.com/market/${slug}`;
  }

  if (platform === Platform.KALSHI) {
    return `https://kalshi.com/search?query=${q}`;
  }

  if (platform === Platform.GEMINI) {
    return `https://exchange.gemini.com/predictions`;
  }

  if (platform === Platform.DRAFTKINGS) {
    return `https://predictions.draftkings.com/en/`;
  }

  if (platform === Platform.ROBINHOOD) {
    return `https://robinhood.com/us/en/prediction-markets/`;
  }

  if (platform === Platform.LIMITLESS) {
    return `https://limitless.exchange/markets`;
  }

  switch (platform) {
    case Platform.PREDICTIT:
      return `https://www.predictit.org/search?query=${q}`;
    default:
      return `https://www.google.com/search?q=${q}+${platform}`;
  }
};

export const calculateArb = (bestYes: number, bestNo: number): number => {
  const total = bestYes + bestNo;
  if (total < 1) {
    return (1 - total) * 100;
  }
  return 0;
};

export const calculateAPY = (arbPercent: number, expiry: Date): { apy: number; days: number } => {
  const now = new Date();
  const diffTime = Math.max(0, expiry.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 
  
  const apy = arbPercent * (365 / diffDays);
  
  return { apy, days: diffDays };
};
