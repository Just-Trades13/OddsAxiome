
import React, { useState } from 'react';
import { Check, Zap, Rocket, Terminal } from 'lucide-react';
import { clsx } from 'clsx';

export const Pricing: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const prices = {
    monthly: { starter: 49, pro: 149 },
    yearly: { starter: 39, pro: 119 }
  };

  return (
    <div className="bg-slate-900 w-full">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-12 pb-32">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-white">Upgrade Your Portfolio</h1>
          <p className="text-slate-400">Join 500+ professionals using AI to dominate prediction markets.</p>
          
          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 pt-6">
             <span className={clsx("text-xs font-bold", billingCycle === 'monthly' ? "text-white" : "text-slate-500")}>Monthly</span>
             <button 
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className="w-12 h-6 bg-slate-800 rounded-full p-1 border border-slate-700 flex items-center transition-all"
             >
                <div className={clsx(
                   "w-4 h-4 rounded-full bg-emerald-500 transition-all",
                   billingCycle === 'yearly' ? "translate-x-6" : "translate-x-0"
                )}></div>
             </button>
             <div className="flex items-center gap-2">
                <span className={clsx("text-xs font-bold", billingCycle === 'yearly' ? "text-white" : "text-slate-500")}>Yearly</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black border border-emerald-500/20">SAVE 25%</span>
             </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <div className="p-8 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-8 flex flex-col">
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-slate-400" />
                   </div>
                   <h3 className="text-xl font-bold text-white">Explorer</h3>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-4xl font-black text-white">${prices[billingCycle].starter}</span>
                   <span className="text-slate-500 text-sm">/mo</span>
                </div>
                <p className="text-sm text-slate-500">Perfect for retail arbitrage seekers.</p>
             </div>
             
             <div className="flex-1 space-y-4">
                {[
                  "Real-time Dashboard",
                  "Standard Arb Scanning",
                  "Local Filtering",
                  "15 Platform Scans / Day"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {feature}
                  </div>
                ))}
             </div>

             <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all border border-slate-700">
                Get Started
             </button>
          </div>

          {/* Pro Plan - Highlighted */}
          <div className="p-8 bg-slate-900 border-2 border-emerald-500/50 rounded-3xl space-y-8 flex flex-col relative shadow-2xl shadow-emerald-500/5">
             <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-full">
                Most Popular
             </div>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-emerald-500" />
                   </div>
                   <h3 className="text-xl font-bold text-white">Arbitrage Pro</h3>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-4xl font-black text-white">${prices[billingCycle].pro}</span>
                   <span className="text-slate-500 text-sm">/mo</span>
                </div>
                <p className="text-sm text-slate-400">Our flagship scanning experience.</p>
             </div>
             
             <div className="flex-1 space-y-4">
                {[
                  "Unlimited Global AI Scans",
                  "Gemini Verify Feature",
                  "Priority Data Refresh",
                  "Time-Lock Analysis",
                  "Arb ROI Calculator Pro",
                  "Custom Column Ordering"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-200">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {feature}
                  </div>
                ))}
             </div>

             <button className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black transition-all shadow-lg shadow-emerald-500/20">
                Upgrade Now
             </button>
          </div>

          {/* API Plan */}
          <div className="p-8 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl space-y-8 flex flex-col">
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                      <Terminal className="w-5 h-5 text-indigo-400" />
                   </div>
                   <h3 className="text-xl font-bold text-white">Quant API</h3>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-black text-white">Custom</span>
                </div>
                <p className="text-sm text-slate-500">For algorithmic trading teams.</p>
             </div>
             
             <div className="flex-1 space-y-4">
                {[
                  "Websocket Data Stream",
                  "JSON Odds Output",
                  "REST API Access",
                  "Dedicated Success Manager",
                  "Custom Node Endpoints"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                    {feature}
                  </div>
                ))}
             </div>

             <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all border border-indigo-500/40 shadow-lg shadow-indigo-600/10">
                Contact Sales
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
