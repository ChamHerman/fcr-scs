import api from './api';

export interface AuditLogItem {
  logId: string;
  userId: string | null;
  userRole: string | null;
  activityType: string;
  moduleName: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY';
  caseReference: string | null;
  ipAddress: string;
  deviceInfo: string | null;
  activityDetails: string | null;
  systemResponse: string | null;
  isArchived: boolean;
  createdAt: string;
  user?: {
    userId: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  } | null;
}

export interface AuditLogPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export interface AuditLogResponse {
  logs: AuditLogItem[];
  pagination: AuditLogPagination;
}

export interface AuditStatsResponse {
  totalLogs: number;
  activeLogs: number;
  archivedLogs: number;
  todayLogs: number;
  bySeverity: {
    INFO: number;
    WARNING: number;
    CRITICAL: number;
    SECURITY: number;
  };
}

export interface AuditFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  isArchived?: string | boolean;
}

export const auditService = {
  getLogs: async (params: AuditFilterParams = {}): Promise<AuditLogResponse> => {
    const response = await api.get<AuditLogResponse>('/audit-logs', { params });
    return response.data;
  },

  getStats: async (): Promise<AuditStatsResponse> => {
    const response = await api.get<AuditStatsResponse>('/audit-logs/stats');
    return response.data;
  },

  exportCsv: async (params: AuditFilterParams = {}): Promise<void> => {
    const response = await api.get('/audit-logs/export/csv', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
