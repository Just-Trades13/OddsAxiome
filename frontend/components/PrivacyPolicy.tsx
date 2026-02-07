
import React from 'react';
import { Eye, Lock, Globe, Database } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="bg-slate-900 w-full">
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-12 pb-32">
        <div className="space-y-4 text-center">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-black text-white">Privacy Policy</h1>
          <p className="text-slate-400">Our commitment to your data security.</p>
        </div>

        <div className="space-y-10 text-slate-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              1. Data Collection
            </h2>
            <p>
              OddsAxiom is designed with privacy in mind. We do not require users to create an account to view public market data. If you subscribe to a paid plan, we collect only the necessary billing information through our secure third-party processor. We do not store credit card numbers on our servers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              2. Technical Data
            </h2>
            <p>
              We collect anonymized technical data (IP address, browser type) to improve Service performance and prevent malicious scraping activity. This data is cleared every 30 days and is never sold to third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              3. Cookies
            </h2>
            <p>
              We use functional cookies to remember your dashboard settings, such as your preferred platform column order and theme settings. You can disable cookies in your browser settings, though some dashboard features may not persist.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">4. Third-Party Links</h2>
            <p>
              Our dashboard contains links to external prediction markets (e.g., Kalshi, Polymarket). When you click these links, you are leaving our Service and are subject to the privacy policies of those third-party sites.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">5. Security</h2>
            <p>
              All traffic between your browser and OddsAxiom is encrypted using industry-standard TLS. We regularly audit our infrastructure to ensure the highest level of security for our high-frequency data feeds.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
