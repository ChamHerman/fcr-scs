import React from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SECTIONS: Array<{ heading: string; body: React.ReactNode }> = [
  {
    heading: '1. Introduction',
    body: (
      <>
        <p>
          FCR-SCS (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) operates the Smart
          Contract Resettlement platform to support fair land acquisition and
          resettlement for communities affected by tourism infrastructure development in
          Malaysia. This Privacy Policy explains how we collect, use, store, share, and
          safeguard information when you use our public website, the Member Portal, the
          Bank Portal, or the Government Administrator workspace (collectively, the
          &ldquo;Services&rdquo;).
        </p>
        <p>
          By using FCR-SCS, you agree to the practices described in this policy. If you
          do not agree, please discontinue use of the Services. This is a placeholder
          policy published for the public landing site and does not yet constitute the
          final data-handling arrangement with the operating agency.
        </p>
      </>
    ),
  },
  {
    heading: '2. Information we collect',
    body: (
      <>
        <p>
          We collect information that you provide directly when you register an account,
          submit a land acquisition claim, upload supporting documents, or contact our
          support team. This may include your full name, identification number (MyKad or
          equivalent), contact number, email address, postal address, bank account
          details (for disbursement), and copies of any statutory forms or supporting
          evidence.
        </p>
        <p>
          We also collect technical data automatically, such as your IP address, browser
          type, operating system, pages visited, and timestamps of access. Technical data
          is used to keep the platform secure, prevent abuse, and improve service quality.
        </p>
      </>
    ),
  },
  {
    heading: '3. How we use your information',
    body: (
      <ul className="list-disc pl-6 space-y-2">
        <li>To verify your identity and process your land acquisition claim;</li>
        <li>To coordinate compensation disbursement and bank settlement;</li>
        <li>
          To anchor cryptographically hashed records to the public Ethereum blockchain
          for statutory audit purposes;
        </li>
        <li>To communicate case status updates and statutory notifications;</li>
        <li>
          To operate, maintain, and improve the platform, including fraud detection and
          incident response;
        </li>
        <li>To comply with applicable Malaysian laws, regulations, and audit requirements.</li>
      </ul>
    ),
  },
  {
    heading: '4. Data sharing and blockchain',
    body: (
      <>
        <p>
          Personal data is <span className="font-semibold">never</span> published on the
          blockchain. Only cryptographic fingerprints (SHA-256 hashes) of finalized
          agreements and payment records are anchored, ensuring tamper-evidence without
          exposing personal details.
        </p>
        <p>
          Limited case information is shared with authorised recipients as needed to
          perform the duties of their role:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Government Administrators and Officers who manage the case;</li>
          <li>
            Registered Valuers assigned to the case for the purposes of asset assessment;
          </li>
          <li>
            Licensed Banks that execute the disbursement through RENTAS (BNM/PayNet);
          </li>
          <li>
            Auditors and oversight bodies acting under written authority of the operating
            agency.
          </li>
        </ul>
        <p>
          We do not sell or rent personal data to third parties for marketing purposes.
        </p>
      </>
    ),
  },
  {
    heading: '5. Data retention',
    body: (
      <>
        <p>
          We retain personal data for as long as your account is active or as needed to
          provide the Services. Where a case is the subject of an active statutory
          process or audit, certain records may be retained beyond the active period in
          line with the National Archives Act 2003 and related legislation. Bank
          account details used for disbursement are retained only for the duration of the
          payment cycle, unless you opt to store a default payout account in your Member
          settings.
        </p>
      </>
    ),
  },
  {
    heading: '6. Your rights',
    body: (
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <span className="font-semibold">Access:</span> request a copy of the personal
          data we hold about you;
        </li>
        <li>
          <span className="font-semibold">Correction:</span> request that inaccurate or
          incomplete data be updated;
        </li>
        <li>
          <span className="font-semibold">Deletion:</span> request deletion of data that
          is no longer required for the original purpose, subject to statutory retention
          obligations;
        </li>
        <li>
          <span className="font-semibold">Restriction:</span> request that we limit the
          processing of your data while a complaint is investigated;
        </li>
        <li>
          <span className="font-semibold">Withdraw consent:</span> where processing is
          based on consent, you may withdraw it at any time without affecting prior
          lawful processing.
        </li>
      </ul>
    ),
  },
  {
    heading: '7. Security',
    body: (
      <p>
        FCR-SCS applies reasonable administrative, technical, and physical safeguards
        designed to protect personal data against unauthorised access, disclosure,
        alteration, and destruction. All sensitive operations require authentication,
        and role-based access controls ensure that users can only view the data
        relevant to their assigned duties. Despite our efforts, no system is completely
        secure, and we cannot guarantee absolute security of the information you
        transmit to us.
      </p>
    ),
  },
  {
    heading: '8. Cookies and local storage',
    body: (
      <p>
        The platform uses local storage to persist your authentication session and user
        preferences. We do not use third-party advertising cookies. You may clear your
        browser&apos;s local storage at any time; doing so will sign you out and reset
        your preferences on this device.
      </p>
    ),
  },
  {
    heading: '9. Changes to this policy',
    body: (
      <p>
        We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo;
        date at the top of this page will reflect the date of the most recent change.
        Material changes will be communicated through the platform or by email where
        appropriate.
      </p>
    ),
  },
  {
    heading: '10. Contact',
    body: (
      <p>
        Questions about this policy or our data handling practices can be directed to
        our support team via the{' '}
        <a href="/contact" className="text-md-primary hover:underline font-semibold">
          contact page
        </a>
        . We will respond to verifiable requests within thirty (30) calendar days.
      </p>
    ),
  },
];

export const PrivacyPolicy: React.FC = () => {
  useDocumentTitle('Privacy Policy');
  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto relative">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-md-primary/10 blur-3xl -top-20 -left-20 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-md-secondary-container/50 blur-3xl bottom-0 right-0 pointer-events-none" />

        <div className="relative z-10 bg-md-surface-container rounded-3xl p-8 md:p-12 shadow-sm border border-white/40">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
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
