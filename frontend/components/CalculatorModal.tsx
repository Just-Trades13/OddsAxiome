
import React, { useState } from 'react';
import { MarketEvent } from '../types.ts';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface CalculatorModalProps {
  event: MarketEvent;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ event, onClose }) => {
  const [totalInvestment, setTotalInvestment] = useState<number>(1000);

  const priceYes = event.bestYes.price;
  const priceNo = event.bestNo.price;
  const sumPrices = priceYes + priceNo;
  
  // Proportional staking for equal payout across both outcomes
  const payout = totalInvestment / sumPrices;
  const investmentYes = payout * priceYes;
  const investmentNo = payout * priceNo;
  
  const netProfit = payout - totalInvestment;
  const profitPercentage = (netProfit / totalInvestment) * 100;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col h-auto max-h-[90vh] my-auto overflow-hidden text-slate-900">
        
        {/* Header - Fixed */}
        <div className="p-5 pb-3 flex justify-between items-center shrink-0 border-b border-slate-50">
          <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Arbitrage Calculator</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-5 pt-2 space-y-4">
          
          {/* Total Investment Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Total Investment ($)</label>
            <div className="relative">
              <input 
                type="number" 
                value={totalInvestment}
                onChange={(e) => setTotalInvestment(Number(e.target.value))}
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-4 py-2 text-xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col text-slate-400">
                <button onClick={() => setTotalInvestment(prev => prev + 10)} className="hover:text-slate-900 leading-none py-0.5">▲</button>
                <button onClick={() => setTotalInvestment(prev => Math.max(0, prev - 10))} className="hover:text-slate-900 leading-none py-0.5">▼</button>
              </div>
            </div>
          </div>

          {/* Market Context Area */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Market Focus</span>
            <h4 className="text-xs font-black text-slate-900 leading-tight">{event.title}</h4>
            <p className="text-[11px] font-bold text-slate-600">{event.outcome}</p>
          </div>

          {/* Breakdown Section */}
          <div className="space-y-2.5">
            
            {/* Bet 1: NO */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-3.5 h-3.5 bg-emerald-500 rounded flex items-center justify-center text-[7px] text-white font-bold">N</div>
                  <span className="text-xs font-black text-slate-900">{event.bestNo.platform} (No)</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold">Stake on No</p>
                <p className="text-[9px] text-slate-400">@{ (priceNo * 100).toFixed(1) }¢ | Payout: ${payout.toFixed(2)}</p>
              </div>
              <div className="text-xl font-black text-slate-900">${investmentNo.toFixed(2)}</div>
            </div>

            {/* Bet 2: YES */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-3.5 h-3.5 bg-blue-600 rounded flex items-center justify-center text-[7px] text-white font-bold">Y</div>
                  <span className="text-xs font-black text-slate-900">{event.bestYes.platform} (Yes)</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold">Stake on Yes</p>
                <p className="text-[9px] text-slate-400">@{ (priceYes * 100).toFixed(1) }¢ | Payout: ${payout.toFixed(2)}</p>
              </div>
              <div className="text-xl font-black text-slate-900">${investmentYes.toFixed(2)}</div>
            </div>

          </div>
        </div>

        {/* Footer Summary - Fixed */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 shrink-0">
          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Total In</span>
              <span className="text-xs font-black text-slate-900">${totalInvestment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Total Out (Min)</span>
              <span className="text-xs font-black text-slate-900">${payout.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Net Profit</span>
            <div className="flex flex-col items-end">
              <span className={clsx("text-xl font-black", netProfit > 0 ? "text-emerald-500" : "text-red-500")}>
                ${netProfit.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold text-emerald-600">ROI: {profitPercentage.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
