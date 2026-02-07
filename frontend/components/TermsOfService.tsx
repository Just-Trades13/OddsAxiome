
import React from 'react';
import { ShieldCheck, Gavel, AlertCircle } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="bg-slate-900 w-full">
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-12 pb-32">
        <div className="space-y-4 text-center">
          <div className="inline-flex p-3 bg-indigo-500/10 rounded-2xl mb-4">
            <Gavel className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-black text-white">Terms of Service</h1>
          <p className="text-slate-400">Last Updated: January 2026</p>
        </div>

        <div className="space-y-10 text-slate-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using OddsAxiom ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. OddsAxiom provides a data aggregation and analysis tool for prediction markets and does not facilitate any form of gambling or financial transactions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              2. No Financial or Betting Advice
            </h2>
            <p>
              The content provided by OddsAxiom, including AI-driven analysis and arbitrage calculations, is for informational purposes only. We are not financial advisors, and the Service is not intended to provide professional advice. You should perform your own due diligence before engaging in any trading activity on third-party platforms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Users must be of legal age in their jurisdiction to use prediction markets.</li>
              <li>Users are responsible for ensuring their use of the Service complies with local laws.</li>
              <li>Users may not scrape, reverse-engineer, or attempt to disrupt the Service's infrastructure.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">4. Intellectual Property</h2>
            <p>
              The "OddsAxiom" name, logo, proprietary algorithms, and AI implementations are the exclusive property of OddsAxiom. You are granted a limited, non-exclusive license to use the interface for personal or professional market research.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">5. Limitation of Liability</h2>
            <p>
              OddsAxiom shall not be liable for any losses incurred resulting from data inaccuracies, platform downtime, or trading decisions made based on aggregated information. Data is provided "as is" and "as available."
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
