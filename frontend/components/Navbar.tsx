import React, { useState } from 'react';
import { Activity, Bell, BookOpen, CreditCard, LayoutDashboard, LogIn, ChevronDown, UserCircle, LogIn as LoginIcon, X, Zap, Sun, Moon, Share2 } from 'lucide-react';
import { clsx } from 'clsx';
import { User } from '../types.ts';
import { Theme } from '../App.tsx';

interface NavbarProps {
  currentNav: 'dashboard' | 'alpha' | 'how-it-works' | 'pricing' | 'profile';
  currentUser: User | null;
  theme: Theme;
  onNavChange: (nav: 'dashboard' | 'alpha' | 'how-it-works' | 'pricing' | 'profile') => void;
  onLoginClick: () => void;
  onLogout: () => void;
  onProfileClick: () => void;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentNav, currentUser, theme, onNavChange, onLoginClick, onLogout, onProfileClick, onToggleTheme }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const handleMobileNavClick = (nav: any) => {
    onNavChange(nav);
    setShowMobileNav(false);
  };

  return (
    <nav className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 shrink-0 z-[300] sticky top-0 transition-colors">
      <div className="flex items-center gap-2 md:gap-8">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onNavChange('dashboard')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-emerald-500 p-1.5 rounded-xl shadow-lg shadow-emerald-500/20 shrink-0">
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase flex items-center">
              ODDS<span className="text-emerald-500 dark:text-emerald-400">AXIOM</span>
            </span>
          </button>
          
          {/* Mobile Navigation Toggle */}
          <button 
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="md:hidden p-1 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronDown className={clsx("w-4 h-4 transition-transform", showMobileNav && "rotate-180")} />
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-white/5">
          <button 
            onClick={() => onNavChange('dashboard')}
            className={clsx(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
              currentNav === 'dashboard' ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Markets
          </button>
          <button 
            onClick={() => onNavChange('alpha')}
            className={clsx(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
              currentNav === 'alpha' ? "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 shadow-sm border border-fuchsia-500/20" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            Alpha
          </button>
          <button 
            onClick={() => onNavChange('how-it-works' as any)}
            className={clsx(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
              currentNav === 'how-it-works' as any ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Intelligence
          </button>
          <button 
            onClick={() => onNavChange('pricing')}
            className={clsx(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
              currentNav === 'pricing' ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Membership
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {showMobileNav && (
        <>
          <div className="md:hidden fixed inset-x-0 top-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shadow-2xl z-[290] animate-in slide-in-from-top-4 duration-300">
            <div className="p-4 space-y-2">
              <button 
                onClick={() => handleMobileNavClick('dashboard')}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest"
              >
                <LayoutDashboard className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> Markets
              </button>
              <button 
                onClick={() => handleMobileNavClick('alpha')}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-sm font-black text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-widest"
              >
                <Zap className="w-5 h-5" /> Alpha
              </button>
              <button 
                onClick={() => handleMobileNavClick('how-it-works')}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest"
              >
                <BookOpen className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> Intelligence
              </button>
              <button 
                onClick={() => handleMobileNavClick('pricing')}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest"
              >
                <CreditCard className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> Membership
              </button>
            </div>
          </div>
          <div className="md:hidden fixed inset-0 bg-black/40 z-[280]" onClick={() => setShowMobileNav(false)} />
        </>
      )}

      <div className="flex items-center gap-2 md:gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={onToggleTheme}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all relative group"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="hidden sm:block relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative group"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Notifications</h4>
              </div>
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No new notifications</p>
              </div>
            </div>
          )}
        </div>

        {currentUser ? (
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-2 py-1.5 md:px-3 md:py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
            >
              <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-950 text-xs font-black uppercase shrink-0">
                {currentUser.firstName[0]}
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white hidden sm:block truncate max-w-[80px]">{currentUser.firstName}</span>
              {currentUser.subscriptionStatus === 'trialing' && (
                <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded hidden sm:block">TRIAL</span>
              )}
              <ChevronDown className={clsx("w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform", showDropdown && "rotate-180")} />
            </button>

            {showDropdown && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                 <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account Type</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">{currentUser.isPaid ? 'Premium Quant' : 'Explorer (Free)'}</p>
                 </div>
                 <button
                  onClick={() => { onProfileClick(); setShowDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3"
                 >
                    <UserCircle className="w-4 h-4" /> My Profile
                 </button>
                 <button
                  onClick={() => { onNavChange('affiliate' as any); setShowDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3"
                 >
                    <Share2 className="w-4 h-4" /> Affiliate Program
                 </button>
                 <button
                  onClick={() => { onLogout(); setShowDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/5 dark:hover:bg-red-500/10 flex items-center gap-3"
                 >
                    <LoginIcon className="w-4 h-4 rotate-180" /> Sign Out
                 </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={onLoginClick}
            className="flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-xl shadow-emerald-500/20"
          >
            <LoginIcon className="w-4 h-4" />
            <span className="leading-none hidden sm:inline">Sign In</span>
            <span className="leading-none sm:hidden">Login</span>
          </button>
        )}
      </div>
    </nav>
  );
};