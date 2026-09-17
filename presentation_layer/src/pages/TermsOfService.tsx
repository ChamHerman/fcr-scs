import React from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SECTIONS: Array<{ heading: string; body: React.ReactNode }> = [
  {
    heading: '1. Acceptance of terms',
    body: (
      <>
        <p>
          By accessing or using the FCR-SCS platform, you agree to be bound by these
          Terms of Service and all applicable laws and regulations of Malaysia. If you
          do not agree with any of these terms, you are prohibited from using or
          accessing the Services.
        </p>
        <p>
          These terms apply to all visitors, registered users, and authorised personnel,
          including affected landowners, government officers, valuers, bank operators,
          and system administrators.
        </p>
      </>
    ),
  },
  {
    heading: '2. Eligibility',
    body: (
      <ul className="list-disc pl-6 space-y-2">
        <li>
          The <span className="font-semibold">Member Portal</span> is intended for
          affected landowners, statutory beneficiaries, and their duly authorised
          representatives. You must be at least eighteen (18) years of age to create an
          account.
        </li>
        <li>
          The <span className="font-semibold">Government Administrator</span> and{' '}
          <span className="font-semibold">Bank Portal</span> workspaces are restricted
          to personnel appointed by their respective agencies and bound by additional
          internal usage policies.
        </li>
        <li>
          Accounts created without proper authority will be suspended upon discovery.
        </li>
      </ul>
    ),
  },
  {
    heading: '3. Account responsibilities',
    body: (
      <>
        <p>
          You are responsible for safeguarding your account credentials and for all
          activity carried out under your account. Notify us immediately of any
          unauthorised use. FCR-SCS will not be liable for losses resulting from failure
          to keep your credentials secure.
        </p>
        <p>
          You agree to provide accurate, current, and complete information during
          registration and to update such information to keep it accurate, current, and
          complete. Falsifying identification documents is a criminal offence under
          Malaysian law and may be reported to the relevant authorities.
        </p>
      </>
    ),
  },
  {
    heading: '4. Permitted use',
    body: (
      <ul className="list-disc pl-6 space-y-2">
        <li>
          Track the status of your own land acquisition case through the Member Portal;
        </li>
        <li>Submit supporting documents related to your case;</li>
        <li>Review your notice of award and other statutory documents;</li>
        <li>
          Verify the integrity of records published on the blockchain through the public
          verification page;
        </li>
        <li>
          Communicate with the operating agency through the channels provided.
        </li>
      </ul>
    ),
  },
  {
    heading: '5. Prohibited use',
    body: (
      <ul className="list-disc pl-6 space-y-2">
        <li>Attempting to access another user&apos;s data or workspace;</li>
        <li>Interfering with or disrupting the integrity or performance of the platform;</li>
        <li>
          Introducing viruses, worms, or other malicious code, or attempting to gain
          unauthorised access to any portion of the Services;
        </li>
        <li>Using the platform for any unlawful purpose or in violation of any regulations;</li>
        <li>
          Impersonating any person or entity or falsely stating or otherwise
          misrepresenting your affiliation with a person or entity.
        </li>
      </ul>
    ),
  },
  {
    heading: '6. Service availability',
    body: (
      <p>
        We aim to keep the platform available around the clock, but scheduled
        maintenance, blockchain network conditions, and third-party outages may cause
        intermittent disruption. Critical statutory actions (such as on-chain
        notarization of milestone records) include recovery safeguards anchored on the
        blockchain. FCR-SCS does not guarantee that the Services will be uninterrupted,
        timely, secure, or error-free.
      </p>
    ),
  },
  {
    heading: '7. Blockchain and notarization',
    body: (
      <p>
        Selected milestone records (such as the Statutory Award and Disbursement
        Settlement fingerprints) are anchored to the public Ethereum blockchain. The
        blockchain serves as a tamper-evident timestamp, not as a substitute for the
        underlying statutory record. Personal data is never published on-chain. The
        operating agency does not control the Ethereum network and is not liable for
        chain re-organisations, validator behaviour, or related technical events.
      </p>
    ),
  },
  {
    heading: '8. Intellectual property',
    body: (
      <p>
        The FCR-SCS platform, including its source code, design system, documentation,
        and brand identity, is the property of the operating agency or its licensors
        and is protected by applicable intellectual property laws. You may not copy,
        modify, distribute, or reverse-engineer any portion of the Services without
        prior written authorisation.
      </p>
    ),
  },
  {
    heading: '9. Limitation of liability',
    body: (
      <p>
        To the maximum extent permitted by Malaysian law, FCR-SCS, its operating agency,
        and its suppliers shall not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or any loss of profits or revenues, whether
        incurred directly or indirectly, or any loss of data, use, or goodwill, resulting
        from your use of the platform. Statutory compensation entitlements are governed
        by the relevant land acquisition act, not by these terms.
      </p>
    ),
  },
  {
    heading: '10. Indemnification',
    body: (
      <p>
        You agree to indemnify and hold harmless the operating agency, its officers,
        employees, and partners from any claim, demand, loss, or expense (including
        reasonable legal fees) arising out of your breach of these terms or your use
        of the Services.
      </p>
    ),
  },
  {
    heading: '11. Termination',
    body: (
      <p>
        We may suspend or terminate your access to the Services at any time, without
        prior notice, if we reasonably believe that you have violated these terms or
        that your continued access poses a security or operational risk. Statutory
        retention obligations survive termination.
      </p>
    ),
  },
  {
    heading: '12. Governing law',
    body: (
      <p>
        These terms are governed by the laws of Malaysia. Any dispute arising from or
        related to the use of the Services will be subject to the exclusive jurisdiction
        of the courts of Malaysia. This is a placeholder agreement published for the
        public landing site and does not yet constitute a binding offer.
      </p>
    ),
  },
];

export const TermsOfService: React.FC = () => {
  useDocumentTitle('Terms of Service');
  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto relative">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-md-tertiary/10 blur-3xl -top-20 -right-20 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-md-primary/10 blur-3xl bottom-0 left-0 pointer-events-none" />

        <div className="relative z-10 bg-md-surface-container rounded-3xl p-8 md:p-12 shadow-sm border border-white/40">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-md-on-surface-variant text-sm">
              Last updated: 17 September 2026.
            </p>
          </div>

          <div className="space-y-8 text-md-on-surface leading-relaxed">
            {SECTIONS.map((s) => (
              <section key={s.heading}>
                <h2 className="text-xl font-bold mb-3 text-md-on-surface">{s.heading}</h2>
                <div className="text-md-on-surface-variant space-y-3">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
