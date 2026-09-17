import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Map, ShieldCheck, BrainCircuit, Scale, FileCheck2 } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const AboutUs: React.FC = () => {
  useDocumentTitle('About Us');
  return (
    <div className="py-12 px-6">
      <div className="max-w-4xl mx-auto relative">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-md-primary/10 blur-3xl -top-20 -left-20 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-md-secondary-container/50 blur-3xl bottom-0 right-0 pointer-events-none" />

        <div className="relative z-10 bg-md-surface-container rounded-3xl p-8 md:p-12 shadow-sm border border-white/40">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-4">About FCR-SCS</h1>
            <p className="text-md-on-surface-variant text-lg leading-relaxed">
              FCR-SCS (Fair Compensation Resettlement — Smart Contract System) is a public
              digital platform that supports fair, transparent, and accountable land
              acquisition and resettlement for communities affected by tourism
              infrastructure development in Malaysia. We replace paper-based workflows with
              verifiable digital records and a cryptographic audit trail anchored to the
              public Ethereum blockchain.
            </p>
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Who we are</h2>
            <p className="text-md-on-surface-variant leading-relaxed">
              FCR-SCS is a research and engineering effort under TARUMT&apos;s CD capstone
              programme. Our team brings together students and supervisors from software
              engineering, land administration, and public policy. We work alongside
              government administrators, registered valuers, licensed banks, and affected
              landowners to design a workflow that is auditable from end to end without
              adding friction to the people it serves.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">What we do</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Building2,
                  title: 'User & Dashboard',
                  body: 'Centralised workspace for administrators, government officers, valuers, banks, and community members to track claims and statistics.',
                },
                {
                  icon: Map,
                  title: 'Land Acquisition',
                  body: 'Digital assessment of physical assets, buildings, and crop values by field officers to ensure precise and reproducible valuation records.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Blockchain Ledger',
                  body: 'Immutable Ethereum-based fingerprints of finalized compensation agreements, protecting integrity without exposing personal data.',
                },
                {
                  icon: BrainCircuit,
                  title: 'AI Valuation',
                  body: 'Machine learning models to forecast fair economic values of trade assets and livelihood replacement costs, supporting human valuers.',
                },
                {
                  icon: Scale,
                  title: 'Statutory Compliance',
                  body: 'Workflow aligned with the Land Acquisition Act 1960, including Form G (Notice of Award), Form H (Statutory Award), and the 7-day acceptance grace period.',
                },
                {
                  icon: FileCheck2,
                  title: 'RENTAS Settlement',
                  body: 'Bank disbursement coordinated through the RENTAS (BNM/PayNet) real-time gross settlement system, with on-chain settlement fingerprints.',
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.title}
                    className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-md-outline/15 p-5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center mb-3">
                      <Icon size={22} />
                    </div>
                    <h3 className="text-lg font-bold mb-1">{m.title}</h3>
                    <p className="text-sm text-md-on-surface-variant leading-relaxed">{m.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Our mission</h2>
            <p className="text-md-on-surface-variant leading-relaxed">
              Land acquisition in tourism corridors is sensitive and time-critical. We aim
              to shorten the path between a registered case and a confirmed settlement by
              giving every party — government, bank, and beneficiary — the same source of
              truth. Every notarized milestone is publicly verifiable, every disbursement
              is end-to-end tracked, and every affected landowner can check the status of
              their case from any device.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Project principles</h2>
            <ul className="list-disc pl-6 space-y-2 text-md-on-surface-variant leading-relaxed">
              <li>
                <span className="font-semibold text-md-on-surface">Transparency by default.</span>{' '}
                Every action taken on a case is timestamped, attributable, and visible to
                the parties entitled to see it.
              </li>
              <li>
                <span className="font-semibold text-md-on-surface">Privacy by design.</span>{' '}
                Only cryptographic fingerprints are anchored on-chain. Personal data stays
                in role-bound, audited storage.
              </li>
              <li>
                <span className="font-semibold text-md-on-surface">Reversibility where lawful.</span>{' '}
                The system supports re-opening a payment cycle, replacing bank details, and
                re-publishing a superseded record — without rewriting history.
              </li>
              <li>
                <span className="font-semibold text-md-on-surface">Accessibility first.</span>{' '}
                Every portal is responsive from 360&nbsp;px upward, ships keyboard
                navigation, and respects reduced-motion preferences.
              </li>
            </ul>
          </section>

          <section className="border-t border-md-outline/15 pt-8">
            <h2 className="text-2xl font-bold mb-3">Contact</h2>
            <p className="text-md-on-surface-variant leading-relaxed">
              For media, partnership, or research enquiries, please visit our{' '}
              <Link to="/contact" className="text-md-primary hover:underline font-semibold">
                contact page
              </Link>
              . For privacy or data handling questions, see our{' '}
              <Link to="/privacy" className="text-md-primary hover:underline font-semibold">
                privacy policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
