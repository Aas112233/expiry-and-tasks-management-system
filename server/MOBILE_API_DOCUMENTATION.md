# Mobile App API Documentation

## Base URL
```
/api/mobile
```

All endpoints require authentication via JWT Bearer token except where noted.

## Authentication

Include the JWT token in all requests:
```
Authorization: Bearer <token>
```

Get tokens from:
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh expired token (within 7-day grace period)

---

## Sync Endpoints

These endpoints allow efficient delta sync for mobile apps. Instead of downloading all data every time, you only get changes since your last sync.

### 1. Get Sync Metadata
```
GET /api/mobile/sync/metadata
```

**Purpose**: Get server time, data counts, and branch list to determine what needs syncing.

**Response**:
```json
{
  "success": true,
  "data": {
    "serverTime": "2026-04-05T12:00:00.000Z",
    "counts": {
      "inventory": 1500,
      "tasks": 230,
      "branches": 5,
      "catalog": 800
    },
    "branches": [
      { "id": "...", "name": "Main Warehouse", "status": "Active" }
    ],
    "userBranch": "Main Warehouse",
    "userRole": "Admin"
  },
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

**Android Usage**:
1. Call this first to check if there are changes
2. Compare `counts` with local counts
3. Use `serverTime` as `lastSyncedAt` for subsequent sync calls

---

### 2. Sync Inventory
```
POST /api/mobile/sync/inventory
Content-Type: application/json

{
  "lastSyncedAt": "2026-04-04T12:00:00.000Z",
  "branch": "Main Warehouse"  // Optional: filter by branch
}
```

**Purpose**: Get inventory items created or modified after `lastSyncedAt`.

**Response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "...",
        "productName": "Milk",
        "barcode": "1234567890",
        "quantity": 50,
        "unit": "pcs",
        "mfgDate": "2026-03-01T00:00:00.000Z",
        "expDate": "2026-04-15T00:00:00.000Z",
        "branch": "Main Warehouse",
        "status": "Critical",
        "notes": null,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "serverTime": "2026-04-05T12:00:00.000Z",
    "totalCount": 45
  },
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

**Android Usage**:
1. Store `serverTime` from response
2. Use it as `lastSyncedAt` for next sync
3. Merge/update items in local database
4. Items are ordered by `updatedAt` descending (most recent first)

---

### 3. Sync Tasks
```
POST /api/mobile/sync/tasks
Content-Type: application/json

{
  "lastSyncedAt": "2026-04-04T12:00:00.000Z",
  "branch": "Main Warehouse"
}
```

**Purpose**: Get tasks created or modified after `lastSyncedAt`.

**Response**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "...",
        "title": "Check expiry dates",
        "description": "Review items expiring this week",
        "priority": "High",
        "status": "Open",
        "dueDate": "2026-04-10T00:00:00.000Z",
        "branch": "Main Warehouse",
        "assignedToId": "...",
        "assigneeName": "John Doe",
        "createdById": "...",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "serverTime": "2026-04-05T12:00:00.000Z",
    "totalCount": 12
  },
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

---

## Device Management

### Register Device for Push Notifications
```
POST /api/mobile/device/register
Content-Type: application/json

{
  "deviceToken": "firebase-cloud-messaging-token",
  "platform": "android",
  "deviceId": "unique-device-identifier"
}
```

**Purpose**: Register device for future push notification support.

**Response**:
```json
{
  "success": true,
  "data": {
    "deviceId": "unique-device-identifier",
    "platform": "android",
    "registeredAt": "2026-04-05T12:00:00.000Z"
  },
  "message": "Device registered successfully",
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

---

## Bulk Operations

### Bulk Update Inventory
```
POST /api/mobile/inventory/bulk
Content-Type: application/json

{
  "operations": [
    {
      "type": "update",
      "id": "inventory-item-id",
      "data": {
        "quantity": 45,
        "status": "Warning"
      }
    },
    {
      "type": "delete",
      "id": "inventory-item-id-2"
    }
  ]
}
```

**Purpose**: Perform multiple inventory operations in a single request for mobile efficiency.

**Response**:
```json
{
  "success": true,
  "data": {
    "success": 2,
    "failed": 0,
    "errors": []
  },
  "message": "Bulk operation completed: 2 succeeded, 0 failed",
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

**Supported Operation Types**:
- `update` - Update an existing item (provide `data` object)
- `delete` - Delete an item

**Android Usage**:
1. Queue operations locally while offline
2. Send all at once when online
3. Handle partial failures gracefully
4. Re-queue failed operations for retry

---

## Standard Response Format

All API responses follow this structure:

```json
{
  "success": true|false,
  "data": {...},           // Present on success
  "error": "message",      // Present on error
  "message": "description",// Optional descriptive message
  "pagination": {...},     // Present on paginated responses
  "meta": {...},           // Optional metadata
  "timestamp": "ISO date", // Server timestamp
  "requestId": "uuid"      // Request tracking ID
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "message": "Optional additional details",
  "timestamp": "2026-04-05T12:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 20 requests | 15 minutes |
| Backup/Restore | 5 requests | 1 hour |
| Sensitive Operations | 10 requests | 1 hour |

Rate limit info is returned in headers:
- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`

---

## Pagination

Some endpoints support pagination:

**Request**:
```
GET /api/inventory?page=1&limit=20&search=milk&status=Critical
```

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "..."
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate item) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (database down) |

---

## Offline Sync Strategy (Recommended for Android)

1. **On App Launch**:
   - Call `GET /api/mobile/sync/metadata`
   - Compare counts with local database
   - If different, proceed to sync

2. **Sync Inventory**:
   - Call `POST /api/mobile/sync/inventory` with `lastSyncedAt`
   - Merge received items into local Room database
   - Save `serverTime` as new `lastSyncedAt`

3. **Sync Tasks**:
   - Call `POST /api/mobile/sync/tasks` with `lastSyncedAt`
   - Merge received tasks into local database
   - Update `lastSyncedAt`

4. **Offline Operations**:
   - Queue CRUD operations locally
   - Use bulk endpoints when online
   - Handle conflicts with server timestamp

5. **Conflict Resolution**:
   - Server `updatedAt` wins over local changes
   - Prompt user for conflicts if needed
   - Use optimistic updates for better UX

---

## Security Headers

All API responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

**Android Implication**: Do not cache sensitive API responses. Use in-memory caching only.

---

## Environment Variables

Backend requires these variables:

```env
DATABASE_URL=mongodb+srv://...
JWT_SECRET=your-strong-secret-key
CORS_ORIGINS=https://yourdomain.com,http://localhost:5173
PORT=5000
NODE_ENV=production
```

---

## Migration from Web App

The mobile API is fully backward compatible with the web app. All existing endpoints continue to work. Mobile-specific features are under `/api/mobile/` namespace.

**Web App Routes**: Continue to work at `/api/*`
**Mobile Routes**: Enhanced features at `/api/mobile/*`

---

## Support

For API issues or questions:
- Check server logs with `requestId`
- Review error responses for details
- Test with Postman/Insomnia first
- Ensure JWT token is valid and not expired
