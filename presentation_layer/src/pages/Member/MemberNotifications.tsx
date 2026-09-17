import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Filter,
  Info,
  AlertTriangle,
  Zap,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  InboxIcon,
  CalendarDays,
  FileText,
} from 'lucide-react';
import { useRole } from '../../hooks/useRole';
import { useNotification } from '../../components/ui/NotificationSystem';
import { alertService } from '../../services/alert.service';
import type { SystemAlertItem } from '../../services/alert.service';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'unacknowledged' | 'acknowledged';

const URGENCY_CONFIG: Record<
  string,
  { label: string; textCls: string; bgCls: string; borderCls: string; icon: React.ReactNode }
> = {
  LOW: {
    label: 'Low',
    textCls: 'text-slate-600',
    bgCls: 'bg-slate-100',
    borderCls: 'border-slate-200',
    icon: <Info size={14} />,
  },
  MEDIUM: {
    label: 'Medium',
    textCls: 'text-blue-700',
    bgCls: 'bg-blue-50',
    borderCls: 'border-blue-200',
    icon: <Info size={14} />,
  },
  HIGH: {
    label: 'High',
    textCls: 'text-amber-700',
    bgCls: 'bg-amber-50',
    borderCls: 'border-amber-200',
    icon: <AlertTriangle size={14} />,
  },
  CRITICAL: {
    label: 'Critical',
    textCls: 'text-rose-700',
    bgCls: 'bg-rose-50',
    borderCls: 'border-rose-200',
    icon: <Zap size={14} />,
  },
  SECURITY: {
    label: 'Security',
    textCls: 'text-purple-700',
    bgCls: 'bg-purple-50',
    borderCls: 'border-purple-200',
    icon: <ShieldAlert size={14} />,
  },
};

function formatAlertType(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const MemberNotifications: React.FC = () => {
  useDocumentTitle('Notifications');
  const { userName } = useRole();
  const { notify } = useNotification();

  const [alerts, setAlerts] = useState<SystemAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set());
  const [acknowledgingAll, setAcknowledgingAll] = useState(false);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 12;

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async (currentPage = 1, status: FilterStatus = 'all') => {
    setLoading(true);
    try {
      const res = await alertService.fetchAlerts({
        page: currentPage,
        limit: PAGE_SIZE,
        status: status === 'all' ? 'all' : status,
      });
      setAlerts(res.alerts || []);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotalCount(res.pagination?.totalCount ?? 0);
    } catch (err) {
      console.error('[MemberNotifications] fetchAlerts error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(page, filterStatus);
  }, [fetchAlerts, page, filterStatus]);

  // ── Acknowledge single ───────────────────────────────────────────────────
  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging((prev) => new Set(prev).add(alertId));
    try {
      await alertService.acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) =>
          a.alertId === alertId
            ? { ...a, isAcknowledged: true, acknowledgedAt: new Date().toISOString() }
            : a
        )
      );
      notify({ type: 'success', title: 'Acknowledged', message: 'Notification marked as acknowledged.' });
    } catch {
      notify({ type: 'error', title: 'Error', message: 'Failed to acknowledge notification. Please try again.' });
    } finally {
      setAcknowledging((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  // ── Acknowledge all ──────────────────────────────────────────────────────
  const handleAcknowledgeAll = async () => {
    setAcknowledgingAll(true);
    try {
      const result = await alertService.acknowledgeAllAlerts();
      notify({
        type: 'success',
        title: 'All Acknowledged',
        message: `${result.count} notification${result.count !== 1 ? 's' : ''} marked as acknowledged.`,
      });
      fetchAlerts(page, filterStatus);
    } catch {
      notify({ type: 'error', title: 'Error', message: 'Failed to acknowledge all notifications.' });
    } finally {
      setAcknowledgingAll(false);
    }
  };

  // ── Filter change ────────────────────────────────────────────────────────
  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
    setPage(1);
  };

  const unacknowledgedCount = alerts.filter((a) => !a.isAcknowledged).length;
  const hasUnacknowledged = unacknowledgedCount > 0 || filterStatus !== 'acknowledged';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto pt-6 sm:pt-8 pb-12 px-4 sm:px-6 space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-md-outline/15">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700">
              Notifications
            </span>
            <span className="text-xs text-md-on-surface-variant">Member Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-md-on-surface flex items-center gap-2">
            <Bell size={22} className="text-violet-600" />
            My Notifications
          </h1>
          <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
            Receive and acknowledge updates related to your land acquisition cases.
          </p>
        </div>
        <Link
          to="/member"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-md-primary hover:underline self-start sm:self-center shrink-0"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* ── Filter Bar & Actions ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Filter pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-full">
          <Filter size={13} className="text-slate-400 ml-1.5" />
          {(
            [
              { value: 'all', label: 'All' },
              { value: 'unacknowledged', label: 'Unread' },
              { value: 'acknowledged', label: 'Acknowledged' },
            ] as { value: FilterStatus; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleFilterChange(value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                filterStatus === value
                  ? 'bg-white text-violet-700 shadow-sm border border-violet-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Acknowledge all — only visible when there are unacknowledged items */}
          {filterStatus !== 'acknowledged' && unacknowledgedCount > 0 && (
            <button
              type="button"
              onClick={handleAcknowledgeAll}
              disabled={acknowledgingAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-60 shadow-sm"
            >
              {acknowledgingAll ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ClipboardCheck size={13} />
              )}
              Mark All as Read
            </button>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={() => fetchAlerts(page, filterStatus)}
            disabled={loading}
            title="Refresh"
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Notifications List ───────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-md-on-surface-variant">
          <Loader2 size={32} className="animate-spin text-violet-500 mb-3" />
          <p className="text-sm">Loading notifications…</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <InboxIcon size={28} className="text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-md-on-surface mb-1">No notifications</h3>
          <p className="text-sm text-md-on-surface-variant max-w-xs">
            {filterStatus === 'unacknowledged'
              ? 'You have no unread notifications. All caught up!'
              : filterStatus === 'acknowledged'
              ? 'No acknowledged notifications yet.'
              : 'You have not received any notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const urgencyCfg = URGENCY_CONFIG[alert.urgencyLevel] ?? URGENCY_CONFIG.MEDIUM;
            const isBeingAcknowledged = acknowledging.has(alert.alertId);

            return (
              <div
                key={alert.alertId}
                className={`relative bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                  alert.isAcknowledged
                    ? 'border-slate-100 opacity-70'
                    : 'border-violet-200/60 ring-1 ring-violet-100'
                }`}
              >
                {/* Left accent bar — colour-coded by urgency */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                    alert.isAcknowledged ? 'bg-slate-200' : urgencyCfg.bgCls.replace('bg-', 'bg-').replace('-50', '-400').replace('-100', '-400')
                  }`}
                />

                <div className="pl-4 pr-5 py-4">
                  {/* Top row: alert type + urgency badge + timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {/* Unread dot */}
                      {!alert.isAcknowledged && (
                        <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-md-on-surface uppercase tracking-wide">
                        {formatAlertType(alert.alertType)}
                      </span>
                      {/* Urgency badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${urgencyCfg.textCls} ${urgencyCfg.bgCls} ${urgencyCfg.borderCls}`}
                      >
                        {urgencyCfg.icon}
                        {urgencyCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-md-on-surface-variant">
                      <CalendarDays size={12} />
                      {formatDate(alert.createdAt)}
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-md-on-surface leading-relaxed">
                    {alert.message}
                  </p>

                  {/* Case reference */}
                  {alert.caseReference && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                      <FileText size={12} />
                      Case: {alert.caseReference}
                    </div>
                  )}

                  {/* Bottom row: acknowledged stamp OR acknowledge button */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {alert.isAcknowledged ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        Acknowledged
                        {alert.acknowledgedAt && (
                          <span className="text-md-on-surface-variant font-normal">
                            · {formatDate(alert.acknowledgedAt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <span className="text-[11px] text-md-on-surface-variant italic">
                          Action required — please acknowledge to confirm receipt
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(alert.alertId)}
                          disabled={isBeingAcknowledged}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-60 shrink-0 shadow-sm"
                        >
                          {isBeingAcknowledged ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          Acknowledge
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-md-on-surface-variant">
            Showing page {page} of {totalPages} &nbsp;·&nbsp; {totalCount} total
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition disabled:opacity-40 shadow-sm"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-medium text-md-on-surface px-2">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition disabled:opacity-40 shadow-sm"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
