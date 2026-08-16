export type AuditAction =
  | 'auth'
  | 'security'
  | 'create'
  | 'update'
  | 'delete'
  | 'billing'
  | 'transfer';

export type AuditViewModule =
  | 'login'
  | 'security'
  | 'inventory'
  | 'purchase'
  | 'billing'
  | 'invoices'
  | 'customers'
  | 'suppliers'
  | 'stores'
  | 'businesses'
  | 'permissions'
  | 'settings'
  | 'system';

export interface AuditLogDoc {
  _id?: string;
  eventType: string;
  entity: string;
  entityId: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  performedBy: string;
  user: string;
  role: string;
  action: AuditAction;
  view: AuditViewModule;
  details: string;
  businessId: string;
  businessName: string;
  ip: string;
  userAgent: string;
  requestId: string;
  timestamp: string;
}

export interface AuditQueryParams {
  limit?: number;
  skip?: number;
  eventType?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
  storeId?: string;
}

export interface AuditSummaryMetrics {
  totalEvents: number;
  authEvents: number;
  billingEvents: number;
  mutations: number;
  securityAlerts: number;
}
