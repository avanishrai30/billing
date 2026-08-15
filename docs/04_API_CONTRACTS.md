# AIAVRO Billing OS — Backend Compatibility Contract

## Absolute rule

The backend is frozen during frontend migration.

Existing endpoints are reused. Frontend work may add a typed client, validation, caching, error normalization, and realtime invalidation without changing the endpoint semantics.

## Known domain endpoints

### Auth
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/verify`

### Users
- `GET /api/v1/users`
- `POST /api/v1/users`
- `POST /api/v1/users/profile`
- `POST /api/v1/users/avatar`
- `POST /api/v1/users/change-password`
- `GET /api/v1/users/presences`

### Products
- `GET /api/v1/products`
- `POST /api/v1/products`
- `POST /api/v1/products/import`

### Inventory
- `GET /api/v1/inventory`
- `POST /api/v1/inventory/adjust`
- `POST /api/v1/inventory/transfer`

### Purchases
- `GET /api/v1/purchases`
- `GET /api/v1/purchases/:id`
- `POST /api/v1/purchases`
- `DELETE /api/v1/purchases/:id`

### Invoices
- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `POST /api/v1/invoices/:id/void`

### Franchises/CRM/Stores/Businesses
Reuse the existing repository API map; do not invent replacement endpoints.

### Settings/RBAC
- `GET /api/v1/role-permissions`
- `POST /api/v1/role-permissions`
- `GET /api/v1/public/settings`
- `POST /api/v1/settings`

## API client requirements

Create one transport wrapper:

```ts
request<T>(path, options): Promise<T>
```

Responsibilities:
- base URL
- Authorization header
- content type
- JSON parsing
- request ID
- normalized errors
- timeout/cancellation where appropriate

Domain clients then become thin:

```ts
purchases.list()
purchases.get(id)
purchases.create(input)
purchases.void(id)
```

No component constructs URLs manually.

## Compatibility rules

- Preserve field names unless backend contract changes are explicitly approved.
- Preserve response shape compatibility.
- Do not silently rename legacy fields.
- Normalize legacy values at the API boundary.
- Do not let UI-specific state leak into API payloads.

## Validation

Zod schemas may validate request/response data in the frontend, but the backend remains authoritative.

## Realtime

Reuse existing Socket.IO events. Map each event to the smallest relevant query invalidation/update.

## Security

Never put JWT secrets or backend credentials in the browser bundle.
Never log raw credentials or tokens.

## API change policy

If a frontend feature appears impossible with the current contract:

1. prove the limitation
2. document the exact endpoint/field gap
3. propose the minimum compatible backend extension
4. stop for review before changing backend
