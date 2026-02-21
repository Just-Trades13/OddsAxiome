import React, { useState, useEffect } from 'react';
import {
  Activity, ArrowRight, BarChart3, BrainCircuit, Check, ChevronRight,
  Globe, Rocket, Search, Shield, ShieldCheck, Sparkles, Target, Timer,
  TrendingUp, Zap, Terminal, CreditCard, Calculator, LoaderCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { createCheckout } from '../services/api.ts';

interface LandingPageProps {
  onSignUp: () => void;
  onNavChange: (nav: string) => void;
}

/** Animated counter that ticks up from 0 to target */
const AnimatedNumber: React.FC<{ target: number; suffix?: string; duration?: number }> = ({ target, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count.toLocaleString()}{suffix}</>;
};

export const LandingPage: React.FC<LandingPageProps> = ({ onSignUp, onNavChange }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState({ markets: 5000, platforms: 9, arbs: 148 });

  // Fetch live stats from public endpoint
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/odds/live?per_page=1');
        const data = await res.json();
        if (data?.meta?.total) {
          setLiveStats(prev => ({ ...prev, markets: data.meta.total }));
        }
      } catch {}
    })();
  }, []);

  const prices = {
    monthly: { starter: 49, pro: 149 },
    yearly: { starter: 39, pro: 119 },
  };

  const handleCheckout = async (tier: 'explorer' | 'pro') => {
    setLoadingTier(tier);
    try {
      const result = await createCheckout(tier, billingCycle);
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    } catch {
      onSignUp();
    } finally {
      setLoadingTier(null);
    }
  };

  const platforms = [
    { name: 'Polymarket', color: 'text-blue-400' },
    { name: 'Kalshi', color: 'text-cyan-400' },
    { name: 'PredictIt', color: 'text-indigo-400' },
    { name: 'DraftKings', color: 'text-green-400' },
    { name: 'FanDuel', color: 'text-sky-400' },
    { name: 'BetMGM', color: 'text-amber-400' },
    { name: 'Bovada', color: 'text-red-400' },
    { name: 'BetRivers', color: 'text-teal-400' },
    { name: 'Gemini', color: 'text-fuchsia-400' },
  ];

  return (
    <div className="bg-slate-950 w-full overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Live — Scanning {liveStats.platforms} Platforms</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.95]">
              The Kayak for<br />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                Prediction Markets.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Compare odds across every major prediction market and sportsbook in real time.
              Spot arbitrage. Detect alpha. Make smarter bets.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={onSignUp}
                className="group flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:-translate-y-0.5"
              >
                Start Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavChange('how-it-works')}
                className="flex items-center gap-3 px-8 py-4 bg-slate-800/60 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm border border-slate-700 transition-all"
              >
                How It Works
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust line */}
            <p className="text-xs text-slate-600 font-medium pt-2">
              Free tier included. No credit card required.
            </p>
          </div>

          {/* Live Stats Bar */}
          <div className="mt-16 grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-white">
                <AnimatedNumber target={liveStats.markets} suffix="+" />
              </div>
              <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Live Markets</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-emerald-400">
                <AnimatedNumber target={liveStats.platforms} />
              </div>
              <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Platforms</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-fuchsia-400">
                <AnimatedNumber target={liveStats.arbs} suffix="+" />
              </div>
              <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Active Arbs</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORM LOGOS ── */}
      <section className="border-y border-slate-800/60 bg-slate-900/30 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-8">
            Aggregating odds from the world's leading markets
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 md:gap-x-12">
            {platforms.map(p => (
              <div key={p.name} className="flex items-center gap-2 px-4 py-2 bg-slate-800/40 border border-slate-800 rounded-xl">
                <Globe className={clsx("w-4 h-4", p.color)} />
                <span className="text-xs font-bold text-slate-400">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOCK DASHBOARD ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white">See Every Market. One Dashboard.</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              No more jumping between six tabs. OddsAxiom normalizes odds, flags arbs, and surfaces alpha — all in real time.
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="bg-slate-800 rounded-3xl border border-slate-700 p-1.5 shadow-2xl shadow-emerald-500/5 relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/10 via-transparent to-fuchsia-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative">
              {/* Title bar */}
              <div className="h-9 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                <span className="ml-4 text-[10px] font-bold text-slate-500">OddsAxiom — Politics Dashboard</span>
              </div>

              {/* Mock table */}
              <div className="p-4 md:p-6 space-y-3">
                {/* Header row */}
                <div className="grid grid-cols-5 gap-2 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-800">
                  <div className="col-span-2">Market</div>
                  <div className="text-center">Polymarket</div>
                  <div className="text-center">Kalshi</div>
                  <div className="text-center">Arb %</div>
                </div>

                {/* Mock rows */}
                {[
                  { title: 'Will Bitcoin hit $150K by July 2026?', poly: '62¢', kalshi: '58¢', arb: '+4.2%', hasArb: true },
                  { title: 'Fed rate cut in March 2026?', poly: '34¢', kalshi: '38¢', arb: '+3.8%', hasArb: true },
                  { title: 'US GDP growth > 3% in Q1 2026?', poly: '45¢', kalshi: '44¢', arb: '—', hasArb: false },
                  { title: 'Next Supreme Court retirement by Dec?', poly: '18¢', kalshi: '22¢', arb: '+2.1%', hasArb: true },
                ].map((row, i) => (
                  <div key={i} className={clsx(
                    "grid grid-cols-5 gap-2 py-3 rounded-xl px-2 items-center transition-colors",
                    row.hasArb ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-slate-800/30 border border-transparent"
                  )}>
                    <div className="col-span-2 text-xs font-bold text-slate-300 truncate">{row.title}</div>
                    <div className="text-center text-xs font-mono font-bold text-slate-400">{row.poly}</div>
                    <div className="text-center text-xs font-mono font-bold text-slate-400">{row.kalshi}</div>
                    <div className={clsx(
                      "text-center text-xs font-mono font-black",
                      row.hasArb ? "text-emerald-400" : "text-slate-600"
                    )}>
                      {row.arb}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="py-20 bg-slate-900/40 border-y border-slate-800/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white">Your Unfair Advantage</h2>
            <p className="text-slate-400 max-w-lg mx-auto">Four tools. One platform. Total market intelligence.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Search,
                color: 'emerald',
                title: 'Multi-Platform Scan',
                desc: 'See normalized odds from 9 platforms side-by-side. Spot pricing discrepancies instantly.',
              },
              {
                icon: Target,
                color: 'fuchsia',
                title: 'Alpha Bias Detection',
                desc: 'Identify lagging "retail" prices against sharp anchors like Polymarket.',
              },
              {
                icon: Calculator,
                color: 'indigo',
                title: 'Arb Calculator',
                desc: 'Input your bankroll, get proportional staking instructions for risk-free returns.',
              },
              {
                icon: Sparkles,
                color: 'amber',
                title: 'AI Verification',
                desc: 'Gemini AI audits contract terms to flag resolution rule mismatches between platforms.',
              },
            ].map((item, i) => {
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
                indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              };
              return (
                <div key={i} className="p-6 bg-slate-800/30 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-colors group">
                  <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center border", colorMap[item.color])}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (condensed) ── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white">How OddsAxiom Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Aggregate',
                desc: 'We pull real-time pricing from 9 prediction markets and sportsbooks into one unified feed.',
                icon: Globe,
                color: 'emerald',
              },
              {
                step: '02',
                title: 'Analyze',
                desc: 'Our engine cross-references odds, detects arbitrage, and surfaces alpha biases automatically.',
                icon: BrainCircuit,
                color: 'indigo',
              },
              {
                step: '03',
                title: 'Act',
                desc: 'Click through to any platform with one click. Use the arb calculator to size your positions.',
                icon: Rocket,
                color: 'fuchsia',
              },
            ].map((item, i) => {
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
              };
              return (
                <div key={i} className="relative p-8 bg-slate-800/30 rounded-2xl border border-slate-800 space-y-4">
                  <div className="absolute -top-4 left-6">
                    <span className={clsx("inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", colorMap[item.color])}>
                      Step {item.step}
                    </span>
                  </div>
                  <div className="pt-4">
                    <item.icon className={clsx("w-8 h-8 mb-4", item.color === 'emerald' ? 'text-emerald-400' : item.color === 'indigo' ? 'text-indigo-400' : 'text-fuchsia-400')} />
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-20 bg-slate-900/40 border-y border-slate-800/40" id="pricing">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-white">Simple, Transparent Pricing</h2>
            <p className="text-slate-400">Start free. Upgrade when you're ready.</p>
            <p className="text-emerald-400/80 text-sm font-bold">All paid plans include a 7-day free trial. Cancel anytime.</p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <span className={clsx("text-xs font-bold", billingCycle === 'monthly' ? "text-white" : "text-slate-500")}>Monthly</span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className="w-12 h-6 bg-slate-800 rounded-full p-1 border border-slate-700 flex items-center transition-all"
              >
                <div className={clsx("w-4 h-4 rounded-full bg-emerald-500 transition-all", billingCycle === 'yearly' ? "translate-x-6" : "translate-x-0")} />
              </button>
              <div className="flex items-center gap-2">
                <span className={clsx("text-xs font-bold", billingCycle === 'yearly' ? "text-white" : "text-slate-500")}>Yearly</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black border border-emerald-500/20">SAVE 25%</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="p-8 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-8 flex flex-col">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Free</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">$0</span>
                  <span className="text-slate-500 text-sm">/mo</span>
                </div>
                <p className="text-sm text-slate-500">Explore the platform. No card needed.</p>
              </div>
              <div className="flex-1 space-y-4">
                {['20 Markets per Category', 'Real-time Dashboard', 'Local Search', 'Basic Arb Highlighting'].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-slate-600 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={onSignUp}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all border border-slate-700"
              >
                Get Started Free
              </button>
            </div>

            {/* Explorer Plan */}
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
                {['Unlimited Markets', 'Standard Arb Scanning', 'Local + Global Filtering', '15 Platform Scans / Day'].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout('explorer')}
                disabled={loadingTier !== null}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all border border-slate-700 flex items-center justify-center gap-2"
              >
                {loadingTier === 'explorer' ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Start 7-Day Free Trial'}
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
                  'Unlimited Global AI Scans',
                  'Gemini Verify Feature',
                  'Priority Data Refresh',
                  'Time-Lock Analysis',
                  'Arb ROI Calculator Pro',
                  'Custom Column Ordering',
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-200">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout('pro')}
                disabled={loadingTier !== null}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {loadingTier === 'pro' ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Start 7-Day Free Trial'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Stop Leaving Money on the Table.
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Every minute you're not comparing odds across platforms, someone else is taking the edge.
          </p>
          <button
            onClick={onSignUp}
            className="group inline-flex items-center gap-3 px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-base uppercase tracking-widest transition-all shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-xs text-slate-600 font-medium">No credit card required.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-800 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-white">Odds<span className="text-emerald-400">Axiom</span></span>
            <span className="text-slate-600 text-[10px] font-medium ml-2">&copy; 2025. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <button onClick={() => onNavChange('terms')} className="hover:text-emerald-400 transition-colors">Terms</button>
            <button onClick={() => onNavChange('privacy')} className="hover:text-emerald-400 transition-colors">Privacy</button>
            <button onClick={() => onNavChange('api-docs')} className="hover:text-emerald-400 transition-colors">API</button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-slate-800/60">
          <p className="text-[10px] text-slate-600 leading-relaxed max-w-4xl italic">
            Disclaimer: OddsAxiom.com is a data aggregation platform. The information provided is for informational and educational purposes only. OddsAxiom is not a gambling operator and does not provide gambling advice or betting services. Trading on prediction markets involves significant financial risk. Users are responsible for compliance with all local laws.
          </p>
        </div>
      </footer>
    </div>
  );
};
