import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  Clock,
  Check,
  RotateCcw,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Play,
  Filter,
  CheckCheck,
  Send,
  ChevronDown,
} from 'lucide-react';
import { MD3Button } from '../MD3Components';
import '../LandAcquisition/case_management.css';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAuth } from '../../context/AuthContext';
import {
  alertService,
  type SystemAlertItem,
  type AlertStats,
  type AlertRuleItem,
  type EmailTemplateSummary,
} from '../../services/alert.service';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'unacknowledged', label: 'Unacknowledged' },
  { value: 'acknowledged', label: 'Acknowledged' },
];

const URGENCY_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Urgencies' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const ACTIVITY_TYPE_PRESETS: SelectOption[] = [
  { value: '*', label: '* All Events (Wildcard)' },
  // Land Acquisition & Case Management
  { value: 'CASE_CREATED', label: 'Land Acquisition: Case Created' },
  { value: 'CASE_UPDATED', label: 'Land Acquisition: Case Updated' },
  { value: 'CASE_DELETED', label: 'Land Acquisition: Case Deleted' },
  { value: 'VALUER_ASSIGNED', label: 'Land Acquisition: Valuer Assigned' },
  { value: 'VALUATION_REPORT_CREATED', label: 'Valuation: Report Submitted' },
  { value: 'VALUATION_REPORT_APPROVED', label: 'Valuation: Report Approved' },
  { value: 'VALUATION_REPORT_REJECTED', label: 'Valuation: Report Rejected' },
  // Compensation Management
  { value: 'COMPENSATION_REPORT_CREATED', label: 'Compensation: Report Created' },
  { value: 'COMPENSATION_REPORT_APPROVED', label: 'Compensation: Report Approved' },
  { value: 'COMPENSATION_REPORT_REJECTED', label: 'Compensation: Report Rejected' },
  { value: 'OFFER_LETTER_CREATED', label: 'Offer Letter: Form H Generated' },
  { value: 'OFFER_LETTER_ACCEPTED', label: 'Offer Letter: Accepted by Landowner' },
  { value: 'OFFER_LETTER_REJECTED', label: 'Offer Letter: Declined by Landowner' },
  { value: 'OBJECTION_FILED', label: 'Objection: Form N Filed' },
  { value: 'OBJECTION_REVIEWED', label: 'Objection: Reviewed & Decided' },
  { value: 'OBJECTION_WITHDRAWN', label: 'Objection: Withdrawn / Deleted' },
  // System & Security
  { value: 'SECURITY_ALERT_BRUTE_FORCE_THROTTLED', label: 'Security: Brute Force Throttling' },
  { value: 'ADMIN_USER_PROVISIONED', label: 'User Admin: Account Provisioned' },
  { value: 'ROLE_PERMISSIONS_UPDATED', label: 'Security: Role Permissions Modified' },
  { value: 'USER_STATUS_CHANGE', label: 'User Admin: Status Change' },
  { value: 'EMAIL_TEMPLATE_MODIFIED', label: 'Settings: Email Template Modified' },
  { value: 'PAYMENT_AUTHORISATION_SIGNED', label: 'Finance: Payment Authorisation Co-Signed' },
  // AI Valuation
  { value: 'AI_VALUATION_GENERATED', label: 'AI Valuation: Valuation Generated' },
  { value: 'AI_MODEL_RETRAINED', label: 'AI Valuation: Model Retrained Successfully' },
  { value: 'AI_MODEL_RETRAIN_FAILED', label: 'AI Valuation: Model Retraining Failed' },
  { value: 'AI_MODEL_ACTIVATED', label: 'AI Valuation: New Model Activated' },
  { value: 'AI_MODEL_DISCARDED', label: 'AI Valuation: Candidate Model Discarded' },
  // Reporting & Analytics
  { value: 'REPORT_GENERATED', label: 'Reporting: Report Generated (JSON View)' },
  { value: 'REPORT_EXPORTED', label: 'Reporting: Report Exported (PDF)' },
  // Smart Contract & Blockchain
  { value: 'BLOCKCHAIN_NETWORK_SWITCHED', label: 'Blockchain: Network Switched' },
  { value: 'BLOCKCHAIN_CLAIM_ACQUIRED', label: 'Blockchain: Publish Lock Acquired' },
  { value: 'BLOCKCHAIN_CLAIM_RELEASED', label: 'Blockchain: Publish Lock Released' },
  { value: 'BLOCKCHAIN_MILESTONE1_NOTARIZED', label: 'Blockchain: Milestone 1 (Award) Notarized' },
  { value: 'BLOCKCHAIN_MILESTONE2_NOTARIZED', label: 'Blockchain: Milestone 2 (Settlement) Notarized' },
  { value: 'BLOCKCHAIN_DOCUMENT_VERIFIED', label: 'Blockchain: Document Integrity Verified' },
  // Payment: Bank Details
  { value: 'CITIZEN_BANK_DETAILS_SUBMITTED', label: 'Payment: Member Submitted Bank Details' },
  { value: 'BANK_DETAILS_UPDATED', label: 'Payment: Default Bank Details Updated' },
  { value: 'PAYMENT_BANK_DETAILS_REQUESTED', label: 'Payment: Admin Requested Updated Bank Details' },
  // Payment: Workflow
  { value: 'PAYMENT_TRANSFER_INITIATED', label: 'Payment: Transfer Initiated (Awaiting Co-Sig)' },
  { value: 'PAYMENT_DISBURSEMENT_EXECUTED', label: 'Payment: Disbursement Sent to Bank' },
  { value: 'PAYMENT_TRANSFER_REJECTED', label: 'Payment: Transfer Rejected by Admin' },
  { value: 'PAYMENT_REJECTION_RESOLVED', label: 'Payment: Rejection Resolved' },
  { value: 'PAYMENT_TRANSFER_CANCELLED', label: 'Payment: Transfer Cancelled (Terminal)' },
  // Payment: Bank Clearance
  { value: 'BANK_TRANSFER_APPROVED', label: 'Payment: Bank Clearance Approved' },
  { value: 'BANK_TRANSFER_REJECTED', label: 'Payment: Bank Clearance Rejected (Gateway Error)' },
  { value: 'PAYMENT_TRANSFER_RETRIED', label: 'Payment: Transfer Retried' },
  { value: 'PAYMENT_TRANSFER_SCHEDULED_NEXT_DAY', label: 'Payment: Transfer Rescheduled to Next Day' },
  { value: 'PAYMENT_RECEIPT_CONFIRMED', label: 'Payment: Receipt Confirmed (PAID / M2 Ready)' },
  // Payment: Dispute
  { value: 'PAYMENT_DISPUTE_FILED', label: 'Payment: Dispute Filed by Member' },
  { value: 'PAYMENT_DISPUTE_RESOLVED', label: 'Payment: Dispute Resolved (Mark as Resolved)' },
  { value: 'PAYMENT_DISPUTE_REINITIATED', label: 'Payment: Dispute Resolved (Reinitiate Payment)' },
  { value: 'PAYMENT_DISPUTE_DETAILS_REQUESTED', label: 'Payment: Dispute Resolved (New Bank Details Requested)' },
];

const TARGET_ROLES_LIST = [
  { value: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator', short: 'Sys Admin' },
  { value: 'GOVERNMENT_ADMINISTRATOR', label: 'Government Administrator', short: 'Gov Admin' },
  { value: 'GOVERNMENT_OFFICER', label: 'Government Officer', short: 'Gov Officer' },
  { value: 'LAND_VALUER', label: 'Land Valuer', short: 'Valuer' },
  { value: 'DISPLACED_COMMUNITY_MEMBER', label: 'Displaced Community Member', short: 'Community Member' },
];

const renderTargetAudiencePills = (targetRole: string | null) => {
  if (!targetRole) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-md-secondary-container text-md-on-secondary-container">
        Sys Admin
      </span>
    );
  }

  const normalized = targetRole.replace(/ALL[\s_]ADMINS?/gi, 'SYSTEM_ADMINISTRATOR,GOVERNMENT_ADMINISTRATOR');
  const roles = normalized.split(',').map((r) => r.trim()).filter(Boolean);
  return roles.map((r) => {
    const matched = TARGET_ROLES_LIST.find((item) => item.value === r);
    const label = matched ? matched.short : r.replace(/_/g, ' ');
    return (
      <span
        key={r}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-md-secondary-container text-md-on-secondary-container"
      >
        {label}
      </span>
    );
  });
};

const SEVERITY_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'INFO', label: 'INFO (Low threshold)' },
  { value: 'WARNING', label: 'WARNING' },
  { value: 'CRITICAL', label: 'CRITICAL' },
  { value: 'SECURITY', label: 'SECURITY (Highest threshold)' },
  { value: 'ALL', label: 'ALL Severities' },
];

const URGENCY_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'LOW', label: 'LOW' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'CRITICAL', label: 'CRITICAL' },
];

const RULES_ROLE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator' },
  { value: 'GOVERNMENT_ADMINISTRATOR', label: 'Government Administrator' },
  { value: 'GOVERNMENT_OFFICER', label: 'Government Officer' },
  { value: 'LAND_VALUER', label: 'Land Valuer' },
  { value: 'DISPLACED_COMMUNITY_MEMBER', label: 'Community Member' },
];

const RULES_CHANNEL_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Channels' },
  { value: 'in_app', label: 'In-App Alerts' },
  { value: 'email', label: 'Statutory Emails' },
  { value: 'both', label: 'Dual Dispatch (In-App & Email)' },
];

const RULES_STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active Rules' },
  { value: 'inactive', label: 'Inactive Rules' },
];

const RULES_URGENCY_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical / Security' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low / Info' },
];

export const AlertMonitoring: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';

  // Navigation tab (Only System Admin can switch to rules; others always stay on feed)
  const [activeTab, setActiveTab] = useState<'feed' | 'rules'>('feed');

  // Alerts Feed State
  const [alerts, setAlerts] = useState<SystemAlertItem[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const pageSize = 10;

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Rules State
  const [rules, setRules] = useState<AlertRuleItem[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateSummary[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<AlertRuleItem | null>(null);
  const [isSubmittingRule, setIsSubmittingRule] = useState<boolean>(false);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);

  // Rules Search, Filter & Pagination State
  const [rulesSearchQuery, setRulesSearchQuery] = useState<string>('');
  const [rulesRoleFilter, setRulesRoleFilter] = useState<string>('all');
  const [rulesChannelFilter, setRulesChannelFilter] = useState<string>('all');
  const [rulesStatusFilter, setRulesStatusFilter] = useState<string>('all');
  const [rulesUrgencyFilter, setRulesUrgencyFilter] = useState<string>('all');
  const [rulesPage, setRulesPage] = useState<number>(1);
  const rulesPageSize = 10;

  // Inspect Alert Modal
  const [inspectAlert, setInspectAlert] = useState<SystemAlertItem | null>(null);

  // Delete Rule Confirmation Modal
  const [ruleToDelete, setRuleToDelete] = useState<AlertRuleItem | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState<boolean>(false);

  // Alert rule options
  const emailTemplateOptions: SelectOption[] = React.useMemo(() => {
    if (!emailTemplates || emailTemplates.length === 0) {
      return [{ value: 'SYSTEM_ALERT', label: 'SYSTEM_ALERT' }];
    }
    return emailTemplates.map((tmpl) => ({
      value: tmpl.templateName,
      label: tmpl.templateName,
    }));
  }, [emailTemplates]);

  // Rule Form State
  const [ruleForm, setRuleForm] = useState({
    ruleName: '',
    description: '',
    activityType: '*',
    moduleName: '*',
    minSeverity: 'INFO',
    triggerInApp: true,
    triggerEmail: false,
    urgencyLevel: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    emailTemplateName: 'SYSTEM_ALERT',
    targetRole: 'SYSTEM_ADMINISTRATOR',
    isEnabled: true,
  });

  // Ensure non-system admins can never stay on the rules tab
  useEffect(() => {
    if (!isSystemAdmin && activeTab !== 'feed') {
      setActiveTab('feed');
    }
  }, [isSystemAdmin, activeTab]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch alert stats
  const loadStats = useCallback(async () => {
    try {
      const data = await alertService.fetchAlertStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load alert stats:', err);
    }
  }, []);

  // Fetch alerts
  const loadAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);
    try {
      const res = await alertService.fetchAlerts({
        page: currentPage,
        limit: pageSize,
        status: statusFilter,
        urgency: urgencyFilter,
        search: debouncedSearch,
      });
      setAlerts(res.alerts);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.totalCount);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      notify({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to retrieve system alerts from the server.',
      });
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [currentPage, statusFilter, urgencyFilter, debouncedSearch, notify]);

  // Fetch routing rules
  const loadRules = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const [rulesData, templatesData] = await Promise.all([
        alertService.fetchAlertRules(),
        alertService.fetchEmailTemplates(),
      ]);
      setRules(rulesData);
      setEmailTemplates(templatesData);
    } catch (err) {
      console.error('Failed to load alert rules:', err);
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

  // Filtered and paginated notification rules
  const filteredRules = React.useMemo(() => {
    return rules.filter((r) => {
      // Search text
      if (rulesSearchQuery.trim()) {
        const q = rulesSearchQuery.toLowerCase();
        const matchesName = r.ruleName?.toLowerCase().includes(q);
        const matchesDesc = r.description?.toLowerCase().includes(q);
        const matchesActivity = r.activityType?.toLowerCase().includes(q);
        const matchesModule = r.moduleName?.toLowerCase().includes(q);
        const matchesTemplate = r.emailTemplateName?.toLowerCase().includes(q);
        const matchesId = r.ruleId?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesActivity && !matchesModule && !matchesTemplate && !matchesId) {
          return false;
        }
      }

      // Role filter
      if (rulesRoleFilter !== 'all') {
        if (!r.targetRole || !r.targetRole.includes(rulesRoleFilter)) {
          return false;
        }
      }

      // Channel filter
      if (rulesChannelFilter === 'in_app' && !r.triggerInApp) return false;
      if (rulesChannelFilter === 'email' && !r.triggerEmail) return false;
      if (rulesChannelFilter === 'both' && (!r.triggerInApp || !r.triggerEmail)) return false;

      // Status filter
      if (rulesStatusFilter === 'active' && !r.isEnabled) return false;
      if (rulesStatusFilter === 'inactive' && r.isEnabled) return false;

      // Urgency / Severity filter
      if (rulesUrgencyFilter !== 'all') {
        const sev = (r.minSeverity || '').toUpperCase();
        const urg = (r.urgencyLevel || '').toUpperCase();
        if (rulesUrgencyFilter === 'CRITICAL') {
          if (sev !== 'CRITICAL' && sev !== 'SECURITY' && urg !== 'CRITICAL') return false;
        } else if (rulesUrgencyFilter === 'LOW') {
          if (sev !== 'LOW' && sev !== 'INFO' && urg !== 'LOW') return false;
        } else {
          if (sev !== rulesUrgencyFilter && urg !== rulesUrgencyFilter) return false;
        }
      }

      return true;
    });
  }, [rules, rulesSearchQuery, rulesRoleFilter, rulesChannelFilter, rulesStatusFilter, rulesUrgencyFilter]);

  const totalRulesPages = Math.ceil(filteredRules.length / rulesPageSize) || 1;
  const paginatedRules = React.useMemo(() => {
    const start = (rulesPage - 1) * rulesPageSize;
    return filteredRules.slice(start, start + rulesPageSize);
  }, [filteredRules, rulesPage, rulesPageSize]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (activeTab === 'rules') {
      loadRules();
    }
  }, [activeTab, loadRules]);

  // Single alert acknowledge
  const handleAcknowledge = async (alertId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await alertService.acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((item) => (item.alertId === alertId ? { ...item, isAcknowledged: true, acknowledgedAt: updated.acknowledgedAt } : item))
      );
      if (inspectAlert && inspectAlert.alertId === alertId) {
        setInspectAlert((prev) => (prev ? { ...prev, isAcknowledged: true, acknowledgedAt: updated.acknowledgedAt } : null));
      }
      loadStats();
      notify({
        type: 'success',
        title: 'Alert Acknowledged',
        message: 'The operational notice has been marked as acknowledged.',
      });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Acknowledgement Failed',
        message: 'Could not update alert status. Please try again.',
      });
    }
  };

  // Bulk acknowledge all alerts
  const handleAcknowledgeAll = async () => {
    if (stats && stats.unacknowledgedAlerts === 0) return;
    try {
      const res = await alertService.acknowledgeAllAlerts();
      notify({
        type: 'success',
        title: 'All Alerts Acknowledged',
        message: `${res.count} pending alert(s) marked as acknowledged.`,
      });
      loadAlerts();
      loadStats();
    } catch (err) {
      notify({
        type: 'error',
        title: 'Action Failed',
        message: 'Failed to batch acknowledge alerts.',
      });
    }
  };

  // Open modal for new rule
  const handleOpenNewRuleModal = () => {
    setEditingRule(null);
    setRuleForm({
      ruleName: '',
      description: '',
      activityType: '*',
      moduleName: '*',
      minSeverity: 'INFO',
      triggerInApp: true,
      triggerEmail: false,
      urgencyLevel: 'MEDIUM',
      emailTemplateName: emailTemplates[0]?.templateName || 'SYSTEM_ALERT',
      targetRole: 'SYSTEM_ADMINISTRATOR',
      isEnabled: true,
    });
    setIsRuleModalOpen(true);
  };

  // Open modal to edit rule
  const handleOpenEditRuleModal = (rule: AlertRuleItem) => {
    setEditingRule(rule);
    setRuleForm({
      ruleName: rule.ruleName,
      description: rule.description || '',
      activityType: rule.activityType,
      moduleName: rule.moduleName,
      minSeverity: rule.minSeverity,
      triggerInApp: rule.triggerInApp,
      triggerEmail: rule.triggerEmail,
      urgencyLevel: rule.urgencyLevel,
      emailTemplateName: rule.emailTemplateName || 'SYSTEM_ALERT',
      targetRole: rule.targetRole || 'SYSTEM_ADMINISTRATOR',
      isEnabled: rule.isEnabled,
    });
    setIsRuleModalOpen(true);
  };

  // Submit create or update rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.ruleName.trim()) {
      notify({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide a descriptive rule name.',
      });
      return;
    }

    setIsSubmittingRule(true);
    try {
      if (editingRule) {
        await alertService.updateAlertRule(editingRule.ruleId, ruleForm);
        notify({
          type: 'success',
          title: 'Rule Updated',
          message: `Routing rule '${ruleForm.ruleName}' updated successfully.`,
        });
      } else {
        await alertService.createAlertRule(ruleForm);
        notify({
          type: 'success',
          title: 'Rule Created',
          message: `New routing rule '${ruleForm.ruleName}' created and activated.`,
        });
      }
      setIsRuleModalOpen(false);
      loadRules();
      loadStats();
    } catch (err) {
      notify({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save alert rule. Please check input values.',
      });
    } finally {
      setIsSubmittingRule(false);
    }
  };

  // Toggle rule enable/disable
  const handleToggleRuleStatus = async (rule: AlertRuleItem) => {
    try {
      const updated = await alertService.updateAlertRule(rule.ruleId, {
        isEnabled: !rule.isEnabled,
      });
      setRules((prev) =>
        prev.map((item) => (item.ruleId === rule.ruleId ? { ...item, isEnabled: updated.isEnabled } : item))
      );
      loadStats();
      notify({
        type: 'general',
        title: updated.isEnabled ? 'Rule Activated' : 'Rule Deactivated',
        message: `Routing rule '${rule.ruleName}' is now ${updated.isEnabled ? 'active' : 'disabled'}.`,
      });
    } catch {
      notify({
        type: 'error',
        title: 'Status Update Failed',
        message: 'Could not toggle rule status.',
      });
    }
  };

  // Open delete confirmation modal
  const handleDeleteRule = (rule: AlertRuleItem) => {
    setRuleToDelete(rule);
  };

  // Execute delete rule
  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    setIsDeletingRule(true);
    try {
      await alertService.deleteAlertRule(ruleToDelete.ruleId);
      setRules((prev) => prev.filter((item) => item.ruleId !== ruleToDelete.ruleId));
      loadStats();
      notify({
        type: 'success',
        title: 'Rule Deleted',
        message: `Routing rule '${ruleToDelete.ruleName}' has been removed.`,
      });
      setRuleToDelete(null);
    } catch {
      notify({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Could not delete rule.',
      });
    } finally {
      setIsDeletingRule(false);
    }
  };

  // Test trigger rule
  const handleTestTrigger = async (rule: AlertRuleItem) => {
    setTestingRuleId(rule.ruleId);
    try {
      const res = await alertService.testTriggerRule(rule.ruleId);
      notify({
        type: 'success',
        title: 'Test Notification Dispatched',
        message: `Simulated trigger executed. In-App: ${res.inAppCreated ? 'Created' : 'Skipped'}, Email: ${res.emailSent ? 'Sent' : 'Skipped'}.`,
      });
      loadStats();
      if (activeTab === 'feed') {
        loadAlerts();
      }
    } catch {
      notify({
        type: 'error',
        title: 'Simulation Failed',
        message: 'Failed to dispatch test notification.',
      });
    } finally {
      setTestingRuleId(null);
    }
  };

  // Urgency badge renderer
  const renderUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 whitespace-nowrap">
            <AlertCircle size={12} className="shrink-0" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 whitespace-nowrap">
            <AlertTriangle size={12} className="shrink-0" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900 whitespace-nowrap">
            <Info size={12} className="shrink-0" />
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-800 whitespace-nowrap">
            <CheckCircle2 size={12} className="shrink-0" />
            LOW
          </span>
        );
    }
  };

  // Format date helper
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Relative time helper
  const formatRelativeTime = (dateStr: string) => {
    try {
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="main blur-shape-bg">
      {/* PageHeader */}
      <PageHeader
        title="Alert & Notification Center"
        subtitle={
          isSystemAdmin
            ? "Review operational anomalies, acknowledge in-app alerts, and configure event-driven email & alert routing rules."
            : "Review operational anomalies and acknowledge in-app compliance and workflow alerts."
        }
      />

      {/* KPI Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <Bell className="stat-icon text-md-primary" size={32} />
          <div className="stat-label">Total In-App Alerts</div>
          <div className="stat-number">{stats ? stats.totalAlerts : '—'}</div>
        </div>

        <div className="stat-card">
          <AlertCircle className={`stat-icon ${(stats?.unacknowledgedAlerts ?? 0) > 0 ? 'text-amber-500 animate-pulse' : 'text-md-on-surface-variant'}`} size={32} />
          <div className="stat-label">Unacknowledged</div>
          <div className="stat-number">{stats ? stats.unacknowledgedAlerts : '—'}</div>
        </div>

        <div className="stat-card">
          <ShieldAlert className="stat-icon text-md-error" size={32} />
          <div className="stat-label">Critical Urgency</div>
          <div className="stat-number">{stats ? stats.criticalAlerts : '—'}</div>
        </div>

        {isSystemAdmin ? (
          <div className="stat-card">
            <Sliders className="stat-icon text-purple-600 dark:text-purple-400" size={32} />
            <div className="stat-label">Active Routing Rules</div>
            <div className="stat-number">{stats ? stats.activeRules : '—'}</div>
          </div>
        ) : (
          <div className="stat-card">
            <CheckCircle2 className="stat-icon text-green-600 dark:text-green-400" size={32} />
            <div className="stat-label">Acknowledged Alerts</div>
            <div className="stat-number">
              {stats ? (stats.acknowledgedAlerts ?? Math.max(0, stats.totalAlerts - stats.unacknowledgedAlerts)) : '—'}
            </div>
          </div>
        )}
      </div>

      {/* Primary Navigation Tabs - Exclusively available to System Administrators */}
      {isSystemAdmin && (
        <div className="flex items-center gap-3 mb-6 border-b border-md-outline/15 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'feed'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'text-md-on-surface-variant hover:bg-md-on-surface/5 hover:text-md-on-surface'
            }`}
          >
            <Bell size={18} />
            <span>Alerts Feed</span>
            {(stats?.unacknowledgedAlerts ?? 0) > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'feed' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
              }`}>
                {stats?.unacknowledgedAlerts}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'rules'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'text-md-on-surface-variant hover:bg-md-on-surface/5 hover:text-md-on-surface'
            }`}
          >
            <Sliders size={18} />
            <span>Notification & Routing Rules</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-md-secondary-container text-md-on-secondary-container">
              {stats?.activeRules ?? 0}
            </span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ALERTS FEED                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'feed' && (
        <>
          {/* Filter Bar */}
          <div className="filter-bar">
            <SearchInput
              placeholder="Search by message, alert type, or case reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="filter-group">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              />
              <Select
                label="Urgency"
                options={URGENCY_OPTIONS}
                value={urgencyFilter}
                onChange={(val) => {
                  setUrgencyFilter(val);
                  setCurrentPage(1);
                }}
              />
              <MD3Button
                variant="outlined"
                className="h-10 px-4"
                onClick={() => {
                  setStatusFilter('all');
                  setUrgencyFilter('ALL');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
              >
                Clear
              </MD3Button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <div className="left">
              <span className="count">{totalCount}</span> alerts found
              <span style={{ opacity: 0.4, margin: '0 4px' }}>·</span>
              <span style={{ fontSize: '13px' }}>
                Showing {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </span>
            </div>

            <div className="right flex items-center gap-2">
              <MD3Button
                variant="outlined"
                icon={<RotateCcw size={16} />}
                onClick={() => {
                  loadAlerts();
                  loadStats();
                }}
                disabled={isLoadingAlerts}
              >
                Refresh
              </MD3Button>

              <MD3Button
                variant="filled"
                icon={<CheckCheck size={16} />}
                onClick={handleAcknowledgeAll}
                disabled={(stats?.unacknowledgedAlerts ?? 0) === 0}
              >
                Acknowledge All
              </MD3Button>
            </div>
          </div>

          {/* Alerts Feed List */}
          <div className="space-y-3">
            {isLoadingAlerts ? (
              <div className="p-12 text-center text-md-on-surface-variant font-medium bg-md-surface-container-lowest rounded-2xl border border-md-outline/10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-md-primary border-t-transparent mb-3" />
                <p>Loading real-time alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-12 text-center text-md-on-surface-variant bg-md-surface-container-lowest rounded-2xl border border-dashed border-md-outline/30">
                <CheckCircle2 size={48} className="mx-auto text-green-500/60 mb-3" />
                <h3 className="text-lg font-semibold text-md-on-surface mb-1">No Alerts Matching Filter</h3>
                <p className="text-sm">All events and compliance tasks are fully acknowledged or up to date.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.alertId}
                  onClick={() => setInspectAlert(alert)}
                  className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    alert.isAcknowledged
                      ? 'bg-md-surface-container-lowest/70 border-md-outline/15 opacity-80 hover:opacity-100 hover:border-md-outline/30'
                      : 'bg-md-surface-container-lowest border-md-outline/25 shadow-sm hover:shadow-md hover:border-md-primary/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Left Details */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Urgency Icon Avatar */}
                      <div className="shrink-0 mt-0.5">
                        {renderUrgencyBadge(alert.urgencyLevel)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-md-primary/10 text-md-primary border border-md-primary/20">
                            {alert.alertId}
                          </span>
                          <span className="font-mono text-xs font-bold text-md-primary">
                            {alert.alertType}
                          </span>
                          {alert.caseReference && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-md-surface-container text-md-on-surface-variant border border-md-outline/10">
                              {alert.caseReference}
                            </span>
                          )}
                          <span className="text-[11px] px-2 py-0.5 rounded bg-md-secondary-container text-md-on-secondary-container font-medium">
                            {alert.channel}
                          </span>
                        </div>

                        <p className="text-sm text-md-on-surface font-medium line-clamp-2 leading-relaxed mb-2">
                          {alert.message}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-md-on-surface-variant flex-wrap">
                          <span className="inline-flex items-center gap-1 font-mono" title={formatDateTime(alert.createdAt)}>
                            <Clock size={13} />
                            {formatRelativeTime(alert.createdAt)}
                          </span>

                          {alert.recipient && (
                            <span>
                              Target: <strong className="font-medium text-md-on-surface">{alert.recipient.name}</strong> ({alert.recipient.role.replace(/_/g, ' ')})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-md-outline/10">
                      {!alert.isAcknowledged ? (
                        <MD3Button
                          variant="filled"
                          className="h-9 px-3 text-xs"
                          icon={<Check size={16} />}
                          onClick={(e) => handleAcknowledge(alert.alertId, e)}
                        >
                          Acknowledge
                        </MD3Button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-green-700 bg-green-50 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800">
                          <CheckCircle2 size={14} />
                          <span>Acknowledged</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            showInfo={true}
            showPageJump={totalPages > 1}
          />
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NOTIFICATION & ROUTING RULES (SYSTEM ADMIN ONLY)                   */}
      {/* ========================================================================= */}
      {isSystemAdmin && activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Rules Filter Bar */}
          <div className="filter-bar">
            <SearchInput
              placeholder="Search by rule name, event, module, or template..."
              value={rulesSearchQuery}
              onChange={(e) => {
                setRulesSearchQuery(e.target.value);
                setRulesPage(1);
              }}
            />
            <div className="filter-group">
              <Select
                label="Role"
                options={RULES_ROLE_OPTIONS}
                value={rulesRoleFilter}
                onChange={(val) => {
                  setRulesRoleFilter(val);
                  setRulesPage(1);
                }}
              />
              <Select
                label="Channel"
                options={RULES_CHANNEL_OPTIONS}
                value={rulesChannelFilter}
                onChange={(val) => {
                  setRulesChannelFilter(val);
                  setRulesPage(1);
                }}
              />
              <Select
                label="Severity"
                options={RULES_URGENCY_OPTIONS}
                value={rulesUrgencyFilter}
                onChange={(val) => {
                  setRulesUrgencyFilter(val);
                  setRulesPage(1);
                }}
              />
              <Select
                label="Status"
                options={RULES_STATUS_OPTIONS}
                value={rulesStatusFilter}
                onChange={(val) => {
                  setRulesStatusFilter(val);
                  setRulesPage(1);
                }}
              />
              <MD3Button
                variant="outlined"
                className="h-10 px-4"
                onClick={() => {
                  setRulesSearchQuery('');
                  setRulesRoleFilter('all');
                  setRulesChannelFilter('all');
                  setRulesUrgencyFilter('all');
                  setRulesStatusFilter('all');
                  setRulesPage(1);
                }}
              >
                Clear
              </MD3Button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <div className="left">
              <span className="count">{filteredRules.length}</span> routing rules found
              <span style={{ opacity: 0.4, margin: '0 4px' }}>·</span>
              <span style={{ fontSize: '13px' }}>
                Showing {filteredRules.length > 0 ? (rulesPage - 1) * rulesPageSize + 1 : 0}–
                {Math.min(rulesPage * rulesPageSize, filteredRules.length)} of {filteredRules.length}
              </span>
            </div>
            <div className="right flex items-center gap-2">
              <MD3Button
                variant="outlined"
                icon={<RotateCcw size={16} />}
                onClick={loadRules}
                disabled={isLoadingRules}
              >
                Refresh
              </MD3Button>
              <MD3Button
                variant="filled"
                icon={<Plus size={16} />}
                onClick={handleOpenNewRuleModal}
              >
                Create New Rule
              </MD3Button>
            </div>
          </div>

          {/* Rules Table */}
          <div className="table-wrap">
            <div className="table-scroll md-scroll-thin">
              <table className="w-full table-fixed">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Rule & Description</th>
                    <th style={{ width: '22%' }}>Trigger Activity / Module</th>
                    <th style={{ width: '12%' }}>Min Severity</th>
                    <th style={{ width: '18%' }}>Dispatch Channels</th>
                    <th style={{ width: '12%' }}>Target Audience</th>
                    <th style={{ width: '6%' }}>Active</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingRules ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-md-on-surface-variant">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-md-primary border-t-transparent mb-2" />
                        <div>Loading routing rules...</div>
                      </td>
                    </tr>
                  ) : paginatedRules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-md-on-surface-variant">
                        No notification routing rules match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRules.map((rule) => (
                      <tr key={rule.ruleId} className="case-row">
                        {/* Name & Description */}
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm text-md-on-surface">{rule.ruleName}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                              {rule.ruleId}
                            </span>
                          </div>
                          {rule.description && (
                            <div className="text-xs text-md-on-surface-variant/80 line-clamp-1 mt-0.5">
                              {rule.description}
                            </div>
                          )}
                        </td>

                        {/* Trigger Event */}
                        <td>
                          <div className="font-mono text-xs font-bold text-md-primary truncate" title={rule.activityType}>
                            {rule.activityType}
                          </div>
                          <div className="text-[11px] text-md-on-surface-variant mt-0.5">
                            Module: <span className="font-mono">{rule.moduleName}</span>
                          </div>
                        </td>

                        {/* Min Severity */}
                        <td>
                          {renderUrgencyBadge(rule.minSeverity === 'SECURITY' ? 'CRITICAL' : rule.minSeverity)}
                        </td>

                        {/* Channels */}
                        <td>
                          <div className="flex flex-col gap-1 text-xs">
                            {rule.triggerInApp && (
                              <span className="inline-flex items-center gap-1 font-medium text-md-primary">
                                <Bell size={13} />
                                <span>In-App ({rule.urgencyLevel})</span>
                              </span>
                            )}
                            {rule.triggerEmail && (
                              <span className="inline-flex items-center gap-1 font-medium text-purple-700 dark:text-purple-400">
                                <Mail size={13} />
                                <span className="truncate" title={rule.emailTemplateName || 'SYSTEM_ALERT'}>
                                  Email ({rule.emailTemplateName || 'SYSTEM_ALERT'})
                                </span>
                              </span>
                            )}
                            {!rule.triggerInApp && !rule.triggerEmail && (
                              <span className="text-md-on-surface-variant text-[11px] italic">No channels enabled</span>
                            )}
                          </div>
                        </td>

                        {/* Target Audience */}
                        <td className="max-w-[190px] py-3">
                          <div className="flex flex-wrap gap-1">
                            {renderTargetAudiencePills(rule.targetRole)}
                          </div>
                        </td>

                        {/* Active Status Toggle */}
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleRuleStatus(rule)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              rule.isEnabled ? 'bg-md-primary' : 'bg-gray-300 dark:bg-gray-700'
                            }`}
                            title={rule.isEnabled ? 'Click to deactivate rule' : 'Click to activate rule'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                rule.isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleTestTrigger(rule)}
                              disabled={testingRuleId === rule.ruleId}
                              className="p-1.5 rounded-lg text-md-on-surface-variant hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Test / simulate trigger"
                            >
                              <Play size={16} className={testingRuleId === rule.ruleId ? 'animate-spin' : ''} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditRuleModal(rule)}
                              className="p-1.5 rounded-lg text-md-on-surface-variant hover:text-md-primary hover:bg-md-primary/10 transition-colors"
                              title="Edit rule"
                            >
                              <Edit2 size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule)}
                              className="p-1.5 rounded-lg text-md-on-surface-variant hover:text-md-error hover:bg-md-error/10 transition-colors"
                              title="Delete rule"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rules Pagination */}
          <Pagination
            currentPage={rulesPage}
            totalPages={totalRulesPages}
            totalCount={filteredRules.length}
            pageSize={rulesPageSize}
            onPageChange={setRulesPage}
            showInfo={true}
            showPageJump={totalRulesPages > 1}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT ROUTING RULE                                         */}
      {/* ========================================================================= */}
      {isRuleModalOpen && (
        <Modal
          isOpen={isRuleModalOpen}
          onClose={() => setIsRuleModalOpen(false)}
          title={editingRule ? 'Edit Notification Routing Rule' : 'Create Notification Routing Rule'}
          subtitle="Map audit activities to in-app alerts and automated emails."
          maxWidth="max-w-2xl"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outlined"
                size="md"
                onClick={() => setIsRuleModalOpen(false)}
                disabled={isSubmittingRule}
              >
                Cancel
              </Button>
              <Button
                variant="filled"
                size="md"
                onClick={handleSaveRule}
                disabled={isSubmittingRule}
              >
                {isSubmittingRule ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveRule} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-md-on-surface mb-1">
                Rule Name <span className="text-md-error">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-md-outline/30 bg-md-surface focus:outline-none focus:border-md-primary"
                placeholder="e.g. Critical Brute Force Throttling"
                value={ruleForm.ruleName}
                onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-md-on-surface mb-1">
                Description
              </label>
              <textarea
                rows={2}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-md-outline/30 bg-md-surface focus:outline-none focus:border-md-primary"
                placeholder="Brief summary of when this notification fires and who it notifies..."
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 z-20 relative">
                <Select
                  label="Trigger Audit Activity Type"
                  options={ACTIVITY_TYPE_PRESETS}
                  value={ruleForm.activityType}
                  onChange={(val) => setRuleForm({ ...ruleForm, activityType: val })}
                />
              </div>

              <div className="flex flex-col gap-1.5 z-20 relative">
                <Select
                  label="Minimum Severity Threshold"
                  options={SEVERITY_LEVEL_OPTIONS}
                  value={ruleForm.minSeverity}
                  onChange={(val) => setRuleForm({ ...ruleForm, minSeverity: val })}
                />
              </div>
            </div>

            {/* Channels Card */}
            <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/20 space-y-3">
              <div className="font-semibold text-xs text-md-on-surface uppercase tracking-wider">
                Notification Channels
              </div>

              {/* In-App Checkbox & Urgency */}
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-md-on-surface">
                  <input
                    type="checkbox"
                    className="rounded text-md-primary focus:ring-md-primary"
                    checked={ruleForm.triggerInApp}
                    onChange={(e) => setRuleForm({ ...ruleForm, triggerInApp: e.target.checked })}
                  />
                  <span>Trigger In-App Alert Feed</span>
                </label>

                {ruleForm.triggerInApp && (
                  <div className="w-36 z-10 relative">
                    <Select
                      label="Urgency"
                      options={URGENCY_LEVEL_OPTIONS}
                      value={ruleForm.urgencyLevel}
                      onChange={(val) =>
                        setRuleForm({ ...ruleForm, urgencyLevel: val as any })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Email Checkbox & Template */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-md-outline/10">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-md-on-surface">
                  <input
                    type="checkbox"
                    className="rounded text-md-primary focus:ring-md-primary"
                    checked={ruleForm.triggerEmail}
                    onChange={(e) => setRuleForm({ ...ruleForm, triggerEmail: e.target.checked })}
                  />
                  <span>Dispatch Statutory Email</span>
                </label>

                {ruleForm.triggerEmail && (
                  <div className="w-64 z-10 relative">
                    <Select
                      label="Email Template"
                      options={emailTemplateOptions}
                      value={ruleForm.emailTemplateName}
                      onChange={(val) =>
                        setRuleForm({ ...ruleForm, emailTemplateName: val })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Target Audience Multi-selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-md-on-surface">
                  Target Recipient Roles <span className="text-md-error">*</span>
                </label>
                <span className="text-[10px] text-md-primary font-medium">Multi-selection supported</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TARGET_ROLES_LIST.map((opt) => {
                  const selectedRoles = (ruleForm.targetRole || 'SYSTEM_ADMINISTRATOR')
                    .split(',')
                    .map((r) => r.trim())
                    .filter(Boolean);
                  const isChecked = selectedRoles.includes(opt.value);

                  const handleToggle = () => {
                    let next: string[];
                    if (isChecked) {
                      next = selectedRoles.filter((r) => r !== opt.value);
                      if (next.length === 0) next = [opt.value]; // keep at least one
                    } else {
                      next = [...selectedRoles, opt.value];
                    }
                    setRuleForm({ ...ruleForm, targetRole: next.join(',') });
                  };

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={handleToggle}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                        isChecked
                          ? 'bg-md-primary/10 border-md-primary text-md-primary font-semibold shadow-xs'
                          : 'bg-md-surface-container-low border-md-outline/20 text-md-on-surface hover:border-md-outline/40'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isChecked ? 'bg-md-primary border-md-primary text-white' : 'border-md-outline/40'
                      }`}>
                        {isChecked && <Check size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-md-on-surface-variant mt-2 leading-relaxed bg-md-surface-variant/30 p-2.5 rounded-xl border border-md-outline/10">
                💡 <strong>Dynamic Stakeholder Routing:</strong> When an event carries a <code>Case Reference</code> (e.g. <em>LAC-2026-08-0001</em>), notifications route specifically to the involved landowner, assigned officer, or valuer for that case. Events without a case reference broadcast to all users in the selected role(s).
              </p>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-xs font-semibold text-md-on-surface">Rule Status</div>
                <div className="text-xs text-md-on-surface-variant">
                  {ruleForm.isEnabled ? 'Active (evaluates on every audit log)' : 'Inactive (disabled)'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRuleForm({ ...ruleForm, isEnabled: !ruleForm.isEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  ruleForm.isEnabled ? 'bg-md-primary' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    ruleForm.isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECT ALERT DETAILS                                              */}
      {/* ========================================================================= */}
      {inspectAlert && (
        <Modal
          isOpen={Boolean(inspectAlert)}
          onClose={() => setInspectAlert(null)}
          title="Operational Alert Details"
          subtitle={`Alert ID: ${inspectAlert.alertId}`}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-md-on-surface-variant">
                {inspectAlert.isAcknowledged ? (
                  <span className="text-green-600 font-medium">Acknowledged</span>
                ) : (
                  <span className="text-amber-600 font-medium">Pending Acknowledgement</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!inspectAlert.isAcknowledged && (
                  <Button
                    variant="filled"
                    size="md"
                    onClick={() => handleAcknowledge(inspectAlert.alertId)}
                  >
                    Acknowledge Alert
                  </Button>
                )}
                <Button variant="outlined" size="md" onClick={() => setInspectAlert(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-md-surface-container-low border border-md-outline/20 text-xs">
              <div className="col-span-2 pb-2 border-b border-md-outline/10">
                <div className="text-md-on-surface-variant font-medium">Alert Reference ID</div>
                <div className="font-mono text-sm font-bold text-md-primary mt-0.5">
                  {inspectAlert.alertId}
                </div>
              </div>
              <div>
                <div className="text-md-on-surface-variant font-medium">Urgency Level</div>
                <div className="mt-1">{renderUrgencyBadge(inspectAlert.urgencyLevel)}</div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">Notification Channel</div>
                <div className="font-semibold text-md-on-surface mt-1">{inspectAlert.channel}</div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">Activity / Event Type</div>
                <div className="font-mono font-semibold text-md-primary mt-1">
                  {inspectAlert.alertType}
                </div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">Timestamp</div>
                <div className="font-mono text-md-on-surface mt-1">
                  {formatDateTime(inspectAlert.createdAt)}
                </div>
              </div>

              {inspectAlert.caseReference && (
                <div>
                  <div className="text-md-on-surface-variant font-medium">Case Reference</div>
                  <div className="font-mono text-md-on-surface mt-1">
                    {inspectAlert.caseReference}
                  </div>
                </div>
              )}

              {inspectAlert.acknowledgedAt && (
                <div>
                  <div className="text-md-on-surface-variant font-medium">Acknowledged At</div>
                  <div className="font-mono text-green-600 dark:text-green-400 mt-1">
                    {formatDateTime(inspectAlert.acknowledgedAt)}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider mb-1.5">
                Alert Message
              </div>
              <div className="p-3.5 rounded-xl bg-md-surface-container border border-md-outline/20 text-sm font-medium text-md-on-surface leading-relaxed whitespace-pre-wrap">
                {inspectAlert.message}
              </div>
            </div>

            {inspectAlert.recipient && (
              <div className="p-3.5 rounded-xl bg-md-surface-container-lowest border border-md-outline/20">
                <div className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider mb-1">
                  Target Recipient
                </div>
                <div className="text-sm font-medium text-md-on-surface">
                  {inspectAlert.recipient.name} ({inspectAlert.recipient.email})
                </div>
                <div className="text-xs text-md-on-surface-variant mt-0.5">
                  Role: {inspectAlert.recipient.role.replace(/_/g, ' ')}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Rule Confirmation Modal */}
      {ruleToDelete && (
        <Modal
          isOpen={!!ruleToDelete}
          onClose={() => setRuleToDelete(null)}
          title="Delete Notification Rule"
          subtitle="This action will permanently remove this automated dispatch rule."
          confirmText={isDeletingRule ? 'Deleting...' : 'Delete Rule'}
          confirmVariant="danger"
          confirmLoading={isDeletingRule}
          onConfirm={confirmDeleteRule}
          cancelText="Cancel"
        >
          <div className="py-2 space-y-3">
            <p className="text-sm text-md-on-surface">
              Are you sure you want to delete the routing rule <strong className="font-semibold text-rose-600 dark:text-rose-400">"{ruleToDelete.ruleName}"</strong>?
            </p>
            <div className="p-3.5 bg-md-surface-container rounded-xl border border-md-outline/20 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-md-on-surface-variant font-medium">Activity Type:</span>
                <span className="font-mono font-medium text-md-on-surface">{ruleToDelete.activityType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-md-on-surface-variant font-medium">Target Role:</span>
                <span className="font-medium text-md-on-surface">
                  {ruleToDelete.targetRole ? ruleToDelete.targetRole.replace(/_/g, ' ') : (ruleToDelete.targetUserId ? 'Specific User' : 'All Users')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-md-on-surface-variant font-medium">Channels:</span>
                <span className="font-medium text-md-on-surface">
                  {[ruleToDelete.triggerInApp ? 'In-App' : null, ruleToDelete.triggerEmail ? 'Email' : null].filter(Boolean).join(', ') || 'None'}
                </span>
              </div>
            </div>
            <p className="text-xs text-md-on-surface-variant opacity-80 leading-relaxed">
              Once deleted, automated alerts matching this event type will no longer be forwarded to the designated channel.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AlertMonitoring;
