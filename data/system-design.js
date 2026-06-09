window.GUIDE_DATA = window.GUIDE_DATA || [];
window.GUIDE_DATA.push({
t: "System Design",
c: "bg-8",
items: [
{
  n: "Design: System for 1 Million Users",
  l: "expert",
  p: [{t:"Capacity estimation & SLA",d:"Tính: DAU, peak concurrent, RPS (avg + peak), storage growth, bandwidth. SLA: 99.9% = 8.7h downtime/year, 99.99% = 52min/year"},{t:"Architecture layers",d:"CDN (static, edge) → Load Balancer (distribute, health check) → App Servers (stateless, auto-scale) → Cache (Redis, 90% hit rate) → DB (Primary + Read Replicas)"},{t:"Scaling milestones",d:"1K: single server. 10K: separate DB + cache. 100K: multi-server + LB + replicas. 1M: sharding + microservices + async queues + multi-region"},{t:"Database sharding & replicas",d:"Read replicas cho 80% reads. Sharding by user_id khi single DB không đủ. Connection pooling. Cache layer giảm DB load 80%+"}],
  q: "Thiết kế hệ thống phục vụ 1 triệu users. Trình bày capacity estimation và scaling strategy?",
  vi: `<p><strong>Capacity Estimation:</strong> 1M users, 10% DAU = 100K active/day. Peak: 3x average. Requests: 100K × 10 req/user = 1M req/day ≈ 12 req/s average, 36 req/s peak. Storage: estimate per-user data × growth rate.</p>
<p><strong>Architecture Layers:</strong> CDN (static assets, edge caching) → Load Balancer (distribute traffic, health checks) → App Servers (stateless, horizontal scale) → Cache Layer (Redis - hot data) → Database (primary + read replicas).</p>
<p><strong>Scaling Milestones:</strong> 1K: single server. 10K: separate DB server, add cache. 100K: multiple app servers + LB, read replicas. 1M: CDN, sharding, microservices, async processing.</p>
<p><strong>Database Strategy:</strong> Read replicas cho read-heavy workloads (80% reads). Sharding khi single DB không đủ (shard by user_id). Connection pooling. Caching layer giảm DB load 80%+.</p>
<div class="code-block">// Capacity Estimation Template
// Users: 1,000,000 registered
// DAU: 100,000 (10%)
// Requests per user per day: 10
// Total requests/day: 1,000,000
// Average RPS: 1,000,000 / 86,400 ≈ 12 RPS
// Peak RPS (3x): ~36 RPS
// Storage per user: 1MB (profile + data)
// Total storage: 1TB (with growth buffer)
// Bandwidth: 36 RPS × 50KB avg response = 1.8 MB/s

// Architecture at 1M users:
//
// [Users] → [CDN] → [Load Balancer (nginx/ALB)]
//                         ↓
//              [App Server 1] [App Server 2] [App Server 3]
//                         ↓
//              [Redis Cache Cluster]
//                         ↓
//              [DB Primary] → [Read Replica 1]
//                           → [Read Replica 2]
//                         ↓
//              [Message Queue (RabbitMQ/SQS)]
//                         ↓
//              [Background Workers]

// ASP.NET Core - Stateless App Server
builder.Services.AddStackExchangeRedisCache(options => {
    options.Configuration = "redis-cluster:6379";
});

// Session in Redis (not in-memory) for horizontal scaling
builder.Services.AddSession(options => {
    options.IdleTimeout = TimeSpan.FromMinutes(30);
});

// Health checks for Load Balancer
builder.Services.AddHealthChecks()
    .AddRedis("redis-cluster:6379")
    .AddSqlServer(connectionString)
    .AddCheck&lt;CustomHealthCheck&gt;("custom");

app.MapHealthChecks("/health", new HealthCheckOptions {
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

// Read/Write splitting
services.AddDbContext&lt;WriteDbContext&gt;(opt => 
    opt.UseSqlServer(config["ConnectionStrings:Primary"]));
services.AddDbContext&lt;ReadDbContext&gt;(opt => 
    opt.UseSqlServer(config["ConnectionStrings:ReadReplica"]));

// Scaling milestones:
// 1K users: Single server (app + DB)
// 10K users: Separate DB, add Redis cache
// 100K users: 3+ app servers, LB, read replicas, CDN
// 1M users: Sharding, microservices, async queues, monitoring

// Connection pooling configuration
"ConnectionStrings": {
    "Primary": "Server=db;Database=app;Max Pool Size=100;Min Pool Size=10;"
}</div>`,
  en: `<p><strong>Estimation:</strong> 1M users → 100K DAU → ~12 RPS average, ~36 peak. Plan for 10x growth.</p>
<p><strong>Layers:</strong> CDN → Load Balancer → Stateless App Servers → Cache (Redis) → DB (Primary + Replicas).</p>
<p><strong>Milestones:</strong> 1K (single server) → 10K (separate DB + cache) → 100K (LB + replicas) → 1M (sharding + microservices).</p>
<p><strong>Database:</strong> Read replicas for read-heavy loads. Sharding when single DB insufficient. Cache reduces DB load 80%+.</p>
<div class="code-block">// Stateless app + Redis session for horizontal scaling
builder.Services.AddStackExchangeRedisCache(opt => 
    opt.Configuration = "redis-cluster:6379");</div>`,
  tip: "Bắt đầu với capacity estimation (numbers). Sau đó scale từng layer. Show interviewer bạn think systematically, không jump vào solution ngay."
},
{
  n: "Design: E-Commerce 10M Products",
  l: "expert",
  p: [{t:"Search with Elasticsearch",d:"SQL LIKE không scale cho 10M records. ES: full-text search, faceted filtering, fuzzy matching, auto-complete. Sync via CDC/Outbox từ SQL → ES"},{t:"Inventory concurrency",d:"Flash sale: 1000 users mua cùng item. Solutions: Optimistic lock + retry, Redis atomic DECRBY (Lua script), DB row-level lock. Prevent overselling"},{t:"Order processing pipeline",d:"Async: Place Order → Validate → Reserve Inventory → Process Payment → Confirm → Notify. Saga pattern cho distributed transaction. Compensating actions cho failures"},{t:"Catalog vs Inventory separation",d:"Catalog (read-heavy, cached aggressively, ít thay đổi) tách khỏi Inventory (write-heavy, real-time accuracy). Different scaling strategies cho mỗi concern"}],
  q: "Thiết kế hệ thống e-commerce với 10M products. Xử lý search, inventory concurrency, và order pipeline?",
  vi: `<p><strong>Search (Elasticsearch):</strong> SQL LIKE không scale cho 10M products. Elasticsearch: full-text search, faceted filtering, fuzzy matching, auto-complete. Sync data từ DB → ES via Change Data Capture hoặc Outbox pattern.</p>
<p><strong>Inventory Concurrency:</strong> Flash sale: 1000 users mua cùng 1 product. Solutions: (1) Optimistic locking với retry, (2) Redis atomic decrement (DECRBY), (3) Database row-level lock. Prevent overselling.</p>
<p><strong>Order Pipeline:</strong> Async processing: Place Order → Validate → Reserve Inventory → Process Payment → Confirm → Notify. Saga pattern cho distributed transaction. Compensating actions cho failures.</p>
<p><strong>Catalog vs Inventory:</strong> Tách Product Catalog (read-heavy, cached aggressively) khỏi Inventory (write-heavy, real-time accuracy). Different scaling strategies cho mỗi service.</p>
<div class="code-block">// Elasticsearch for Product Search
public class ProductSearchService {
    private readonly IElasticClient _elastic;
    
    public async Task&lt;SearchResult&gt; SearchAsync(ProductSearchQuery query) {
        var response = await _elastic.SearchAsync&lt;ProductDocument&gt;(s => s
            .Index("products")
            .Query(q => q
                .Bool(b => b
                    .Must(
                        m => m.MultiMatch(mm => mm
                            .Query(query.Keyword)
                            .Fields(f => f
                                .Field(p => p.Name, boost: 3)
                                .Field(p => p.Description)
                                .Field(p => p.Brand, boost: 2))
                            .Fuzziness(Fuzziness.Auto)),
                        m => query.CategoryId.HasValue 
                            ? m.Term(t => t.CategoryId, query.CategoryId) 
                            : m.MatchAll()
                    )
                    .Filter(
                        f => f.Range(r => r.Field(p => p.Price)
                            .GreaterThanOrEquals(query.MinPrice)
                            .LessThanOrEquals(query.MaxPrice))
                    )
                ))
            .Aggregations(a => a
                .Terms("brands", t => t.Field(p => p.Brand))
                .Range("price_ranges", r => r.Field(p => p.Price)
                    .Ranges(rr => rr.From(0).To(100),
                            rr => rr.From(100).To(500))))
            .From(query.Page * query.PageSize)
            .Size(query.PageSize)
            .Sort(ss => ss.Field(query.SortField, query.SortOrder)));
        
        return MapToResult(response);
    }
}

// Inventory - Redis Atomic Decrement (prevent overselling)
public class InventoryService {
    private readonly IDatabase _redis;
    private readonly AppDbContext _db;
    
    public async Task&lt;Result&gt; ReserveStockAsync(int productId, int quantity) {
        var key = $"inventory:{productId}";
        
        // Atomic check-and-decrement with Lua script
        var script = @"
            local current = tonumber(redis.call('GET', KEYS[1]))
            if current >= tonumber(ARGV[1]) then
                redis.call('DECRBY', KEYS[1], ARGV[1])
                return 1
            end
            return 0";
        
        var result = await _redis.ScriptEvaluateAsync(script,
            new RedisKey[] { key },
            new RedisValue[] { quantity });
        
        if ((int)result == 0)
            return Result.Failure("Insufficient stock");
        
        // Async sync to database
        await _messageBus.PublishAsync(new StockReservedEvent(productId, quantity));
        return Result.Success();
    }
}

// Order Processing Pipeline (Saga)
public class OrderSaga : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken ct) {
        await foreach (var order in _orderChannel.Reader.ReadAllAsync(ct)) {
            try {
                // Step 1: Reserve inventory
                var reserved = await _inventory.ReserveAsync(order.Items);
                if (!reserved.IsSuccess) { await RejectOrder(order); continue; }
                
                // Step 2: Process payment
                var payment = await _payment.ChargeAsync(order.Total);
                if (!payment.IsSuccess) {
                    await _inventory.ReleaseAsync(order.Items);  // Compensate
                    await RejectOrder(order); continue;
                }
                
                // Step 3: Confirm order
                await _orders.ConfirmAsync(order.Id);
                await _notifications.SendConfirmationAsync(order);
            }
            catch (Exception ex) {
                await CompensateAll(order);
                _logger.LogError(ex, "Order saga failed for {OrderId}", order.Id);
            }
        }
    }
}</div>`,
  en: `<p><strong>Search:</strong> Elasticsearch for full-text, faceted search on 10M products. Sync via CDC/Outbox.</p>
<p><strong>Inventory:</strong> Redis atomic decrement for flash sales. Lua script for check-and-decrement atomicity.</p>
<p><strong>Order Pipeline:</strong> Async saga: Reserve → Pay → Confirm with compensating actions on failure.</p>
<p><strong>Separation:</strong> Catalog (read-heavy, cached) separate from Inventory (write-heavy, real-time).</p>
<div class="code-block">// Redis atomic stock reservation (Lua script)
local current = redis.call('GET', KEYS[1])
if current >= ARGV[1] then redis.call('DECRBY', KEYS[1], ARGV[1]) return 1 end
return 0</div>`,
  tip: "E-commerce design: focus on inventory concurrency (flash sale scenario) và search scalability. Đây là 2 điểm interviewer muốn nghe nhất."
},
{
  n: "Design: Chat System",
  l: "expert",
  p: ["SignalR with Redis backplane", "Presence detection (online/offline)", "Message delivery guarantees", "Message storage & retrieval"],
  q: "Thiết kế hệ thống chat real-time với delivery guarantees và presence detection?",
  vi: `<p><strong>SignalR + Redis Backplane:</strong> SignalR cho real-time WebSocket communication. Redis backplane đồng bộ messages across multiple server instances. Fallback: SSE → Long Polling cho clients không support WebSocket.</p>
<p><strong>Presence Detection:</strong> Track user online/offline status. Redis SET cho online users, TTL-based heartbeat. Publish presence changes to relevant users (contacts/group members).</p>
<p><strong>Delivery Guarantees:</strong> At-least-once: store message in DB first, then deliver. Client ACK khi nhận. Retry unACKed messages. Offline users nhận khi reconnect (pull unread). Message states: Sent → Delivered → Read.</p>
<p><strong>Storage:</strong> Messages in DB (partitioned by conversation). Recent messages cached in Redis. Pagination cho history. Separate read/write paths.</p>
<div class="code-block">// Chat Architecture:
// [Client] ←WebSocket→ [SignalR Hub] ←Redis Backplane→ [Other Hubs]
//                            ↓
//                    [Message Service]
//                      ↓           ↓
//              [Redis Cache]   [PostgreSQL]
//              (recent msgs)   (all messages)

// Message Entity
public class ChatMessage {
    public Guid Id { get; set; }
    public string ConversationId { get; set; }
    public string SenderId { get; set; }
    public string Content { get; set; }
    public DateTime SentAt { get; set; }
    public MessageStatus Status { get; set; }  // Sent, Delivered, Read
}

// Chat Hub with delivery tracking
public class ChatHub : Hub&lt;IChatClient&gt; {
    public async Task SendMessage(string conversationId, string content) {
        var message = new ChatMessage {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderId = Context.UserIdentifier!,
            Content = content,
            SentAt = DateTime.UtcNow,
            Status = MessageStatus.Sent
        };
        
        // 1. Persist first (durability)
        await _messageService.SaveAsync(message);
        
        // 2. Deliver to online recipients
        var members = await _conversationService.GetMembersAsync(conversationId);
        foreach (var memberId in members.Where(m => m != message.SenderId)) {
            await Clients.User(memberId).ReceiveMessage(message);
        }
        
        // 3. Queue for offline users
        var offlineMembers = members.Where(m => !await _presence.IsOnlineAsync(m));
        await _notificationQueue.EnqueueAsync(offlineMembers, message);
    }
    
    // Client acknowledges receipt
    public async Task AcknowledgeMessage(Guid messageId) {
        await _messageService.UpdateStatusAsync(messageId, MessageStatus.Delivered);
        var msg = await _messageService.GetAsync(messageId);
        await Clients.User(msg.SenderId).MessageDelivered(messageId);
    }
    
    // Mark as read
    public async Task MarkRead(string conversationId, DateTime readUntil) {
        await _messageService.MarkReadAsync(
            conversationId, Context.UserIdentifier!, readUntil);
        // Notify sender about read receipt
        var members = await _conversationService.GetMembersAsync(conversationId);
        await Clients.Users(members).ReadReceipt(
            conversationId, Context.UserIdentifier!, readUntil);
    }
}

// Presence Service with Redis
public class PresenceService {
    private readonly IDatabase _redis;
    private const int HeartbeatTTL = 30;  // seconds
    
    public async Task SetOnlineAsync(string userId) {
        await _redis.StringSetAsync($"presence:{userId}", "online",
            TimeSpan.FromSeconds(HeartbeatTTL));
        await _redis.PublishAsync("presence:changes", 
            JsonSerializer.Serialize(new { userId, status = "online" }));
    }
    
    public async Task HeartbeatAsync(string userId) {
        await _redis.KeyExpireAsync($"presence:{userId}",
            TimeSpan.FromSeconds(HeartbeatTTL));
    }
    
    public async Task&lt;bool&gt; IsOnlineAsync(string userId) {
        return await _redis.KeyExistsAsync($"presence:{userId}");
    }
}

// Unread messages on reconnect
public override async Task OnConnectedAsync() {
    var userId = Context.UserIdentifier!;
    await _presence.SetOnlineAsync(userId);
    
    // Deliver pending messages
    var undelivered = await _messageService.GetUndeliveredAsync(userId);
    foreach (var msg in undelivered) {
        await Clients.Caller.ReceiveMessage(msg);
    }
}</div>`,
  en: `<p><strong>SignalR + Redis:</strong> WebSocket real-time with Redis backplane for multi-instance sync.</p>
<p><strong>Presence:</strong> Redis key with TTL heartbeat. Publish changes to contacts.</p>
<p><strong>Delivery:</strong> Persist first, deliver to online, queue for offline. Client ACK for confirmation. States: Sent→Delivered→Read.</p>
<p><strong>Storage:</strong> DB for persistence, Redis for recent messages cache. Pagination for history.</p>
<div class="code-block">// Delivery guarantee: persist → deliver → ACK
await _messageService.SaveAsync(message);  // Durability first
await Clients.User(recipientId).ReceiveMessage(message);
// Client calls AcknowledgeMessage → status = Delivered</div>`,
  tip: "Focus on: delivery guarantees (persist first, ACK mechanism) và presence (heartbeat TTL). Đây là điểm khác biệt giữa toy chat và production chat."
},
{
  n: "Design: Notification System",
  l: "expert",
  p: ["Multi-channel delivery (push, email, SMS, in-app)", "Priority queue & batching", "User preferences & throttling", "Template engine & localization"],
  q: "Thiết kế Notification System multi-channel với priority và batching?",
  vi: `<p><strong>Multi-channel:</strong> Mỗi notification có thể deliver qua nhiều channels: Push (Firebase/APNs), Email (SendGrid), SMS (Twilio), In-app (SignalR). User chọn channels per notification type. Strategy pattern cho mỗi channel.</p>
<p><strong>Priority Queue:</strong> Critical (OTP, security alerts) → High (order updates) → Normal (promotions) → Low (weekly digest). Separate queues per priority. Critical bypass batching.</p>
<p><strong>Batching:</strong> Group similar notifications (5 new comments → "You have 5 new comments" thay vì 5 separate notifications). Time-window batching cho non-critical. Reduce notification fatigue.</p>
<p><strong>User Preferences:</strong> Per-type channel preferences. Quiet hours. Frequency caps (max 10 push/day). Unsubscribe per category.</p>
<div class="code-block">// Notification System Architecture:
// [Event Source] → [Notification Service] → [Priority Queue]
//                                               ↓
//                                    [Channel Router]
//                          ↓         ↓         ↓         ↓
//                      [Push]    [Email]    [SMS]    [In-App]
//                          ↓         ↓         ↓         ↓
//                      [FCM]   [SendGrid] [Twilio] [SignalR]

// Notification Entity
public class Notification {
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string Type { get; set; }        // "order_shipped", "new_message"
    public NotificationPriority Priority { get; set; }
    public Dictionary&lt;string, object&gt; Data { get; set; }
    public List&lt;DeliveryChannel&gt; Channels { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

// Channel Strategy Pattern
public interface INotificationChannel {
    string ChannelName { get; }
    Task&lt;DeliveryResult&gt; SendAsync(Notification notification, UserPreferences prefs);
}

public class PushNotificationChannel : INotificationChannel {
    public string ChannelName => "push";
    public async Task&lt;DeliveryResult&gt; SendAsync(Notification notification, UserPreferences prefs) {
        if (prefs.QuietHoursActive) return DeliveryResult.Deferred();
        var message = _templateEngine.Render(notification.Type, notification.Data);
        await _fcmClient.SendAsync(new FcmMessage {
            Token = prefs.DeviceToken,
            Title = message.Title,
            Body = message.Body,
            Data = notification.Data
        });
        return DeliveryResult.Sent();
    }
}

// Priority-based Processing
public class NotificationProcessor : BackgroundService {
    private readonly Channel&lt;Notification&gt; _criticalQueue;   // Process immediately
    private readonly Channel&lt;Notification&gt; _normalQueue;     // Batch-eligible
    
    protected override async Task ExecuteAsync(CancellationToken ct) {
        // Critical: process immediately
        var criticalTask = ProcessQueueAsync(_criticalQueue.Reader, batch: false, ct);
        // Normal: batch every 5 minutes
        var normalTask = ProcessQueueAsync(_normalQueue.Reader, batch: true, ct);
        await Task.WhenAll(criticalTask, normalTask);
    }
}

// Batching Logic
public class NotificationBatcher {
    private readonly Dictionary&lt;string, List&lt;Notification&gt;&gt; _buffer = new();
    
    public async Task&lt;List&lt;BatchedNotification&gt;&gt; FlushAsync() {
        var batched = new List&lt;BatchedNotification&gt;();
        foreach (var (userId, notifications) in _buffer) {
            // Group by type
            var grouped = notifications.GroupBy(n => n.Type);
            foreach (var group in grouped) {
                if (group.Count() > 1) {
                    // Batch: "You have 5 new comments"
                    batched.Add(new BatchedNotification {
                        UserId = userId,
                        Type = group.Key,
                        Count = group.Count(),
                        Template = "batch_summary"
                    });
                } else {
                    batched.Add(new BatchedNotification { /* single */ });
                }
            }
        }
        _buffer.Clear();
        return batched;
    }
}

// User Preferences & Throttling
public class NotificationRouter {
    public async Task RouteAsync(Notification notification) {
        var prefs = await _prefsService.GetAsync(notification.UserId);
        
        // Check frequency cap
        var todayCount = await _counter.GetTodayCountAsync(notification.UserId, "push");
        if (todayCount >= prefs.MaxPushPerDay) return;
        
        // Check quiet hours
        if (prefs.IsQuietHours(DateTime.Now)) {
            await _deferQueue.EnqueueAsync(notification, prefs.QuietHoursEnd);
            return;
        }
        
        // Route to preferred channels
        var channels = prefs.GetChannelsForType(notification.Type);
        foreach (var channel in channels) {
            await _channelFactory.GetChannel(channel).SendAsync(notification, prefs);
        }
    }
}</div>`,
  en: `<p><strong>Multi-channel:</strong> Push, Email, SMS, In-app via Strategy pattern. User selects channels per type.</p>
<p><strong>Priority:</strong> Separate queues by priority. Critical bypasses batching.</p>
<p><strong>Batching:</strong> Group similar notifications in time windows. Reduce fatigue.</p>
<p><strong>Preferences:</strong> Per-type channels, quiet hours, frequency caps, unsubscribe.</p>
<div class="code-block">// Route based on user preferences and throttling
var channels = prefs.GetChannelsForType(notification.Type);
if (todayCount >= prefs.MaxPushPerDay) return; // Throttle</div>`,
  tip: "Key design decisions: priority queues (critical vs normal), batching (reduce fatigue), user preferences (respect user). Mention: 'notification fatigue kills engagement.'"
},
{
  n: "Design: URL Shortener",
  l: "expert",
  p: ["Base62 encoding for short codes", "Caching strategy for hot URLs", "Analytics & click tracking", "Collision handling & uniqueness"],
  q: "Thiết kế URL Shortener service với analytics. Làm sao generate unique short codes?",
  vi: `<p><strong>Base62 Encoding:</strong> Dùng [a-zA-Z0-9] = 62 characters. 7 chars = 62^7 = 3.5 trillion combinations. Approaches: (1) Auto-increment ID → Base62, (2) Random generation + collision check, (3) Pre-generated pool. Counter-based đảm bảo uniqueness.</p>
<p><strong>Caching:</strong> 80/20 rule - 20% URLs nhận 80% traffic. Cache hot URLs trong Redis với TTL. Cache-aside pattern. Bloom filter cho existence check (avoid DB lookup cho non-existent codes).</p>
<p><strong>Analytics:</strong> Async tracking - log click events to message queue, process in background. Track: timestamp, IP, user-agent, referrer, geo-location. Time-series DB cho aggregation.</p>
<p><strong>Collision Handling:</strong> Counter-based (no collision). Random: check DB, retry if exists. Pre-generated: background service generates pool of available codes, app picks from pool (no collision, no latency).</p>
<div class="code-block">// URL Shortener Architecture:
// [Client] → [API] → [Redis Cache] → [PostgreSQL]
//                ↓
//         [Analytics Queue] → [ClickHouse/TimescaleDB]

// Base62 Encoding
public static class Base62 {
    private const string Chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    public static string Encode(long number) {
        if (number == 0) return "0";
        var sb = new StringBuilder();
        while (number > 0) {
            sb.Insert(0, Chars[(int)(number % 62)]);
            number /= 62;
        }
        return sb.ToString();
    }
    
    public static long Decode(string encoded) {
        return encoded.Aggregate(0L, (current, c) => current * 62 + Chars.IndexOf(c));
    }
}

// URL Service
public class UrlShortenerService {
    private readonly IDistributedCache _cache;
    private readonly AppDbContext _db;
    private readonly IAnalyticsPublisher _analytics;
    
    public async Task&lt;string&gt; ShortenAsync(string originalUrl, string? customAlias = null) {
        // Option 1: Counter-based (guaranteed unique)
        var entry = new UrlEntry { OriginalUrl = originalUrl, CreatedAt = DateTime.UtcNow };
        _db.Urls.Add(entry);
        await _db.SaveChangesAsync();
        entry.ShortCode = Base62.Encode(entry.Id);  // ID → Base62
        await _db.SaveChangesAsync();
        
        // Cache immediately (likely to be accessed soon)
        await _cache.SetStringAsync($"url:{entry.ShortCode}", originalUrl,
            new DistributedCacheEntryOptions { 
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) 
            });
        
        return $"https://short.ly/{entry.ShortCode}";
    }
    
    public async Task&lt;string?&gt; ResolveAsync(string shortCode, HttpContext context) {
        // 1. Check cache first
        var cached = await _cache.GetStringAsync($"url:{shortCode}");
        if (cached != null) {
            // Fire-and-forget analytics
            _ = _analytics.TrackClickAsync(shortCode, context);
            return cached;
        }
        
        // 2. Check DB
        var entry = await _db.Urls.FirstOrDefaultAsync(u => u.ShortCode == shortCode);
        if (entry == null) return null;
        
        // 3. Populate cache
        await _cache.SetStringAsync($"url:{shortCode}", entry.OriginalUrl,
            new DistributedCacheEntryOptions { 
                SlidingExpiration = TimeSpan.FromHours(1) 
            });
        
        _ = _analytics.TrackClickAsync(shortCode, context);
        return entry.OriginalUrl;
    }
}

// Analytics - async processing
public class ClickAnalyticsConsumer : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken ct) {
        await foreach (var click in _channel.Reader.ReadAllAsync(ct)) {
            await _timescaleDb.InsertAsync(new ClickEvent {
                ShortCode = click.ShortCode,
                Timestamp = click.Timestamp,
                Country = _geoIp.GetCountry(click.IpAddress),
                Device = ParseUserAgent(click.UserAgent),
                Referrer = click.Referrer
            });
        }
    }
}

// API Endpoint
app.MapGet("/{code}", async (string code, HttpContext ctx, UrlShortenerService svc) => {
    var url = await svc.ResolveAsync(code, ctx);
    return url != null ? Results.Redirect(url, permanent: false) : Results.NotFound();
});</div>`,
  en: `<p><strong>Base62:</strong> 7 chars = 3.5T combinations. Counter-based (ID→Base62) guarantees uniqueness.</p>
<p><strong>Caching:</strong> Redis for hot URLs (80/20 rule). Bloom filter for non-existent code checks.</p>
<p><strong>Analytics:</strong> Async click tracking via message queue to time-series DB.</p>
<p><strong>Collision:</strong> Counter-based (none), random (check+retry), pre-generated pool (none, no latency).</p>
<div class="code-block">// Counter-based: ID → Base62 = guaranteed unique
entry.ShortCode = Base62.Encode(entry.Id); // 12345 → "dnh"</div>`,
  tip: "URL Shortener là classic system design question. Key points: Base62 encoding, caching hot URLs, async analytics. Mention read:write ratio (100:1) drives caching strategy."
},
{
  n: "Design: Auth/SSO Service",
  l: "expert",
  p: ["OAuth2 flows (Authorization Code, PKCE)", "Token management & rotation", "Multi-Factor Authentication (MFA)", "Single Sign-On across services"],
  q: "Thiết kế Authentication/SSO service với OAuth2, MFA, và token management?",
  vi: `<p><strong>OAuth2 Flows:</strong> Authorization Code + PKCE cho SPAs/mobile (most secure). Client Credentials cho service-to-service. Implicit flow deprecated. PKCE prevents authorization code interception.</p>
<p><strong>Token Management:</strong> Access token (short-lived, 15min, JWT). Refresh token (long-lived, 7-30 days, opaque, stored in DB). Token rotation: new refresh token mỗi lần refresh. Revocation via blacklist hoặc token family.</p>
<p><strong>MFA:</strong> TOTP (Google Authenticator), SMS OTP, WebAuthn/FIDO2 (hardware keys). Backup codes cho recovery. Step-up authentication cho sensitive operations.</p>
<p><strong>SSO:</strong> Central Identity Provider (IdP). Services redirect to IdP for auth. IdP issues tokens accepted by all services. Session management: SSO session + per-service sessions. Single Logout propagation.</p>
<div class="code-block">// OAuth2 Authorization Code + PKCE Flow:
// 1. Client generates code_verifier (random) + code_challenge (SHA256)
// 2. Client redirects to /authorize?code_challenge=xxx&response_type=code
// 3. User authenticates at IdP
// 4. IdP redirects back with authorization_code
// 5. Client exchanges code + code_verifier for tokens at /token
// 6. IdP verifies SHA256(code_verifier) == code_challenge

// Identity Provider Service
public class AuthService {
    public async Task&lt;AuthResult&gt; AuthenticateAsync(LoginRequest request) {
        // Step 1: Validate credentials
        var user = await _userStore.FindByEmailAsync(request.Email);
        if (user == null || !_hasher.Verify(request.Password, user.PasswordHash))
            return AuthResult.Failed("Invalid credentials");
        
        // Step 2: Check MFA requirement
        if (user.MfaEnabled) {
            var mfaToken = GenerateMfaToken(user.Id);
            return AuthResult.MfaRequired(mfaToken);
        }
        
        // Step 3: Issue tokens
        return await IssueTokensAsync(user);
    }
    
    public async Task&lt;AuthResult&gt; VerifyMfaAsync(MfaRequest request) {
        var userId = ValidateMfaToken(request.MfaToken);
        var user = await _userStore.FindByIdAsync(userId);
        
        // Verify TOTP code
        var isValid = _totpService.Verify(user.MfaSecret, request.Code);
        if (!isValid) return AuthResult.Failed("Invalid MFA code");
        
        return await IssueTokensAsync(user);
    }
    
    private async Task&lt;AuthResult&gt; IssueTokensAsync(User user) {
        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user);
        
        // Create SSO session
        var session = new SsoSession {
            UserId = user.Id,
            SessionId = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddHours(8),
            Services = new List&lt;string&gt;()
        };
        await _sessionStore.CreateAsync(session);
        
        return AuthResult.Success(accessToken, refreshToken, session.SessionId);
    }
}

// MFA - TOTP Setup
public class MfaService {
    public MfaSetupResult SetupTotp(string userId) {
        var secret = Base32Encoding.ToString(RandomNumberGenerator.GetBytes(20));
        var uri = $"otpauth://totp/MyApp:{userId}?secret={secret}&issuer=MyApp";
        return new MfaSetupResult(secret, uri);  // Show QR code of URI
    }
    
    public bool Verify(string secret, string code) {
        var totp = new Totp(Base32Encoding.ToBytes(secret));
        return totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
    }
}

// SSO - Token validation middleware for services
public class SsoTokenValidationMiddleware {
    public async Task InvokeAsync(HttpContext context) {
        var token = context.Request.Headers.Authorization.ToString().Replace("Bearer ", "");
        var principal = _tokenService.ValidateAccessToken(token);
        
        if (principal == null) {
            context.Response.StatusCode = 401;
            return;
        }
        
        // Verify SSO session still active
        var sessionId = principal.FindFirst("session_id")?.Value;
        var session = await _sessionStore.GetAsync(sessionId);
        if (session == null || session.IsRevoked) {
            context.Response.StatusCode = 401;
            return;
        }
        
        context.User = principal;
        await _next(context);
    }
}

// Single Logout
public async Task LogoutAsync(string sessionId) {
    var session = await _sessionStore.GetAsync(sessionId);
    session.IsRevoked = true;
    await _sessionStore.UpdateAsync(session);
    
    // Notify all services to clear local sessions
    foreach (var service in session.Services) {
        await _httpClient.PostAsync($"{service}/logout", 
            new StringContent(JsonSerializer.Serialize(new { sessionId })));
    }
}</div>`,
  en: `<p><strong>OAuth2:</strong> Authorization Code + PKCE for SPAs/mobile. Client Credentials for service-to-service.</p>
<p><strong>Tokens:</strong> Short-lived access (JWT, 15min) + long-lived refresh (opaque, rotated). Revocation via blacklist.</p>
<p><strong>MFA:</strong> TOTP, SMS, WebAuthn. Step-up auth for sensitive operations. Backup codes for recovery.</p>
<p><strong>SSO:</strong> Central IdP issues tokens for all services. Session management + single logout propagation.</p>
<div class="code-block">// PKCE: code_verifier → SHA256 → code_challenge
// Prevents authorization code interception attacks</div>`,
  tip: "Auth design: emphasize security layers (PKCE, token rotation, MFA). Mention OWASP guidelines. SSO = central session + per-service validation."
}
]
});
