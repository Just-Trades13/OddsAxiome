
import { MarketCategory, Platform, MarketEvent, MarketLine } from '../types.ts';
import { calculateArb, calculateAPY, PLATFORMS, getSearchUrl } from '../constants.ts';

const MOCK_DATA_SETS: Record<MarketCategory, { title: string, outcomes: string[] }[]> = {
  [MarketCategory.POLITICS]: [
    { title: '2025 Cabinet Confirmations', outcomes: ['Robert F. Kennedy Jr. (HHS)', 'Matt Gaetz (Attorney General)', 'Tulsi Gabbard (DNI)', 'Pete Hegseth (Defense)'] },
    { title: 'Global Elections 2025', outcomes: ['German Chancellor: Friedrich Merz wins', 'Canada Snapshot: Conservatives majority', 'French Snap Election called'] },
    { title: 'US Legislative Action', outcomes: ['Reciprocal Trade Act passes House', 'Federal Income Tax cut signed by June', 'Dept of Efficiency (DOGE) first major cut'] },
    { title: 'Winner of the 2028 US Presidential Election', outcomes: ['JD Vance', 'Gavin Newsom', 'Josh Shapiro'] }
  ],
  [MarketCategory.ECONOMICS]: [
    { title: 'Federal Reserve 2025', outcomes: ['March Meeting: 25bps Rate Cut', 'June Meeting: No Change', 'Inflation Target reached (2.0%)'] },
    { title: 'Market Milestones', outcomes: ['S&P 500 hits 6,500', 'Gold reaches $3,000/oz', 'Oil drops below $65/bbl'] }
  ],
  [MarketCategory.CRYPTO]: [
    { title: 'US Crypto Policy', outcomes: ['Strategic Bitcoin Reserve Bill passed', 'SEC drops Ripple lawsuit', 'Gary Gensler official resignation'] },
    { title: 'Market Peaks', outcomes: ['Bitcoin hits $150,000', 'Ethereum Flippening (vs BTC)', 'Solana hits $300'] }
  ],
  [MarketCategory.SCIENCE]: [
    { title: 'Space Exploration', outcomes: ['SpaceX Starship Flight 12 (Before March)', 'Artemis II launch date confirmed', 'NASA Mars Sample Return funded'] },
    { title: 'Bio-Tech', outcomes: ['First FDA-approved AI drug', 'Neuralink 10th patient milestone', 'Anti-aging pill enters Phase III'] }
  ],
  [MarketCategory.CULTURE]: [
    { title: 'Media & Awards', outcomes: ['GTA VI Release Date: Q1 2026', 'MrBeast hits 1B subscribers', 'AI Movie wins Best Picture'] }
  ],
  [MarketCategory.SPORTS]: [
    { title: 'NFL Playoffs & Super Bowl LIX', outcomes: ['Kansas City Chiefs to win Super Bowl LIX', 'Detroit Lions to win NFC Championship', 'Buffalo Bills to win Super Bowl LIX', 'Eagles to win NFC Championship'] },
    { title: 'UFC 311 (Feb 1, 2025)', outcomes: ['Islam Makhachev to defeat Arman Tsarukyan', 'Johnny Walker to win vs Volkan Oezdemir', 'UFC 311 Main Event: Goes to Decision'] },
    { title: 'NBA Regular Season (Jan 24-31)', outcomes: ['Boston Celtics to win Eastern Conference', 'OKC Thunder to finish #1 Seed West', 'LeBron James to announce retirement by June'] },
    { title: 'Tennis: Australian Open 2025', outcomes: ['Novak Djokovic to win Men\'s Singles', 'Aryna Sabalenka to win Women\'s Singles'] }
  ],
};

export const generateMockEvents = (category: MarketCategory): MarketEvent[] => {
  const sets = MOCK_DATA_SETS[category] || [];
  const events: MarketEvent[] = [];
  
  const getExpiry = (category: MarketCategory, title: string) => {
    if (title.includes('2028')) return new Date("2028-11-05T23:59:59Z");
    if (category === MarketCategory.SPORTS) {
        if (title.includes('Super Bowl')) return new Date("2025-02-09T23:59:59Z");
        if (title.includes('UFC 311')) return new Date("2025-02-01T23:59:59Z");
        if (title.includes('Australian Open')) return new Date("2025-01-26T23:59:59Z");
        return new Date("2025-01-31T23:59:59Z");
    }
    return new Date("2025-12-31T20:00:00Z");
  };

  sets.forEach((set, setIdx) => {
    set.outcomes.forEach((outcome, outIdx) => {
      const baseYes = 0.20 + Math.random() * 0.6;
      
      // Fix: Explicitly type the map return to resolve type predicate mismatch (MarketLine vs inferred literal)
      const lines: MarketLine[] = PLATFORMS.map((p): MarketLine | null => {
        const hasLine = Math.random() > 0.15; 
        if (!hasLine) return null;

        const variance = (Math.random() * 0.03 - 0.015);
        const yesPrice = Math.min(0.99, Math.max(0.01, baseYes + variance));
        const juice = 0.02 + Math.random() * 0.02;
        const noPrice = Math.min(0.99, Math.max(0.01, (1 - yesPrice) + juice));
        
        // Generate random liquidity based on platform typical volumes
        const baseLiquidity = p === Platform.POLYMARKET ? 500000 : 50000;
        const liquidity = Math.floor(Math.random() * baseLiquidity * 10);

        return {
          platform: p,
          yesPrice: { price: yesPrice, timestamp: Date.now() },
          noPrice: { price: noPrice, timestamp: Date.now() },
          url: getSearchUrl(p, `${set.title} ${outcome}`),
          liquidity
        };
      }).filter((l): l is MarketLine => l !== null);

      if (lines.length < 2) return;

      let bestYes = { price: 1, platform: Platform.POLYMARKET };
      let bestNo = { price: 1, platform: Platform.POLYMARKET };

      lines.forEach(l => {
        if (l.yesPrice.price < bestYes.price) {
          bestYes = { price: l.yesPrice.price, platform: l.platform };
        }
        if (l.noPrice.price < bestNo.price) {
          bestNo = { price: l.noPrice.price, platform: l.platform };
        }
      });

      const arbPercent = calculateArb(bestYes.price, bestNo.price);
      const expiry = getExpiry(category, set.title);
      const { apy, days } = calculateAPY(arbPercent, expiry);

      events.push({
        id: `fallback-${category}-${setIdx}-${outIdx}`,
        category,
        title: set.title,
        outcome: outcome,
        description: `Market data for ${outcome}`,
        expiry,
        lines,
        bestYes,
        bestNo,
        arbPercent: arbPercent > 0 ? arbPercent : undefined,
        apy: arbPercent > 0 ? apy : undefined,
        daysToExpiry: days
      });
    });
  });

  return events;
};
