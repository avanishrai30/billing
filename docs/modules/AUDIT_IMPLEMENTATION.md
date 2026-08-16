# Phase 14B — Audit & Activity Log Implementation Specification

## 1. Executive Summary & Domain Scope

Phase 14B implements the **System Audit & Activity Logging** module in the typed frontend workspace under:
- `apps/web/features/audit/` and [`apps/web/app/(protected)/audit/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/audit/page.tsx)

### Core Features Implemented:
1. **Immutable Append-Only Audit Ledger:**
   - Pure read-only presentation backed by `GET /api/v1/audit-logs`.
   - **Zero** create, edit, or delete controls in the frontend.
2. **Server-Side Pagination & Sorting:**
   - Paginated querying using `limit` (default: 100/200, max: 1000) and `skip` offsets.
   - Deterministic reverse-chronological ordering (`timestamp: -1`).
3. **Multi-Tenant Store Scope Integration:**
   - Automatically synchronizes with `StoreScopeProvider` for management users.
   - Non-super-admin restricted users are constrained by backend middleware to their assigned store.
4. **Defense-in-Depth Payload Redaction (`AuditPayloadViewer`):**
   - Recursive masking of sensitive credential keys (`password`, `passwordHash`, `token`, `secret`, `currentPassword`, `newPassword`, `jwt`, `authorization`) to `"[REDACTED]"`.
   - Safe rendering of `string`, `number`, `boolean`, `null`, `array`, and nested `object`.
   - Before/after state mutation diff highlights.
5. **Interactive Filtering & KPI Summaries:**
   - Real-time client-side search across actor, entityId, request ID, and details.
   - Action categorization filters (`auth`, `billing`, `create`, `update`, `delete`, `security`, `transfer`).
   - Entity domain filters (`billing`, `inventory`, `purchase`, `customers`, `suppliers`, `stores`, `user`, `permissions`, `auth`).

---

## 2. Verified Endpoints & Contracts

| Endpoint | Method | Permission | Query Parameters | Response Shape |
| :--- | :---: | :---: | :--- | :--- |
| `/api/v1/audit-logs` | `GET` | `audit.view` | `limit` (1..1000)<br>`skip` (number)<br>`eventType` (string)<br>`entity` (string)<br>`startDate` (ISO)<br>`endDate` (ISO)<br>`storeId` (string) | `AuditLogDoc[]` sorted by `timestamp DESC` |

---

## 3. Authoritative Audit Data Model

```typescript
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
  action: 'auth' | 'security' | 'create' | 'update' | 'delete' | 'billing' | 'transfer';
  view: string;
  details: string;
  businessId: string;
  businessName: string;
  ip: string;
  userAgent: string;
  requestId: string;
  timestamp: string;
}
```

---

## 4. Architectural Safety & Anti-Flicker Decisions

1. **Zero Backend Modifications:** Backend files (`server.js`, `modules/audit.js`, `services/auditService.js`, etc.) remain 100% frozen.
2. **Zero Legacy HTML Modifications:** `aiavro_billing_system.html` remains 100% frozen.
3. **Pure Declarative State:** Uses React state and TanStack Query with row keys bound to `log._id || log.requestId`.
4. **No Artificial Polling:** Manual on-demand refresh prevents unnecessary background battery or network drain.
