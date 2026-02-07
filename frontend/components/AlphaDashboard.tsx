
import React, { useMemo } from 'react';
import { MarketEvent, Platform } from '../types.ts';
import { clsx } from 'clsx';
import { Zap, TrendingUp, Info, RefreshCw, Sparkles, HelpCircle, ArrowUpRight, ShieldAlert, Coins } from 'lucide-react';

interface AlphaOpportunity extends MarketEvent {
  edge: number;
  fairPrice: number;
  strategy: 'Retail Lag' | 'Institutional Gap' | 'Market Maker';
  confidence: number;
}

interface AlphaDashboardProps {
  events: MarketEvent[];
  orderedPlatforms: Platform[];
  onRefreshSingleEvent: (event: MarketEvent) => void;
  onAnalyze: (event: MarketEvent) => void;
}

export const AlphaDashboard: React.FC<AlphaDashboardProps> = ({ 
  events, 
  orderedPlatforms, 
  onRefreshSingleEvent,
  onAnalyze
}) => {
  const alphaOpportunities = useMemo(() => {
    return events.map(event => {
      const lines = event.lines || [];
      if (lines.length < 2) return null;

      // Logic: Calculate fair price based on sharp anchor (Polymarket) or median
      const polyLine = lines.find(l => l.platform === Platform.POLYMARKET);
      const medianYes = lines.sort((a,b) => a.yesPrice.price - b.yesPrice.price)[Math.floor(lines.length / 2)].yesPrice.price;
      const fairPrice = polyLine ? polyLine.yesPrice.price : medianYes;

      // Find biggest deviation from fair price
      let maxEdge = 0;
      let strategy: 'Retail Lag' | 'Institutional Gap' | 'Market Maker' = 'Retail Lag';
      
      lines.forEach(line => {
        const edge = Math.abs(line.yesPrice.price - fairPrice);
        if (edge > maxEdge) maxEdge = edge;
      });

      // Simple strategy tagging logic
      if (maxEdge > 0.08) strategy = 'Institutional Gap';
      else if (lines.some(l => Math.abs(l.yesPrice.price - l.noPrice.price) > 0.15)) strategy = 'Market Maker';

      return {
        ...event,
        edge: maxEdge * 100,
        fairPrice,
        strategy,
        confidence: Math.min(95, 40 + (maxEdge * 300))
      } as AlphaOpportunity;
    }).filter((o): o is AlphaOpportunity => o !== null && o.edge > 1.5)
      .sort((a,b) => b.edge - a.edge);
  }, [events]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Summary Banner */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-3xl p-5 flex items-center gap-4">
           <div className="w-12 h-12 bg-fuchsia-500/20 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-fuchsia-400" />
           </div>
           <div>
              <p className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest">Bias Opportunities</p>
              <p className="text-xl font-black text-white">{alphaOpportunities.length} Detected</p>
           </div>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-5 flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
           </div>
           <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Avg Edge</p>
              <p className="text-xl font-black text-white">
                {(alphaOpportunities.reduce((acc,o) => acc + o.edge, 0) / (alphaOpportunities.length || 1)).toFixed(1)}%
              </p>
           </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-5 flex items-center gap-4">
           <div className="w-12 h-12 bg-slate-700/50 rounded-2xl flex items-center justify-center">
              <Coins className="w-6 h-6 text-slate-400" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HFT Sync Status</p>
              <p className="text-xl font-black text-emerald-400">Live</p>
           </div>
        </div>
      </div>

      {/* Alpha Opportunity List */}
      <div className="space-y-4">
        {alphaOpportunities.map((op) => (
          <div 
            key={op.id} 
            className="bg-slate-850 border border-white/5 rounded-[2rem] p-6 hover:border-fuchsia-500/30 transition-all group relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Zap className="w-24 h-24 text-fuchsia-500" />
            </div>

            <div className="flex flex-col md:flex-row gap-6 relative z-10">
               {/* Left: Event Details */}
               <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                      op.strategy === 'Institutional Gap' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30"
                    )}>
                      {op.strategy}
                    </span>
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                      {op.category} • Expiry {op.expiry.toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight">
                    {op.outcome}
                  </h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-tight opacity-70">
                    {op.title}
                  </p>
                  
                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-slate-600 uppercase">Consensus Fair Value</span>
                       <span className="text-sm font-mono font-bold text-slate-300">{(op.fairPrice * 100).toFixed(1)}¢</span>
                    </div>
                    <div className="w-px h-8 bg-slate-800"></div>
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-slate-600 uppercase">Confidence Score</span>
                       <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500" style={{ width: `${op.confidence}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-emerald-400">{op.confidence.toFixed(0)}</span>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Right: The Edge & Actions */}
               <div className="w-full md:w-64 flex flex-col justify-between gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Est. Alpha</span>
                        <span className="text-2xl font-black text-fuchsia-400">+{op.edge.toFixed(1)}%</span>
                     </div>
                     <ArrowUpRight className="w-6 h-6 text-fuchsia-500" />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => onAnalyze(op)}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Audit
                    </button>
                    <button 
                      onClick={() => onRefreshSingleEvent(op)}
                      className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all border border-slate-700"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>

            {/* Platform Comparison for Alpha */}
            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
               {orderedPlatforms.map(p => {
                 const line = op.lines.find(l => l.platform === p);
                 const deviation = line ? Math.abs(line.yesPrice.price - op.fairPrice) : 0;
                 const isBias = deviation > 0.03;

                 return (
                   <div key={p} className={clsx(
                     "p-3 rounded-2xl border transition-all flex flex-col items-center gap-1",
                     isBias ? "bg-fuchsia-500/10 border-fuchsia-500/30" : "bg-slate-900/50 border-slate-800 opacity-40"
                   )}>
                      <span className="text-[8px] font-black text-slate-500 uppercase truncate w-full text-center">{p}</span>
                      <span className={clsx(
                        "text-xs font-mono font-bold",
                        isBias ? "text-fuchsia-400" : "text-slate-400"
                      )}>
                        {line ? `${(line.yesPrice.price * 100).toFixed(0)}¢` : '--'}
                      </span>
                   </div>
                 );
               })}
            </div>
          </div>
        ))}

        {alphaOpportunities.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center gap-6 bg-slate-900 border border-dashed border-slate-700 rounded-[3rem]">
             <ShieldAlert className="w-12 h-12 text-slate-700" />
             <div className="space-y-1">
               <h4 className="text-white font-bold">No Active Biases Detected</h4>
               <p className="text-xs text-slate-500 max-w-xs">Markets are currently trading within equilibrium. Check back in a few minutes or switch categories.</p>
             </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex items-start gap-4">
         <div className="p-2 bg-indigo-500/20 rounded-xl">
            <Info className="w-4 h-4 text-indigo-400" />
         </div>
         <div className="space-y-1">
            <p className="text-xs font-black text-white uppercase tracking-widest">Quant Strategy Note</p>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Bias trading exploits the time-delay between information hitting "Sharp" high-volume exchanges and "Retail" low-volume platforms. This view uses <strong>Polymarket</strong> as the sharp anchor for fair-value anchoring. High-edge opportunities (>5%) often settle within minutes as arbitrageurs bridge the gap.
            </p>
         </div>
      </div>
    </div>
  );
};
