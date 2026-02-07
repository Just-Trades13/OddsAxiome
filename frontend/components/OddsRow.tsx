
import React, { useEffect, useState } from 'react';
import { MarketEvent, Platform } from '../types.ts';
import { clsx } from 'clsx';
import { Sparkles, TriangleAlert, Info, Globe, Clock, CheckCircle2, RefreshCw, Calculator, HelpCircle } from 'lucide-react';

interface OddsRowProps {
  event: MarketEvent;
  onAnalyze: (event: MarketEvent) => void;
  onRefreshSingleEvent: (event: MarketEvent) => void;
  platformOrder: Platform[];
  onOpenCalculator: (event: MarketEvent) => void;
}

export const OddsRow: React.FC<OddsRowProps> = ({ event, onAnalyze, onRefreshSingleEvent, platformOrder, onOpenCalculator }) => {
  const isArb = !!event.arbPercent && event.arbPercent > 0;
  const isMock = event.id.startsWith('fallback');
  const lines = event.lines || [];
  const [isRefreshing, setIsRefreshing] = useState(false);

  const apy = event.apy || 0;
  const isGreatYield = apy > 10;
  
  const [timeAgo, setTimeAgo] = useState<string>('just now');

  useEffect(() => {
    if (isMock || !event.lastScraped) return;
    
    const updateTime = () => {
      const seconds = Math.floor((Date.now() - (event.lastScraped || 0)) / 1000);
      if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      else setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [event.lastScraped, isMock]);

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

  return (
    <div className={clsx(
      "grid grid-cols-[380px_85px_85px_85px_repeat(8,1fr)] hover:bg-slate-800/30 transition-colors group relative border-b border-slate-800/50 last:border-0",
      isArb && !isMock && "bg-emerald-500/[0.04]"
    )}>
      {/* Event Info */}
      <div className="p-4 flex flex-col justify-center border-r border-slate-800/50">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-tight flex-1 break-words leading-snug">
              {event.title} • {event.expiry.toLocaleDateString()}
            </span>
            {event.relevanceScore !== undefined && (
              <span className={clsx(
                "text-[10px] font-bold mt-1 flex items-center gap-1",
                event.relevanceScore > 80 ? "text-emerald-400" : "text-amber-400"
              )}>
                <CheckCircle2 className="w-3 h-3" />
                {event.relevanceScore > 80 ? 'High Match' : 'Potential Match'}
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0 mt-0.5">
            {!isMock ? (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                  <Globe className="w-2.5 h-2.5" /> AI SCRAPED
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={clsx("w-2.5 h-2.5", isRefreshing && "animate-spin")} />
                    Refresh
                  </button>
                  <span className="text-[8px] text-slate-500 font-bold flex items-center gap-1">
                    <Clock className="w-2 h-2" /> {timeAgo}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-1 rounded flex items-center gap-1 whitespace-nowrap">
                <TriangleAlert className="w-2.5 h-2.5" /> SIMULATED
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="font-bold text-white text-[15px] leading-tight group-hover:text-indigo-400 transition-colors flex-1 break-words">
            {event.outcome}
          </div>
          {isArb && !isMock && (
            <div className="relative group/arb">
              <span className="text-[10px] font-bold bg-emerald-450 text-slate-950 px-2 py-1 rounded uppercase tracking-wider shrink-0 cursor-help">
                {event.arbPercent?.toFixed(2)}% ARB
              </span>
              {/* Arb Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl z-[60] invisible group-hover/arb:visible opacity-0 group-hover/arb:opacity-100 transition-all duration-200 pointer-events-none">
                <div className="flex items-center gap-2 mb-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Fees & Responsibility</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Arbitrage calculations do not include platform-specific trading fees. It is the user's responsibility to factor in fees and slippage when executing trades.
                </p>
                <div className="absolute -bottom-1 right-4 w-2 h-2 bg-slate-800 border-b border-r border-slate-700 rotate-45"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Yield Column */}
      <div className="p-2 flex flex-col items-center justify-center border-l border-slate-800/50 bg-slate-950/10">
        {isArb ? (
          <>
            <div className={clsx(
              "text-sm font-black font-mono",
              isGreatYield ? "text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.4)]" : "text-fuchsia-500/80"
            )}>
              {apy.toFixed(1)}%
            </div>
            <div className="text-[8px] text-slate-500 uppercase font-bold flex items-center gap-1 mt-0.5">
              {event.daysToExpiry}D
            </div>
          </>
        ) : (
          <span className="text-slate-800 font-mono text-xs">--</span>
        )}
      </div>

      {/* Analysis Column */}
      <div className="p-2 flex items-center justify-center border-l border-slate-800/50 bg-slate-900/40">
        <button 
          onClick={() => onAnalyze(event)} 
          className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20 group/ai"
          title="Analyze"
        >
          <Sparkles className="w-3.5 h-3.5 group-hover/ai:scale-110 transition-transform" />
        </button>
      </div>

      {/* Calculator Column */}
      <div className="p-2 flex items-center justify-center border-l border-slate-800/50 bg-slate-900/20">
        <button 
          onClick={() => onOpenCalculator(event)} 
          className={clsx(
            "p-1.5 rounded-lg transition-all border group/calc",
            isArb ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white" : "bg-slate-800/40 text-slate-600 border-transparent hover:text-slate-400"
          )}
          title="Arbitrage Calculator"
        >
          <Calculator className="w-3.5 h-3.5 group-hover/calc:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Platform Columns */}
      {platformOrder.map((platform) => {
        const line = lines.find(l => l.platform === platform);
        const isBestYes = line?.yesPrice.price === event.bestYes.price;
        const isBestNo = line?.noPrice.price === event.bestNo.price;

        return (
          <div key={platform} className="p-2 border-l border-slate-800/50 flex flex-col justify-center items-center gap-1.5 overflow-hidden">
            {line ? (
              <div className="w-full flex flex-col items-center gap-1.5">
                <a 
                  href={line.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex flex-col gap-1.5 no-underline"
                >
                  <div className={clsx(
                    "w-full py-1 rounded text-[10px] font-mono font-bold transition-all border flex items-center px-1.5 justify-between",
                    isBestYes && isArb && !isMock
                      ? "bg-emerald-400 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                      : "bg-slate-800/40 text-slate-400 border-transparent hover:border-slate-700 hover:text-slate-200"
                  )}>
                    <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter">Y</span>
                    <span>{(line.yesPrice.price * 100).toFixed(1)}¢</span>
                  </div>

                  <div className={clsx(
                    "w-full py-1 rounded text-[10px] font-mono font-bold transition-all border flex items-center px-1.5 justify-between",
                    isBestNo && isArb && !isMock
                      ? "bg-emerald-400 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                      : "bg-slate-800/40 text-slate-400 border-transparent hover:border-slate-700 hover:text-slate-200"
                  )}>
                    <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter">N</span>
                    <span>{(line.noPrice.price * 100).toFixed(1)}¢</span>
                  </div>
                </a>
                
                {/* Liquidity Display - Tooltip removed as requested */}
                <div className="w-full">
                  <div className={clsx(
                    "text-[8px] font-mono font-bold transition-all truncate w-full text-center mt-0.5",
                    getLiquidityColor(line.liquidity)
                  )}>
                    {formatLiquidity(line.liquidity)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-1.5 opacity-10">
                <div className="w-full py-1 rounded bg-slate-900 border border-slate-800 text-center text-[9px]">--</div>
                <div className="w-full py-1 rounded bg-slate-900 border border-slate-800 text-center text-[9px]">--</div>
                <div className="w-full text-center text-[8px] font-mono">--</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
