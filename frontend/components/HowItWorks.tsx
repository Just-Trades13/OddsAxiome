import React from 'react';
import { Search, Zap, Calculator, Sparkles, Layout, Database, TrendingUp, ShieldCheck, CheckCircle2, ShieldAlert, BarChart3, ArrowUpRight, Target, BrainCircuit, Timer } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <div className="bg-slate-900 w-full">
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-24 pb-32">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
            The Professional Edge for <br />
            <span className="text-emerald-400">Prediction Markets.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            OddsAxiom is a high-frequency aggregation platform that scans the world's leading prediction markets to identify <strong>Alpha Biases</strong> and risk-free <strong>Arbitrage</strong> opportunities.
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-4">
             <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-xs font-bold text-slate-300 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Powered by Gemini 3.0
             </div>
             <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-xs font-bold text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Real-time Verification
             </div>
             <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-xs font-bold text-slate-300 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-fuchsia-400" /> Alpha Bias Detection
             </div>
          </div>
        </section>

        {/* Step 1: Aggregation */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 order-2 md:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-black uppercase tracking-widest border border-emerald-500/20">
              Step 01
            </div>
            <h2 className="text-3xl font-bold text-white">Aggregated Market Feed</h2>
            <p className="text-slate-400 leading-relaxed">
              We connect directly to Polymarket, Kalshi, PredictIt, and DraftKings. Instead of checking six tabs, you get a unified view of the entire global prediction ecosystem in a single, lightning-fast dashboard.
            </p>
            <ul className="space-y-3">
              {[
                "Real-time price normalization (cents to decimals)",
                "Customizable column ordering via drag-and-drop",
                "Automated volume and liquidity tracking"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <div className="mt-1 p-0.5 bg-emerald-500/20 rounded-full">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 md:order-2 bg-slate-800 rounded-2xl border border-slate-700 p-2 shadow-2xl relative group">
             <div className="absolute -inset-1 bg-emerald-500/20 blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-700"></div>
             <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative">
                <div className="h-7 bg-slate-800 border-b border-slate-700 flex items-center px-3 gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500/40"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40"></div>
                </div>
                <div className="p-5 space-y-5">
                   <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700 space-y-3">
                      <div className="flex justify-between items-start">
                         <div className="space-y-1">
                            <div className="h-1.5 w-16 bg-indigo-500/50 rounded"></div>
                            <div className="text-[10px] font-bold text-white leading-tight">Will the S&P 500 close above 6,000?</div>
                         </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                         <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 flex flex-col items-center gap-1">
                            <span className="text-[6px] font-black text-slate-500 uppercase">Polymarket</span>
                            <span className="text-[11px] font-mono font-bold text-slate-300">42¢</span>
                         </div>
                         <div className="bg-slate-950/80 rounded-lg p-2 border border-emerald-500/30 ring-1 ring-emerald-500/20 flex flex-col items-center gap-1 relative overflow-hidden">
                            <span className="text-[6px] font-black text-slate-500 uppercase">Kalshi</span>
                            <span className="text-[11px] font-mono font-bold text-white">38¢</span>
                         </div>
                         <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 flex flex-col items-center gap-1">
                            <span className="text-[6px] font-black text-slate-500 uppercase">PredictIt</span>
                            <span className="text-[11px] font-mono font-bold text-slate-300">45¢</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Step 2: AI Audit */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-2 shadow-2xl overflow-hidden relative group">
             <div className="absolute -inset-1 bg-indigo-500/20 blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-700"></div>
             <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6 relative">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                   <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] font-bold text-white uppercase tracking-wider">Verification Panel</div>
                      <div className="text-[9px] text-slate-500 font-medium">Scanning Platform Rulebooks...</div>
                   </div>
                </div>
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                         <span className="text-slate-400 uppercase tracking-tighter">Term Definition</span>
                         <span className="text-amber-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> REVIEW NEEDED</span>
                      </div>
                      <div className="text-[9px] text-slate-300 leading-tight italic">
                         "Strike" defined as kinetic military action on Poly, but as formal declaration on Kalshi.
                      </div>
                </div>
             </div>
          </div>
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs font-black uppercase tracking-widest border border-indigo-500/20">
              Step 02
            </div>
            <h2 className="text-3xl font-bold text-white">AI Grounding & Verification</h2>
            <p className="text-slate-400 leading-relaxed">
              Not all contracts are created equal. OddsAxiom uses Gemini AI to scan the underlying "Terms of Service" and resolution rules for every market. We flag discrepancies in settlement dates or event definitions so you never get caught on the wrong side of a technicality.
            </p>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
               <h4 className="text-xs font-black text-slate-300 uppercase">Live Analysis Output</h4>
               <p className="text-xs text-slate-500 italic">"Detected mismatch: Kalshi settles on Jan 2nd while Polymarket settles on physical inauguration. Risk Level: Medium."</p>
            </div>
          </div>
        </section>

        {/* New Section: Alpha & Biases */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 order-2 md:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded-lg text-xs font-black uppercase tracking-widest border border-fuchsia-500/20">
              Step 03
            </div>
            <h2 className="text-3xl font-bold text-white">Alpha Bias Detection</h2>
            <p className="text-slate-400 leading-relaxed">
              Alpha is the ability to outperform the market by identifying price biases. In prediction markets, these biases occur due to <strong>information asymmetry</strong> and <strong>platform lag</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">Retail Lag</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Low-volume "Retail" platforms often take minutes or hours to react to news that has already moved "Sharp" anchor markets.
                </p>
              </div>
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">Sharp Anchoring</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  We use Polymarket's high-liquidity pricing as a "Fair Value" anchor to detect institutional-grade mispricings elsewhere.
                </p>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 bg-slate-800 rounded-2xl border border-slate-700 p-2 shadow-2xl relative group">
             <div className="absolute -inset-1 bg-fuchsia-500/20 blur-2xl opacity-40"></div>
             <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 relative">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Market Alpha Score</span>
                    <span className="text-fuchsia-400 font-mono text-sm font-black">+8.4% EDGE</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-fuchsia-500 w-3/4"></div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                      <span>Sharp Px (Poly)</span>
                      <span className="text-white">42.0¢</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                      <span>Retail Px (Lagged)</span>
                      <span className="text-emerald-400">38.2¢</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </section>

        {/* Step 4: Arbitrage Calculator */}
        <section className="text-center space-y-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-black uppercase tracking-widest border border-amber-500/20">
              Step 04
            </div>
            <h2 className="text-3xl font-bold text-white">The Arbitrage Engine</h2>
            <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
              Identify "Free Money" opportunities. When the combined price of the Best Yes and Best No across two different platforms is less than $1.00, our system highlights it in green.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
             <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                   <Search className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-bold text-white">1. Scan</h3>
                <p className="text-xs text-slate-500">Scan for markets where the spread is inverted between platforms.</p>
             </div>
             <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700 text-center space-y-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto">
                   <Calculator className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className="font-bold text-white">2. Calculate</h3>
                <p className="text-xs text-slate-500">Input your bankroll to get proportional staking instructions for zero-risk return.</p>
             </div>
             <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700 text-center space-y-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                   <Database className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="font-bold text-white">3. Profit</h3>
                <p className="text-xs text-slate-500">Lock in your gains regardless of the event outcome or market direction.</p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};