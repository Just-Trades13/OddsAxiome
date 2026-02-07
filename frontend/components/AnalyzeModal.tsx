
import React, { useEffect, useState } from 'react';
import { MarketEvent, AnalysisResult } from '../types.ts';
import { analyzeMarket } from '../services/geminiService.ts';
import { X, Bot, ShieldAlert, LoaderCircle, ExternalLink, Clock, TrendingUp, Sparkles, ShieldCheck, FileText, Activity } from 'lucide-react';
import { clsx } from 'clsx';

interface AnalyzeModalProps {
  event: MarketEvent;
  onClose: () => void;
}

export const AnalyzeModal: React.FC<AnalyzeModalProps> = ({ event, onClose }) => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchAnalysis = async () => {
      setLoading(true);
      const data = await analyzeMarket(event);
      if (mounted) {
        setResult(data);
        setLoading(false);
      }
    };
    fetchAnalysis();
    return () => { mounted = false; };
  }, [event]);

  const apy = event.apy || 0;
  const isLowYield = apy < 4.5 && !!event.arbPercent;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto font-sans">
      <div className="bg-[#0b121f] border border-white/10 rounded-[1.5rem] w-full max-w-xl shadow-[0_40px_120px_rgba(0,0,0,0.9)] flex flex-col h-auto max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500/10 p-2 rounded-lg">
                <Activity className="w-4 h-4 text-indigo-400" />
             </div>
             <div>
                <h3 className="text-[11px] font-black text-white tracking-[0.15em] uppercase">Intelligence Audit</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[200px] sm:max-w-md">Node ID: {event.id.split('-').pop()}</p>
             </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div className="relative">
                <LoaderCircle className="w-10 h-10 text-indigo-500 animate-spin" />
                <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300" />
              </div>
              <div className="space-y-1.5 text-center">
                <p className="text-white font-black uppercase tracking-[0.2em] text-[10px]">Accessing Global Feed...</p>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest animate-pulse">Grounding Cross-Platform Definitions</p>
              </div>
            </div>
          ) : result ? (
            <>
              {/* Event Context Header */}
              <div className="space-y-1">
                 <h2 className="text-white text-lg font-black leading-tight">{event.outcome}</h2>
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{event.title}</p>
              </div>

              {/* Status Ribbon - Redesigned to remove label and encompass full width */}
              <div className={clsx(
                "px-6 py-5 rounded-xl border transition-all text-center",
                result.recommendation === 'STRONG BUY' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
                result.recommendation === 'BUY' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                result.recommendation === 'AVOID' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                "bg-slate-800/40 border-white/5 text-slate-400"
              )}>
                <span className="text-xs font-black uppercase tracking-[0.15em] block leading-relaxed">
                  {result.recommendation}
                </span>
              </div>

              {/* Intelligence Report Content */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 space-y-4">
                 <div className="flex items-center gap-2 opacity-50">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Executive Summary</span>
                 </div>
                 <div className="text-[13px] leading-[1.6] text-slate-300 font-medium whitespace-pre-line">
                   {result.analysis}
                 </div>
                 <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Risk Assessment:</span>
                    <span className={clsx(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                      result.riskLevel === 'HIGH' ? "text-red-400 bg-red-400/10" : 
                      result.riskLevel === 'MEDIUM' ? "text-amber-400 bg-amber-400/10" : "text-emerald-400 bg-emerald-400/10"
                    )}>{result.riskLevel}</span>
                 </div>
              </div>

              {/* Bottom Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className={clsx(
                  "p-3.5 rounded-2xl border flex flex-col gap-1",
                  isLowYield ? "bg-amber-500/5 border-amber-500/10" : "bg-slate-900/40 border-white/5"
                )}>
                  <div className="flex items-center gap-1.5 opacity-50">
                    <TrendingUp className="w-3 h-3 text-slate-400" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Real Yield</span>
                  </div>
                  <span className={clsx("text-sm font-black font-mono", isLowYield ? "text-amber-400" : "text-emerald-400")}>
                    {apy.toFixed(1)}% APY
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-white/5 bg-slate-900/40 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 opacity-50">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Time Lock</span>
                  </div>
                  <span className="text-sm font-black font-mono text-slate-200">
                    {event.daysToExpiry} Days
                  </span>
                </div>
              </div>

              {/* Grounding Sources */}
              {result.sources && result.sources.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 opacity-50">
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Reference Grounding</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((source, i) => (
                      <a 
                        key={i} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-white/5 rounded-xl text-[9px] font-bold text-slate-400 hover:text-white hover:border-indigo-500/40 transition-all"
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
        
        {/* Footer Action */}
        <div className="px-6 py-4 border-t border-white/5 bg-slate-950/80 flex justify-end shrink-0">
          <button 
            onClick={onClose} 
            className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg active:scale-95"
          >
            Dismiss Report
          </button>
        </div>
      </div>
    </div>
  );
};
