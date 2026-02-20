
import React, { useState } from 'react';
import { MarketEvent, Platform, UserTier } from '../types.ts';
import { OddsRow } from './OddsRow.tsx';
import { OddsCard } from './OddsCard.tsx';
import { GripVertical, ArrowUpDown, ArrowUp, ArrowDown, Info, ShieldCheck, HelpCircle, TrendingUp, Sparkles, AlertTriangle, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { ArbSortOrder } from '../App.tsx';

interface DashboardProps {
  events: MarketEvent[];
  orderedPlatforms: Platform[];
  arbSortOrder: ArbSortOrder;
  onToggleArbSort: () => void;
  onReorderPlatforms: (newOrder: Platform[]) => void;
  onRefreshSingleEvent: (event: MarketEvent) => void;
  onAnalyze: (event: MarketEvent) => void;
  onOpenCalculator: (event: MarketEvent) => void;
  onOpenChart: (event: MarketEvent) => void;
  onOpenOrderBook: (event: MarketEvent) => void;
  userTier: UserTier;
}

export const Dashboard: React.FC<DashboardProps> = ({
  events,
  orderedPlatforms,
  arbSortOrder,
  onToggleArbSort,
  onReorderPlatforms,
  onRefreshSingleEvent,
  onAnalyze,
  onOpenCalculator,
  onOpenChart,
  onOpenOrderBook,
  userTier
}) => {
  const [draggedPlatform, setDraggedPlatform] = useState<Platform | null>(null);

  // Auto-hide platforms that have zero data across all displayed events
  const visiblePlatforms = React.useMemo(() => {
    const platformsWithData = new Set<Platform>();
    for (const event of events) {
      for (const line of event.lines || []) {
        platformsWithData.add(line.platform);
      }
    }
    const filtered = orderedPlatforms.filter(p => platformsWithData.has(p));
    // Fall back to all platforms if no events loaded yet
    return filtered.length > 0 ? filtered : orderedPlatforms;
  }, [events, orderedPlatforms]);

  const colCount = visiblePlatforms.length;
  const gridTemplate = `380px 85px 85px 85px repeat(${colCount}, 1fr)`;
  const minTableWidth = 380 + 85 * 3 + colCount * 120;

  const handleDragStart = (platform: Platform) => {
    setDraggedPlatform(platform);
  };

  const handleDragOver = (e: React.DragEvent, platform: Platform) => {
    e.preventDefault();
    if (draggedPlatform === platform || !draggedPlatform) return;

    const newOrder = [...orderedPlatforms];
    const draggedIdx = newOrder.indexOf(draggedPlatform);
    const targetIdx = newOrder.indexOf(platform);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedPlatform);

    onReorderPlatforms(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedPlatform(null);
  };

  const isFree = userTier === 'free';

  return (
    <div className="flex flex-col gap-6">
      {/* Data Freshness Banner */}
      {isFree ? (
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2.5 text-[11px] font-black text-amber-400 uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Delayed Data Feed — 15 Min Lag
          </div>
          <button
            onClick={() => onToggleArbSort()}
            className="text-[10px] font-black text-amber-300 hover:text-amber-200 transition-colors uppercase tracking-wider whitespace-nowrap"
          >
            Upgrade for Real-Time →
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
            HFT Real-Time Feed — Sub-Second Updates
          </span>
        </div>
      )}

      {/* Mobile View: Card List */}
      <div className="md:hidden space-y-4 pr-1">
        {events.map((event) => (
          <OddsCard
            key={event.id}
            event={event}
            onAnalyze={onAnalyze}
            onRefreshSingleEvent={onRefreshSingleEvent}
            onOpenCalculator={onOpenCalculator}
            onOpenChart={onOpenChart}
            onOpenOrderBook={onOpenOrderBook}
            platformOrder={orderedPlatforms}
            userTier={userTier}
          />
        ))}
        {events.length === 0 && (
          <div className="p-10 text-center text-slate-500 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
            No active entries found.
          </div>
        )}
      </div>

      {/* Desktop View: Comparison Table */}
      <div className="hidden md:flex flex-col border border-slate-700/50 rounded-2xl bg-slate-900 shadow-2xl overflow-x-auto">
        <div style={{ minWidth: `${minTableWidth}px` }}>
          {/* Table Header - Dynamic columns based on active platforms */}
          <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-md" style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
            <div className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between group/event">
              <span className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-slate-600" />
                Market Name
              </span>
              <button 
                onClick={onToggleArbSort}
                title="Sort by Arb %"
                className={clsx(
                  "p-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-transparent",
                  arbSortOrder ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "hover:bg-slate-800 text-slate-600 group-hover/event:text-slate-400"
                )}
              >
                {arbSortOrder === 'desc' && <ArrowDown className="w-3.5 h-3.5" />}
                {arbSortOrder === 'asc' && <ArrowUp className="w-3.5 h-3.5" />}
                {!arbSortOrder && <ArrowUpDown className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-black uppercase">Sort Arb</span>
              </button>
            </div>
            
            <div className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-l border-slate-800 flex flex-col items-center justify-center relative group cursor-help bg-slate-950/50">
              <span className="border-b border-dotted border-slate-600 pb-0.5 flex items-center gap-1">
                Yield
              </span>
              {/* Yield Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Annualized Yield</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium capitalize-none">
                  Calculated ROI adjusted for time-to-settlement. Useful for comparing against other financial instruments like T-Bills.
                </p>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-t border-l border-slate-700 rotate-45"></div>
              </div>
            </div>

            <div className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-l border-slate-800 flex flex-col items-center justify-center relative group cursor-help bg-slate-950/50">
              <span className="border-b border-dotted border-slate-600 pb-0.5">Audit</span>
              {/* Audit Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Contract Audit</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  AI-powered verification of contract terms. Checks if resolution dates and event definitions match across all platforms.
                </p>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-t border-l border-slate-700 rotate-45"></div>
              </div>
            </div>

            <div className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-l border-slate-800 flex items-center justify-center bg-slate-950/50 relative group cursor-help">
              <span className="border-b border-dotted border-slate-600 pb-0.5">Calc</span>
              {/* Calc Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Arbitrage calculator to determine optimal stake sizes for guaranteed profit.
                </p>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-t border-l border-slate-700 rotate-45"></div>
              </div>
            </div>

            {visiblePlatforms.map(p => (
              <div 
                key={p} 
                draggable
                onDragStart={() => handleDragStart(p)}
                onDragOver={(e) => handleDragOver(e, p)}
                onDragEnd={handleDragEnd}
                className={clsx(
                  "p-4 text-center border-l border-slate-800 cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-colors flex flex-col items-center justify-center gap-1 group/header",
                  draggedPlatform === p && "opacity-30 bg-indigo-500/10"
                )}
              >
                <div className="flex items-center gap-1">
                   <GripVertical className="w-3 h-3 text-slate-700 group-hover/header:text-slate-500 transition-all shrink-0" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block truncate">{p}</span>
                </div>
                <div className="h-0.5 w-8 bg-slate-800 rounded-full group-hover/header:bg-indigo-500/50 transition-all"></div>
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-800/30">
            {events.map((event) => (
              <OddsRow
                key={event.id}
                event={event}
                onAnalyze={onAnalyze}
                onRefreshSingleEvent={onRefreshSingleEvent}
                platformOrder={visiblePlatforms}
                onOpenCalculator={onOpenCalculator}
                onOpenChart={onOpenChart}
                onOpenOrderBook={onOpenOrderBook}
                userTier={userTier}
                gridTemplate={gridTemplate}
              />
            ))}
            {events.length === 0 && (
              <div className="p-20 text-center text-slate-500">
                No active markets found for this category.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isFree ? (
        <div className="flex items-center gap-2 px-6 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          Data delayed ~15 minutes. Upgrade for HFT real-time access
        </div>
      ) : (
        <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          All data points verified in real-time via OddsAxiom Quant Node
        </div>
      )}
    </div>
  );
};
