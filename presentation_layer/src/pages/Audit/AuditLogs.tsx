import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Download, 
  RotateCcw, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  FileText, 
  Copy, 
  Check, 
  Calendar,
  Archive,
} from 'lucide-react';
import { MD3Button } from '../MD3Components';
import '../LandAcquisition/case_management.css';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { 
  auditService, 
  type AuditLogItem, 
  type AuditStatsResponse 
} from '../../services/audit.service';

const MODULE_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'USER_MANAGEMENT', label: 'User Management' },
  { value: 'LAND_ACQUISITION', label: 'Land Acquisition' },
  { value: 'COMPENSATION', label: 'Compensation Management' },
  { value: 'PAYMENT', label: 'Payment & Disbursement' },
  { value: 'SMART_CONTRACT', label: 'Smart Contract & Blockchain' },
];

const SEVERITY_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Severities' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'SECURITY', label: 'Security' },
];

const ARCHIVE_OPTIONS: SelectOption[] = [
  { value: 'false', label: 'Active Logs' },
  { value: 'true', label: 'Archived Logs' },
  { value: 'ALL', label: 'All Logs' },
];

const roleFormatMap: Record<string, string> = {
  SYSTEM_ADMINISTRATOR: 'System Admin',
  GOVERNMENT_ADMINISTRATOR: 'Gov Admin',
  GOVERNMENT_OFFICER: 'Gov Officer',
  LAND_VALUER: 'Land Valuer',
  DISPLACED_COMMUNITY_MEMBER: 'Community Member',
};

const formatRole = (role?: string | null) => {
  if (!role) return 'System';
  return roleFormatMap[role] || role.replace(/_/g, ' ');
};

export const AuditLogs: React.FC = () => {
  // Data state
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [archiveFilter, setArchiveFilter] = useState<string>('false');

  // Inspection Modal State
  const [inspectLog, setInspectLog] = useState<AuditLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Audit Logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await auditService.getLogs({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        module: selectedModule,
        severity: selectedSeverity,
        isArchived: archiveFilter,
      });

      setLogs(response.logs);
      setTotalCount(response.pagination.totalCount);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedModule, selectedSeverity, archiveFilter]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const statsData = await auditService.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching audit stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await auditService.exportCsv({
        search: debouncedSearch,
        module: selectedModule,
        severity: selectedSeverity,
        isArchived: archiveFilter,
      });
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedModule('ALL');
    setSelectedSeverity('ALL');
    setArchiveFilter('false');
    setCurrentPage(1);
  };

  // Helper to copy text with 0.5s timeout
  const handleCopy = (text: string, type: 'id' | 'json') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 500);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 500);
    }
  };

  // Formatter for timestamp in Malaysia Time (Asia/Kuala_Lumpur, UTC+8)
  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
    return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
  };

  // Normalizer for IP address (clean localhost display)
  const formatIpAddress = (ip?: string | null) => {
    if (!ip) return '127.0.0.1';
    if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('127.0.0.1')) {
      return '127.0.0.1 (localhost)';
    }
    return ip;
  };

  // Extract actor info safely
  const getActorInfo = (log: AuditLogItem) => {
    if (log.user) {
      return {
        name: log.user.name,
        email: log.user.email,
        isDeleted: false,
      };
    }
    // Check activityDetails fallback for snapshot
    if (log.activityDetails) {
      try {
        const parsed = JSON.parse(log.activityDetails);
        if (parsed.actorName || parsed.actorEmail) {
          return {
            name: parsed.actorName || 'Unknown User',
            email: parsed.actorEmail || 'N/A',
            isDeleted: true,
          };
        }
      } catch {
        // Fallback
      }
    }
    return {
      name: 'System / Anonymous',
      email: 'N/A',
      isDeleted: false,
    };
  };

  // Severity badge renderer
  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'SECURITY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 whitespace-nowrap">
            <ShieldAlert size={12} className="shrink-0" />
            SECURITY
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 whitespace-nowrap">
            <AlertCircle size={12} className="shrink-0" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 whitespace-nowrap">
            <AlertTriangle size={12} className="shrink-0" />
            WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900 whitespace-nowrap">
            <Info size={12} className="shrink-0" />
            INFO
          </span>
        );
    }
  };

  return (
    <div className="main blur-shape-bg">
      {/* Standard Canonical PageHeader */}
      <PageHeader
        title="System Audit Logs"
        subtitle="Real-time compliance monitoring, security event tracking, and immutable audit trails."
      />

      {/* Statistics - Canonical stats-grid identical to UserAdministration */}
      <div className="stats-grid">
        <div className="stat-card">
          <FileText className="stat-icon text-md-primary" size={32} />
          <div className="stat-label">Total Logs</div>
          <div className="stat-number">{stats ? stats.totalLogs : '—'}</div>
        </div>

        <div className="stat-card">
          <ShieldAlert className="stat-icon text-purple-700 dark:text-purple-400" size={32} />
          <div className="stat-label">Security Incidents</div>
          <div className="stat-number">{stats?.bySeverity ? stats.bySeverity.SECURITY : 0}</div>
        </div>

        <div className="stat-card">
          <AlertCircle className="stat-icon text-md-error" size={32} />
          <div className="stat-label">Critical Operations</div>
          <div className="stat-number">{stats?.bySeverity ? stats.bySeverity.CRITICAL : 0}</div>
        </div>

        <div className="stat-card">
          <Calendar className="stat-icon text-green-700 dark:text-green-500" size={32} />
          <div className="stat-label">Events Today</div>
          <div className="stat-number">{stats ? stats.todayLogs : '—'}</div>
        </div>
      </div>

      {/* Filter Bar - Identical to UserAdministration */}
      <div className="filter-bar">
        <SearchInput 
          placeholder="Search by user, action, IP, or case ref..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="filter-group">
          <Select 
            label="Module" 
            options={MODULE_OPTIONS} 
            value={selectedModule}
            onChange={(val) => {
              setSelectedModule(val);
              setCurrentPage(1);
            }}
            wrapLabels
          />
          <Select 
            label="Severity" 
            options={SEVERITY_OPTIONS} 
            value={selectedSeverity}
            onChange={(val) => {
              setSelectedSeverity(val);
              setCurrentPage(1);
            }}
          />
          <Select 
            label="Archive" 
            options={ARCHIVE_OPTIONS} 
            value={archiveFilter}
            onChange={(val) => {
              setArchiveFilter(val);
              setCurrentPage(1);
            }}
          />
          <MD3Button
            variant="outlined"
            className="h-10 px-4"
            onClick={handleResetFilters}
          >
            Clear
          </MD3Button>
        </div>
      </div>

      {/* Action Bar - Between Search and Table */}
      <div className="action-bar">
        <div className="left">
          <span className="count">{totalCount}</span> records found
          <span style={{ opacity: 0.4, margin: "0 4px" }}>·</span>
          <span style={{ fontSize: "13px" }}>
            Showing {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </span>
        </div>

        <div className="right flex items-center gap-2">
          <MD3Button
            variant="outlined"
            icon={<Download size={16} />}
            onClick={handleExportCsv}
            disabled={isExporting || totalCount === 0}
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </MD3Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-wrap">
        <div className="table-scroll md-scroll-thin">
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th style={{ width: '11%' }}>Timestamp</th>
                <th style={{ width: '22%' }}>User / Actor</th>
                <th style={{ width: '17%' }}>Role</th>
                <th style={{ width: '25%' }}>Activity Type</th>
                <th style={{ width: '10%' }}>Severity</th>
                <th style={{ width: '15%' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="w-4 h-4 rounded-full border-2 border-md-primary border-t-transparent animate-spin" />
                      Loading compliance audit logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "var(--md-on-surface-variant)", opacity: 0.7 }}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Archive size={32} className="opacity-30" />
                      <div className="font-medium text-base">No audit records match your current criteria.</div>
                      <div className="text-xs text-md-on-surface-variant/70">Try adjusting your search or filters.</div>
                      <Button variant="outlined" size="sm" onClick={handleResetFilters} className="mt-2">
                        Clear Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actor = getActorInfo(log);
                  return (
                    <tr
                      key={log.logId}
                      className="case-row row-clickable"
                      onClick={() => setInspectLog(log)}
                      title="Click row to inspect audit trail details"
                    >
                      {/* Timestamp */}
                      <td className="font-mono text-xs text-md-on-surface-variant whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </td>

                      {/* User / Actor */}
                      <td className="truncate">
                        <div className="font-medium text-md-on-surface truncate" title={actor.name}>
                          {actor.name}
                          {actor.isDeleted && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              Deleted
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-md-on-surface-variant/70 truncate" title={actor.email}>
                          {actor.email}
                        </div>
                      </td>

                      {/* Role - Formatted with plenty of space */}
                      <td>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-md-secondary-container text-md-on-secondary-container whitespace-nowrap">
                          {formatRole(log.userRole)}
                        </span>
                      </td>

                      {/* Activity Type & Module */}
                      <td className="truncate">
                        <div className="font-semibold text-xs text-md-on-surface font-mono truncate" title={log.activityType}>
                          {log.activityType}
                        </div>
                        <div className="text-[11px] text-md-on-surface-variant/70 flex items-center gap-1 mt-0.5 truncate">
                          <span className="font-mono text-[10px] text-md-primary font-semibold">{log.logId} ·</span>
                          <span className="font-medium">{log.moduleName}</span>
                          {log.caseReference && (
                            <span className="font-mono text-xs text-md-primary">· {log.caseReference}</span>
                          )}
                        </div>
                      </td>

                      {/* Severity Badge */}
                      <td>
                        {renderSeverityBadge(log.severity)}
                      </td>

                      {/* IP Address */}
                      <td className="font-mono text-xs text-md-on-surface-variant whitespace-nowrap">
                        {formatIpAddress(log.ipAddress)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Standard Pagination Component */}
        <div style={{ padding: '0 16px 16px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="audit records"
          />
        </div>
      </div>

      {/* Detailed Inspection Modal */}
      {inspectLog && (
        <Modal
          isOpen={!!inspectLog}
          onClose={() => setInspectLog(null)}
          title="Audit Trail Log Inspection"
          subtitle={`Trace ID / Reference: ${inspectLog.logId}`}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-md-on-surface-variant">
                Statutory retention compliance active.
              </div>
              <Button variant="filled" size="md" onClick={() => setInspectLog(null)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Top Grid of Metadata */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-md-surface-container-low border border-md-outline/20 text-xs">
              <div className="col-span-2 pb-2 border-b border-md-outline/10 flex items-center justify-between">
                <div>
                  <div className="text-md-on-surface-variant font-medium">Compliance Log Reference</div>
                  <div className="font-mono text-sm font-bold text-md-primary mt-0.5">
                    {inspectLog.logId}
                  </div>
                </div>
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => handleCopy(inspectLog.logId, 'id')}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  {copiedId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  {copiedId ? 'Copied' : 'Copy ID'}
                </Button>
              </div>
              <div>
                <div className="text-md-on-surface-variant font-medium">Timestamp (MYT / UTC+8)</div>
                <div className="font-mono text-sm text-md-on-surface mt-0.5">
                  {formatTimestamp(inspectLog.createdAt)}
                </div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">Severity Classification</div>
                <div className="mt-0.5">
                  {renderSeverityBadge(inspectLog.severity)}
                </div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">Actor Name & Email</div>
                <div className="font-medium text-md-on-surface mt-0.5">
                  {getActorInfo(inspectLog).name}
                </div>
                <div className="text-[11px] text-md-on-surface-variant">
                  {getActorInfo(inspectLog).email}
                </div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">User Role</div>
                <div className="font-medium text-md-on-surface mt-0.5">
                  {inspectLog.userRole?.replace(/_/g, ' ') || 'SYSTEM'}
                </div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">Domain Module</div>
                <div className="font-medium text-md-on-surface mt-0.5">
                  {inspectLog.moduleName}
                </div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">Activity Type</div>
                <div className="font-mono font-semibold text-md-primary mt-0.5">
                  {inspectLog.activityType}
                </div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">IP Address & Outcome</div>
                <div className="font-mono text-md-on-surface mt-0.5">
                  {formatIpAddress(inspectLog.ipAddress)} · {inspectLog.systemResponse || 'SUCCESS (200)'}
                </div>
              </div>

              <div>
                <div className="text-md-on-surface-variant font-medium">Case Reference</div>
                <div className="font-mono text-md-on-surface mt-0.5">
                  {inspectLog.caseReference || 'None'}
                </div>
              </div>

              {inspectLog.deviceInfo && (
                <div className="col-span-2">
                  <div className="text-md-on-surface-variant font-medium">Device & User-Agent</div>
                  <div className="font-mono text-[11px] text-md-on-surface truncate" title={inspectLog.deviceInfo}>
                    {inspectLog.deviceInfo}
                  </div>
                </div>
              )}
            </div>

            {/* JSON Payload Inspector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant">
                  Activity Details & State Diff
                </div>
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => handleCopy(inspectLog.activityDetails || '{}', 'json')}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  {copiedJson ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  {copiedJson ? 'Copied' : 'Copy JSON'}
                </Button>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto max-h-60 border border-gray-800">
                <pre>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(inspectLog.activityDetails || '{}'), null, 2);
                    } catch {
                      return inspectLog.activityDetails || 'No structured details recorded.';
                    }
                  })()}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogs;
