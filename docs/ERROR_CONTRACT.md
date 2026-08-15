# AIAVRO Billing OS — Error Response Envelope & Status Code Contract

This document standardizes the server-side error response envelopes, HTTP status codes, error code taxonomy, and frontend error normalization rules implemented across the codebase.

---

## 1. Authoritative Error Envelope Standard

All API errors return a standard JSON envelope with HTTP status codes in the 4xx or 5xx range:

```ts
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;       // Machine-readable uppercase error identifier
    message: string;    // Human-readable description
  };
  requestId?: string;   // Tracing correlation ID (e.g. "req-1786500-123")
  errors?: Array<{      // Optional array of field-level validation errors (from Zod)
    path: string[];
    message: string;
  }>;
}
```

---

## 2. HTTP Status Code Mapping

| Status Code | Meaning | When Used |
| :--- | :--- | :--- |
| `200 OK` | Success | Standard request completion |
| `400 Bad Request` | Validation Failure / Domain Invariant Violation | Missing required fields, invalid format, negative stock adjustment, already voided transaction |
| `401 Unauthorized` | Missing / Invalid / Expired Authentication | Missing `Authorization` header, invalid JWT signature, expired token, revoked session (`tokenVersion` mismatch) |
| `403 Forbidden` | Access Denied / Store Mismatch / Account Deactivated | Missing RBAC permission, store-scope mismatch (`STORE_ACCESS_DENIED`), account suspended |
| `404 Not Found` | Entity Missing | Unknown product, invoice, purchase, customer, store, or business ID |
| `429 Too Many Requests` | Rate Limit Exceeded | Exceeded auth (150/15m) or upload (100/15m) limit |
| `500 Internal Server Error` | Unhandled Exception / Database Error | MongoDB connection loss, file system failure, unhandled crash |

---

## 3. Authoritative Error Code Taxonomy

### 3.1 Authentication & User Access Errors
| Error Code | HTTP Status | Trigger Condition / Description |
| :--- | :--- | :--- |
| `INVALID_CREDENTIALS` | `401` | Incorrect username or password during `POST /api/v1/auth/login`. |
| `UNAUTHORIZED` | `401` | Missing `Authorization: Bearer <token>` header on a protected route. |
| `TOKEN_EXPIRED` | `401` | JWT signature is invalid or token expiration timestamp passed. |
| `SESSION_REVOKED` | `401` | User's active session invalidated due to password change or version increment (`tokenVersion` mismatch). |
| `ACCOUNT_SUSPENDED` | `403` | User account status is `'suspended'` or `'inactive'` at login or runtime. |
| `ACCOUNT_DEACTIVATED` | `403` | User account deactivated during active token check. |
| `FORBIDDEN` | `403` | User lacks the required granular permission for the requested endpoint. |
| `STORE_ACCESS_DENIED` | `403` | User attempted to read or mutate records for a store not in their `assignedStoreId` / `assignedStores`. |
| `USER_NOT_FOUND` | `404` | Target user ID does not exist in `users` collection. |
| `PASSWORD_CHANGE_FAILED` | `400` | Current password incorrect or new password does not meet policy. |

### 3.2 Product & Inventory Errors
| Error Code | HTTP Status | Trigger Condition / Description |
| :--- | :--- | :--- |
| `PRODUCT_NOT_FOUND` | `404` | Product ID, SKU, or barcode not found. |
| `SKU_ALREADY_EXISTS` | `400` | Attempted to create or update product with duplicate SKU. |
| `BARCODE_ALREADY_EXISTS` | `400` | Attempted to assign an already mapped barcode to a different product. |
| `MISSING_FIELDS` | `400` | Required fields missing (e.g. `productId`, `locationId`, `quantity`). |
| `INVALID_LOCATION` | `400` | Store location ID missing or source and destination locations identical during transfer. |
| `INSUFFICIENT_STOCK` | `400` | Requested stock transfer or deduction exceeds available physical balance. |
| `ADJUSTMENT_FAILED` | `500` | Database error executing atomic stock adjustment. |
| `TRANSFER_ERROR` | `500` | Database error executing inter-store stock transfer. |

### 3.3 Billing & POS Checkout Errors
| Error Code | HTTP Status | Trigger Condition / Description |
| :--- | :--- | :--- |
| `INVALID_ITEMS` | `400` | Invoice or purchase submitted with empty or malformed `items` array. |
| `INVOICE_NOT_FOUND` | `404` | Invoice ID not found or access denied by store scope. |
| `TRANSACTION_ALREADY_VOIDED` | `400` | Attempted to void an invoice that is already marked `VOIDED` or `isArchived: true`. |
| `INVOICE_VOID_FAILED` | `500` | Error reverting inventory stock or updating invoice status. |

### 3.4 Supplier Procurement & Purchase Errors
| Error Code | HTTP Status | Trigger Condition / Description |
| :--- | :--- | :--- |
| `PURCHASE_NOT_FOUND` | `404` | Purchase order ID not found or access denied. |
| `PURCHASE_ALREADY_VOIDED` | `400` | Attempted to void a purchase that is already marked `VOIDED`. |
| `PURCHASE_VOID_FAILED` | `500` | Error reverting inventory stock or updating purchase status. |

### 3.5 General & Infrastructure Errors
| Error Code | HTTP Status | Trigger Condition / Description |
| :--- | :--- | :--- |
| `SERVER_ERROR` | `500` | Unexpected server-side exception or database communication failure. |
| `TIMEOUT` | Client-side | Request exceeded client timeout threshold (15,000ms). |
| `FETCH_ERROR` | `500` | Error querying database collection. |
| `NOT_FOUND` | `404` | Generic entity not found in target collection. |

---

## 4. Frontend Error Normalization (`client.js`)

The API client wrapper [frontend-api/client.js](file:///Users/avanish/Documents/billing%20system/frontend-api/client.js) normalizes all error responses into a consistent JavaScript `Error` object:

```javascript
const err = new Error(errMsg);
err.code = errData.error?.code || (res.status === 401 ? 'UNAUTHORIZED' : (res.status === 403 ? 'FORBIDDEN' : 'API_ERROR'));
err.status = res.status;
err.data = errData;
throw err;
```

**Client Behavior on 401 Unauthorized:**
- If a 401 error occurs on any authenticated request (excluding `POST /api/v1/auth/login`), `client.js` automatically clears `aiavro_jwt_token` and triggers session logout.
