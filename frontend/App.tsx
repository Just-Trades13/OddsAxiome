import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { AlphaDashboard } from './components/AlphaDashboard.tsx';
import { HowItWorks } from './components/HowItWorks.tsx';
import { Pricing } from './components/Pricing.tsx';
import { TermsOfService } from './components/TermsOfService.tsx';
import { PrivacyPolicy } from './components/PrivacyPolicy.tsx';
import { ApiDocs } from './components/ApiDocs.tsx';
import { ProfilePage } from './components/ProfilePage.tsx';
import { AnalyzeModal } from './components/AnalyzeModal.tsx';
import { CalculatorModal } from './components/CalculatorModal.tsx';
import { SearchTool, SearchMode } from './components/SearchTool.tsx';
import { Footer } from './components/Footer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { AffiliateDashboard } from './components/AffiliateDashboard.tsx';
import { FeedbackDrawer } from './components/FeedbackDrawer.tsx';
import { MarketCategory, MarketEvent, Platform, User } from './types.ts';
import { fetchRealTimeMarkets, searchMarketsByQuery, refreshSingleMarket } from './services/marketDataService.ts';
import { PLATFORMS as INITIAL_PLATFORMS } from './constants.ts';
import { LoaderCircle, RefreshCw, Database, History, Globe, Search, AlertCircle, WifiOff, Terminal, Sparkles, MousePointer2, Menu, Check, ArrowDown, ArrowUp, ArrowUpDown, MessageSquare, Zap } from 'lucide-react';
import { clsx } from 'clsx';

// Firebase Imports
import { auth } from './services/firebase.ts';
import { onAuthStateChanged, signOut, reload } from 'firebase/auth';
import { syncUser, getMe, updateMe } from './services/api.ts';

type MarketDataState = Record<MarketCategory, {
  events: MarketEvent[];
  source: 'live' | 'cache' | 'fallback';
  loading: boolean;
  lastUpdated?: number;
  errorReason?: 'QUOTA_EXHAUSTED' | 'NETWORK_ERROR' | 'TIMEOUT' | null;
}>;

export type ArbSortOrder = 'asc' | 'desc' | null;
export type NavView = 'dashboard' | 'alpha' | 'how-it-works' | 'pricing' | 'terms' | 'privacy' | 'api-docs' | 'admin' | 'profile' | 'affiliate';
export type Theme = 'dark' | 'light';

const STORAGE_KEY_ORDER = 'oddsaxiom_v1_stable_order';
const STORAGE_KEY_HIDE_TOOLTIP = 'oddsaxiom_hide_onboarding_tip';
const STORAGE_KEY_THEME = 'oddsaxiom_theme_pref';
const STORAGE_KEY_REF = 'oddsaxiom_ref_code';

/** Capture affiliate ref code from URL on first load, persist in sessionStorage */
function captureRefCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    sessionStorage.setItem(STORAGE_KEY_REF, ref);
    // Clean the URL without reloading
    params.delete('ref');
    const clean = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (clean ? '?' + clean : ''));
  }
  return ref || sessionStorage.getItem(STORAGE_KEY_REF) || null;
}

const capturedRefCode = captureRefCode();

const initialMarketState: MarketDataState = Object.values(MarketCategory).reduce((acc, cat) => ({
  ...acc,
  [cat]: { events: [], source: 'live', loading: false, errorReason: null }
}), {} as MarketDataState);

export default function App() {
  const [navView, setNavView] = useState<NavView>('dashboard');
  const [activeSport, setActiveSport] = useState<MarketCategory>(MarketCategory.POLITICS);
  const [marketData, setMarketData] = useState<MarketDataState>(initialMarketState);
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);
  
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY_THEME) as Theme) || 'dark';
  });

  const [showAutoTooltip, setShowAutoTooltip] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_HIDE_TOOLTIP) !== 'true';
  });
  
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialStep, setAuthInitialStep] = useState<'lead' | 'verifying' | 'complete'>('lead');
  
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [arbSortOrder, setArbSortOrder] = useState<ArbSortOrder>(null);
  
  const [orderedPlatforms, setOrderedPlatforms] = useState<Platform[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ORDER);
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved) as Platform[];
        const filteredSaved = savedOrder.filter(p => INITIAL_PLATFORMS.includes(p));
        const missingPlatforms = INITIAL_PLATFORMS.filter(p => !filteredSaved.includes(p));
        return [...filteredSaved, ...missingPlatforms];
      } catch (e) { console.error("Order recovery failed", e); }
    }
    return INITIAL_PLATFORMS;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // Firebase Auth Listener — syncs with backend API
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await reload(firebaseUser);
        } catch (e) {
          console.debug("User session refresh failed or user logged out");
        }

        try {
          // Sync user to backend (creates if not exists)
          await syncUser({
            first_name: firebaseUser.displayName?.split(' ')[0] || 'User',
            ref_code: capturedRefCode || undefined,
          });

          // Fetch full user profile from backend
          const userData = await getMe() as any;
          const user: User = {
            id: userData.id || firebaseUser.uid,
            firstName: userData.first_name || firebaseUser.displayName || 'User',
            lastName: userData.last_name,
            email: userData.email || firebaseUser.email || '',
            isPaid: userData.tier !== 'free',
            registrationStep: userData.registration_step || 'complete',
            createdAt: userData.created_at ? new Date(userData.created_at).getTime() : Date.now(),
            hideOnboardingTip: userData.hide_onboarding_tip,
          };
          setCurrentUser(user);

          if (user.hideOnboardingTip) {
            setShowAutoTooltip(false);
            localStorage.setItem(STORAGE_KEY_HIDE_TOOLTIP, 'true');
          }

          if (user.registrationStep !== 'complete') {
            setAuthInitialStep(firebaseUser.emailVerified ? 'complete' : 'verifying');
            setIsAuthModalOpen(true);
          } else if (!firebaseUser.emailVerified) {
            setAuthInitialStep('verifying');
            setIsAuthModalOpen(true);
          }
        } catch (apiErr) {
          console.debug("Backend API unavailable, opening auth modal:", apiErr);
          if (!isAuthModalOpen) {
            setAuthInitialStep('lead');
            setIsAuthModalOpen(true);
          }
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(orderedPlatforms));
  }, [orderedPlatforms]);

  useEffect(() => {
    if (showAutoTooltip) {
      const timer = setTimeout(() => {
        setShowAutoTooltip(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showAutoTooltip]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('local');
  const [globalSearchResults, setGlobalSearchResults] = useState<MarketEvent[]>([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [activeGlobalQuery, setActiveGlobalQuery] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  const loadCategory = useCallback(async (category: MarketCategory, force = false) => {
    setMarketData(prev => ({
      ...prev,
      [category]: { ...prev[category], loading: true, errorReason: null }
    }));

    try {
      const { data, source, errorReason } = await fetchRealTimeMarkets(category, force);
      setMarketData(prev => ({
        ...prev,
        [category]: { 
          events: data, 
          source, 
          loading: false, 
          lastUpdated: Date.now(),
          errorReason: errorReason || null
        }
      }));
    } catch (error) {
      setMarketData(prev => ({
        ...prev,
        [category]: { ...prev[category], loading: false, errorReason: 'NETWORK_ERROR' }
      }));
    }
  }, []);

  const handleRefreshSingleEvent = useCallback(async (event: MarketEvent) => {
    const updated = await refreshSingleMarket(event);
    if (updated) {
      setMarketData(prev => {
        const cat = updated.category;
        const newEvents = prev[cat].events.map(e => e.id === updated.id ? updated : e);
        return {
          ...prev,
          [cat]: { ...prev[cat], events: newEvents }
        };
      });
      if (searchMode === 'global') {
        setGlobalSearchResults(prev => prev.map(e => e.id === updated.id ? updated : e));
      }
    }
  }, [searchMode]);

  useEffect(() => {
    if (marketData[activeSport].events.length === 0) {
      loadCategory(activeSport, false);
    }
  }, [activeSport, loadCategory]);

  const handleSearch = async (query: string, mode: SearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setGlobalError(null);

    if (mode === 'global' && query.trim().length > 0) {
      setIsGlobalLoading(true);
      setActiveGlobalQuery(query);
      try {
        const results = await searchMarketsByQuery(query);
        setGlobalSearchResults(results);
        if (results.length === 0) setGlobalError("No matching global markets found.");
      } catch (error) {
        setGlobalError("AI Sync failed. Please retry your scan.");
      } finally {
        setIsGlobalLoading(false);
      }
    } else if (mode === 'local') {
      setGlobalSearchResults([]);
      setActiveGlobalQuery('');
    }
  };

  const handleManualRefresh = () => {
    setShowAutoTooltip(false);
    if (activeGlobalQuery) {
      handleSearch(activeGlobalQuery, 'global');
    } else {
      loadCategory(activeSport, true);
    }
  };

  const handleReorderPlatforms = (newOrder: Platform[]) => {
    setOrderedPlatforms(newOrder);
  };

  const toggleArbSort = () => {
    setArbSortOrder(prev => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  };

  const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const currentCategoryData = marketData[activeSport] as MarketDataState[MarketCategory];
  
  const displayedEvents = useMemo(() => {
    let result: MarketEvent[] = [];
    if (searchMode === 'global' && activeGlobalQuery) {
      result = [...globalSearchResults];
    } else if (searchMode === 'local' && searchQuery.trim().length > 0) {
      const qNorm = normalize(searchQuery);
      const allMatches: MarketEvent[] = [];
      Object.entries(marketData).forEach(([_, state]) => {
        const categoryState = state as MarketDataState[MarketCategory];
        categoryState.events.forEach(event => {
          if (normalize(event.title).includes(qNorm) || normalize(event.outcome).includes(qNorm)) {
            allMatches.push(event);
          }
        });
      });
      result = allMatches;
    } else {
      result = [...currentCategoryData.events];
    }

    if (arbSortOrder) {
      result.sort((a, b) => {
        const arbA = a.arbPercent || 0;
        const arbB = b.arbPercent || 0;
        return arbSortOrder === 'desc' ? arbB - arbA : arbA - arbB;
      });
    }
    return result;
  }, [searchMode, searchQuery, activeGlobalQuery, globalSearchResults, currentCategoryData.events, marketData, arbSortOrder]);

  const isCurrentlyEmpty = (searchMode === 'global' ? isGlobalLoading : (currentCategoryData.events.length === 0 && currentCategoryData.loading));

  const handleNavChange = (nav: NavView) => {
    setNavView(nav);
    window.scrollTo(0, 0);
    setIsSidebarExpanded(false);
  };

  const handleAuthComplete = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    setAuthInitialStep('lead');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setNavView('dashboard');
  };

  const handleDontShowAgain = async (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(STORAGE_KEY_HIDE_TOOLTIP, 'true');
    setShowAutoTooltip(false);
    if (currentUser) {
      try {
        await updateMe({ hide_onboarding_tip: true });
        setCurrentUser({ ...currentUser, hideOnboardingTip: true });
      } catch (err) {
        console.error("Failed to persist tooltip preference", err);
      }
    }
  };

  return (
    <div className={clsx("flex h-full flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300", theme)}>
      <Navbar 
        currentNav={navView as any} currentUser={currentUser} theme={theme}
        onNavChange={handleNavChange as any} onLoginClick={() => { setAuthInitialStep('lead'); setIsAuthModalOpen(true); }}
        onLogout={handleLogout} onProfileClick={() => setNavView('profile')}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      />
      
      {(navView === 'dashboard' || navView === 'alpha') ? (
        <div className="flex flex-1 overflow-hidden relative">
          
          <Sidebar 
            activeSport={activeSport} 
            setActiveSport={(cat) => {
              setActiveSport(cat);
              setSearchQuery('');
              setActiveGlobalQuery('');
              setSearchMode('local');
              setArbSortOrder(null);
              setIsSidebarExpanded(false);
            }} 
            isExpanded={isSidebarExpanded}
            setIsExpanded={setIsSidebarExpanded}
          />
          
          {isSidebarExpanded && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-[140] animate-in fade-in duration-300"
              onClick={() => setIsSidebarExpanded(false)}
            />
          )}

          <main className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 relative">
            <button 
              onClick={() => setIsFeedbackOpen(true)}
              className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] uppercase tracking-[0.25em] py-3 w-[22px] rounded-l-md shadow-2xl transition-all duration-300 hover:-translate-x-1 border-y border-l border-emerald-400/50 flex items-center justify-center overflow-hidden"
              style={{ writingMode: 'vertical-rl' }}
            >
              FEEDBACK
            </button>

            <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
              <div className="p-4 md:p-6 lg:p-6 shrink-0 pt-6">
                <div className="max-w-7xl mx-auto space-y-4">
                  <header className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setIsSidebarExpanded(true)}
                          className="lg:hidden w-11 h-11 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-500 transition-all shadow-xl"
                        >
                          <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight capitalize leading-none flex items-center gap-3">
                          {navView === 'alpha' && <Zap className="w-6 h-6 text-fuchsia-400" />}
                          {searchQuery && searchMode === 'local' ? `Filter: "${searchQuery}"` : activeGlobalQuery ? "Global Scan" : activeSport}
                        </h1>
                      </div>

                      <div className="flex items-center gap-2">
                        {navView === 'dashboard' && (
                          <button 
                            onClick={toggleArbSort}
                            className={clsx(
                              "lg:hidden flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border h-11 shadow-lg",
                              arbSortOrder ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40" : "bg-white dark:bg-slate-800/40 text-slate-500 border-slate-200 dark:border-white/5"
                            )}
                          >
                            {arbSortOrder === 'desc' && <ArrowDown className="w-4 h-4" />}
                            {arbSortOrder === 'asc' && <ArrowUp className="w-4 h-4" />}
                            {!arbSortOrder && <ArrowUpDown className="w-4 h-4" />}
                            <span className="sr-only">Sort</span>
                          </button>
                        )}

                        <div className="relative group/refresh-tip z-[60]">
                          <button 
                            onClick={handleManualRefresh}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-white/5 h-11 md:h-11 shadow-lg"
                          >
                            <RefreshCw className={clsx("w-4 h-4", (currentCategoryData.loading || isGlobalLoading) && "animate-spin")} />
                            <span className="hidden sm:inline">Refresh</span>
                            <span className="sm:hidden">Sync</span>
                          </button>

                          <div className={clsx(
                            "absolute top-full right-0 mt-4 w-[calc(100vw-48px)] sm:w-72 bg-purple-900 dark:bg-purple-900/95 border-2 border-fuchsia-500 p-5 rounded-3xl shadow-[0_20px_50px_rgba(139,92,246,0.3)] z-[250] transition-all duration-500 pointer-events-auto transform origin-top-right",
                            showAutoTooltip 
                              ? "opacity-100 translate-y-0 scale-100 visible" 
                              : "opacity-0 -translate-y-4 scale-95 invisible group-hover/refresh-tip:opacity-100 group-hover/refresh-tip:translate-y-0 group-hover/refresh-tip:scale-100 group-hover/refresh-tip:visible"
                          )}>
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="w-4 h-4 text-fuchsia-400" />
                              <span className="text-[11px] font-black text-white uppercase tracking-widest">Live Data Syncing</span>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-slate-950 border border-fuchsia-500/50 flex items-center justify-center text-[10px] font-black text-fuchsia-400 shrink-0 mt-0.5">1</div>
                                <p className="text-[11px] text-slate-200 leading-relaxed font-medium">Choose category via menu.</p>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-slate-950 border border-fuchsia-500/50 flex items-center justify-center text-[10px] font-black text-fuchsia-400 shrink-0 mt-0.5">2</div>
                                <p className="text-[11px] text-slate-200 leading-relaxed font-medium">Click sync for latest odds.</p>
                              </div>
                              <div className="pt-2 border-t border-fuchsia-500/30 mt-2">
                                <div className="flex items-center gap-2 text-[9px] font-bold text-fuchsia-200 uppercase tracking-tight italic leading-snug">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    Verify predictions across platforms.
                                </div>
                              </div>
                              <div className="pt-3 border-t border-fuchsia-500/10">
                                <button 
                                  onClick={handleDontShowAgain}
                                  className="flex items-center gap-2 group/check hover:text-white transition-colors text-[10px] font-bold text-fuchsia-300 uppercase tracking-widest py-1"
                                >
                                    <div className="w-4 h-4 rounded-md border-2 border-fuchsia-500/50 flex items-center justify-center group-hover/check:border-fuchsia-400 transition-colors">
                                      <Check className="w-2.5 h-2.5 opacity-0 group-hover/check:opacity-100 transition-opacity" />
                                    </div>
                                    Don't show again
                                </button>
                              </div>
                            </div>
                            <div className="absolute -top-2 right-12 w-4 h-4 bg-purple-900 border-t-2 border-l-2 border-fuchsia-500 rotate-45"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center">
                      <SearchTool onSearch={handleSearch} isSearching={isGlobalLoading} />
                    </div>
                  </header>
                </div>
              </div>

              <div className="p-4 md:p-6 pt-0">
                <div className="max-w-7xl mx-auto h-full">
                  {currentCategoryData.errorReason ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-white dark:bg-slate-950/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in duration-500">
                       <div className="p-5 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                          <Terminal className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
                       </div>
                       <div className="space-y-2">
                         <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sync Interruption Detected</h3>
                         <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm leading-relaxed">The AI was unable to complete the live scan.</p>
                       </div>
                       <button 
                         onClick={handleManualRefresh} 
                         className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
                       >
                          <RefreshCw className="w-4 h-4" />
                          Restart Scan
                       </button>
                    </div>
                  ) : isCurrentlyEmpty ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                      <LoaderCircle className="w-12 h-12 text-emerald-500 animate-spin" />
                      <p className="text-slate-900 dark:text-white font-bold text-lg">Connecting to Quant Nodes...</p>
                    </div>
                  ) : navView === 'alpha' ? (
                    <AlphaDashboard 
                      events={displayedEvents} 
                      orderedPlatforms={orderedPlatforms}
                      onRefreshSingleEvent={handleRefreshSingleEvent}
                      onAnalyze={(e) => { setSelectedEvent(e); setIsAnalyzeOpen(true); }} 
                    />
                  ) : (
                    <Dashboard 
                      events={displayedEvents} orderedPlatforms={orderedPlatforms}
                      arbSortOrder={arbSortOrder} onToggleArbSort={toggleArbSort}
                      onReorderPlatforms={handleReorderPlatforms} onRefreshSingleEvent={handleRefreshSingleEvent}
                      onAnalyze={(e) => { setSelectedEvent(e); setIsAnalyzeOpen(true); }} 
                      onOpenCalculator={(e) => { setSelectedEvent(e); setIsCalculatorOpen(true); }}
                    />
                  )}
                </div>
              </div>
              <Footer onNavChange={handleNavChange} />
            </div>
          </main>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {navView === 'how-it-works' && <HowItWorks />}
          {navView === 'pricing' && <Pricing />}
          {navView === 'terms' && <TermsOfService />}
          {navView === 'privacy' && <PrivacyPolicy />}
          {navView === 'api-docs' && <ApiDocs />}
          {navView === 'profile' && currentUser && <ProfilePage user={currentUser} onUpgrade={() => setNavView('pricing')} />}
          {navView === 'affiliate' && <AffiliateDashboard onBack={() => setNavView('profile')} />}
          {navView === 'admin' && <AdminPortal onClose={() => setNavView('dashboard')} currentUserEmail={currentUser?.email} />}
          <Footer onNavChange={handleNavChange} />
        </div>
      )}

      {isAuthModalOpen && (
        <AuthModal 
          onClose={() => setIsAuthModalOpen(false)} 
          onComplete={handleAuthComplete} 
          initialStep={authInitialStep}
        />
      )}
      {isAnalyzeOpen && selectedEvent && <AnalyzeModal event={selectedEvent} onClose={() => setIsAnalyzeOpen(false)} />}
      {isCalculatorOpen && selectedEvent && <CalculatorModal event={selectedEvent} onClose={() => setIsCalculatorOpen(false)} />}
      
      <FeedbackDrawer 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
        currentUser={currentUser}
        activeSport={activeSport}
      />
    </div>
  );
}