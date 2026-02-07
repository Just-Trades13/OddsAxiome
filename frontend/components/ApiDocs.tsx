
import React from 'react';
import { Terminal, Code, Cpu, Zap, Copy } from 'lucide-react';

export const ApiDocs: React.FC = () => {
  return (
    <div className="bg-slate-900 w-full">
      <div className="max-w-5xl mx-auto px-6 py-20 space-y-12 pb-32">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">Quant API Docs</h1>
              <p className="text-slate-400">High-performance data for algorithmic traders.</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_350px] gap-12">
          <div className="space-y-12">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Zap className="w-5 h-5 text-emerald-400" />
                Real-time Websocket
              </h2>
              <p className="text-slate-400">
                The OddsAxiom Websocket provides sub-100ms updates for every price move across Polymarket and Kalshi. 
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connect</span>
                  <button className="text-slate-500 hover:text-white transition-colors"><Copy className="w-3 h-3" /></button>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                  wss://api.oddsaxiom.com/v1/stream?key=YOUR_API_KEY
                </pre>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Code className="w-5 h-5 text-indigo-400" />
                REST Endpoints
              </h2>
              <p className="text-slate-400">
                Use our REST API to fetch historical yields and current market snapshots via the OddsAxiom gateway.
              </p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded uppercase">GET</span>
                    <code className="text-sm font-bold text-white">https://api.oddsaxiom.com/v1/markets/{'{category}'}</code>
                  </div>
                  <p className="text-sm text-slate-500">Fetch all active contracts in a specific category.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-black rounded uppercase">GET</span>
                    <code className="text-sm font-bold text-white">https://api.oddsaxiom.com/v1/arb/scan</code>
                  </div>
                  <p className="text-sm text-slate-500">Returns all current arbitrage opportunities with ROI metrics.</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">Market Object Schema</h2>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <pre className="p-6 text-xs font-mono text-slate-400 leading-relaxed overflow-x-auto">
{`{
  "id": "poly-fed-march-25",
  "title": "Fed Interest Rate March Meeting",
  "best_yes": {
    "price": 0.42,
    "platform": "Polymarket"
  },
  "best_no": {
    "price": 0.55,
    "platform": "Kalshi"
  },
  "arb_percent": 3.0,
  "apy": 12.4
}`}
                </pre>
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <div className="p-6 bg-slate-800/40 border border-slate-700 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 text-white">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold">Rate Limits</h3>
              </div>
              <ul className="space-y-3 text-xs text-slate-400">
                <li className="flex justify-between">
                  <span>Starter</span>
                  <span className="text-white font-bold">100 req/min</span>
                </li>
                <li className="flex justify-between">
                  <span>Pro</span>
                  <span className="text-white font-bold">5,000 req/min</span>
                </li>
                <li className="flex justify-between">
                  <span>Quant</span>
                  <span className="text-emerald-400 font-bold">Unlimited</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Need higher limits?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Our Quant API supports dedicated node endpoints for low-latency HFT bots.
              </p>
              <button className="w-full py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors">
                Upgrade to Quant
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
