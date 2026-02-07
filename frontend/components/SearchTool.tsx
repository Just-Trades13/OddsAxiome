import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Globe, Laptop, Check, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

export type SearchMode = 'local' | 'global';

interface SearchToolProps {
  onSearch: (query: string, mode: SearchMode) => void;
  isSearching: boolean;
}

export const SearchTool: React.FC<SearchToolProps> = ({ onSearch, isSearching }) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('local');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExecuteSearch = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    // Logic: Global scan requires text, Local filter is fine with empty (resets results)
    if (query.trim().length === 0 && mode === 'global') return;
    onSearch(query, mode);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExecuteSearch();
    }
  };

  const selectMode = (newMode: SearchMode) => {
    setMode(newMode);
    setIsOpen(false);
    // If switching to local, immediately filter with current query
    if (newMode === 'local') {
      onSearch(query, 'local');
    }
  };

  // The icon that replaces the magnifying glass
  const ModeIcon = mode === 'local' ? Laptop : Globe;

  return (
    <div className="relative flex-1 max-w-xl group w-full" ref={dropdownRef}>
      <div className={clsx(
        "flex items-center bg-slate-950 border rounded-xl overflow-hidden transition-all duration-300 h-11 md:h-10",
        isSearching 
          ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.01]" 
          : mode === 'global'
            ? "border-indigo-500/40 focus-within:border-indigo-400 focus-within:bg-slate-900"
            : "border-slate-800 focus-within:border-emerald-500/50 focus-within:bg-slate-900"
      )}>
        {/* Mode Selector Dropdown Trigger */}
        <div className="flex h-full">
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={clsx(
              "pl-4 pr-2 hover:bg-slate-800 transition-all border-r border-slate-800 flex items-center gap-2",
              mode === 'global' ? "text-indigo-400" : "text-emerald-400"
            )}
            title={`Current: ${mode === 'local' ? 'Local Filter' : 'Global Scan'}. Click to switch.`}
          >
            <ModeIcon className={clsx("w-4 h-4", isSearching && "animate-pulse")} />
            <ChevronDown className="w-3 h-3 text-slate-600" />
          </button>
        </div>

        {/* Input */}
        <input 
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            // Local search filters as you type
            if (mode === 'local') onSearch(val, 'local');
          }}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'local' ? "Filter dashboard..." : "Scan all platforms for..."}
          className="w-full bg-transparent px-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none h-full"
        />

        {/* Action Button - ABSOLUTELY IDENTICAL VIBRANT GREEN 'GO' BUTTON */}
        <button 
          onClick={handleExecuteSearch}
          disabled={isSearching}
          className={clsx(
            "px-4 py-1 mr-1 rounded-lg transition-all shrink-0 h-8 flex items-center justify-center gap-2 font-bold uppercase tracking-tight",
            "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30", 
            "hover:bg-emerald-400 active:scale-95",
            isSearching && "opacity-80 cursor-wait"
          )}
        >
          {isSearching ? (
             <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span className="text-[11px]">Go</span>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-1">
            Search Mode
          </div>
          <button 
            type="button"
            onClick={() => selectMode('local')}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={clsx("p-1.5 rounded-lg", mode === 'local' ? "bg-emerald-500/20" : "bg-slate-800")}>
                <Laptop className={clsx("w-4 h-4", mode === 'local' ? "text-emerald-400" : "text-slate-400")} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Local Search</p>
                <p className="text-[10px] text-slate-500">Filter through loaded categories</p>
              </div>
            </div>
            {mode === 'local' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
          
          <button 
            type="button"
            onClick={() => selectMode('global')}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={clsx("p-1.5 rounded-lg", mode === 'global' ? "bg-indigo-500/20" : "bg-slate-800")}>
                <Globe className={clsx("w-4 h-4", mode === 'global' ? "text-indigo-400" : "text-slate-400")} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Global Scan</p>
                <p className="text-[10px] text-slate-500">Deep-search across all platforms</p>
              </div>
            </div>
            {mode === 'global' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      )}
    </div>
  );
};