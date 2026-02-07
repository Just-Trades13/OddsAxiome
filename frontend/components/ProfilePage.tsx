
import React from 'react';
import { User, ShieldCheck, Mail, Phone, MapPin, Globe, CreditCard, Bell, Key, Zap, Clock, ChevronRight, AlertTriangle, Download, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { User as UserType } from '../types.ts';

interface ProfilePageProps {
  user: UserType;
  onUpgrade: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpgrade }) => {
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
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Phone</span>
                  </div>
                  <span className="text-sm font-bold text-white">{user.countryCode} {user.phone}</span>
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

              <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all">
                Edit Information
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
                    <div className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-emerald-500/50 transition-colors">
                            <Bell className="w-5 h-5 text-slate-500 group-hover:text-emerald-400" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white">Market Alerts</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Push & Email</p>
                         </div>
                      </div>
                      <div className="w-10 h-5 bg-emerald-500 rounded-full flex items-center px-1">
                        <div className="w-3.5 h-3.5 bg-white rounded-full ml-auto shadow-sm"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-emerald-500/50 transition-colors">
                            <Zap className="w-5 h-5 text-slate-500 group-hover:text-emerald-400" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white">Live Data Stream</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">HFT Updates</p>
                         </div>
                      </div>
                      <div className="w-10 h-5 bg-slate-800 rounded-full flex items-center px-1">
                        <div className="w-3.5 h-3.5 bg-slate-500 rounded-full shadow-sm"></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <button className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all group">
                       <div className="flex items-center gap-4">
                          <Key className="w-5 h-5 text-slate-500 group-hover:text-white" />
                          <span className="text-sm font-bold text-white">Security & 2FA</span>
                       </div>
                       <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>

                    <button className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all group">
                       <div className="flex items-center gap-4">
                          <CreditCard className="w-5 h-5 text-slate-500 group-hover:text-white" />
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
                  {[
                    { event: 'Login Successful', location: 'San Francisco, CA', ip: user.ipAddress, time: 'Current Session' },
                    { event: 'Subscription Renewed', location: 'Payment Portal', ip: 'Stripe Gateway', time: '2 days ago' },
                    { event: 'Account Verified', location: 'Email Activation', ip: user.ipAddress, time: 'Just now' }
                  ].map((log, i) => (
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
                     <button className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Start Export
                     </button>
                  </div>

                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex flex-col justify-between items-start gap-4">
                     <div>
                        <p className="text-sm font-bold text-white">Delete Account</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">Permanently remove your account and all associated data from OddsAxiom.</p>
                     </div>
                     <button className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Close Account
                     </button>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
