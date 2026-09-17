import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MD3Card, MD3Button } from '../MD3Components';
import { PageHeader } from '../../components/ui/PageHeader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import '../LandAcquisition/case_management.css';
import {
  ArrowLeft,
  Save,
  Code2,
  Eye,
  Check,
  Sparkles,
  AlertCircle,
  Smartphone,
  Monitor,
  CheckCircle2,
  FileCode,
  Info,
  ExternalLink,
  Layers
} from 'lucide-react';

export interface PlaceholderItem {
  key: string;
  label: string;
  category: 'Links & Buttons' | 'Case & Land' | 'Recipient' | 'Financial' | 'Security & OTP';
  sample: string;
}

const COMMON_PLACEHOLDERS: PlaceholderItem[] = [
  // Links & Buttons
  { key: 'actionUrl', label: 'Action Button URL', category: 'Links & Buttons', sample: 'http://localhost:5173/member/cases/LAC-2026-08-0001' },
  { key: 'buttonText', label: 'Action Button Text', category: 'Links & Buttons', sample: 'View Case & Respond' },
  { key: 'portalLink', label: 'Member Portal Link', category: 'Links & Buttons', sample: 'http://localhost:5173/member' },
  { key: 'loginUrl', label: 'Login Page URL', category: 'Links & Buttons', sample: 'http://localhost:5173/login' },
  { key: 'resetLink', label: 'Password Reset URL', category: 'Links & Buttons', sample: 'http://localhost:5173/reset-password?token=demo_token' },
  { key: 'verificationLink', label: 'Email Verify URL', category: 'Links & Buttons', sample: 'http://localhost:5173/verify-email?token=demo_token' },

  // Case & Land
  { key: 'caseId', label: 'Case Number', category: 'Case & Land', sample: 'LAC-2026-08-0001' },
  { key: 'caseTitle', label: 'Project / Case Title', category: 'Case & Land', sample: 'Klang Valley Expressway Corridor Acquisition' },
  { key: 'lotNo', label: 'Lot Number', category: 'Case & Land', sample: 'Lot 4082' },
  { key: 'mukim', label: 'Mukim / District', category: 'Case & Land', sample: 'Mukim Batu' },
  { key: 'status', label: 'Case Status', category: 'Case & Land', sample: 'COMPENSATION_APPROVED' },
  { key: 'remarks', label: 'Official Remarks', category: 'Case & Land', sample: 'Statutory verification completed successfully.' },
  { key: 'officerName', label: 'Assigned Officer', category: 'Case & Land', sample: 'Puan Siti Aminah' },

  // Recipient
  { key: 'name', label: 'Recipient Name', category: 'Recipient', sample: 'Ahmad bin Abdullah' },
  { key: 'email', label: 'Recipient Email', category: 'Recipient', sample: 'ahmad@example.com' },
  { key: 'role', label: 'Recipient Role', category: 'Recipient', sample: 'Displaced Community Member' },
  { key: 'timestamp', label: 'Timestamp (MYT)', category: 'Recipient', sample: new Date().toLocaleString() },

  // Financial
  { key: 'amount', label: 'Amount (RM)', category: 'Financial', sample: 'RM 385,000.00' },
  { key: 'compensationAmount', label: 'Compensation Award', category: 'Financial', sample: 'RM 385,000.00' },
  { key: 'transactionId', label: 'Transaction / EFT ID', category: 'Financial', sample: 'TXN-9842104-MY' },
  { key: 'bankName', label: 'Bank Name', category: 'Financial', sample: 'Malayan Banking Berhad (Maybank)' },
  { key: 'accountNumber', label: 'Bank Account Number', category: 'Financial', sample: '114012345678' },

  // Security & OTP
  { key: 'otp', label: '6-Digit OTP', category: 'Security & OTP', sample: '729104' },
  { key: 'temporaryPassword', label: 'Temporary Password', category: 'Security & OTP', sample: 'Tmp#Pass982' },
  { key: 'expiresMinutes', label: 'Expiry Minutes', category: 'Security & OTP', sample: '5' },
];

const CATEGORIES = ['ALL', 'Links & Buttons', 'Case & Land', 'Recipient', 'Financial', 'Security & OTP'] as const;

const INITIAL_BODY = `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <div style="border-bottom: 2px solid #6750A4; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="color: #6750A4; margin: 0; font-size: 20px;">FCR-SCS Notification</h2>
    <span style="font-size: 12px; color: #64748b;">Statutory Compensation & Land Commission</span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Dear {{name}},</p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    This is an official communication regarding your compensation case <strong>{{caseId}}</strong>.
  </p>

  <div style="background-color: #f8fafc; border-left: 4px solid #6750A4; padding: 12px 16px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; color: #1e293b;">Status: <strong>{{status}}</strong></p>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">Remarks: {{remarks}}</p>
  </div>

  <div style="text-align: center; margin: 25px 0;">
    <a href="{{portalLink}}" style="background-color: #6750A4; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px;">View In Member Portal</a>
  </div>

  <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
    If you did not expect this communication, please verify your credentials or contact administrative support.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
    Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)<br/>
    Government of Malaysia
  </p>
</div>`;

export const EmailTemplateCreate: React.FC = () => {
  useDocumentTitle('Create Email Template');
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [templateName, setTemplateName] = useState('');
  const [subject, setSubject] = useState('FCR-SCS: Official Notice regarding Case {{caseId}}');
  const [bodyContent, setBodyContent] = useState(INITIAL_BODY);
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [placeholderFilter, setPlaceholderFilter] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleInsertButtonSnippet = () => {
    const snippet = `\n<div style="text-align: center; margin: 24px 0;">\n  <a href="{{actionUrl}}" style="background-color: #6750A4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(103,80,164,0.2);">{{buttonText}}</a>\n</div>\n`;

    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const current = el.value;
      const next = current.substring(0, start) + snippet + current.substring(end);
      setBodyContent(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + snippet.length, start + snippet.length);
      }, 0);
    } else {
      setBodyContent((prev) => prev + snippet);
    }
    showToast('Inserted Action Button snippet into editor!', 'success');
  };

  // Click placeholder tag: copy & insert, show tick for 0.5s
  const handleInsertPlaceholder = (key: string) => {
    const placeholder = `{{${key}}}`;
    navigator.clipboard.writeText(placeholder).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 500);

    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const current = el.value;
      const next = current.substring(0, start) + placeholder + current.substring(end);
      setBodyContent(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      setBodyContent((prev) => prev + ' ' + placeholder);
    }
  };

  // Interpolated Preview
  const previewSubject = useMemo(() => {
    let s = subject;
    COMMON_PLACEHOLDERS.forEach(({ key, sample }) => {
      s = s.replace(new RegExp(`{{${key}}}`, 'g'), sample);
    });
    return s;
  }, [subject]);

  const previewHtml = useMemo(() => {
    let b = bodyContent;
    COMMON_PLACEHOLDERS.forEach(({ key, sample }) => {
      b = b.replace(new RegExp(`{{${key}}}`, 'g'), sample);
    });
    return b;
  }, [bodyContent]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedKey = templateName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!normalizedKey) {
      setError('Please provide a valid Template Identifier Key (e.g., PAYMENT_RETRY_NOTICE).');
      return;
    }

    if (!subject.trim()) {
      setError('Please specify a Subject line for the email template.');
      return;
    }

    if (!bodyContent.trim()) {
      setError('Body content cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:3030/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: normalizedKey,
          subject: subject.trim(),
          bodyContent: bodyContent.trim(),
        }),
      });

      if (res.ok) {
        showToast('Email template created successfully!', 'success');
        setTimeout(() => {
          navigate('/admin/email-templates');
        }, 800);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create email template.');
      }
    } catch (err: any) {
      setError('Failed to connect to the backend server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-md-inverse-surface text-md-inverse-on-surface rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} className="text-md-primary shrink-0" />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <PageHeader
        title="Create Email Template"
        subtitle="Design a new administrative notification template with live split-screen preview."
        backPath="/admin/email-templates"
        actions={
          <MD3Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {isSaving ? 'Saving Template...' : 'Save Template'}
          </MD3Button>
        }
      />

      {error && (
        <div className="mb-6 flex items-start gap-2 p-4 text-sm text-md-error bg-md-error-container rounded-xl">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Split Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Left: Template Editor Form */}
        <div className="flex flex-col gap-5">
          <MD3Card elevation={1} className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
              <FileCode size={16} /> Template Configuration
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant mb-1">
                Template Identifier Key <span className="text-md-error">*</span>
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                placeholder="e.g. PAYMENT_REMINDER_NOTIFICATION"
                className="w-full px-3.5 py-2.5 rounded-lg border border-md-outline bg-md-surface text-md-on-surface font-mono text-sm focus:border-md-primary focus:outline-none focus:ring-1 focus:ring-md-primary"
                required
              />
              <p className="text-xs text-md-on-surface-variant mt-1 flex items-center gap-1">
                <Info size={12} /> Unique uppercase identifier used by backend services to trigger this email.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant mb-1">
                Email Subject Line <span className="text-md-error">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. FCR-SCS: Action Required on Case {{caseId}}"
                className="w-full px-3.5 py-2.5 rounded-lg border border-md-outline bg-md-surface text-md-on-surface text-sm focus:border-md-primary focus:outline-none focus:ring-1 focus:ring-md-primary"
                required
              />
            </div>
          </MD3Card>

          {/* Placeholders Toolbar */}
          {/* Placeholders Toolbar */}
          <MD3Card elevation={1} className="p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-md-outline-variant/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5">
                  <Sparkles size={14} className="text-md-primary" /> Available Placeholders
                </span>
                <span className="text-[11px] text-md-on-surface-variant hidden sm:inline">
                  (Click to insert at cursor position)
                </span>
              </div>

              {/* Quick Action Button Snippet Inserter */}
              <button
                type="button"
                onClick={handleInsertButtonSnippet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-md-primary hover:bg-md-primary/90 text-white transition-all shadow-sm"
                title="Insert pre-styled responsive Action Button snippet into editor"
              >
                <ExternalLink size={13} />
                <span>+ Insert Action Button</span>
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPlaceholderFilter(cat)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all ${
                    placeholderFilter === cat
                      ? 'bg-md-primary text-white shadow-xs'
                      : 'bg-md-surface-variant/50 hover:bg-md-surface-variant text-md-on-surface-variant'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Placeholders Chips Grid */}
            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
              {COMMON_PLACEHOLDERS.filter(
                (p) => placeholderFilter === 'ALL' || p.category === placeholderFilter
              ).map(({ key, label }) => {
                const isCopied = copiedKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleInsertPlaceholder(key)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
                      isCopied
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-md-surface-variant/40 hover:bg-md-surface-variant text-md-on-surface border-md-outline-variant/60'
                    }`}
                    title={`Click to insert {{${key}}} (${label})`}
                  >
                    {isCopied ? <Check size={12} className="text-green-600" /> : <Code2 size={12} />}
                    <span>{`{{${key}}}`}</span>
                    <span className="text-[10px] text-md-on-surface-variant font-sans">({label})</span>
                  </button>
                );
              })}
            </div>
          </MD3Card>

          {/* HTML Body Editor */}
          <MD3Card elevation={1} className="p-4 flex-1 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5">
                <Code2 size={14} /> HTML Body Code
              </span>
              <span className="text-[11px] text-md-on-surface-variant font-mono">
                {bodyContent.length} characters
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={bodyContent}
              onChange={(e) => setBodyContent(e.target.value)}
              className="w-full flex-1 p-3.5 rounded-lg border border-md-outline bg-gray-950 text-emerald-400 font-mono text-xs leading-relaxed focus:border-md-primary focus:outline-none focus:ring-1 focus:ring-md-primary resize-y min-h-[380px]"
              placeholder="Enter template HTML here..."
              spellCheck={false}
            />
          </MD3Card>
        </div>

        {/* Right: Live Seamless Preview */}
        <div className="flex flex-col gap-4">
          <MD3Card elevation={1} className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-md-outline-variant/50 mb-4">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-md-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-md-on-surface">
                  Live Email Preview
                </h2>
              </div>

              {/* Viewport Switcher */}
              <div className="flex items-center gap-1 bg-md-surface-variant/50 p-1 rounded-lg border border-md-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setDevicePreview('desktop')}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                    devicePreview === 'desktop'
                      ? 'bg-md-surface shadow-sm text-md-on-surface font-medium'
                      : 'text-md-on-surface-variant hover:text-md-on-surface'
                  }`}
                  title="Desktop Preview (600px)"
                >
                  <Monitor size={14} />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDevicePreview('mobile')}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                    devicePreview === 'mobile'
                      ? 'bg-md-surface shadow-sm text-md-on-surface font-medium'
                      : 'text-md-on-surface-variant hover:text-md-on-surface'
                  }`}
                  title="Mobile Preview (375px)"
                >
                  <Smartphone size={14} />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* Email Header Simulation */}
            <div className="p-3.5 bg-md-surface-variant/30 rounded-xl border border-md-outline-variant/50 text-xs text-md-on-surface-variant space-y-1.5 mb-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-md-on-surface">
                  From: FCR-SCS Notification &lt;no-reply@fcrscs.gov.my&gt;
                </span>
                <span className="font-mono text-[11px]">Just now</span>
              </div>
              <div className="text-md-on-surface-variant">
                To: Ahmad bin Abdullah &lt;ahmad@example.com&gt;
              </div>
              <div className="pt-1 text-sm font-semibold text-md-on-surface border-t border-md-outline-variant/30">
                Subject: {previewSubject || '(Empty Subject)'}
              </div>
            </div>

            {/* Rendered Email Container */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-900/60 p-4 rounded-xl flex justify-center items-start overflow-auto min-h-[460px]">
              <div
                className={`w-full bg-white shadow-sm rounded-lg overflow-hidden transition-all duration-200 ${
                  devicePreview === 'mobile' ? 'max-w-[375px]' : 'max-w-[620px]'
                }`}
              >
                <div
                  className="email-rendered-preview p-2"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          </MD3Card>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateCreate;
