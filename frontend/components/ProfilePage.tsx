
import React, { useState } from 'react';
import { User, ShieldCheck, Mail, Phone, MapPin, Globe, CreditCard, Bell, Key, Zap, Clock, ChevronRight, AlertTriangle, Download, Trash2, Save, X, LoaderCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { User as UserType } from '../types.ts';
import { updateMe, getMe, openBillingPortal } from '../services/api.ts';

interface ProfilePageProps {
  user: UserType;
  onUpgrade: () => void;
  onUserUpdated?: () => Promise<void>;
  onLogout?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpgrade, onUserUpdated, onLogout }) => {
  const [editing, setEditing] = useState(false);
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [editZip, setEditZip] = useState(user.zip || '');
  const [editCountryCode, setEditCountryCode] = useState(user.countryCode || '+1');
  const [saving, setSaving] = useState(false);

  const [marketAlerts, setMarketAlerts] = useState(user.market_alerts ?? true);
  const [liveDataStream, setLiveDataStream] = useState(user.live_data_stream ?? false);
  const [togglingAlerts, setTogglingAlerts] = useState(false);
  const [togglingStream, setTogglingStream] = useState(false);

  const [billingLoading, setBillingLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateMe({ phone: editPhone, zip: editZip, country_code: editCountryCode });
      if (onUserUpdated) await onUserUpdated();
      setEditing(false);
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAlerts = async () => {
    setTogglingAlerts(true);
    const next = !marketAlerts;
    try {
      await updateMe({ market_alerts: next });
      setMarketAlerts(next);
    } catch { /* silent */ }
    setTogglingAlerts(false);
  };

  const handleToggleStream = async () => {
    setTogglingStream(true);
    const next = !liveDataStream;
    try {
      await updateMe({ live_data_stream: next });
      setLiveDataStream(next);
    } catch { /* silent */ }
    setTogglingStream(false);
  };

  const handleBillingHistory = async () => {
    setBillingLoading(true);
    try {
      const result = await openBillingPortal();
      if (result.portal_url) {
        window.location.href = result.portal_url;
      }
    } catch (err: any) {
      alert('Unable to open billing portal. Please ensure you have an active subscription.');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const data = await getMe();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oddsaxiom-account-${user.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (deleteInput !== 'DELETE') return;
    if (onLogout) {
      alert('Your account deletion request has been submitted. You will be signed out now. Contact support@oddsaxiom.com if you need further assistance.');
      onLogout();
    }
  };

  const securityHistory = [
    { event: 'Current Session', location: 'Active Now', ip: user.ipAddress || 'Unknown', time: 'Now' },
    { event: 'Account Created', location: 'Registration', ip: user.ipAddress || 'Unknown', time: new Date(user.createdAt).toLocaleDateString() },
    ...(user.isPaid ? [{ event: 'Subscription Active', location: 'Stripe', ip: 'Payment Gateway', time: 'Active' }] : []),
  ];

  return (
    <div className="bg-slate-900 w-full min-h-full">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8 pb-60">

        {/* Profile Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-950 p-8 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <User className="w-32 h-32" />
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-indigo-600 rounded-3xl p-1 shadow-2xl shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[1.4rem] flex items-center justify-center text-3xl font-black text-white">
                {user.firstName[0]}{user.lastName ? user.lastName[0] : ''}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-tight">{user.firstName} {user.lastName}</h1>
                {user.isPaid && (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> PRO QUANT
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" /> {user.email}
              </p>
              <div className="flex items-center gap-4 mt-2">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}
                 </div>
                 <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" /> Active Session
                 </div>
              </div>
            </div>
          </div>

          <button
            onClick={onUpgrade}
            className={clsx(
              "px-8 py-3 rounded-2xl font-black text-sm transition-all relative z-10",
              user.isPaid
                ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-default"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/20"
            )}
          >
            {user.isPaid ? 'Manage Subscription' : 'Upgrade to Pro'}
          </button>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Column 1: Identity & Contact */}
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-4">Personal Details</h3>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Country Code</label>
                    <input
                      type="text"
                      value={editCountryCode}
                      onChange={e => setEditCountryCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-emerald-500 outline-none"
                      placeholder="+1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-emerald-500 outline-none"
                      placeholder="555-123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Zip Code</label>
                    <input
                      type="text"
                      value={editZip}
                      onChange={e => setEditZip(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-emerald-500 outline-none"
                      placeholder="90210"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                    >
                      {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save</>}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setEditPhone(user.phone || ''); setEditZip(user.zip || ''); setEditCountryCode(user.countryCode || '+1'); }}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Phone</span>
                    </div>
                    <span className="text-sm font-bold text-white">{user.countryCode} {user.phone || 'Not Set'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Location</span>
                    </div>
                    <span className="text-sm font-bold text-white">{user.zip || 'Not Set'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Identity IP</span>
                    </div>
                    <span className="text-xs font-mono text-emerald-500/80">{user.ipAddress}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setEditing(!editing)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all"
              >
                {editing ? 'Cancel Edit' : 'Edit Information'}
              </button>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6 space-y-4">
               <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Pro Features</h3>
               </div>
               <p className="text-xs text-slate-500 leading-relaxed">
                 You are currently on the <span className="text-white font-bold">{user.isPaid ? 'Pro Quant' : 'Explorer'}</span> plan.
                 {user.isPaid ? ' You have full access to high-frequency AI scans.' : ' Upgrade to unlock real-time arbitrage alerts.'}
               </p>
            </div>
          </div>

          {/* Column 2: Account Settings & Prefs */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-xl">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8">Interface Preferences</h3>

               <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div
                      onClick={togglingAlerts ? undefined : handleToggleAlerts}
                      className="flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-emerald-500/50 transition-colors">
                            <Bell className="w-5 h-5 text-slate-500 group-hover:text-emerald-400" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white">Market Alerts</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Push & Email</p>
                         </div>
                      </div>
                      <div className={clsx("w-10 h-5 rounded-full flex items-center px-1 transition-colors", marketAlerts ? "bg-emerald-500" : "bg-slate-800")}>
                        <div className={clsx("w-3.5 h-3.5 rounded-full shadow-sm transition-all", marketAlerts ? "bg-white ml-auto" : "bg-slate-500")}></div>
                      </div>
                    </div>

                    <div
                      onClick={togglingStream ? undefined : handleToggleStream}
                      className="flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-emerald-500/50 transition-colors">
                            <Zap className="w-5 h-5 text-slate-500 group-hover:text-emerald-400" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white">Live Data Stream</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">HFT Updates</p>
                         </div>
                      </div>
                      <div className={clsx("w-10 h-5 rounded-full flex items-center px-1 transition-colors", liveDataStream ? "bg-emerald-500" : "bg-slate-800")}>
                        <div className={clsx("w-3.5 h-3.5 rounded-full shadow-sm transition-all", liveDataStream ? "bg-white ml-auto" : "bg-slate-500")}></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <button
                      onClick={() => alert('Two-factor authentication is coming soon. Stay tuned!')}
                      className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all group"
                    >
                       <div className="flex items-center gap-4">
                          <Key className="w-5 h-5 text-slate-500 group-hover:text-white" />
                          <span className="text-sm font-bold text-white">Security & 2FA</span>
                       </div>
                       <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>

                    <button
                      onClick={handleBillingHistory}
                      disabled={billingLoading}
                      className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all group"
                    >
                       <div className="flex items-center gap-4">
                          {billingLoading ? <LoaderCircle className="w-5 h-5 animate-spin text-slate-500" /> : <CreditCard className="w-5 h-5 text-slate-500 group-hover:text-white" />}
                          <span className="text-sm font-bold text-white">Billing History</span>
                       </div>
                       <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
               </div>
            </div>

            {/* Audit Log / History */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 overflow-hidden shadow-xl">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Security History</h3>
               <div className="space-y-4">
                  {securityHistory.map((log, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-slate-900 last:border-0">
                       <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          <div>
                             <p className="text-xs font-bold text-white">{log.event}</p>
                             <p className="text-[10px] text-slate-500 font-medium">{log.location} • {log.ip}</p>
                          </div>
                       </div>
                       <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{log.time}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 shadow-xl">
               <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="text-xs font-black text-red-500 uppercase tracking-widest">Danger Zone</h3>
               </div>

               <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex flex-col justify-between items-start gap-4">
                     <div>
                        <p className="text-sm font-bold text-white">Export Account Data</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">Download a full archive of your trade history and market analytics.</p>
                     </div>
                     <button
                       onClick={handleExport}
                       disabled={exportLoading}
                       className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors"
                     >
                        {exportLoading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} {exportLoading ? 'Exporting...' : 'Start Export'}
                     </button>
                  </div>

                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex flex-col justify-between items-start gap-4">
                     <div>
                        <p className="text-sm font-bold text-white">Delete Account</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">Permanently remove your account and all associated data from OddsAxiom.</p>
                     </div>
                     {showDeleteConfirm ? (
                       <div className="w-full space-y-2">
                         <p className="text-[10px] text-red-400 font-bold">Type DELETE to confirm:</p>
                         <input
                           type="text"
                           value={deleteInput}
                           onChange={e => setDeleteInput(e.target.value)}
                           className="w-full px-3 py-2 bg-slate-900 border border-red-500/30 rounded-lg text-sm text-white focus:border-red-500 outline-none"
                           placeholder="DELETE"
                         />
                         <div className="flex gap-2">
                           <button
                             onClick={handleDeleteAccount}
                             disabled={deleteInput !== 'DELETE'}
                             className={clsx("flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", deleteInput === 'DELETE' ? "bg-red-500 text-white hover:bg-red-400" : "bg-slate-800 text-slate-600 cursor-not-allowed")}
                           >
                             Confirm Delete
                           </button>
                           <button
                             onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                             className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                           >
                             Cancel
                           </button>
                         </div>
                       </div>
                     ) : (
                       <button
                         onClick={() => setShowDeleteConfirm(true)}
                         className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors"
                       >
                          <Trash2 className="w-3.5 h-3.5" /> Close Account
                       </button>
                     )}
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
