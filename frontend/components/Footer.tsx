
import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface FooterProps {
  onNavChange: (nav: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavChange }) => {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-900 py-10 px-6 shrink-0">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => onNavChange('dashboard')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-sm font-bold tracking-tight text-white">Odds<span className="text-emerald-400">Axiom</span></span>
              <span className="text-slate-600 text-[10px] font-medium">© 2025. All rights reserved.</span>
            </button>
            <button 
              onClick={() => onNavChange('admin')}
              className="flex items-center gap-1.5 text-[9px] font-black text-slate-800 uppercase tracking-widest hover:text-emerald-500/50 transition-colors"
            >
              <ShieldAlert className="w-2.5 h-2.5" /> Admin Terminal
            </button>
          </div>
          
          <div className="flex gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <button 
              onClick={() => onNavChange('terms')}
              className="hover:text-emerald-400 transition-colors"
            >
              Terms of Service
            </button>
            <button 
              onClick={() => onNavChange('privacy')}
              className="hover:text-emerald-400 transition-colors"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => onNavChange('api-docs')}
              className="hover:text-emerald-400 transition-colors"
            >
              API Docs
            </button>
          </div>
        </div>
        
        <div className="pt-6 border-t border-slate-900">
          <p className="text-[10px] text-slate-600 leading-relaxed max-w-4xl italic">
            Disclaimer: OddsAxiom.com is a data aggregation platform. The information provided is for informational and educational purposes only. OddsAxiom is not a gambling operator and does not provide gambling advice or betting services. We aggregate data from third-party prediction markets for analysis. Trading on prediction markets involves significant financial risk. Users are responsible for ensuring compliance with all local laws and regulations regarding the use of prediction platforms in their jurisdiction.
          </p>
        </div>
      </div>
    </footer>
  );
};
