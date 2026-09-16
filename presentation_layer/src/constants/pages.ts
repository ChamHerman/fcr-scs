export interface AdminPageInfo {
  path: string;
  name: string;
  category: string;
}

export const ADMIN_PAGES: AdminPageInfo[] = [
  { path: '/admin', name: 'Dashboard Overview', category: 'Main' },
  { path: '/admin/valuers', name: 'Valuers Management', category: 'Main' },
  { path: '/admin/forms', name: 'Forms & Templates', category: 'Main' },

  { path: '/admin/case', name: 'Cases Dashboard', category: 'Land Acquisition' },
  { path: '/admin/case/valuation', name: 'Valuation', category: 'Land Acquisition' },

  { path: '/admin/compensation/report', name: 'Compensation Report', category: 'Compensation' },
  { path: '/admin/compensation/offer', name: 'Compensation Offer', category: 'Compensation' },
  { path: '/admin/compensation/objection', name: 'Compensation Objection', category: 'Compensation' },

  { path: '/admin/payment', name: 'Payments Overview', category: 'Finance & Ledger' },
  { path: '/admin/payment/initiate', name: 'Initiate Payment', category: 'Finance & Ledger' },
  { path: '/admin/payment/pending', name: 'Pending Authorisations', category: 'Finance & Ledger' },
  { path: '/admin/payment/failed', name: 'Failed Transactions', category: 'Finance & Ledger' },

  { path: '/admin/blockchain', name: 'Blockchain Overview', category: 'Finance & Ledger' },
  { path: '/admin/blockchain/publish', name: 'Publish to Ledger', category: 'Finance & Ledger' },

  { path: '/admin/prediction', name: 'Generate AI Valuation', category: 'AI Valuation' },
  { path: '/admin/prediction/retrain', name: 'Retrain Model', category: 'AI Valuation' },

  { path: '/admin/reports', name: 'Reports Overview', category: 'Reporting' },
  { path: '/admin/reports/case-status', name: 'Case Status Reports', category: 'Reporting' },
  { path: '/admin/reports/payment', name: 'Payment Reports', category: 'Reporting' },
  { path: '/admin/reports/blockchain-audit', name: 'Blockchain Audit', category: 'Reporting' },

  { path: '/admin/users', name: 'User Admin', category: 'User Management' },
  { path: '/admin/role-management', name: 'Role Management', category: 'User Management' },
  { path: '/admin/profile', name: 'My Profile', category: 'System' },
  { path: '/admin/email-templates', name: 'Email Templates', category: 'System' },
  { path: '/admin/audit-logs', name: 'Audit Logs', category: 'System' },
  { path: '/admin/alerts', name: 'Alerts', category: 'System' },
  { path: '/admin/settings', name: 'Settings', category: 'System' },

  { path: '/member', name: 'Member Dashboard', category: 'Member Portal' },
  { path: '/member/offer-letter', name: 'Offer Letter', category: 'Member Portal' },
  { path: '/member/bank-details', name: 'Bank Details', category: 'Member Portal' },
  { path: '/member/payment-status', name: 'Payment Status', category: 'Member Portal' },
  { path: '/member/verify-audit', name: 'Verify Audit Trail', category: 'Member Portal' },
  { path: '/member/settings', name: 'Member Settings', category: 'Member Portal' },
];
