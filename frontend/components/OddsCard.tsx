
import React, { useState } from 'react';
import { MarketEvent, Platform } from '../types.ts';
import { clsx } from 'clsx';
import { Sparkles, Calendar, Clock, TrendingUp, CheckCircle2, RefreshCw, Calculator, HelpCircle } from 'lucide-react';

interface OddsCardProps {
  event: MarketEvent;
  onAnalyze: (event: MarketEvent) => void;
  onRefreshSingleEvent: (event: MarketEvent) => void;
  onOpenCalculator: (event: MarketEvent) => void;
  platformOrder: Platform[];
}

export const OddsCard: React.FC<OddsCardProps> = ({ event, onAnalyze, onRefreshSingleEvent, onOpenCalculator, platformOrder }) => {
  const isArb = !!event.arbPercent && event.arbPercent > 0;
  const lines = event.lines || [];
  const apy = event.apy || 0;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<'arb' | 'yield' | 'lock' | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshSingleEvent(event);
    setIsRefreshing(false);
  };

  const formatLiquidity = (val?: number) => {
    if (val === undefined || val === 0) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getLiquidityColor = (val?: number) => {
    if (!val) return 'text-slate-600';
    if (val >= 1000000) return 'text-emerald-400';
    if (val >= 100000) return 'text-amber-400';
    return 'text-red-400';
  };

  const toggleTooltip = (type: 'arb' | 'yield' | 'lock', e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTooltip(activeTooltip === type ? null : type);
  };

  return (
    <div 
      className={clsx(
        "bg-slate-850/60 rounded-[2rem] p-5 shadow-2xl border border-white/5 flex flex-col gap-4 relative overflow-hidden group transition-all",
        isArb && "ring-2 ring-emerald-500/30 bg-emerald-500/[0.03]"
      )}
      onClick={() => setActiveTooltip(null)}
    >
      {/* Decorative accent for Arb */}
      {isArb && <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />}

      {/* Card Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-500/70" />
            <span>{event.expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h3 className="text-white text-lg font-black leading-tight tracking-tight">
            {event.outcome}
          </h3>
          <p className="text-indigo-400/80 text-[11px] font-black uppercase tracking-wider mt-1.5">
            {event.title}
          </p>
          {event.relevanceScore !== undefined && (
            <div className={clsx(
              "text-[9px] font-black mt-3 flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-lg w-fit border border-white/5",
              event.relevanceScore > 80 ? "text-emerald-400" : "text-amber-400"
            )}>
              <CheckCircle2 className="w-3 h-3" />
              {event.relevanceScore > 80 ? 'VERIFIED MATCH' : 'POTENTIAL MATCH'}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {isArb && (
            <div className="relative">
              <button 
                onClick={(e) => toggleTooltip('arb', e)}
                className="bg-emerald-500 text-slate-950 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-xl shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                {event.arbPercent?.toFixed(2)}%
                <HelpCircle className="w-3 h-3 opacity-60" />
              </button>
              
              {/* Arb Tooltip */}
              <div className={clsx(
                "absolute top-full right-0 mt-3 w-56 sm:w-64 bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[250] transition-all duration-200 pointer-events-none text-left",
                activeTooltip === 'arb' ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-2"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Fee Notice</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                  Calculated ROI does not include platform fees. Always check final payout on source.
                </p>
                <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-900 border-t-2 border-l-2 border-slate-700 rotate-45"></div>
              </div>
            </div>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenCalculator(event); }}
            className={clsx(
              "w-10 h-10 rounded-xl transition-all border flex items-center justify-center shadow-lg",
              isArb ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950" : "bg-slate-800/60 text-slate-500 border-slate-700 hover:text-slate-300"
            )}
          >
            <Calculator className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 border-y border-white/5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
           {/* Yield Section with Tooltip */}
           <div className="relative">
             <button 
               onClick={(e) => toggleTooltip('yield', e)}
               className="flex flex-col items-start active:opacity-60 transition-opacity"
             >
               <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
                 Yield <HelpCircle className="w-2.5 h-2.5 opacity-40" />
               </span>
               <div className="flex items-center gap-1 text-xs font-black text-slate-200">
                  <TrendingUp className={clsx("w-3 h-3", apy > 10 ? "text-fuchsia-400" : "text-amber-400")} />
                  {apy.toFixed(1)}%
               </div>
             </button>
             
             {/* Yield Tooltip */}
             <div className={clsx(
                "absolute top-full left-0 mt-3 w-56 bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl shadow-2xl z-[250] transition-all duration-200 pointer-events-none text-left",
                activeTooltip === 'yield' ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-2"
              )}>
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1.5">Annualized Yield</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                  ROI adjusted for time-to-settlement. Useful for comparing against benchmarks like T-Bills.
                </p>
                <div className="absolute -top-1.5 left-6 w-3 h-3 bg-slate-900 border-t-2 border-l-2 border-slate-700 rotate-45"></div>
              </div>
           </div>

           {/* Lock Section with Tooltip */}
           <div className="relative">
             <button 
               onClick={(e) => toggleTooltip('lock', e)}
               className="flex flex-col items-start active:opacity-60 transition-opacity"
             >
               <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
                 Lock <HelpCircle className="w-2.5 h-2.5 opacity-40" />
               </span>
               <div className="flex items-center gap-1 text-xs font-black text-slate-200">
                  <Clock className="w-3 h-3 text-slate-600" />
                  {event.daysToExpiry}D
               </div>
             </button>

             {/* Lock Tooltip */}
             <div className={clsx(
                "absolute top-full left-0 mt-3 w-56 bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl shadow-2xl z-[250] transition-all duration-200 pointer-events-none text-left",
                activeTooltip === 'lock' ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-2"
              )}>
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1.5">Time Lock</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                  Number of days until the event expires and funds are released.
                </p>
                <div className="absolute -top-1.5 left-6 w-3 h-3 bg-slate-900 border-t-2 border-l-2 border-slate-700 rotate-45"></div>
              </div>
           </div>
        </div>

        {!event.id.startsWith('fallback') && (
           <button 
             onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
             disabled={isRefreshing}
             className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-black text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-2 disabled:opacity-50"
           >
             <RefreshCw className={clsx("w-3 h-3", isRefreshing && "animate-spin")} />
             Sync
           </button>
        )}
      </div>

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-hide" onClick={(e) => e.stopPropagation()}>
        {platformOrder.map((platform) => {
          const line = lines.find(l => l.platform === platform);
          const isHighlightedYes = isArb && line?.yesPrice.price === event.bestYes.price;
          const isHighlightedNo = isArb && line?.noPrice.price === event.bestNo.price;

          return (
            <div key={platform} className="bg-slate-900/40 rounded-2xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-[11px] font-black uppercase tracking-widest">
                  {platform}
                </span>
                {line && (
                  <div className={clsx(
                    "text-[10px] font-mono font-bold",
                    getLiquidityColor(line.liquidity)
                  )}>
                    {formatLiquidity(line.liquidity)}
                  </div>
                )}
              </div>

              {line ? (
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href={line.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={clsx(
                      "py-3 px-2 rounded-xl text-center text-xs font-mono font-black transition-all border-2 flex flex-col items-center justify-center gap-1",
                      isHighlightedYes 
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/10" 
                        : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <span className="text-[9px] opacity-40">YES</span>
                    {(line.yesPrice.price * 100).toFixed(0)}¢
                  </a>
                  <a 
                    href={line.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={clsx(
                      "py-3 px-2 rounded-xl text-center text-xs font-mono font-black transition-all border-2 flex flex-col items-center justify-center gap-1",
                      isHighlightedNo 
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/10" 
                        : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <span className="text-[9px] opacity-40">NO</span>
                    {(line.noPrice.price * 100).toFixed(0)}¢
                  </a>
                </div>
              ) : (
                <div className="py-4 text-center text-[10px] font-black text-slate-800 italic border border-slate-800/40 rounded-xl bg-slate-950/30">
                  MARKET NOT LISTED
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onAnalyze(event); }}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.2rem] text-[12px] font-black tracking-widest transition-all flex items-center justify-center gap-2 shadow-2xl shadow-indigo-600/20 group-hover:scale-[1.02] active:scale-95 border border-indigo-400/20"
      >
        <Sparkles className="w-4 h-4" />
        AI AUDIT
      </button>
    </div>
  );
};
