import React from 'react';
import { X, BarChart3, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { MarketEvent, Platform } from '../types.ts';
import { getSearchUrl } from '../constants.ts';

interface OrderBookModalProps {
  event: MarketEvent;
  onClose: () => void;
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  [Platform.POLYMARKET]: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', bar: 'bg-emerald-500' },
  [Platform.KALSHI]: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', bar: 'bg-indigo-500' },
  [Platform.PREDICTIT]: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-500' },
  [Platform.DRAFTKINGS]: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', bar: 'bg-cyan-500' },
  [Platform.GEMINI]: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', bar: 'bg-violet-500' },
  [Platform.COINBASE]: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', bar: 'bg-blue-500' },
  [Platform.ROBINHOOD]: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', bar: 'bg-rose-500' },
  [Platform.LIMITLESS]: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', bar: 'bg-pink-500' },
};

const DEFAULT_COLORS = { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', bar: 'bg-slate-500' };

export const OrderBookModal: React.FC<OrderBookModalProps> = ({ event, onClose }) => {
  const lines = event.lines || [];
  const maxLiquidity = Math.max(...lines.map(l => l.liquidity || 0), 1);

  const formatLiquidity = (val?: number) => {
    if (!val || val === 0) return 'N/A';
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <BarChart3 className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Market Depth</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 max-w-md truncate">{event.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Best Yes</p>
              <p className="text-2xl font-black text-emerald-400 font-mono">{(event.bestYes.price * 100).toFixed(1)}¢</p>
              <p className="text-[9px] font-bold text-slate-500 mt-1">{event.bestYes.platform}</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Best No</p>
              <p className="text-2xl font-black text-red-400 font-mono">{(event.bestNo.price * 100).toFixed(1)}¢</p>
              <p className="text-[9px] font-bold text-slate-500 mt-1">{event.bestNo.platform}</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Arb</p>
              <p className={clsx("text-2xl font-black font-mono", event.arbPercent && event.arbPercent > 0 ? "text-emerald-400" : "text-slate-600")}>
                {event.arbPercent ? `${event.arbPercent.toFixed(2)}%` : '--'}
              </p>
              <p className="text-[9px] font-bold text-slate-500 mt-1">{event.daysToExpiry}d to expiry</p>
            </div>
          </div>

          {/* Platform Depth Bars */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
              Platform Comparison — Liquidity & Pricing
            </h4>

            <div className="space-y-3">
              {lines
                .sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0))
                .map((line) => {
                  const colors = PLATFORM_COLORS[line.platform] || DEFAULT_COLORS;
                  const liqPercent = maxLiquidity > 0 ? ((line.liquidity || 0) / maxLiquidity) * 100 : 0;

                  return (
                    <div key={line.platform} className={clsx("border rounded-xl p-4", colors.border, colors.bg)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={clsx("text-xs font-black uppercase tracking-wider", colors.text)}>{line.platform}</span>
                          {line.isImpliedNo && (
                            <span className="text-[8px] font-bold text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">IMPLIED</span>
                          )}
                        </div>
                        <a
                          href={line.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={clsx("flex items-center gap-1 text-[9px] font-bold hover:underline", colors.text)}
                        >
                          Trade <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Price Display */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Yes Price</p>
                          <p className="text-lg font-black text-white font-mono">{(line.yesPrice.price * 100).toFixed(1)}¢</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">No Price</p>
                          <p className="text-lg font-black text-white font-mono">{(line.noPrice.price * 100).toFixed(1)}¢</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Spread</p>
                          <p className="text-lg font-black text-slate-400 font-mono">
                            {((line.yesPrice.price + line.noPrice.price - 1) * 100).toFixed(1)}¢
                          </p>
                        </div>
                      </div>

                      {/* Liquidity Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Liquidity</p>
                          <p className={clsx("text-[10px] font-black font-mono", colors.text)}>{formatLiquidity(line.liquidity)}</p>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={clsx("h-full rounded-full transition-all duration-500", colors.bar)}
                            style={{ width: `${Math.max(liqPercent, 2)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {lines.length === 0 && (
              <div className="text-center py-8">
                <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">No platform data available</p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-600 font-medium text-center">
            Click "Trade" to open the market on each platform. OddsAxiom does not execute trades.
          </p>
        </div>
      </div>
    </div>
  );
};
