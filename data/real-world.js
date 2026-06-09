window.GUIDE_DATA = window.GUIDE_DATA || [];
window.GUIDE_DATA.push({
t: "Real-World Scenarios",
c: "bg-6",
items: [
{
  n: "Memory Leak in Production",
  l: "senior",
  p: ["Detection symptoms & monitoring", "Common causes in .NET", "Diagnostic tools (dotnet-dump, dotnet-gcdump)", "Fix strategies & prevention"],
  q: "Phát hiện và fix memory leak trong production .NET application. Các nguyên nhân phổ biến?",
  vi: `<p><strong>Detection:</strong> Symptoms: memory tăng liên tục không giảm, GC frequency tăng, OutOfMemoryException, container OOM killed. Monitor: Process memory (Working Set), GC heap size, Gen2 collection count.</p>
<p><strong>Common Causes:</strong> (1) Event handlers không unsubscribe, (2) Static collections grow unbounded, (3) IDisposable không dispose (HttpClient, DbContext), (4) Closure capture giữ reference, (5) Cache không có eviction policy, (6) String concatenation trong loop.</p>
<p><strong>Diagnostic Tools:</strong> dotnet-gcdump: capture GC heap snapshot. dotnet-dump: full process dump analysis. dotnet-counters: real-time GC metrics. Visual Studio Diagnostic Tools. JetBrains dotMemory.</p>
<p><strong>Fix & Prevention:</strong> Weak references cho caches, IDisposable pattern, static analysis tools, memory pressure tests trong CI, bounded collections.</p>
<div class="code-block">// ⚠️ Common Memory Leak: Event handler not unsubscribed
public class OrderPage : IDisposable {
    private readonly IOrderService _service;
    
    public OrderPage(IOrderService service) {
        _service = service;
        _service.OrderUpdated += OnOrderUpdated;  // Subscribe
    }
    
    // ❌ If Dispose never called, OrderPage stays in memory forever!
    // _service (singleton) holds reference to OrderPage via event
    
    public void Dispose() {
        _service.OrderUpdated -= OnOrderUpdated;  // Must unsubscribe!
    }
}

// ⚠️ Static collection growing forever
public static class AuditLog {
    private static readonly List&lt;string&gt; _logs = new();  // Never cleared!
    public static void Log(string message) => _logs.Add(message);
}

// ⚠️ HttpClient not disposed (socket exhaustion + memory)
// ❌ BAD
public async Task&lt;string&gt; GetDataAsync() {
    using var client = new HttpClient();  // Creates new socket each time!
    return await client.GetStringAsync("https://api.example.com");
}
// ✅ GOOD: Use IHttpClientFactory
public class MyService {
    private readonly HttpClient _client;
    public MyService(IHttpClientFactory factory) {
        _client = factory.CreateClient("api");
    }
}

// Diagnostic: dotnet-gcdump
// $ dotnet-gcdump collect -p <PID>
// $ dotnet-gcdump report <file.gcdump>
// Shows: top types by size, retention paths

// Diagnostic: dotnet-counters (real-time)
// $ dotnet-counters monitor -p <PID> --counters System.Runtime
// Watch: gc-heap-size, gen-0-gc-count, gen-2-gc-count

// Fix: Bounded cache with eviction
public class BoundedCache&lt;TKey, TValue&gt; {
    private readonly ConcurrentDictionary&lt;TKey, CacheEntry&gt; _cache = new();
    private readonly int _maxSize;
    
    public void Set(TKey key, TValue value, TimeSpan ttl) {
        if (_cache.Count >= _maxSize) {
            EvictOldest();  // Remove expired or LRU entries
        }
        _cache[key] = new CacheEntry(value, DateTime.UtcNow.Add(ttl));
    }
}

// Prevention: WeakReference for observer pattern
public class EventAggregator {
    private readonly List&lt;WeakReference&lt;IEventHandler&gt;&gt; _handlers = new();
    
    public void Subscribe(IEventHandler handler) {
        _handlers.Add(new WeakReference&lt;IEventHandler&gt;(handler));
    }
    
    public void Publish(IEvent evt) {
        _handlers.RemoveAll(wr => !wr.TryGetTarget(out _));  // Cleanup dead refs
        foreach (var wr in _handlers) {
            if (wr.TryGetTarget(out var handler))
                handler.Handle(evt);
        }
    }
}

// Health check for memory
public class MemoryHealthCheck : IHealthCheck {
    public Task&lt;HealthCheckResult&gt; CheckHealthAsync(HealthCheckContext ctx, CancellationToken ct) {
        var allocated = GC.GetTotalMemory(false);
        var threshold = 1_500_000_000L;  // 1.5GB
        return Task.FromResult(allocated > threshold
            ? HealthCheckResult.Unhealthy($"Memory: {allocated / 1_000_000}MB")
            : HealthCheckResult.Healthy());
    }
}</div>`,
  en: `<p><strong>Detection:</strong> Rising memory, frequent GC, OOM exceptions. Monitor Working Set and GC heap size.</p>
<p><strong>Causes:</strong> Unsubscribed events, static collections, undisposed resources, closure captures, unbounded caches.</p>
<p><strong>Tools:</strong> dotnet-gcdump (heap snapshot), dotnet-counters (real-time), dotnet-dump (full analysis).</p>
<p><strong>Fix:</strong> Bounded collections, WeakReference, IDisposable, IHttpClientFactory, eviction policies.</p>
<div class="code-block">// dotnet-gcdump collect -p &lt;PID&gt;
// Shows top types by retained size and GC roots</div>`,
  tip: "Kể story: 'Production app memory tăng 100MB/hour. Dùng dotnet-gcdump phát hiện event handler leak. Fix: implement IDisposable, unsubscribe trong Dispose.' Concrete experience wins."
},
{
  n: "Thread Pool Starvation",
  l: "senior",
  p: ["Symptoms (slow responses, timeouts)", "Root cause (sync-over-async, blocking calls)", "Detection with dotnet-counters", "Fix strategies"],
  q: "Thread Pool Starvation là gì? Nguyên nhân và cách fix trong ASP.NET Core?",
  vi: `<p><strong>Symptoms:</strong> Response times tăng đột ngột (seconds thay vì ms). Timeouts. CPU thấp nhưng throughput thấp. Thread count tăng liên tục (thread injection). Health checks timeout.</p>
<p><strong>Root Cause:</strong> Thread pool threads bị block bởi synchronous operations: .Result/.Wait() trên async code, synchronous I/O (File.ReadAllText thay vì ReadAllTextAsync), Thread.Sleep, blocking database calls. Pool hết threads → requests queue → cascade failure.</p>
<p><strong>Detection:</strong> dotnet-counters: ThreadPool Queue Length > 0 liên tục, ThreadPool Thread Count tăng. Application Insights: request duration spikes. Thread dump: nhiều threads stuck tại .Result hoặc Monitor.Enter.</p>
<p><strong>Fix:</strong> (1) Async all the way - KHÔNG .Result/.Wait(). (2) Dùng async I/O APIs. (3) Tăng min threads tạm thời (ThreadPool.SetMinThreads). (4) Offload CPU-bound work với Task.Run (cẩn thận). (5) Identify và fix blocking calls.</p>
<div class="code-block">// ⚠️ Cause 1: Sync-over-async (.Result blocks thread)
public IActionResult GetData() {
    // BLOCKS a thread pool thread waiting for async result!
    var data = _httpClient.GetStringAsync("https://api.com").Result;
    return Ok(data);
}
// Under load: all threads blocked → no threads for new requests → STARVATION

// ✅ Fix: Async all the way
public async Task&lt;IActionResult&gt; GetData() {
    var data = await _httpClient.GetStringAsync("https://api.com");
    return Ok(data);
}

// ⚠️ Cause 2: Synchronous I/O
public IActionResult ProcessFile() {
    var content = File.ReadAllText("large-file.txt");  // Blocks thread!
    return Ok(Process(content));
}
// ✅ Fix
public async Task&lt;IActionResult&gt; ProcessFile() {
    var content = await File.ReadAllTextAsync("large-file.txt");
    return Ok(Process(content));
}

// ⚠️ Cause 3: Blocking in constructor (DI resolution blocks)
public class MyService {
    private readonly Data _data;
    public MyService(IDataProvider provider) {
        _data = provider.GetDataAsync().Result;  // Blocks during DI!
    }
}
// ✅ Fix: Use async initialization or Lazy
public class MyService {
    private readonly Lazy&lt;Task&lt;Data&gt;&gt; _data;
    public MyService(IDataProvider provider) {
        _data = new Lazy&lt;Task&lt;Data&gt;&gt;(() => provider.GetDataAsync());
    }
    public async Task&lt;Data&gt; GetDataAsync() => await _data.Value;
}

// Detection: dotnet-counters
// $ dotnet-counters monitor -p <PID> System.Runtime
// Watch these metrics:
// - threadpool-thread-count: should be stable, not growing
// - threadpool-queue-length: should be 0, > 0 means starvation
// - threadpool-completed-items-count: throughput indicator

// Temporary mitigation (buy time while fixing root cause)
ThreadPool.SetMinThreads(workerThreads: 200, completionPortThreads: 200);
// WARNING: This is a band-aid, not a fix!

// Prevention: Detect blocking calls in development
// Add to Program.cs (Development only)
if (app.Environment.IsDevelopment()) {
    // Ben.BlockingDetector NuGet package
    // Logs warning when async code is blocked synchronously
}

// Real scenario timeline:
// 1. Normal: 50 threads handle 1000 RPS (each request ~50ms async)
// 2. Deploy code with .Result call in hot path
// 3. Each request now blocks thread for 200ms
// 4. Thread pool grows: 50 → 100 → 200 (injection rate: 1-2/sec)
// 5. Queue builds up, response times: 50ms → 2s → 30s → timeout
// 6. Health checks fail → load balancer removes instance → cascade</div>`,
  en: `<p><strong>Symptoms:</strong> Slow responses, timeouts, low CPU but low throughput, growing thread count.</p>
<p><strong>Cause:</strong> Blocking calls (.Result, .Wait(), sync I/O) exhaust thread pool threads.</p>
<p><strong>Detection:</strong> dotnet-counters: queue length > 0, thread count growing. Thread dumps show blocking.</p>
<p><strong>Fix:</strong> Async all the way, async I/O APIs, remove .Result/.Wait(). SetMinThreads as temporary band-aid.</p>
<div class="code-block">// BAD: blocks thread pool thread
var data = _client.GetAsync(url).Result;
// GOOD: releases thread during I/O
var data = await _client.GetAsync(url);</div>`,
  tip: "Thread pool starvation là production killer #1 trong .NET. Rule: NEVER .Result or .Wait() in request pipeline. Mention dotnet-counters cho monitoring."
},
{
  n: "Connection Pool Exhaustion",
  l: "senior",
  p: ["Symptoms & error messages", "Root causes (undisposed connections, long transactions)", "Fix with proper lifetime management", "Monitoring & alerting"],
  q: "Connection Pool Exhaustion xảy ra khi nào? Nguyên nhân và cách fix?",
  vi: `<p><strong>Symptoms:</strong> "Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool." Intermittent failures under load. Works fine with low traffic, fails at peak.</p>
<p><strong>Root Causes:</strong> (1) DbContext/Connection không dispose (leak). (2) Long-running transactions giữ connections. (3) Pool size quá nhỏ cho load. (4) Async void methods (fire-and-forget) mở connections không track. (5) Deadlocks giữ connections.</p>
<p><strong>Fix:</strong> Proper DI lifetime (Scoped DbContext), using statements, connection string tuning (Max Pool Size, Connection Timeout), identify long transactions, async all the way.</p>
<p><strong>Monitoring:</strong> Track active connections, pool wait time, connection lifetime. Alert khi pool utilization > 80%. SQL Server: sys.dm_exec_connections.</p>
<div class="code-block">// ⚠️ Cause 1: Connection leak (not disposing)
public class BadService {
    public List&lt;Order&gt; GetOrders() {
        var connection = new SqlConnection(connectionString);
        connection.Open();
        // ... query ...
        return orders;
        // ❌ Connection never closed! Leaked back to pool only on GC
    }
}

// ✅ Fix: Always dispose
public class GoodService {
    public async Task&lt;List&lt;Order&gt;&gt; GetOrdersAsync() {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        // ... query ...
        return orders;
    }  // Connection returned to pool here
}

// ⚠️ Cause 2: Long transaction holds connection
public async Task ProcessBatchAsync(List&lt;Order&gt; orders) {
    using var transaction = await _db.Database.BeginTransactionAsync();
    foreach (var order in orders) {  // 1000 orders × 100ms each = 100 seconds!
        await ProcessSingleOrder(order);  // Connection held entire time
    }
    await transaction.CommitAsync();
}

// ✅ Fix: Smaller batches
public async Task ProcessBatchAsync(List&lt;Order&gt; orders) {
    foreach (var batch in orders.Chunk(50)) {
        using var transaction = await _db.Database.BeginTransactionAsync();
        foreach (var order in batch) {
            await ProcessSingleOrder(order);
        }
        await transaction.CommitAsync();
    }  // Connection released between batches
}

// ⚠️ Cause 3: Fire-and-forget leaking connections
public IActionResult CreateOrder(OrderDto dto) {
    _ = ProcessOrderAsync(dto);  // ❌ No await! Connection may leak on exception
    return Accepted();
}

// ✅ Fix: Use background service with proper scope
public IActionResult CreateOrder(OrderDto dto) {
    _backgroundQueue.Enqueue(dto);  // Proper lifecycle management
    return Accepted();
}

// Connection String Tuning
"Server=db;Database=app;Max Pool Size=200;Min Pool Size=10;Connection Timeout=30;
 Connection Lifetime=300;Pooling=true;"

// Max Pool Size: default 100, increase for high-traffic apps
// Min Pool Size: keep warm connections ready
// Connection Lifetime: recycle connections (load balancer friendly)
// Connection Timeout: how long to wait for available connection

// Monitoring: EF Core interceptor
public class ConnectionPoolInterceptor : DbConnectionInterceptor {
    private static int _activeConnections;
    
    public override async ValueTask&lt;InterceptionResult&gt; ConnectionOpeningAsync(
        DbConnection connection, ConnectionEventData eventData, 
        InterceptionResult result, CancellationToken ct) {
        var count = Interlocked.Increment(ref _activeConnections);
        if (count > 80)  // 80% of pool
            _logger.LogWarning("Connection pool high: {Count}/100", count);
        return result;
    }
    
    public override async Task ConnectionClosedAsync(
        DbConnection connection, ConnectionEndEventData eventData) {
        Interlocked.Decrement(ref _activeConnections);
    }
}

// SQL Server monitoring
// SELECT COUNT(*) FROM sys.dm_exec_connections WHERE session_id > 50;
// SELECT * FROM sys.dm_exec_requests WHERE blocking_session_id > 0;</div>`,
  en: `<p><strong>Symptoms:</strong> "Timeout expired obtaining connection from pool." Intermittent under load.</p>
<p><strong>Causes:</strong> Undisposed connections, long transactions, small pool size, fire-and-forget leaks.</p>
<p><strong>Fix:</strong> Proper disposal (using/DI Scoped), smaller transactions, tune pool size, avoid fire-and-forget.</p>
<p><strong>Monitor:</strong> Track active connections, alert at 80% pool utilization.</p>
<div class="code-block">// Connection string tuning
"Max Pool Size=200;Min Pool Size=10;Connection Timeout=30;"</div>`,
  tip: "Nói: 'Tôi đã gặp connection pool exhaustion do long-running transaction. Fix: batch processing + connection monitoring interceptor.' Real experience = credibility."
},
{
  n: "Zero-Downtime Deployment",
  l: "expert",
  p: ["Blue/Green deployment", "Database migration strategy", "Feature flags for safe rollout", "Health checks & graceful shutdown"],
  q: "Implement zero-downtime deployment cho .NET application. Xử lý database migrations thế nào?",
  vi: `<p><strong>Blue/Green:</strong> 2 identical environments. Blue = current production. Green = new version. Deploy to Green, test, switch traffic. Instant rollback: switch back to Blue. Requires: stateless apps, shared DB/cache.</p>
<p><strong>DB Migrations:</strong> Expand-Contract pattern. Migration PHẢI backward compatible (old code vẫn work với new schema). Deploy migration TRƯỚC code. Never rename/drop columns in same release.</p>
<p><strong>Feature Flags:</strong> Deploy code disabled, enable gradually (1% → 10% → 50% → 100%). Instant disable nếu có issues. A/B testing. Per-user/per-tenant targeting.</p>
<p><strong>Health Checks & Graceful Shutdown:</strong> Readiness probe: app ready to serve traffic. Liveness probe: app alive. Graceful shutdown: stop accepting new requests, finish in-flight requests, then terminate.</p>
<div class="code-block">// Deployment Strategy:
// 1. Deploy DB migration (backward compatible)
// 2. Deploy new code to Green environment
// 3. Run smoke tests against Green
// 4. Switch Load Balancer to Green
// 5. Monitor for errors
// 6. If issues: switch back to Blue (instant rollback)

// Graceful Shutdown in ASP.NET Core
var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure&lt;HostOptions&gt;(options => {
    options.ShutdownTimeout = TimeSpan.FromSeconds(30);  // Wait for in-flight requests
});

var app = builder.Build();

// Respond to shutdown signal
var lifetime = app.Services.GetRequiredService&lt;IHostApplicationLifetime&gt;();
lifetime.ApplicationStopping.Register(() => {
    // Stop accepting new work
    _logger.LogInformation("Shutting down gracefully...");
    // Wait for background tasks to complete
});

// Health Checks
builder.Services.AddHealthChecks()
    .AddCheck("ready", () => _isReady 
        ? HealthCheckResult.Healthy() 
        : HealthCheckResult.Unhealthy());

// Kubernetes probes
app.MapHealthChecks("/health/ready", new HealthCheckOptions {
    Predicate = check => check.Tags.Contains("ready")
});
app.MapHealthChecks("/health/live", new HealthCheckOptions {
    Predicate = _ => true
});

// Feature Flags with Microsoft.FeatureManagement
builder.Services.AddFeatureManagement();

// appsettings.json
// "FeatureManagement": {
//   "NewCheckoutFlow": {
//     "EnabledFor": [
//       { "Name": "Percentage", "Parameters": { "Value": 10 } }
//     ]
//   }
// }

[HttpPost("checkout")]
public async Task&lt;IActionResult&gt; Checkout(CheckoutDto dto) {
    if (await _featureManager.IsEnabledAsync("NewCheckoutFlow")) {
        return await NewCheckoutFlow(dto);
    }
    return await LegacyCheckoutFlow(dto);
}

// Gradual rollout with targeting
builder.Services.AddFeatureManagement()
    .AddFeatureFilter&lt;PercentageFilter&gt;()
    .AddFeatureFilter&lt;TargetingFilter&gt;();

// Target specific users/groups
var context = new TargetingContext {
    UserId = currentUser.Id,
    Groups = new[] { currentUser.Tier }  // "beta-testers", "premium"
};

// Rolling Deployment with Kubernetes
// deployment.yaml:
// spec:
//   strategy:
//     type: RollingUpdate
//     rollingUpdate:
//       maxSurge: 1        # Add 1 new pod at a time
//       maxUnavailable: 0  # Never reduce below desired count
//   template:
//     spec:
//       containers:
//         - readinessProbe:
//             httpGet:
//               path: /health/ready
//             initialDelaySeconds: 5
//           livenessProbe:
//             httpGet:
//               path: /health/live
//             initialDelaySeconds: 15

// Deployment checklist:
// □ DB migration is backward compatible
// □ New code works with both old and new schema
// □ Feature flags for risky changes
// □ Health checks configured
// □ Graceful shutdown handles in-flight requests
// □ Rollback plan documented and tested
// □ Monitoring alerts configured</div>`,
  en: `<p><strong>Blue/Green:</strong> Two environments, instant switch and rollback. Requires stateless apps.</p>
<p><strong>DB Migrations:</strong> Expand-Contract, backward compatible, deploy before code.</p>
<p><strong>Feature Flags:</strong> Deploy disabled, enable gradually (1%→100%). Instant kill switch.</p>
<p><strong>Health/Shutdown:</strong> Readiness/liveness probes. Graceful shutdown finishes in-flight requests.</p>
<div class="code-block">// Graceful shutdown: finish in-flight requests
builder.Services.Configure&lt;HostOptions&gt;(o => 
    o.ShutdownTimeout = TimeSpan.FromSeconds(30));</div>`,
  tip: "Zero-downtime = backward compatible migrations + feature flags + health checks + graceful shutdown. Nói: 'Tôi deploy multiple times/day với confidence nhờ feature flags và automated rollback.'"
},
{
  n: "External Service Failures",
  l: "senior",
  p: ["Retry with exponential backoff", "Circuit Breaker implementation", "Fallback strategies (cache, default, queue)", "Timeout management"],
  q: "Xử lý khi external service (payment, email, 3rd party API) bị down? Implement resilience patterns?",
  vi: `<p><strong>Retry:</strong> Transient failures (network blip, 503) thường tự recover. Retry với exponential backoff + jitter. Chỉ retry idempotent operations. Max 3-5 retries. KHÔNG retry 4xx (client errors).</p>
<p><strong>Circuit Breaker:</strong> Khi service consistently failing, stop sending requests (fail fast). 3 states: Closed (normal) → Open (reject immediately) → Half-Open (test with few requests). Prevent cascade failures và cho service time to recover.</p>
<p><strong>Fallback:</strong> Khi cả retry và circuit breaker fail: (1) Return cached data (stale but available), (2) Default/degraded response, (3) Queue for later processing, (4) Alternative service. Graceful degradation > total failure.</p>
<p><strong>Timeout:</strong> Always set timeouts. HttpClient timeout + per-request timeout. Timeout < circuit breaker sampling window. Cancel via CancellationToken.</p>
<div class="code-block">// Complete Resilience Setup with Polly v8
builder.Services.AddHttpClient("PaymentGateway", client => {
    client.BaseAddress = new Uri("https://payment-api.com");
    client.Timeout = TimeSpan.FromSeconds(10);  // Overall timeout
})
.AddResilienceHandler("payment-resilience", pipeline => {
    // 1. Timeout per attempt
    pipeline.AddTimeout(new TimeoutStrategyOptions {
        Timeout = TimeSpan.FromSeconds(5),
        OnTimeout = args => {
            _logger.LogWarning("Payment API timeout after 5s");
            return default;
        }
    });
    
    // 2. Retry with exponential backoff + jitter
    pipeline.AddRetry(new HttpRetryStrategyOptions {
        MaxRetryAttempts = 3,
        Delay = TimeSpan.FromMilliseconds(500),
        BackoffType = DelayBackoffType.Exponential,
        UseJitter = true,
        ShouldHandle = new PredicateBuilder&lt;HttpResponseMessage&gt;()
            .HandleResult(r => (int)r.StatusCode >= 500)
            .Handle&lt;HttpRequestException&gt;()
            .Handle&lt;TimeoutRejectedException&gt;(),
        OnRetry = args => {
            _logger.LogWarning("Retry {Attempt} for payment API", args.AttemptNumber);
            return default;
        }
    });
    
    // 3. Circuit Breaker
    pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions {
        FailureRatio = 0.5,
        SamplingDuration = TimeSpan.FromSeconds(30),
        MinimumThroughput = 10,
        BreakDuration = TimeSpan.FromSeconds(30),
        OnOpened = args => {
            _logger.LogError("Circuit OPEN for payment API - failing fast");
            return default;
        },
        OnClosed = args => {
            _logger.LogInformation("Circuit CLOSED - payment API recovered");
            return default;
        }
    });
});

// Fallback Strategy
public class ResilientPaymentService : IPaymentService {
    private readonly HttpClient _client;
    private readonly IDistributedCache _cache;
    private readonly IMessageQueue _queue;
    
    public async Task&lt;PaymentResult&gt; ProcessAsync(PaymentRequest request) {
        try {
            // Primary: call payment API
            var response = await _client.PostAsJsonAsync("/charge", request);
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync&lt;PaymentResult&gt;();
            return result!;
        }
        catch (BrokenCircuitException) {
            // Fallback 1: Queue for later processing
            _logger.LogWarning("Payment circuit open, queuing for retry");
            await _queue.EnqueueAsync(new PendingPayment(request));
            return PaymentResult.Pending("Payment queued, will process shortly");
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.ServiceUnavailable) {
            // Fallback 2: Alternative payment provider
            return await _backupPaymentService.ProcessAsync(request);
        }
        catch (TimeoutRejectedException) {
            // Fallback 3: Inform user
            return PaymentResult.Failed("Payment service temporarily unavailable. Please retry.");
        }
    }
}

// Graceful Degradation Example: Product Recommendations
public class RecommendationService {
    private readonly HttpClient _mlClient;
    private readonly IDistributedCache _cache;
    
    public async Task&lt;List&lt;Product&gt;&gt; GetRecommendationsAsync(string userId) {
        try {
            // Try ML service
            return await _mlClient.GetFromJsonAsync&lt;List&lt;Product&gt;&gt;(
                $"/recommend/{userId}");
        }
        catch (Exception) {
            // Fallback: cached recommendations
            var cached = await _cache.GetAsync&lt;List&lt;Product&gt;&gt;($"recs:{userId}");
            if (cached != null) return cached;
            
            // Final fallback: popular products (always available)
            return await _productService.GetPopularAsync(limit: 10);
        }
    }
}

// Timeout hierarchy:
// HttpClient.Timeout = 30s (overall, including retries)
// Per-attempt timeout = 5s
// Circuit breaker sampling = 30s
// Circuit break duration = 30s</div>`,
  en: `<p><strong>Retry:</strong> Exponential backoff + jitter for transient errors. Only idempotent operations. Max 3-5 attempts.</p>
<p><strong>Circuit Breaker:</strong> Closed→Open→Half-Open. Fail fast when service is down. Prevent cascades.</p>
<p><strong>Fallback:</strong> Cached data, default response, queue for later, or alternative service. Graceful degradation.</p>
<p><strong>Timeout:</strong> Always set. Per-attempt < overall. Cancel with CancellationToken.</p>
<div class="code-block">// Fallback chain: primary → cache → alternative → default
try { return await _primaryApi.GetAsync(); }
catch { return await _cache.GetAsync() ?? _defaults; }</div>`,
  tip: "Resilience = Retry + Circuit Breaker + Fallback + Timeout. Nói: 'Tôi design cho failure - every external call has timeout, retry, và fallback strategy.'"
},
{
  n: "Debugging Non-Reproducible Bugs",
  l: "expert",
  p: ["Correlation ID for request tracing", "Structured logging (Serilog)", "Distributed tracing (OpenTelemetry)", "Reproducing with production-like data"],
  q: "Làm sao debug bugs chỉ xảy ra trong production và không reproduce được locally?",
  vi: `<p><strong>Correlation ID:</strong> Unique ID gán cho mỗi request, propagate qua tất cả services/logs. Cho phép trace toàn bộ request journey. Middleware tự động generate và attach vào logs, responses, downstream calls.</p>
<p><strong>Structured Logging:</strong> Log dạng structured (key-value) thay vì plain text. Query-able: tìm tất cả logs cho 1 user, 1 order, 1 correlation ID. Serilog + Seq/Elasticsearch cho search và analysis.</p>
<p><strong>Distributed Tracing:</strong> OpenTelemetry: trace request across services với spans. Visualize latency, identify bottlenecks. Jaeger/Zipkin cho visualization. Auto-instrument HTTP, DB, messaging.</p>
<p><strong>Reproducing:</strong> Capture request payload (sanitized) trong logs. Replay requests locally. Feature flags để enable verbose logging cho specific users. Chaos engineering cho intermittent issues.</p>
<div class="code-block">// Correlation ID Middleware
public class CorrelationIdMiddleware {
    private const string Header = "X-Correlation-Id";
    
    public async Task InvokeAsync(HttpContext context) {
        var correlationId = context.Request.Headers[Header].FirstOrDefault()
            ?? Guid.NewGuid().ToString();
        
        context.Items["CorrelationId"] = correlationId;
        context.Response.Headers[Header] = correlationId;
        
        // Add to all logs in this request scope
        using (_logger.BeginScope(new Dictionary&lt;string, object&gt; {
            ["CorrelationId"] = correlationId,
            ["UserId"] = context.User?.Identity?.Name ?? "anonymous"
        })) {
            await _next(context);
        }
    }
}

// Propagate to downstream services
public class CorrelationIdHandler : DelegatingHandler {
    protected override async Task&lt;HttpResponseMessage&gt; SendAsync(
        HttpRequestMessage request, CancellationToken ct) {
        var correlationId = _httpContextAccessor.HttpContext?.Items["CorrelationId"];
        if (correlationId != null)
            request.Headers.Add("X-Correlation-Id", correlationId.ToString());
        return await base.SendAsync(request, ct);
    }
}

// Structured Logging with Serilog
builder.Host.UseSerilog((context, config) => config
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "OrderService")
    .Enrich.WithProperty("Environment", context.HostingEnvironment.EnvironmentName)
    .WriteTo.Console(new JsonFormatter())
    .WriteTo.Seq("http://seq:5341"));

// Structured log usage
_logger.LogInformation("Order {OrderId} created for customer {CustomerId}, total: {Total}",
    order.Id, order.CustomerId, order.Total);
// Output: {"OrderId": 123, "CustomerId": "abc", "Total": 99.99, "CorrelationId": "..."}
// Searchable: find all logs where OrderId = 123

// OpenTelemetry Setup
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddSqlClientInstrumentation(o => o.SetDbStatementForText = true)
        .AddSource("OrderService")  // Custom activities
        .AddOtlpExporter(o => o.Endpoint = new Uri("http://jaeger:4317")))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddOtlpExporter());

// Custom tracing for business operations
public class OrderService {
    private static readonly ActivitySource _activity = new("OrderService");
    
    public async Task&lt;Order&gt; CreateOrderAsync(CreateOrderDto dto) {
        using var activity = _activity.StartActivity("CreateOrder");
        activity?.SetTag("customer.id", dto.CustomerId);
        activity?.SetTag("items.count", dto.Items.Count);
        
        try {
            var order = await ProcessOrder(dto);
            activity?.SetTag("order.id", order.Id);
            activity?.SetStatus(ActivityStatusCode.Ok);
            return order;
        }
        catch (Exception ex) {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);
            throw;
        }
    }
}

// Debug strategy for non-reproducible bugs:
// 1. Find CorrelationId from error report/alert
// 2. Search structured logs: all events with that CorrelationId
// 3. View distributed trace: see timing, which service failed
// 4. Check: request payload, user state, concurrent operations
// 5. Add targeted logging (feature flag for specific user)
// 6. If timing-related: check for race conditions, add tracing spans
// 7. Reproduce with captured request + similar data state</div>`,
  en: `<p><strong>Correlation ID:</strong> Unique per-request ID propagated across all services and logs for end-to-end tracing.</p>
<p><strong>Structured Logging:</strong> Key-value logs (Serilog) that are searchable and queryable.</p>
<p><strong>Distributed Tracing:</strong> OpenTelemetry traces requests across services. Visualize with Jaeger/Zipkin.</p>
<p><strong>Reproducing:</strong> Capture request payloads, replay locally, targeted verbose logging via feature flags.</p>
<div class="code-block">// Correlation ID + structured logging = find any request
_logger.LogInformation("Order {OrderId} created", order.Id);
// Search: CorrelationId = "abc-123" → see entire request journey</div>`,
  tip: "Observability stack: Correlation ID + Structured Logging + Distributed Tracing. Nói: 'Với 3 tools này, tôi có thể trace bất kỳ request nào từ entry point đến database và back.'"
}
]
});
