import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, TrendingUp, Clock, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { MarketEvent, UserTier } from '../types.ts';
import { getOddsHistory } from '../services/api.ts';

interface PriceHistoryModalProps {
  event: MarketEvent;
  onClose: () => void;
  userTier: UserTier;
  onUpgrade: () => void;
}

interface HistoryPoint {
  captured_at: string;
  price: number;
  implied_prob: number;
  platform_id: number;
  platform_slug?: string;
  outcome_name: string;
}

const SLUG_COLORS: Record<string, string> = {
  polymarket: '#10b981',
  kalshi: '#6366f1',
  predictit: '#f59e0b',
  draftkings: '#06b6d4',
  fanduel: '#3b82f6',
  betmgm: '#eab308',
  bovada: '#f43f5e',
  betrivers: '#8b5cf6',
};

const SLUG_NAMES: Record<string, string> = {
  polymarket: 'Polymarket', kalshi: 'Kalshi', predictit: 'PredictIt',
  draftkings: 'DraftKings', fanduel: 'FanDuel', betmgm: 'BetMGM',
  bovada: 'Bovada', betrivers: 'BetRivers',
};

// Fallback for older data that only has platform_id
const PLATFORM_COLORS: Record<number, string> = {
  1: '#10b981', 2: '#6366f1', 3: '#f59e0b',
  4: '#06b6d4', 5: '#3b82f6', 6: '#eab308',
  7: '#f43f5e', 8: '#8b5cf6',
};

const getPlatformColor = (p: HistoryPoint): string =>
  (p.platform_slug && SLUG_COLORS[p.platform_slug]) || PLATFORM_COLORS[p.platform_id] || '#94a3b8';

const getPlatformKey = (p: HistoryPoint): string =>
  p.platform_slug || String(p.platform_id);

const getPlatformName = (p: HistoryPoint): string =>
  (p.platform_slug && SLUG_NAMES[p.platform_slug]) || `Platform ${p.platform_id}`;

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({ event, onClose, userTier, onUpgrade }) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string>('Yes');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isPro = userTier === 'pro';

  useEffect(() => {
    if (!isPro) return;
    loadHistory();
  }, [event.id, selectedOutcome]);

  useEffect(() => {
    if (history.length > 0 && canvasRef.current) {
      drawChart();
    }
  }, [history]);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const data = await getOddsHistory(event.id, selectedOutcome, 500);
      setHistory(data);
      if (data.length === 0) {
        setError('No historical data available for this market yet.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load price history');
    } finally {
      setLoading(false);
    }
  }

  function drawChart() {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Group by platform (use slug if available, else platform_id)
    const byPlatform = new Map<string, HistoryPoint[]>();
    for (const p of history) {
      const key = getPlatformKey(p);
      const arr = byPlatform.get(key) || [];
      arr.push(p);
      byPlatform.set(key, arr);
    }

    // Time range
    const times = history.map(p => new Date(p.captured_at).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const timeRange = maxT - minT || 1;

    // Price range (0 to 1 for implied_prob)
    const minP = 0;
    const maxP = 1;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH * i / 4);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      // Y labels
      const prob = (1 - i / 4) * 100;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${prob.toFixed(0)}¢`, padding.left - 8, y + 4);
    }

    // Time labels
    const timeLabels = 5;
    ctx.textAlign = 'center';
    for (let i = 0; i <= timeLabels; i++) {
      const t = minT + (timeRange * i / timeLabels);
      const x = padding.left + (chartW * i / timeLabels);
      const date = new Date(t);
      const label = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(label, x, h - padding.bottom + 20);
    }

    // Draw lines per platform
    byPlatform.forEach((points, platformKey) => {
      const sorted = [...points].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
      if (sorted.length < 2) return;

      const color = getPlatformColor(sorted[0]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      sorted.forEach((p, i) => {
        const x = padding.left + ((new Date(p.captured_at).getTime() - minT) / timeRange) * chartW;
        const y = padding.top + (1 - p.implied_prob) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();

      // Draw last point dot
      const last = sorted[sorted.length - 1];
      const lx = padding.left + ((new Date(last.captured_at).getTime() - minT) / timeRange) * chartW;
      const ly = padding.top + (1 - last.implied_prob) * chartH;
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Price History</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 max-w-md truncate">{event.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {!isPro ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="p-5 bg-amber-500/10 rounded-3xl border border-amber-500/20">
                <Lock className="w-10 h-10 text-amber-400" />
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-xl font-black text-white">Pro Feature</h4>
                <p className="text-sm text-slate-400 max-w-sm">
                  Historical price charts are available on the Pro plan. Upgrade to track odds movements across all platforms.
                </p>
              </div>
              <button
                onClick={onUpgrade}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-sm font-black transition-all shadow-xl shadow-emerald-500/20"
              >
                Upgrade to Pro
              </button>
            </div>
          ) : (
            <>
              {/* Outcome Toggle */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Outcome:</span>
                {['Yes', 'No'].map((o) => (
                  <button
                    key={o}
                    onClick={() => setSelectedOutcome(o)}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                      selectedOutcome === o
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300"
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>

              {/* Chart */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Clock className="w-8 h-8 text-slate-600" />
                  <p className="text-sm text-slate-500 font-medium">{error}</p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                    <canvas
                      ref={canvasRef}
                      className="w-full"
                      style={{ height: '300px' }}
                    />
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    {Array.from(new Set(history.map(h => getPlatformKey(h)))).map((key) => {
                      const sample = history.find(h => getPlatformKey(h) === key)!;
                      return (
                        <div key={key} className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getPlatformColor(sample) }}
                          />
                          <span className="text-[10px] font-bold text-slate-400">
                            {getPlatformName(sample)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-600 font-medium mt-3 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {history.length} data points • Updated every 90 seconds
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
