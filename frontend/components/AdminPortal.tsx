
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Download, Trash2, CheckCircle2, Users, Globe, Lock, Unlock, Key, ShieldAlert, Terminal, Loader2, Mail, Database, AlertCircle, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';
import { auth } from '../services/firebase.ts';
import { adminGetUsers, adminGetMetrics, adminUpdateUser, adminDeleteUser } from '../services/api.ts';

interface AdminPortalProps {
  onClose: () => void;
  currentUserEmail?: string;
}

interface BackendUser {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  tier: string;
  is_admin: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface Metrics {
  total_users: number;
  active_subscriptions: number;
  active_markets: number;
  active_arbs: number;
  total_affiliates: number;
}

type AdminTab = 'users' | 'metrics';

export const AdminPortal: React.FC<AdminPortalProps> = ({ onClose, currentUserEmail }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Auto-authorize if current Firebase user is admin
  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const user = auth.currentUser;
    if (!user) {
      setAuthError('Please sign in first');
      return;
    }
    try {
      // Try to access admin endpoint - if 403, user is not admin
      await adminGetMetrics();
      setIsAuthorized(true);
    } catch (err: any) {
      setAuthError(err.message?.includes('403') || err.message?.includes('admin')
        ? 'Your account does not have admin privileges'
        : `Auth error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadUserData();
      loadMetrics();
    }
  }, [isAuthorized, page]);

  // Debounced search
  useEffect(() => {
    if (!isAuthorized) return;
    const timer = setTimeout(() => {
      setPage(1);
      loadUserData();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadUserData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminGetUsers({ search: search || undefined, page, per_page: 50 });
      setUsers(response.data || []);
      setTotalPages(response.meta?.total_pages || 1);
      setTotalUsers(response.meta?.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const m = await adminGetMetrics();
      setMetrics(m);
    } catch (err: any) {
      console.error('Failed to load metrics:', err.message);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleTierToggle = async (user: BackendUser) => {
    const newTier = user.tier === 'free' ? 'pro' : 'free';
    try {
      await adminUpdateUser(user.id, { tier: newTier });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, tier: newTier } : u));
    } catch (err: any) {
      alert(`Failed to update tier: ${err.message}`);
    }
  };

  const handleDelete = async (user: BackendUser) => {
    if (!confirm(`Deactivate user ${user.email}? This will disable their account.`)) return;
    try {
      await adminDeleteUser(user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: false } : u));
    } catch (err: any) {
      alert(`Failed to deactivate: ${err.message}`);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(users, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `oddsaxiom_users_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const tierLabel = (tier: string) => {
    switch (tier) {
      case 'pro': return 'Arbitrage Pro';
      case 'explorer': return 'Explorer';
      default: return 'Free';
    }
  };

  const tierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'explorer': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-800 text-slate-500 border-slate-700';
    }
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse"></div>

           <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                 <Lock className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Admin Access</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  {authError || 'Verifying admin credentials...'}
                </p>
                {!authError && <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto mt-4" />}
              </div>
           </div>

           <button onClick={onClose} className="w-full text-slate-600 hover:text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-colors">
              Return to Dashboard
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col animate-in fade-in duration-300">
      <header className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
            <Unlock className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Admin Console</h1>
            <div className="flex items-center gap-3">
               <button onClick={() => setActiveTab('users')} className={clsx("text-[10px] font-bold uppercase tracking-widest transition-colors", activeTab === 'users' ? "text-emerald-400" : "text-slate-500 hover:text-slate-300")}>
                 Users
               </button>
               <span className="text-slate-800 text-[10px]">|</span>
               <button onClick={() => setActiveTab('metrics')} className={clsx("text-[10px] font-bold uppercase tracking-widest transition-colors", activeTab === 'metrics' ? "text-indigo-400" : "text-slate-500 hover:text-slate-300")}>
                 Metrics
               </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 mr-2">
             <Database className="w-3.5 h-3.5 text-emerald-500" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Database</span>
           </div>
           <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all border border-slate-700">
             Close
           </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
        {activeTab === 'users' ? (
          <>
            <div className="flex justify-between items-center">
               <div className="relative w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                  />
               </div>
               <div className="flex items-center gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    title="Export Users"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button onClick={loadUserData} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all">
                    <Terminal className="w-4 h-4" />
                  </button>
                  <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-white">{totalUsers} Users</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 border border-slate-800 rounded-2xl bg-slate-900/50 overflow-hidden flex flex-col shadow-2xl relative">
              {loading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
                   <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                </div>
              )}
              {error && (
                <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tier</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Login</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Created</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {users.map((user) => (
                      <tr key={user.id} className={clsx("hover:bg-slate-800/20 transition-colors group", !user.is_active && "opacity-50")}>
                        <td className="px-6 py-5">
                          <span className="text-sm font-bold text-white whitespace-nowrap">
                            {user.display_name || 'No name'}
                            {user.is_admin && <span className="ml-2 text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/20">ADMIN</span>}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-slate-300 font-mono tracking-tight">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <button
                            onClick={() => handleTierToggle(user)}
                            className={clsx(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-1.5 border",
                              tierColor(user.tier)
                            )}
                          >
                            {tierLabel(user.tier)}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <span className={clsx(
                            "text-[10px] font-bold uppercase",
                            user.is_active ? "text-emerald-400" : "text-red-400"
                          )}>
                            {user.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-xs text-slate-500 font-mono">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-5 text-xs text-slate-500 font-mono">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-5 text-right">
                           {user.is_active && (
                             <button onClick={() => handleDelete(user)} className="p-2 text-slate-600 hover:text-red-500 transition-colors" title="Deactivate user">
                                <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !loading && (
                      <tr>
                        <td colSpan={7} className="px-6 py-20 text-center text-slate-500 italic text-sm">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 px-4">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {metricsLoading ? (
              <div className="col-span-4 flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              </div>
            ) : metrics ? (
              <>
                <MetricCard label="Total Users" value={metrics.total_users} icon={<Users className="w-5 h-5" />} color="emerald" />
                <MetricCard label="Active Subscriptions" value={metrics.active_subscriptions} icon={<CheckCircle2 className="w-5 h-5" />} color="blue" />
                <MetricCard label="Live Markets" value={metrics.active_markets} icon={<BarChart3 className="w-5 h-5" />} color="amber" />
                <MetricCard label="Active Arbs" value={metrics.active_arbs} icon={<ShieldCheck className="w-5 h-5" />} color="indigo" />
                <MetricCard label="Affiliates" value={metrics.total_affiliates} icon={<Globe className="w-5 h-5" />} color="indigo" />
              </>
            ) : (
              <div className="col-span-4 text-center text-slate-500 py-20">Failed to load metrics</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center border", colorMap[color])}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-black text-white">{value.toLocaleString()}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{label}</p>
      </div>
    </div>
  );
}
