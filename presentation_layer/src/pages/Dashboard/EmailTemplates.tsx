import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MD3Card, MD3Button } from '../MD3Components';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import '../LandAcquisition/case_management.css';
import {
  Mail,
  Search,
  RotateCcw,
  Save,
  Plus,
  Eye,
  Code2,
  Columns,
  Check,
  Copy,
  Clock,
  Sparkles,
  AlertCircle,
  FileCode,
  CheckCircle2,
  X,
  ExternalLink
} from 'lucide-react';

interface EmailTemplate {
  templateId: string;
  templateName: string;
  subject: string;
  bodyContent: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

interface TemplateMeta {
  displayName: string;
  category: 'AUTH' | 'LAND_ACQUISITION' | 'FINANCE' | 'SYSTEM' | 'CUSTOM';
  description: string;
  suggestedVariables: string[];
}

const TEMPLATE_METAS: Record<string, TemplateMeta> = {
  PASSWORD_RESET: {
    displayName: 'Password Reset Request',
    category: 'AUTH',
    description: 'Triggered when a user requests a password reset token via the portal.',
    suggestedVariables: ['name', 'resetLink'],
  },
  ACCOUNT_ACTIVATION: {
    displayName: 'Account Activation',
    category: 'AUTH',
    description: 'Sent to newly registered citizens to verify identity and activate account.',
    suggestedVariables: ['name', 'activationLink'],
  },
  OFFER_LETTER_NOTIFICATION: {
    displayName: 'Compensation Offer Notice',
    category: 'LAND_ACQUISITION',
    description: 'Notifies land owners when a statutory Form G/H offer letter is issued.',
    suggestedVariables: ['name', 'caseId', 'amount', 'portalLink'],
  },
  PAYMENT_DISBURSED: {
    displayName: 'Payment Disbursed Notification',
    category: 'FINANCE',
    description: 'Dispatched when compensation funds are successfully transferred via EFT.',
    suggestedVariables: ['name', 'caseId', 'amount', 'transactionId'],
  },
  OBJECTION_UPDATE: {
    displayName: 'Objection Status Update',
    category: 'LAND_ACQUISITION',
    description: 'Alerts community members on hearing dates, committee decisions, or reviews.',
    suggestedVariables: ['name', 'caseId', 'status', 'remarks', 'portalLink'],
  },
  SYSTEM_ALERT: {
    displayName: 'System Administrative Alert',
    category: 'SYSTEM',
    description: 'Automated notification for critical security, maintenance, or audit notices.',
    suggestedVariables: ['name', 'alertType', 'message', 'timestamp'],
  },
  SYSTEM_ADMIN_OTP: {
    displayName: 'System Admin Two-Factor OTP',
    category: 'AUTH',
    description: 'Dispatched during System Administrator login gate for two-factor authentication.',
    suggestedVariables: ['name', 'otp', 'expiresMinutes'],
  },
};

const SAMPLE_VALUES: Record<string, string> = {
  // Links & Buttons
  actionUrl: 'http://localhost:5173/member/cases/LAC-2026-08-0001',
  buttonText: 'View Case & Respond',
  portalLink: 'http://localhost:5173/member',
  loginUrl: 'http://localhost:5173/login',
  resetLink: 'http://localhost:5173/reset-password?token=demo_token_87234',
  activationLink: 'http://localhost:5173/activate?token=demo_activation_19482',
  verificationLink: 'http://localhost:5173/verify-email?token=demo_verification_45892',

  // Case & Property
  caseId: 'LAC-2026-08-0001',
  caseTitle: 'Klang Valley Expressway Corridor Acquisition',
  lotNo: 'Lot 4082',
  mukim: 'Mukim Batu',
  status: 'HEARING_SCHEDULED',
  remarks: 'Statutory hearing confirmed for 28 September 2026 at Room 4B, Federal Land Office.',
  officerName: 'Puan Siti Aminah',

  // Recipient
  name: 'Ahmad bin Abdullah',
  email: 'ahmad@example.com',
  role: 'Displaced Community Member',
  timestamp: new Date().toLocaleString(),

  // Financial
  amount: 'RM 385,000.00',
  compensationAmount: 'RM 385,000.00',
  transactionId: '0x8f2a9b4c6e1d7a3f5b8e9c0d1a2f3b4c5d6e7f8a9b0c',
  bankName: 'Malayan Banking Berhad (Maybank)',
  accountNumber: '114012345678',

  // Security & Alerts
  alertType: 'SECURITY_AUDIT',
  message: 'Multi-signature policy threshold has been successfully verified.',
  otp: '849201',
  temporaryPassword: 'Tmp#Pass982',
  expiresMinutes: '5',
};

const GLOBAL_PLACEHOLDERS = [
  'actionUrl',
  'buttonText',
  'caseId',
  'caseTitle',
  'lotNo',
  'name',
  'email',
  'amount',
  'compensationAmount',
  'portalLink',
  'loginUrl',
  'status',
  'remarks',
  'officerName',
  'transactionId',
  'bankName',
  'accountNumber',
  'otp',
  'temporaryPassword',
  'expiresMinutes',
  'timestamp',
];

export const EmailTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Popup confirmation modal states
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [pendingSwitchTmpl, setPendingSwitchTmpl] = useState<EmailTemplate | null>(null);

  // Editor states
  const [subject, setSubject] = useState<string>('');
  const [bodyContent, setBodyContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Add Template Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('');
  const [newBodyContent, setNewBodyContent] = useState<string>(`<div style="font-family: sans-serif; padding: 20px;">
  <h2>Notification Title</h2>
  <p>Dear {{name}},</p>
  <p>Your message content goes here.</p>
  <br>
  <p>Regards,<br>The FCR-SCS Team</p>
</div>`);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTemplates = async (selectName?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3030/api/email-templates');
      if (res.ok) {
        const data: EmailTemplate[] = await res.json();
        setTemplates(data);
        if (data.length > 0) {
          const targetName = selectName || selectedTemplateName || data[0].templateName;
          const found = data.find(t => t.templateName === targetName) || data[0];
          setSelectedTemplateName(found.templateName);
          setSubject(found.subject);
          setBodyContent(found.bodyContent);
          setIsDirty(false);
        }
      } else {
        showToast('Failed to load email templates from server', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to backend API', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.templateName === selectedTemplateName);
  }, [templates, selectedTemplateName]);

  const applySelectTemplate = (tmpl: EmailTemplate) => {
    setSelectedTemplateName(tmpl.templateName);
    setSubject(tmpl.subject);
    setBodyContent(tmpl.bodyContent);
    setIsDirty(false);
  };

  const handleSelectTemplate = (tmpl: EmailTemplate) => {
    if (isDirty) {
      setPendingSwitchTmpl(tmpl);
      return;
    }
    applySelectTemplate(tmpl);
  };

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    setIsDirty(true);
  };

  const handleBodyChange = (val: string) => {
    setBodyContent(val);
    setIsDirty(true);
  };

  const handleInsertVariable = (varName: string) => {
    const placeholder = `{{${varName}}}`;
    navigator.clipboard.writeText(placeholder).catch(() => {});
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 500);

    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const current = el.value;
      const next = current.substring(0, start) + placeholder + current.substring(end);
      setBodyContent(next);
      setIsDirty(true);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      setBodyContent(prev => prev + ' ' + placeholder);
      setIsDirty(true);
    }
    showToast(`Inserted and copied ${placeholder} to clipboard!`, 'info');
  };

  const handleInsertButtonSnippet = () => {
    const snippet = `\n<div style="text-align: center; margin: 24px 0;">\n  <a href="{{actionUrl}}" style="background-color: #0066cc; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">{{buttonText}}</a>\n</div>\n`;

    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const current = el.value;
      const next = current.substring(0, start) + snippet + current.substring(end);
      setBodyContent(next);
      setIsDirty(true);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + snippet.length, start + snippet.length);
      }, 0);
    } else {
      setBodyContent((prev) => prev + snippet);
      setIsDirty(true);
    }
    showToast('Inserted Action Button snippet into editor!', 'success');
  };

  const handleSave = async () => {
    if (!selectedTemplateName) return;
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:3030/api/email-templates/${encodeURIComponent(selectedTemplateName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          bodyContent,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        showToast('Email template saved successfully!', 'success');
        setIsDirty(false);
        setTemplates(prev => prev.map(t => t.templateName === selectedTemplateName ? json.template : t));
      } else {
        const errJson = await res.json();
        showToast(errJson.error || 'Failed to save template', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving template', 'error');
    } finally {
      setIsSaving(false);
    }
  };

const STOCK_DEFAULTS: Record<string, { subject: string; bodyContent: string }> = {
  PASSWORD_RESET: {
    subject: 'FCR-SCS: Password Reset Request',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Password Reset Request</h2>
  <p>Hi {{name}},</p>
  <p>You recently requested to reset your password for your FCR-SCS account. Click the button below to reset it:</p>
  <a href="{{resetLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
  <p>If you did not request a password reset, please ignore this email or reply to let us know. This password reset link is only valid for the next 60 minutes.</p>
  <br>
  <p>Thanks,<br>The FCR-SCS Team</p>
</div>`,
  },
  ACCOUNT_ACTIVATION: {
    subject: 'FCR-SCS: Activate Your Account',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Activate Your Account</h2>
  <p>Hi {{name}},</p>
  <p>Thank you for registering with FCR-SCS. Please click the button below to activate your account:</p>
  <a href="{{activationLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Activate Account</a>
  <p>If you did not register for an account, please ignore this email. This link is valid for 24 hours.</p>
  <br>
  <p>Thanks,<br>The FCR-SCS Team</p>
</div>`,
  },
  OFFER_LETTER_NOTIFICATION: {
    subject: 'FCR-SCS: Compensation Offer Notice - Case {{caseId}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Official Compensation Offer Notice</h2>
  <p>Dear {{name}},</p>
  <p>An official compensation offer has been published for Land Acquisition Case <strong>{{caseId}}</strong>.</p>
  <p>Total awarded amount: <strong>{{amount}}</strong></p>
  <p>Please log in to your Member Portal to review the formal offer letter and select your response (Accept / Dispute) within the statutory window:</p>
  <a href="{{portalLink}}" style="background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Offer Letter</a>
  <br>
  <p>Regards,<br>Land Acquisition & Compensation Department</p>
</div>`,
  },
  PAYMENT_DISBURSED: {
    subject: 'FCR-SCS: Payment Disbursed for Case {{caseId}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Compensation Payment Disbursed</h2>
  <p>Dear {{name}},</p>
  <p>Your compensation payment of <strong>{{amount}}</strong> for Case <strong>{{caseId}}</strong> has been approved and processed.</p>
  <p>Reference Transaction ID: <code>{{transactionId}}</code></p>
  <p>Payment Method: Direct Bank Transfer (EFT)</p>
  <p>Please allow 1-3 business days for the funds to reflect in your designated bank account.</p>
  <br>
  <p>Regards,<br>Finance & Disbursement Division</p>
</div>`,
  },
  OBJECTION_UPDATE: {
    subject: 'FCR-SCS: Status Update on Objection - Case {{caseId}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Objection Status Update</h2>
  <p>Dear {{name}},</p>
  <p>We are writing to update you on your formal objection regarding Land Acquisition Case <strong>{{caseId}}</strong>.</p>
  <p>Current Status: <strong>{{status}}</strong></p>
  <p>Remarks: {{remarks}}</p>
  <a href="{{portalLink}}" style="background-color: #6750a4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Check Details in Portal</a>
  <br>
  <p>Regards,<br>Land Acquisition Hearing Committee</p>
</div>`,
  },
  SYSTEM_ALERT: {
    subject: 'FCR-SCS: System Notification - {{alertType}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>System Notification</h2>
  <p>Hello {{name}},</p>
  <p>This is an automated system notice: <strong>{{message}}</strong></p>
  <p>Timestamp: {{timestamp}}</p>
  <p>If you require assistance, please reach out to the System Administrator.</p>
  <br>
  <p>FCR-SCS Administrative Services</p>
</div>`,
  },
  SYSTEM_ADMIN_OTP: {
    subject: 'FCR-SCS Security: Your Administrator Verification Code is {{otp}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px; max-width: 540px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #6750a4; margin-top: 0;">System Administrator Authentication</h2>
  <p>Dear {{name}},</p>
  <p>A login request to the FCR-SCS Administrative Console was initiated for your account. Please use the following One-Time Password (OTP) to complete your two-factor verification:</p>
  <div style="text-align: center; margin: 25px 0;">
    <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 28px; background-color: #f3edf7; color: #21005d; border-radius: 8px; border: 1px dashed #6750a4;">{{otp}}</span>
  </div>
  <p style="color: #49454f; font-size: 14px;">This code is valid for <strong>{{expiresMinutes}} minutes</strong>. If you did not initiate this login, please immediately notify the security operations team.</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
  <p style="font-size: 12px; color: #79747e;">Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)</p>
</div>`,
  },
};

  const handleResetStock = () => {
    if (!selectedTemplateName) return;
    setIsResetModalOpen(true);
  };

  const executeResetStock = async () => {
    if (!selectedTemplateName) return;
    setIsResetting(true);
    try {
      const defaults = STOCK_DEFAULTS[selectedTemplateName];
      if (defaults) {
        const res = await fetch(`http://localhost:3030/api/email-templates/${encodeURIComponent(selectedTemplateName)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: defaults.subject,
            bodyContent: defaults.bodyContent,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          setSubject(defaults.subject);
          setBodyContent(defaults.bodyContent);
          setIsDirty(false);
          setTemplates(prev => prev.map(t => t.templateName === selectedTemplateName ? json.template : t));
          showToast('Template successfully restored to stock default!', 'success');
          setIsResetModalOpen(false);
          return;
        }
      }

      // Fallback to /reset endpoint
      const res = await fetch(`http://localhost:3030/api/email-templates/${encodeURIComponent(selectedTemplateName)}/reset`, {
        method: 'POST',
      });

      if (res.ok) {
        const json = await res.json();
        setSubject(json.template.subject);
        setBodyContent(json.template.bodyContent);
        setIsDirty(false);
        setTemplates(prev => prev.map(t => t.templateName === selectedTemplateName ? json.template : t));
        showToast('Template successfully restored to stock default!', 'success');
        setIsResetModalOpen(false);
      } else {
        const errJson = await res.json();
        showToast(errJson.error || 'Reset failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error resetting template', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!selectedTemplate) return;
    setSubject(selectedTemplate.subject);
    setBodyContent(selectedTemplate.bodyContent);
    setIsDirty(false);
    showToast('Unsaved edits discarded', 'info');
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newSubject.trim() || !newBodyContent.trim()) {
      showToast('Please fill in all template fields', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('http://localhost:3030/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: newTemplateName,
          subject: newSubject,
          bodyContent: newBodyContent,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        showToast('New template created successfully!', 'success');
        setIsAddModalOpen(false);
        setNewTemplateName('');
        setNewSubject('');
        fetchTemplates(json.template.templateName);
      } else {
        const errJson = await res.json();
        showToast(errJson.error || 'Failed to create template', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error creating template', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Preview interpolation
  const previewSubject = useMemo(() => {
    let s = subject;
    Object.entries(SAMPLE_VALUES).forEach(([k, v]) => {
      s = s.replace(new RegExp(`{{${k}}}`, 'g'), v);
    });
    return s;
  }, [subject]);

  const previewHtml = useMemo(() => {
    let b = bodyContent;
    Object.entries(SAMPLE_VALUES).forEach(([k, v]) => {
      b = b.replace(new RegExp(`{{${k}}}`, 'g'), v);
    });
    return b;
  }, [bodyContent]);

  // Detected variables in the current bodyContent and subject
  const detectedVariables = useMemo(() => {
    const combined = subject + ' ' + bodyContent;
    const matches = combined.match(/{{([a-zA-Z0-9_]+)}}/g);
    if (!matches) return [];
    const unique = Array.from(new Set(matches.map(m => m.replace(/{{|}}/g, ''))));
    return unique;
  }, [subject, bodyContent]);

  const currentMeta = selectedTemplateName ? TEMPLATE_METAS[selectedTemplateName] || {
    displayName: selectedTemplateName.replace(/_/g, ' '),
    category: 'CUSTOM',
    description: 'Custom configured administrative notification template.',
    suggestedVariables: ['name'],
  } : null;

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const meta = TEMPLATE_METAS[t.templateName];
      const matchesSearch =
        t.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (meta?.displayName && meta.displayName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'ALL' ||
        (meta && meta.category === selectedCategory) ||
        (!meta && selectedCategory === 'CUSTOM');

      return matchesSearch && matchesCat;
    });
  }, [templates, searchQuery, selectedCategory]);

  return (
    <div className="main blur-shape-bg">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-8 right-8 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-800 text-white'
              : toast.type === 'error'
              ? 'bg-rose-800 text-white'
              : 'bg-indigo-900 text-white'
          }`}
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          {toast.type === 'success' && <CheckCircle2 size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Sparkles size={18} />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Email Templates"
        subtitle="Manage system email dispatch templates, adjust formatting, and configure dynamic variable tags."
        actions={
          <MD3Button
            variant="tonal"
            onClick={() => navigate('/admin/email-templates/new')}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            <span>New Template</span>
          </MD3Button>
        }
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template List (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <MD3Card elevation={1} className="p-4 flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant opacity-60"
              />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-md-outline/30 bg-transparent text-md-on-surface focus:outline-none focus:border-md-primary"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['ALL', 'AUTH', 'LAND_ACQUISITION', 'FINANCE', 'SYSTEM'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-md-primary text-white'
                      : 'bg-md-surface-container-high text-md-on-surface-variant hover:text-md-on-surface'
                  }`}
                >
                  {cat === 'LAND_ACQUISITION' ? 'Cases' : cat === 'AUTH' ? 'Auth' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </MD3Card>

          {/* Templates Card List */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[720px] pr-1">
            {isLoading ? (
              <div className="p-8 text-center text-md-on-surface-variant text-sm">
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-8 text-center text-md-on-surface-variant text-sm border border-dashed border-md-outline/20 rounded-2xl">
                No email templates match your filter.
              </div>
            ) : (
              filteredTemplates.map(tmpl => {
                const meta = TEMPLATE_METAS[tmpl.templateName];
                const isSelected = tmpl.templateName === selectedTemplateName;

                return (
                  <div
                    key={tmpl.templateId}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'border-md-primary bg-md-secondary-container/40 shadow-sm'
                        : 'border-md-outline/20 bg-md-surface-container hover:bg-md-surface-container-high'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-sm text-md-on-surface">
                        {meta?.displayName || tmpl.templateName}
                      </span>
                      <span
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md font-medium"
                        style={{
                          background: isSelected ? 'var(--md-primary)' : 'rgba(121,116,126,0.14)',
                          color: isSelected ? '#ffffff' : 'var(--md-on-surface-variant)',
                        }}
                      >
                        {tmpl.templateName}
                      </span>
                    </div>

                    <p className="text-xs text-md-on-surface-variant line-clamp-1 mb-2">
                      {tmpl.subject}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-md-on-surface-variant opacity-70">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(tmpl.updatedAt).toLocaleDateString()}
                      </span>
                      {meta?.category && (
                        <span className="capitalize">{meta.category.toLowerCase().replace('_', ' ')}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Template Editor & Preview (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {selectedTemplate ? (
            <MD3Card elevation={1} className="p-6 flex flex-col gap-6">
              {/* Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-md-outline/15 pb-5">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-md-on-surface">
                      {currentMeta?.displayName || selectedTemplate.templateName}
                    </h2>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-md-primary/10 text-md-primary font-semibold border border-md-primary/20 flex items-center gap-1.5">
                      <code>{selectedTemplate.templateName}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTemplate.templateName);
                          showToast('Template key copied!', 'info');
                        }}
                        title="Copy key"
                        className="hover:text-md-on-surface"
                      >
                        <Copy size={12} />
                      </button>
                    </span>
                    {isDirty && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Unsaved Edits
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-md-on-surface-variant mt-1.5">
                    {currentMeta?.description}
                  </p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-md-surface-container-high rounded-xl p-1 border border-md-outline/20 self-start md:self-auto">
                  <button
                    onClick={() => setViewMode('split')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      viewMode === 'split' ? 'bg-md-primary text-white shadow-sm' : 'text-md-on-surface-variant hover:text-md-on-surface'
                    }`}
                    title="Side-by-side Editor & Preview"
                  >
                    <Columns size={14} />
                    <span className="hidden sm:inline">Split</span>
                  </button>
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      viewMode === 'edit' ? 'bg-md-primary text-white shadow-sm' : 'text-md-on-surface-variant hover:text-md-on-surface'
                    }`}
                    title="Code Editor Only"
                  >
                    <Code2 size={14} />
                    <span className="hidden sm:inline">Code</span>
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      viewMode === 'preview' ? 'bg-md-primary text-white shadow-sm' : 'text-md-on-surface-variant hover:text-md-on-surface'
                    }`}
                    title="Email Preview Only"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Preview</span>
                  </button>
                </div>
              </div>

              {/* Subject Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant flex items-center justify-between">
                  <span>Subject Line</span>
                  <span className="text-[11px] font-normal lowercase opacity-70">supports dynamic placeholders</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => handleSubjectChange(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-md-outline/30 bg-md-surface text-md-on-surface focus:outline-none focus:border-md-primary font-medium"
                />
              </div>

              {/* Dynamic Variables Pill Bar */}
              <div className="flex flex-col gap-2 bg-md-surface-container/60 p-3.5 rounded-2xl border border-md-outline/15">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-md-on-surface-variant pb-1 border-b border-md-outline/10">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles size={14} className="text-md-primary" />
                      Available Placeholders
                    </span>
                    <span className="text-[11px] opacity-75 hidden sm:inline">(Click to insert tag at cursor position)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInsertButtonSnippet}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
                    title="Insert pre-styled responsive Action Button snippet into editor"
                  >
                    <ExternalLink size={12} />
                    <span>+ Insert Action Button</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-[140px] overflow-y-auto">
                  {Array.from(new Set([...(currentMeta?.suggestedVariables || []), ...detectedVariables, ...GLOBAL_PLACEHOLDERS])).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariable(v)}
                      className={`group text-xs font-mono px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                        copiedVar === v
                          ? 'bg-emerald-700 text-white border-emerald-600'
                          : 'bg-md-surface border-md-outline/30 text-md-on-surface hover:border-md-primary hover:text-md-primary'
                      }`}
                      title={`Click to insert {{${v}}}`}
                    >
                      <span>{`{{${v}}}`}</span>
                      {copiedVar === v ? <Check size={11} /> : <Plus size={11} className="opacity-50 group-hover:opacity-100" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Content Editor & Preview Layout */}
              <div className={`grid gap-4 ${viewMode === 'split' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Code Editor Panel */}
                {(viewMode === 'split' || viewMode === 'edit') && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-md-on-surface-variant">
                      <span className="flex items-center gap-1.5">
                        <FileCode size={14} />
                        HTML Template Markup
                      </span>
                      <span className="text-[11px] font-mono opacity-70">HTML / JetBrains Mono</span>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden border border-md-outline/25 bg-neutral-900 shadow-inner">
                      <textarea
                        ref={textareaRef}
                        rows={viewMode === 'split' ? 18 : 22}
                        value={bodyContent}
                        onChange={e => handleBodyChange(e.target.value)}
                        placeholder="Enter HTML template content..."
                        spellCheck={false}
                        className="w-full p-4 font-mono text-xs leading-relaxed bg-transparent text-neutral-100 resize-y focus:outline-none focus:ring-1 focus:ring-md-primary"
                        style={{ minHeight: '380px', fontFamily: '"JetBrains Mono", monospace' }}
                      />
                    </div>
                  </div>
                )}

                {/* Email Mockup Preview Panel */}
                {(viewMode === 'split' || viewMode === 'preview') && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-md-on-surface-variant">
                      <span className="flex items-center gap-1.5">
                        <Eye size={14} />
                        Simulated In-box Preview
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Mock Data Injected
                      </span>
                    </div>

                    {/* Email Window Mock */}
                    <div className="rounded-2xl border border-md-outline/30 bg-md-surface overflow-hidden shadow-sm flex flex-col" style={{ minHeight: '380px' }}>
                      {/* Window title bar */}
                      <div className="bg-md-surface-container-high px-4 py-2.5 border-b border-md-outline/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <span className="text-md-on-surface-variant text-[11px] font-medium ml-2">Webmail Client Simulator</span>
                        </div>
                      </div>

                      {/* Header fields */}
                      <div className="px-5 py-3.5 bg-md-surface-container/40 border-b border-md-outline/15 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-md-on-surface-variant font-medium w-14">From:</span>
                          <span className="text-md-on-surface font-semibold font-mono text-[11px]">
                            FCR-SCS System &lt;noreply@fcrscs.gov.my&gt;
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-md-on-surface-variant font-medium w-14">To:</span>
                          <span className="text-md-on-surface font-mono text-[11px]">
                            recipient@example.com
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-md-on-surface-variant font-medium w-14">Subject:</span>
                          <span className="text-md-on-surface font-semibold">
                            {previewSubject || '(No subject)'}
                          </span>
                        </div>
                      </div>

                      {/* Rendered Email Body */}
                      <div className="p-6 overflow-y-auto flex-1 bg-white text-neutral-900 text-sm">
                        <div
                          className="email-rendered-preview"
                          dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-md-outline/15">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetStock}
                    disabled={isResetting}
                    className="flex items-center gap-1.5 text-xs text-md-on-surface-variant hover:text-rose-500 font-medium px-3 py-2 rounded-xl transition-colors"
                  >
                    <RotateCcw size={14} />
                    <span>Reset to Stock Default</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {isDirty && (
                    <MD3Button
                      variant="tonal"
                      onClick={handleDiscardChanges}
                      disabled={isSaving}
                      className="text-xs"
                    >
                      Discard Edits
                    </MD3Button>
                  )}
                  <MD3Button
                    variant="filled"
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                    className="flex items-center gap-2"
                  >
                    <Save size={16} />
                    <span>{isSaving ? 'Saving Template...' : 'Save Template'}</span>
                  </MD3Button>
                </div>
              </div>
            </MD3Card>
          ) : (
            <MD3Card elevation={1} className="p-12 text-center text-md-on-surface-variant">
              Select an email template from the list to view and customize its format.
            </MD3Card>
          )}
        </div>
      </div>

      {/* Modal: Confirm Reset to Stock Default */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Restore Stock Default?"
        subtitle="Resetting will overwrite any customized changes with system defaults."
        maxWidth="max-w-md"
        confirmText={isResetting ? "Restoring..." : "Restore Default"}
        cancelText="Cancel"
        confirmVariant="danger"
        confirmDisabled={isResetting}
        onConfirm={executeResetStock}
      >
        <div className="py-2 text-sm text-md-on-surface-variant space-y-3">
          <p>
            Are you sure you want to reset <strong className="font-mono text-md-on-surface">{selectedTemplateName}</strong> back to the official stock template?
          </p>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>This action cannot be undone. All customized HTML styling and subject revisions will be permanently restored to stock defaults.</span>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Discard Changes on Switch */}
      <Modal
        isOpen={pendingSwitchTmpl !== null}
        onClose={() => setPendingSwitchTmpl(null)}
        title="Discard Unsaved Changes?"
        subtitle="You have unsaved edits in the active template."
        maxWidth="max-w-md"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        confirmVariant="danger"
        onConfirm={() => {
          if (pendingSwitchTmpl) {
            applySelectTemplate(pendingSwitchTmpl);
            setPendingSwitchTmpl(null);
          }
        }}
      >
        <div className="py-2 text-sm text-md-on-surface-variant space-y-3">
          <p>
            You have unsaved changes in <strong className="font-mono text-md-on-surface">{selectedTemplateName}</strong>. If you switch to <strong className="font-mono text-md-on-surface">{pendingSwitchTmpl?.templateName}</strong> now, your modifications will be discarded.
          </p>
          <p className="text-xs text-md-on-surface-variant">
            Click <strong>Discard Changes</strong> to proceed without saving, or <strong>Keep Editing</strong> to stay on this template.
          </p>
        </div>
      </Modal>

      {/* Modal: Add New Template (Fallback) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Custom Email Template"
        subtitle="Define a new email template key, subject, and body format."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateTemplate} className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-xs font-semibold text-md-on-surface-variant block mb-1">
              Template Key Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. VALUATION_REPORT_READY"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value.toUpperCase())}
              required
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-md-outline/30 bg-transparent text-md-on-surface font-mono"
            />
            <span className="text-[11px] text-md-on-surface-variant mt-1 block">
              Auto-formatted to uppercase alphanumeric characters with underscores.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-md-on-surface-variant block mb-1">
              Subject Line <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. FCR-SCS: Valuation Report Completed for Case {{caseId}}"
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-md-outline/30 bg-transparent text-md-on-surface"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-md-on-surface-variant block mb-1">
              Initial HTML Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={8}
              value={newBodyContent}
              onChange={e => setNewBodyContent(e.target.value)}
              required
              className="w-full p-3 text-xs font-mono rounded-xl border border-md-outline/30 bg-neutral-900 text-neutral-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-md-outline/20">
            <MD3Button
              type="button"
              variant="tonal"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </MD3Button>
            <MD3Button
              type="submit"
              variant="filled"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Template'}
            </MD3Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
