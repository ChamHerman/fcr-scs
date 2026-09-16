import api from './api';

export interface SystemAlertItem {
  alertId: string;
  customId?: string | null;
  recipientId: string;
  alertType: string;
  channel: 'IN_APP' | 'EMAIL' | 'DASHBOARD';
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  caseReference: string | null;
  message: string;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
  createdAt: string;
  recipient?: {
    userId: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface AlertPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export interface AlertsResponse {
  alerts: SystemAlertItem[];
  pagination: AlertPagination;
}

export interface AlertStats {
  totalAlerts: number;
  unacknowledgedAlerts: number;
  criticalAlerts: number;
  acknowledgedAlerts?: number;
  activeRules: number;
}

export interface AlertRuleItem {
  ruleId: string;
  customId?: string | null;
  ruleName: string;
  description: string | null;
  activityType: string;
  moduleName: string;
  minSeverity: string;
  triggerInApp: boolean;
  triggerEmail: boolean;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  emailTemplateName: string | null;
  targetRole: string | null;
  targetUserId: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    userId: string;
    name: string;
    email: string;
  } | null;
  targetUser?: {
    userId: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface EmailTemplateSummary {
  templateId: string;
  customId?: string | null;
  templateName: string;
  subject: string;
}

export interface AlertFilterParams {
  page?: number;
  limit?: number;
  status?: string;
  urgency?: string;
  search?: string;
}

export const alertService = {
  /**
   * Fetch paginated and filtered in-app alerts
   */
  async fetchAlerts(params: AlertFilterParams = {}): Promise<AlertsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.urgency && params.urgency !== 'ALL') query.append('urgency', params.urgency);
    if (params.search) query.append('search', params.search);

    const res = await api.get(`/alerts?${query.toString()}`);
    return res.data;
  },

  /**
   * Fetch aggregate alert metrics
   */
  async fetchAlertStats(): Promise<AlertStats> {
    const res = await api.get('/alerts/stats');
    return res.data;
  },

  /**
   * Mark a single alert as acknowledged
   */
  async acknowledgeAlert(alertId: string): Promise<SystemAlertItem> {
    const res = await api.patch(`/alerts/${alertId}/acknowledge`);
    return res.data;
  },

  /**
   * Mark all unacknowledged alerts as acknowledged
   */
  async acknowledgeAllAlerts(): Promise<{ count: number; message: string }> {
    const res = await api.post('/alerts/acknowledge-all');
    return res.data;
  },

  /**
   * Fetch all configured notification & routing rules
   */
  async fetchAlertRules(): Promise<AlertRuleItem[]> {
    const res = await api.get('/alerts/rules');
    return res.data;
  },

  /**
   * Create a new alert routing rule
   */
  async createAlertRule(data: Partial<AlertRuleItem>): Promise<AlertRuleItem> {
    const res = await api.post('/alerts/rules', data);
    return res.data;
  },

  /**
   * Update an existing alert routing rule (including toggling isEnabled)
   */
  async updateAlertRule(ruleId: string, data: Partial<AlertRuleItem>): Promise<AlertRuleItem> {
    const res = await api.put(`/alerts/rules/${ruleId}`, data);
    return res.data;
  },

  /**
   * Delete an alert routing rule
   */
  async deleteAlertRule(ruleId: string): Promise<{ ruleId: string; message: string }> {
    const res = await api.delete(`/alerts/rules/${ruleId}`);
    return res.data;
  },

  /**
   * Test trigger a rule for verification
   */
  async testTriggerRule(ruleId: string): Promise<{ success: boolean; message: string; inAppCreated: boolean; emailSent: boolean }> {
    const res = await api.post(`/alerts/rules/${ruleId}/test`);
    return res.data;
  },

  /**
   * Helper to retrieve available email templates for rule selection
   */
  async fetchEmailTemplates(): Promise<EmailTemplateSummary[]> {
    try {
      const res = await api.get('/email-templates');
      return res.data.map((t: any) => ({
        templateId: t.templateId,
        templateName: t.templateName,
        subject: t.subject,
      }));
    } catch {
      return [];
    }
  },
};
