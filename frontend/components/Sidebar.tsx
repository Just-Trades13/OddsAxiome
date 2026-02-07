import React from 'react';
import { MarketCategory } from '../types.ts';
import { Vote, TrendingUp, Coins, Microscope, Ghost, Trophy, ChevronRight, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  activeSport: MarketCategory;
  setActiveSport: (cat: MarketCategory) => void;
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeSport, setActiveSport, isExpanded, setIsExpanded }) => {
  const items = [
    { id: MarketCategory.POLITICS, label: 'Politics', icon: Vote },
    { id: MarketCategory.ECONOMICS, label: 'Economics', icon: TrendingUp },
    { id: MarketCategory.CRYPTO, label: 'Crypto', icon: Coins },
    { id: MarketCategory.SCIENCE, label: 'Science', icon: Microscope },
    { id: MarketCategory.CULTURE, label: 'Culture', icon: Ghost },
    { id: MarketCategory.SPORTS, label: 'Sports', icon: Trophy },
  ];

  return (
    <aside className={clsx(
      "fixed lg:static inset-y-0 left-0 z-[150] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none",
      isExpanded ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:translate-x-0 lg:w-64"
    )}>
      {/* Sidebar Header with Close Button for Mobile */}
      <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-900 lg:hidden">
        <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Navigation</span>
        <button 
          onClick={() => setIsExpanded(false)}
          className="w-10 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex flex-col h-full">
        <div className="w-full space-y-2 pt-4">
          <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest px-4 mb-4">
            Categories
          </h2>
          
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeSport === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSport(item.id)}
                className={clsx(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all relative group",
                  isActive 
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shadow-lg shadow-indigo-500/5" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                )}
              >
                <div className="shrink-0 flex items-center justify-center">
                  <Icon className={clsx("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive && "text-indigo-600 dark:text-indigo-500")} />
                </div>
                
                <span className="whitespace-nowrap flex-1 text-left">
                  {item.label}
                </span>

                {isActive && (
                  <div className="w-1 h-5 bg-indigo-500 rounded-full absolute right-0" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* System Info at Bottom */}
        <div className="mt-auto p-4 space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800/50">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Quant Stream Active</span>
             </div>
             <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-2/3"></div>
             </div>
          </div>
        </div>
      </div>
    </aside>
  );
};