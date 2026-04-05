# Quick Start: Android App Integration

## Base URL
```
https://your-server.com/api
```
or for development:
```
http://10.0.2.2:5000/api  (Android emulator)
http://your-lan-ip:5000/api  (physical device)
```

---

## 1. Authentication Flow

### Login
```kotlin
@POST("auth/login")
suspend fun login(@Body request: LoginRequest): AuthResponse

data class LoginRequest(val email: String, val password: String)
data class AuthResponse(
    val success: Boolean,
    val data: AuthData,
    val timestamp: String
)
data class AuthData(
    val token: String,
    val expiresAt: String,
    val user: User
)
data class User(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    val branch: String
)
```

**Store Token**:
```kotlin
// Save to SharedPreferences or DataStore
prefs.edit().apply {
    putString("auth_token", response.data.token)
    putString("user_role", response.data.user.role)
    apply()
}
```

**Use Token in All Requests**:
```kotlin
val interceptor = object : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = prefs.getString("auth_token", null)
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer $token")
            .build()
        return chain.proceed(request)
    }
}
```

---

## 2. Efficient Sync Strategy

### Step 1: Check if Sync Needed
```kotlin
@GET("mobile/sync/metadata")
suspend fun getMetadata(): ApiResponse<MetadataData>

val metadata = api.getMetadata()
val serverCounts = metadata.data.counts

if (serverCounts.inventory > localDb.getInventoryCount()) {
    // Sync needed
}
```

### Step 2: Delta Sync Inventory
```kotlin
@POST("mobile/sync/inventory")
suspend fun syncInventory(@Body request: SyncRequest): ApiResponse<SyncData>

data class SyncRequest(
    val lastSyncedAt: String  // ISO 8601 format
)

val response = api.syncInventory(
    SyncRequest(lastSyncedAt = prefs.getString("last_sync", "1970-01-01T00:00:00.000Z")!!)
)

// Save items to Room database
response.data.items.forEach { item ->
    localDb.upsertInventory(item)
}

// Update last sync time
prefs.edit().putString("last_sync", response.data.serverTime).apply()
```

### Step 3: Sync Tasks
```kotlin
@POST("mobile/sync/tasks")
suspend fun syncTasks(@Body request: SyncRequest): ApiResponse<TasksData>

val tasksResponse = api.syncTasks(SyncRequest(lastSyncedAt))
tasksResponse.data.tasks.forEach { task ->
    localDb.upsertTask(task)
}
```

---

## 3. Offline Support

### Queue Operations While Offline
```kotlin
data class QueuedOperation(
    val type: String,  // "update" or "delete"
    val id: String,
    val data: Map<String, Any?>?
)

// When offline, queue operations
val queue = mutableListOf<QueuedOperation>()

queue.add(
    QueuedOperation(
        type = "update",
        id = itemId,
        data = mapOf("quantity" to newQuantity)
    )
)
```

### Sync When Online
```kotlin
@POST("mobile/inventory/bulk")
suspend fun bulkOperations(@Body request: BulkRequest): ApiResponse<BulkData>

data class BulkRequest(
    val operations: List<QueuedOperation>
)

if (isOnline() && queue.isNotEmpty()) {
    val response = api.bulkOperations(BulkRequest(queue))
    
    if (response.success) {
        // Remove successful operations from queue
        queue.clear()
    }
}
```

---

## 4. Error Handling

### Standard Error Response
```kotlin
data class ErrorResponse(
    val success: Boolean,
    val error: String,
    val timestamp: String
)
```

### Handle Common Errors
```kotlin
try {
    val response = api.syncInventory(request)
    // Handle success
} catch (e: HttpException) {
    when (e.code()) {
        401 -> {
            // Token expired - try refresh
            val refreshed = refreshToken()
            if (!refreshed) {
                // Navigate to login
            }
        }
        403 -> {
            // Insufficient permissions
            showMessage("You don't have permission to perform this action")
        }
        429 -> {
            // Rate limited
            showMessage("Too many requests. Please wait a moment.")
        }
        503 -> {
            // Server unavailable
            showMessage("Server is temporarily unavailable")
        }
    }
}
```

### Token Refresh
```kotlin
@POST("auth/refresh")
suspend fun refresh(@Body request: RefreshRequest): AuthResponse

data class RefreshRequest(val token: String)

suspend fun refreshToken(): Boolean {
    return try {
        val currentToken = prefs.getString("auth_token", null)!!
        val response = api.refresh(RefreshRequest(currentToken))
        
        prefs.edit().putString("auth_token", response.data.token).apply()
        true
    } catch (e: Exception) {
        false
    }
}
```

---

## 5. Push Notifications (Future-Ready)

### Register Device
```kotlin
@POST("mobile/device/register")
suspend fun registerDevice(@Body request: DeviceRequest): ApiResponse<DeviceData>

data class DeviceRequest(
    val deviceToken: String,
    val platform: String = "android",
    val deviceId: String
)

// Get FCM token
val fcmToken = Firebase.messaging.token.await()

// Get device ID
val deviceId = Settings.Secure.getString(
    context.contentResolver,
    Settings.Secure.ANDROID_ID
)

// Register
api.registerDevice(
    DeviceRequest(
        deviceToken = fcmToken,
        deviceId = deviceId
    )
)
```

---

## 6. Retrofit Setup

### Complete Configuration
```kotlin
object ApiClient {
    private const val BASE_URL = "https://your-server.com/api/"
    
    private val logging = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }
    
    private val authInterceptor = object : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val token = AppPrefs.getToken()
            val request = chain.request().newBuilder()
                .apply {
                    if (token != null) {
                        addHeader("Authorization", "Bearer $token")
                    }
                }
                .build()
            
            val response = chain.proceed(request)
            
            // Handle 401
            if (response.code == 401) {
                // Trigger token refresh or logout
            }
            
            return response
        }
    }
    
    val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(logging)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val api: MobileApiService = retrofit.create(MobileApiService::class.java)
}
```

---

## 7. Room Database Entities

### Inventory Item
```kotlin
@Entity(tableName = "inventory")
data class InventoryItem(
    @PrimaryKey val id: String,
    val productName: String,
    val barcode: String?,
    val quantity: Int,
    val unit: String,
    val mfgDate: String,
    val expDate: String,
    val branch: String,
    val status: String,
    val notes: String?,
    val updatedAt: String
)

@Dao
interface InventoryDao {
    @Query("SELECT * FROM inventory ORDER BY expDate ASC")
    suspend fun getAll(): List<InventoryItem>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: InventoryItem)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<InventoryItem>)
    
    @Query("SELECT COUNT(*) FROM inventory")
    suspend fun count(): Int
}
```

---

## 8. Repository Pattern

```kotlin
class InventoryRepository @Inject constructor(
    private val api: MobileApiService,
    private val dao: InventoryDao,
    private val prefs: SharedPreferences
) {
    suspend fun syncIfNeeded() {
        val metadata = api.getMetadata()
        val localCount = dao.count()
        
        if (metadata.data.counts.inventory > localCount) {
            val lastSync = prefs.getString("last_sync", "1970-01-01T00:00:00.000Z")!!
            val response = api.syncInventory(SyncRequest(lastSync))
            
            dao.upsertAll(response.data.items)
            prefs.edit().putString("last_sync", response.data.serverTime).apply()
        }
    }
    
    fun getLocalItems(): Flow<List<InventoryItem>> {
        return dao.getAll().asFlow()
    }
}
```

---

## 9. WorkManager for Background Sync

```kotlin
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    override suspend fun doWork(): Result {
        return try {
            val repository = InventoryRepository.getInstance()
            repository.syncIfNeeded()
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }
}

// Schedule periodic sync
val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
    15, TimeUnit.MINUTES,
    FlexTimeInterval(5, TimeUnit.MINUTES)
)
    .setConstraints(
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
    )
    .build()

WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "inventory_sync",
    ExistingPeriodicWorkPolicy.KEEP,
    syncRequest
)
```

---

## 10. Testing Checklist

Before releasing Android app:

- [ ] Login with valid credentials succeeds
- [ ] Invalid credentials show error
- [ ] Token refresh works automatically
- [ ] Logout clears token and navigate to login
- [ ] Delta sync only downloads changed items
- [ ] Offline queue syncs when back online
- [ ] Rate limit errors (429) handled gracefully
- [ ] 401 errors trigger token refresh
- [ ] Branch filtering works correctly
- [ ] Bulk operations handle partial failures
- [ ] Push notifications register successfully
- [ ] Background sync works with WorkManager
- [ ] Room database persists across app restarts

---

## Common Endpoints Quick Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/auth/login` | POST | ❌ | Login |
| `/auth/refresh` | POST | ❌ | Refresh token |
| `/inventory?page=1&limit=20` | GET | ✅ | Get paginated inventory |
| `/tasks?page=1&limit=20` | GET | ✅ | Get paginated tasks |
| `/mobile/sync/metadata` | GET | ✅ | Get sync metadata |
| `/mobile/sync/inventory` | POST | ✅ | Delta sync inventory |
| `/mobile/sync/tasks` | POST | ✅ | Delta sync tasks |
| `/mobile/device/register` | POST | ✅ | Register for push |
| `/mobile/inventory/bulk` | POST | ✅ | Bulk operations |
| `/branches` | GET | ✅ | Get all branches |
| `/backup/export` | GET | ✅ Admin | Download backup (Admin only) |

---

## Need Help?

- Full API docs: `server/MOBILE_API_DOCUMENTATION.md`
- Enhancement details: `server/MOBILE_ENHANCEMENTS.md`
- Server logs: Check `requestId` in responses for debugging
