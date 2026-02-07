
import React, { useState } from 'react';
import { X, MessageSquare, Zap, ExternalLink, ShieldCheck, ListChecks, ArrowRight, Settings, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { User, MarketCategory } from '../types.ts';

interface FeedbackDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  activeSport: MarketCategory;
}

export const FeedbackDrawer: React.FC<FeedbackDrawerProps> = ({ isOpen, onClose, currentUser, activeSport }) => {
  // Updated with the live Google Form ID
  const formId = "1FAIpQLSeVEU7rooeVfu2ftVuaTos0nKjsaWBUdrgL1Ul9FTqJri-ZLQ"; 
  
  const isPlaceholder = formId.includes("PLACEHOLDER");
  const [isLoading, setIsLoading] = useState(true);

  // Construct pre-fill parameters
  // Note: To use these, your Google Form needs fields with these 'entry' IDs
  // Usually entry.123456789=value. If you haven't mapped these yet, the form will just load normally.
  const prefillParams = currentUser 
    ? `&entry.email=${encodeURIComponent(currentUser.email)}&entry.category=${encodeURIComponent(activeSport)}`
    : `&entry.category=${encodeURIComponent(activeSport)}`;

  const formUrl = `https://docs.google.com/forms/d/e/${formId}/viewform?embedded=true${prefillParams}`;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={clsx(
          "fixed top-0 right-0 h-full w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 z-[210] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight uppercase">Your Feedback</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Help us build Axiom</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-4 bg-indigo-500/5 border-b border-indigo-500/10 flex items-start gap-3 shrink-0">
          <Zap className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-300">Contextual Intelligence</p>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              We've automatically detected your view: <span className="text-indigo-400 font-black uppercase">[{activeSport}]</span>. 
              {currentUser && <span> Linked to <span className="text-indigo-400 font-black uppercase">[{currentUser.firstName}]</span>.</span>}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-slate-950 flex flex-col overflow-y-auto">
          {isPlaceholder ? (
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                      <Settings className="w-4 h-4 text-amber-500" />
                   </div>
                   <h4 className="text-sm font-black text-white uppercase tracking-wider">Setup Instructions</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  To start receiving instant feedback in your Google Sheet, follow these 3 steps:
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-700 shrink-0">1</div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-200">Create a Google Form</p>
                    <p className="text-[10px] text-slate-500 leading-normal">Go to <a href="https://forms.google.com" target="_blank" className="text-indigo-400 underline">forms.google.com</a> and create a simple form with 3 fields: Email, Market Category, and Suggestion.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-700 shrink-0">2</div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-200">Copy the Form ID</p>
                    <p className="text-[10px] text-slate-500 leading-normal">Look at your browser's URL while editing. Copy the long string of letters between <code className="text-emerald-400">/d/</code> and <code className="text-emerald-400">/edit</code>.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-700 shrink-0">3</div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-200">Paste in Code</p>
                    <p className="text-[10px] text-slate-500 leading-normal">Replace <code className="text-emerald-400">PLACEHOLDER_ID</code> in <code className="text-indigo-400">FeedbackDrawer.tsx</code> with your ID.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-indigo-300 leading-relaxed font-bold">
                  PRO TIP: Use "Get pre-filled link" in Google Forms to find the entry IDs if you want to automatically capture the user's email and current category!
                </p>
              </div>

              <a 
                href="https://forms.google.com" 
                target="_blank" 
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-center text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/20"
              >
                Create My Form <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="flex-1 relative bg-white h-full">
              {isLoading && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4 z-50">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Establishing Secure Uplink...</p>
                </div>
              )}
              <iframe 
                src={formUrl}
                className="w-full h-full border-0"
                title="Axiom Feedback Form"
                onLoad={() => setIsLoading(false)}
              >
                Loading feedback portal...
              </iframe>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          {!isPlaceholder && (
            <a 
              href={`https://docs.google.com/forms/d/e/${formId}/viewform`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Full Portal
            </a>
          )}
          <div className="mt-4 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3 h-3 text-slate-700" />
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Encrypted Data Stream</span>
          </div>
        </div>
      </div>
    </>
  );
};
