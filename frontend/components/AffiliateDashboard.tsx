import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, DollarSign, MousePointerClick, Users, TrendingUp, ArrowLeft, Loader2, Link2 } from 'lucide-react';
import { clsx } from 'clsx';
import { registerAffiliate, getAffiliateStats, getAffiliateConversions } from '../services/api.ts';

interface AffiliateDashboardProps {
  onBack: () => void;
}

interface AffiliateStats {
  code: string;
  commission_rate: number;
  total_clicks: number;
  total_conversions: number;
  total_earned: number;
  total_paid: number;
  pending_payout: number;
}

interface Conversion {
  id: number;
  user_id: string;
  amount: number;
  commission: number;
  status: string;
  created_at: string;
}

export const AffiliateDashboard: React.FC<AffiliateDashboardProps> = ({ onBack }) => {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralUrl = stats?.code ? `${window.location.origin}?ref=${stats.code}` : '';

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAffiliateStats();
      setStats(data);
      setIsRegistered(true);
      const convData = await getAffiliateConversions();
      setConversions(convData);
    } catch (err: any) {
      if (err.message?.includes('not registered') || err.message?.includes('404') || err.message?.includes('Not Found')) {
        setIsRegistered(false);
      } else {
        setError(err.message || 'Failed to load affiliate data');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setRegistering(true);
    setError(null);
    try {
      await registerAffiliate();
      await loadStats();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="bg-slate-900 w-full min-h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 w-full min-h-full">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 pb-60">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <Share2 className="w-6 h-6 text-emerald-400" />
                Affiliate Program
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">Earn 15% commission on every referral subscription</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400 font-medium">
            {error}
          </div>
        )}

        {!isRegistered ? (
          /* Registration CTA */
          <div className="bg-slate-950 border border-slate-800 rounded-[2rem] p-12 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/20">
              <Share2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Join the Affiliate Program</h2>
              <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                Share OddsAxiom with your network and earn <span className="text-emerald-400 font-bold">15% commission</span> on
                every subscription your referrals make. No limits, no caps.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-2xl font-black text-emerald-400">15%</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Commission</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-2xl font-black text-white">$0</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Minimum</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-2xl font-black text-white">30d</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Cookie</p>
              </div>
            </div>
            <button
              onClick={handleRegister}
              disabled={registering}
              className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-2xl text-sm font-black transition-all shadow-xl shadow-emerald-500/20"
            >
              {registering ? 'Setting up...' : 'Become an Affiliate'}
            </button>
          </div>
        ) : stats && (
          <>
            {/* Referral Link */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Link2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Your Referral Link</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-emerald-400 truncate">
                  {referralUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className={clsx(
                    "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shrink-0",
                    copied
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                  )}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-slate-600 font-medium mt-3">
                Code: <span className="text-slate-400 font-bold">{stats.code}</span> &middot;
                Commission Rate: <span className="text-emerald-400 font-bold">{(stats.commission_rate * 100).toFixed(0)}%</span>
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Clicks', value: stats.total_clicks.toLocaleString(), icon: MousePointerClick, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                { label: 'Conversions', value: stats.total_conversions.toLocaleString(), icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                { label: 'Total Earned', value: `$${stats.total_earned.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                { label: 'Pending Payout', value: `$${stats.pending_payout.toFixed(2)}`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
              ].map((stat) => (
                <div key={stat.label} className={clsx("border rounded-3xl p-6 shadow-xl", stat.bg, stat.border)}>
                  <div className="flex items-center gap-3 mb-3">
                    <stat.icon className={clsx("w-5 h-5", stat.color)} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <p className={clsx("text-3xl font-black", stat.color)}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Conversion History */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Conversion History</h3>
              {conversions.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                  <p className="text-sm text-slate-500 font-medium">No conversions yet. Share your referral link to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Amount</th>
                        <th className="pb-3 pr-4">Commission</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversions.map((c) => (
                        <tr key={c.id} className="border-b border-slate-900 last:border-0">
                          <td className="py-3 pr-4 text-xs text-slate-400 font-medium">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 pr-4 text-sm font-bold text-white">${c.amount.toFixed(2)}</td>
                          <td className="py-3 pr-4 text-sm font-bold text-emerald-400">${c.commission.toFixed(2)}</td>
                          <td className="py-3">
                            <span className={clsx(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                              c.status === 'approved' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                              c.status === 'pending' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                              c.status === 'rejected' && "bg-red-500/10 text-red-400 border border-red-500/20"
                            )}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
