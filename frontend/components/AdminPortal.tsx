
import React, { useState, useEffect, useRef } from 'react';
import { User, ShieldCheck, Search, Download, Trash2, CheckCircle2, XCircle, Users, Globe, Lock, Unlock, Key, ShieldAlert, Terminal, Loader2, Mail, Phone as PhoneIcon, Upload, Database, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { User as UserType } from '../types.ts';

interface AdminPortalProps {
  onClose: () => void;
  currentUserEmail?: string;
}

// Master Security Config
const ADMIN_MASTER_KEY = 'axiom2025';
const AUTHORIZED_EMAILS = ['admin@oddsaxiom.com']; // Add your email here for auto-login
const STORAGE_KEY = 'oddsaxiom_users_v1';

type AdminTab = 'users' | 'security';

export const AdminPortal: React.FC<AdminPortalProps> = ({ onClose, currentUserEmail }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [securityKey, setSecurityKey] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-authorize if logged in with a master email
    if (currentUserEmail && AUTHORIZED_EMAILS.includes(currentUserEmail.toLowerCase())) {
      setIsAuthorized(true);
    }
  }, [currentUserEmail]);

  useEffect(() => {
    if (isAuthorized) {
      loadUserData();
    }
  }, [isAuthorized]);

  const loadUserData = () => {
    setLoading(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUsers(JSON.parse(saved));
      } catch (e) {
        console.error("Corrupt database found.");
      }
    }
    setTimeout(() => setLoading(false), 800);
  };

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityKey === ADMIN_MASTER_KEY) {
      setIsAuthorized(true);
      setError(null);
    } else {
      setError('Invalid Authentication Token');
      setSecurityKey('');
    }
  };

  const toggleSubscription = (id: string) => {
    const updated = users.map(u => u.id === id ? { ...u, isPaid: !u.isPaid } : u);
    setUsers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteUser = (id: string) => {
    if (confirm('Permanently purge this user record from the Axiom Database?')) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(users, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `oddsaxiom_db_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content);
        
        // Basic validation: Check if it's an array of objects with an email
        if (Array.isArray(importedData) && (importedData.length === 0 || importedData[0].email)) {
          if (confirm(`Detected ${importedData.length} records. This will replace your current local database. Proceed?`)) {
            setUsers(importedData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(importedData));
            alert("Database synchronized successfully.");
          }
        } else {
          alert("Invalid file format. Please use a genuine OddsAxiom export.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const filteredUsers = users.filter(u => 
    u.firstName.toLowerCase().includes(search.toLowerCase()) || 
    (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase())) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone && u.phone.includes(search)) ||
    (u.ipAddress && u.ipAddress.toLowerCase().includes(search.toLowerCase()))
  );

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
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Restricted Terminal</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  You are attempting to access the Master Axiom Database. Unauthorized access is monitored and logged.
                </p>
              </div>
           </div>

           <form onSubmit={handleAuthorize} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password"
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                    placeholder="Enter Master Security Key"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-red-500 transition-all outline-none text-sm font-mono tracking-[0.3em]"
                  />
                </div>
                {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}
              </div>
              
              <button 
                type="submit"
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-2"
              >
                Authenticate Session
              </button>
           </form>

           <button onClick={onClose} className="w-full text-slate-600 hover:text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-colors">
              Return to Public Dashboard
           </button>
        </div>
        <p className="mt-8 text-[10px] font-mono text-slate-800 uppercase tracking-widest">Axiom Guard v4.1.2 // Secure Node us-west1</p>
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
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Axiom Master Console</h1>
            <div className="flex items-center gap-3">
               <button onClick={() => setActiveTab('users')} className={clsx("text-[10px] font-bold uppercase tracking-widest transition-colors", activeTab === 'users' ? "text-emerald-400" : "text-slate-500 hover:text-slate-300")}>
                 User Database
               </button>
               <span className="text-slate-800 text-[10px]">|</span>
               <button onClick={() => setActiveTab('security')} className={clsx("text-[10px] font-bold uppercase tracking-widest transition-colors", activeTab === 'security' ? "text-indigo-400" : "text-slate-500 hover:text-slate-300")}>
                 Security Logs
               </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 mr-2">
             <Database className="w-3.5 h-3.5 text-emerald-500" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local Persist: ON</span>
           </div>
           <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all border border-slate-700">
             Lock Terminal
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
                    placeholder="Search master database..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                  />
               </div>
               <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json"
                    onChange={handleFileImport}
                  />
                  <button 
                    onClick={handleImportClick}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    title="Import Database"
                  >
                    <Upload className="w-4 h-4" />
                    Restore
                  </button>
                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    title="Export Database"
                  >
                    <Download className="w-4 h-4" />
                    Backup
                  </button>
                  <button onClick={loadUserData} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all">
                    <Terminal className="w-4 h-4" />
                  </button>
                  <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-white">{users.length} Records</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 border border-slate-800 rounded-2xl bg-slate-900/50 overflow-hidden flex flex-col shadow-2xl relative">
              {loading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
                   <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tier</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">IP Source</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Created</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="text-sm font-bold text-white whitespace-nowrap">{user.firstName} {user.lastName}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-slate-300 font-mono tracking-tight">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-slate-300 font-mono">{user.countryCode} {user.phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <button 
                            onClick={() => toggleSubscription(user.id)}
                            className={clsx(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-1.5",
                              user.isPaid 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-slate-800 text-slate-500 border border-slate-700"
                            )}
                          >
                            {user.isPaid ? 'Premium Quant' : 'Explorer'}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                             <Globe className="w-3 h-3 text-slate-600" />
                             <span className="text-xs font-mono text-emerald-500/80">{user.ipAddress}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs text-slate-500 font-mono">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-5 text-right">
                           <button onClick={() => deleteUser(user.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-20 text-center text-slate-500 italic text-sm">No synchronized user records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
               <AlertCircle className="w-4 h-4 text-indigo-400" />
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                 Axiom Master Tip: Use the <span className="text-indigo-400">Backup</span> tool regularly to ensure zero data loss during major platform migrations.
               </p>
            </div>
          </>
        ) : (
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center space-y-4">
             <ShieldAlert className="w-12 h-12 text-indigo-500 mb-2" />
             <h3 className="text-xl font-black text-white uppercase">Internal Node Security Logs</h3>
             <p className="text-slate-500 text-sm max-w-sm text-center font-bold uppercase tracking-widest leading-relaxed">System logs for authorized Axiom Admins are restricted to server-side exports in this version.</p>
          </div>
        )}
      </main>
    </div>
  );
};
