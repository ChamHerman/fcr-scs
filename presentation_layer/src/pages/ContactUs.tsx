import React from 'react';
import { Mail, Phone, MapPin, Clock, Building2, MessageCircle, Globe } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ContactUs: React.FC = () => {
  useDocumentTitle('Contact Us');
  return (
    <div className="py-12 px-6">
      <div className="max-w-4xl mx-auto relative">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-md-primary/10 blur-3xl -top-20 -left-20 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-md-secondary-container/50 blur-3xl bottom-0 right-0 pointer-events-none" />

        <div className="relative z-10 bg-md-surface-container rounded-3xl p-8 md:p-12 shadow-sm border border-white/40">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-md-on-surface-variant text-lg leading-relaxed">
              We&apos;d love to hear from you. Whether you are an affected landowner with
              a question about your case, a researcher interested in our methodology, or
              a government partner exploring collaboration, the channels below will get
              you to the right team.
            </p>
          </div>

          {/* Office */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-3">Operating office</h2>
            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-md-outline/15 p-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center shrink-0">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">FCR-SCS Project Office</h3>
                  <p className="text-sm text-md-on-surface-variant leading-relaxed">
                    Centre for Diploma Studies (CD)
                    <br />
                    Tunku Abdul Rahman University of Management and Technology (TARUMT)
                    <br />
                    Jalan Genting Kelang, Setapak
                    <br />
                    53300 Kuala Lumpur, Malaysia
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Channels grid */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Reach us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-md-outline/15 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center">
                    <Mail size={20} />
                  </div>
                  <h3 className="text-base font-bold">Email</h3>
                </div>
                <p className="text-sm text-md-on-surface-variant mb-1">General enquiries</p>
                <a
                  href="mailto:hello@fcr-scs.gov.my"
                  className="text-md-primary hover:underline font-semibold text-sm"
                >
                  hello@fcr-scs.gov.my
                </a>
                <p className="text-sm text-md-on-surface-variant mb-1 mt-3">Member support</p>
                <a
                  href="mailto:support@fcr-scs.gov.my"
                  className="text-md-primary hover:underline font-semibold text-sm"
                >
                  support@fcr-scs.gov.my
                </a>
                <p className="text-sm text-md-on-surface-variant mb-1 mt-3">Research &amp; partnerships</p>
                <a
                  href="mailto:research@fcr-scs.gov.my"
                  className="text-md-primary hover:underline font-semibold text-sm"
                >
                  research@fcr-scs.gov.my
                </a>
              </div>

              <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-md-outline/15 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center">
                    <Phone size={20} />
                  </div>
                  <h3 className="text-base font-bold">Phone</h3>
                </div>
                <p className="text-sm text-md-on-surface-variant mb-1">Member hotline</p>
                <a
                  href="tel:+60312345678"
                  className="text-md-primary hover:underline font-semibold text-sm"
                >
                  +60 3-1234 5678
                </a>
                <p className="text-sm text-md-on-surface-variant mb-1 mt-3">Bank &amp; settlement desk</p>
                <a
                  href="tel:+60312345680"
                  className="text-md-primary hover:underline font-semibold text-sm"
                >
                  +60 3-1234 5680
                </a>
                <p className="text-sm text-md-on-surface-variant mb-1 mt-3">Media enquiries</p>
                <a
                  href="tel:+60312345690"
                  className="text-md-primary hover:underline font-semibold text-sm"
                >
                  +60 3-1234 5690
                </a>
              </div>

              <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-md-outline/15 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <h3 className="text-base font-bold">Visit us</h3>
                </div>
                <p className="text-sm text-md-on-surface-variant leading-relaxed">
                  Walk-in support is available at the FCR-SCS Project Office, Level 3,
                  Block B, TARUMT main campus. Please bring a valid photo ID and your
                  case reference (if any) for in-person assistance.
                </p>
              </div>

              <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-md-outline/15 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center">
                    <Clock size={20} />
                  </div>
                  <h3 className="text-base font-bold">Office hours</h3>
                </div>
                <p className="text-sm text-md-on-surface-variant leading-relaxed">
                  Monday – Friday: 09:00 – 17:30 (MYT)
                  <br />
                  Saturday: 09:00 – 13:00 (MYT)
                  <br />
                  Sunday &amp; public holidays: closed
                  <br />
                  <span className="text-xs italic">
                    Hotlines receive messages 24/7. Critical statutory incidents are
                    escalated on a 24-hour roster.
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Online channels */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Online channels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-md-outline/15 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center">
                    <MessageCircle size={20} />
                  </div>
                  <h3 className="text-base font-bold">Member Portal messaging</h3>
                </div>
                <p className="text-sm text-md-on-surface-variant leading-relaxed">
                  Registered landowners can reach the case officer assigned to their file
                  through the secure inbox inside the Member Portal. Messages are tied
                  to the case record and remain auditable.
                </p>
              </div>
              <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-md-outline/15 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <h3 className="text-base font-bold">Social &amp; web</h3>
                </div>
                <p className="text-sm text-md-on-surface-variant leading-relaxed">
                  For project announcements, research notes, and demonstration
                  recordings, follow our public channels. The platform does not accept
                  case-specific enquiries through social media.
                </p>
              </div>
            </div>
          </section>

          {/* What to include */}
          <section className="border-t border-md-outline/15 pt-8">
            <h2 className="text-2xl font-bold mb-3">What to include in your message</h2>
            <ul className="list-disc pl-6 space-y-2 text-md-on-surface-variant leading-relaxed">
              <li>Your full name and a contact number or email we can reach you on;</li>
              <li>
                Your case reference number (LAC-YYYY-MM-XXXX) if your enquiry is about
                an existing case;
              </li>
              <li>
                For verification requests, the blockchain record ID
                (BCN-YYYY-MM-####) printed on the certificate you are verifying;
              </li>
              <li>A short, clear description of what you need help with.</li>
            </ul>
            <p className="text-md-on-surface-variant mt-6 leading-relaxed">
              We respond to verifiable requests within thirty (30) calendar days. For
              urgent statutory incidents, please call the member hotline and mark the
              call as &ldquo;urgent.&rdquo;
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
