window.GUIDE_DATA = window.GUIDE_DATA || [];
window.GUIDE_DATA.push({
t: "ASP.NET Core",
c: "bg-2",
items: [
{
  n: "Middleware Pipeline",
  l: "senior",
  p: ["Request pipeline order matters", "Custom middleware implementation", "Short-circuiting", "Map/MapWhen branching"],
  q: "Giải thích Middleware Pipeline trong ASP.NET Core. Thứ tự middleware quan trọng thế nào?",
  vi: `<p><strong>Pipeline Order:</strong> Request đi qua middleware theo thứ tự đăng ký, response đi ngược lại. Thứ tự quan trọng: Exception handling phải đầu tiên (catch all), Authentication trước Authorization, CORS trước routing.</p>
<p><strong>Custom Middleware:</strong> Class với InvokeAsync method nhận HttpContext và RequestDelegate (next). Có thể modify request/response, hoặc short-circuit.</p>
<p><strong>Short-circuiting:</strong> Không gọi next() → request không đi tiếp pipeline. Dùng cho caching, rate limiting, health checks.</p>
<p><strong>Map/MapWhen:</strong> Branch pipeline dựa trên path (Map) hoặc condition (MapWhen). Mỗi branch có pipeline riêng.</p>
<div class="code-block">// Correct middleware order
var app = builder.Build();
app.UseExceptionHandler("/error");     // 1. Catch all exceptions
app.UseHsts();                          // 2. Security headers
app.UseHttpsRedirection();              // 3. HTTPS redirect
app.UseStaticFiles();                   // 4. Static files (short-circuits)
app.UseRouting();                       // 5. Route matching
app.UseCors("MyPolicy");               // 6. CORS (after routing, before auth)
app.UseAuthentication();                // 7. Who are you?
app.UseAuthorization();                 // 8. Can you access this?
app.UseRateLimiter();                   // 9. Rate limiting
app.MapControllers();                   // 10. Endpoint execution

// Custom Middleware
public class RequestTimingMiddleware {
    private readonly RequestDelegate _next;
    private readonly ILogger&lt;RequestTimingMiddleware&gt; _logger;
    
    public RequestTimingMiddleware(RequestDelegate next, 
        ILogger&lt;RequestTimingMiddleware&gt; logger) {
        _next = next;
        _logger = logger;
    }
    
    public async Task InvokeAsync(HttpContext context) {
        var sw = Stopwatch.StartNew();
        
        // Add header before response starts
        context.Response.OnStarting(() => {
            context.Response.Headers["X-Response-Time"] = 
                $"{sw.ElapsedMilliseconds}ms";
            return Task.CompletedTask;
        });
        
        await _next(context);  // Call next middleware
        
        sw.Stop();
        _logger.LogInformation("Request {Method} {Path} took {Ms}ms",
            context.Request.Method, context.Request.Path, sw.ElapsedMilliseconds);
    }
}

// Short-circuit middleware (caching example)
public class CacheMiddleware {
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    
    public async Task InvokeAsync(HttpContext context) {
        var key = context.Request.Path.ToString();
        if (_cache.TryGetValue(key, out string cached)) {
            await context.Response.WriteAsync(cached);
            return;  // SHORT-CIRCUIT - don't call next()
        }
        await _next(context);
    }
}

// MapWhen - conditional branching
app.MapWhen(
    context => context.Request.Path.StartsWithSegments("/api"),
    apiApp => {
        apiApp.UseRateLimiter();
        apiApp.UseAuthentication();
    });

// Registration
app.UseMiddleware&lt;RequestTimingMiddleware&gt;();</div>`,
  en: `<p><strong>Order:</strong> Middleware executes in registration order for requests, reverse for responses. Exception handling first, auth before authorization.</p>
<p><strong>Custom:</strong> Class with InvokeAsync(HttpContext, RequestDelegate). Can modify request/response or short-circuit.</p>
<p><strong>Short-circuit:</strong> Skip remaining pipeline by not calling next(). Used for caching, rate limiting.</p>
<p><strong>Branching:</strong> Map/MapWhen creates separate pipeline branches based on path or conditions.</p>
<div class="code-block">app.UseExceptionHandler("/error"); // First
app.UseAuthentication();            // Before Authorization
app.UseAuthorization();             // After Authentication</div>`,
  tip: "Vẽ diagram pipeline hình chữ U (request đi xuống, response đi lên). Nhấn mạnh: sai thứ tự = security vulnerabilities."
},
{
  n: "JWT Authentication & Security",
  l: "senior",
  p: ["JWT token flow", "Refresh token rotation", "Token revocation strategies", "Security best practices"],
  q: "Implement JWT authentication flow với refresh tokens. Làm sao revoke tokens đã issue?",
  vi: `<p><strong>JWT Flow:</strong> Client gửi credentials → Server validate → Issue access token (short-lived, 15-30min) + refresh token (long-lived, 7-30 days). Access token gửi trong Authorization header mỗi request.</p>
<p><strong>Refresh Token Rotation:</strong> Khi access token hết hạn, dùng refresh token để lấy cặp token mới. Old refresh token bị invalidate ngay (rotation). Detect reuse = compromise → revoke all tokens của user.</p>
<p><strong>Revocation:</strong> JWT stateless nên không thể revoke trực tiếp. Strategies: (1) Short expiry + refresh, (2) Token blacklist in Redis, (3) Token version in DB - increment to invalidate all, (4) JTI claim check.</p>
<p><strong>Security:</strong> Store refresh token in httpOnly cookie (not localStorage). Access token in memory only. Use HTTPS. Validate issuer, audience, lifetime.</p>
<div class="code-block">// JWT Configuration
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(config["Jwt:Key"]!)),
            ClockSkew = TimeSpan.Zero  // No tolerance for expiry
        };
    });

// Token Generation Service
public class TokenService : ITokenService {
    public TokenResult GenerateTokens(User user) {
        var claims = new[] {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("jti", Guid.NewGuid().ToString())  // Unique token ID
        };
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),  // Short-lived!
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        
        var refreshToken = new RefreshToken {
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            UserId = user.Id
        };
        
        return new TokenResult(
            new JwtSecurityTokenHandler().WriteToken(token),
            refreshToken);
    }
}

// Refresh Token Endpoint with Rotation
[HttpPost("refresh")]
public async Task&lt;IActionResult&gt; Refresh([FromBody] RefreshRequest request) {
    var storedToken = await _db.RefreshTokens
        .FirstOrDefaultAsync(t => t.Token == request.RefreshToken);
    
    if (storedToken == null || storedToken.IsRevoked) {
        // Possible token reuse attack!
        await RevokeAllUserTokens(storedToken?.UserId);
        return Unauthorized("Token reuse detected");
    }
    if (storedToken.ExpiresAt < DateTime.UtcNow)
        return Unauthorized("Refresh token expired");
    
    // Rotate: revoke old, issue new
    storedToken.IsRevoked = true;
    var user = await _db.Users.FindAsync(storedToken.UserId);
    var newTokens = _tokenService.GenerateTokens(user!);
    _db.RefreshTokens.Add(newTokens.RefreshToken);
    await _db.SaveChangesAsync();
    
    return Ok(new { accessToken = newTokens.AccessToken, 
                    refreshToken = newTokens.RefreshToken.Token });
}

// Token Revocation via Redis blacklist
public class TokenBlacklistService {
    private readonly IDistributedCache _cache;
    public async Task RevokeAsync(string jti, TimeSpan remaining) {
        await _cache.SetStringAsync($"blacklist:{jti}", "revoked",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = remaining });
    }
    public async Task&lt;bool&gt; IsRevokedAsync(string jti) {
        return await _cache.GetStringAsync($"blacklist:{jti}") != null;
    }
}</div>`,
  en: `<p><strong>Flow:</strong> Credentials → validate → issue short-lived access token + long-lived refresh token.</p>
<p><strong>Rotation:</strong> Each refresh issues new pair, old refresh token invalidated. Reuse detection = revoke all.</p>
<p><strong>Revocation:</strong> Short expiry + refresh, Redis blacklist, or token version in DB.</p>
<p><strong>Security:</strong> Refresh in httpOnly cookie, access in memory, validate all claims, ClockSkew = Zero.</p>
<div class="code-block">// Refresh token rotation
storedToken.IsRevoked = true; // Invalidate old
var newTokens = _tokenService.GenerateTokens(user);
// If old token reused → revoke ALL user tokens (attack detected)</div>`,
  tip: "Nói rõ trade-off: JWT stateless = scalable nhưng khó revoke. Giải pháp: short expiry (15min) + refresh rotation + Redis blacklist cho force-logout."
},
{
  n: "Caching Strategies",
  l: "senior",
  p: ["IMemoryCache vs IDistributedCache", "Redis caching patterns", "Output Caching (.NET 7+)", "Cache invalidation strategies"],
  q: "So sánh các caching strategies trong ASP.NET Core. Làm sao invalidate cache hiệu quả?",
  vi: `<p><strong>IMemoryCache:</strong> In-process, nhanh nhất, mất khi app restart. Dùng cho data ít thay đổi, single-instance apps. Cẩn thận memory pressure.</p>
<p><strong>IDistributedCache (Redis):</strong> Shared across instances, survive restarts. Cần serialization overhead. Dùng cho multi-instance deployments, session data.</p>
<p><strong>Output Caching (.NET 7+):</strong> Cache toàn bộ HTTP response. Server-side (khác Response Caching là client-side). Hỗ trợ tag-based invalidation, vary by query/header.</p>
<p><strong>Invalidation:</strong> Hardest problem in CS. Strategies: TTL (time-based), Event-driven (pub/sub khi data change), Tag-based (invalidate group), Cache-aside pattern.</p>
<div class="code-block">// IMemoryCache with factory pattern
public class ProductService {
    private readonly IMemoryCache _cache;
    private readonly IProductRepository _repo;
    
    public async Task&lt;Product?&gt; GetProductAsync(int id) {
        return await _cache.GetOrCreateAsync($"product:{id}", async entry => {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            entry.SlidingExpiration = TimeSpan.FromMinutes(2);
            entry.Priority = CacheItemPriority.High;
            return await _repo.GetByIdAsync(id);
        });
    }
}

// Redis Distributed Cache
services.AddStackExchangeRedisCache(options => {
    options.Configuration = "localhost:6379";
    options.InstanceName = "MyApp:";
});

public class CachedProductService : IProductService {
    private readonly IDistributedCache _cache;
    private readonly IProductRepository _repo;
    
    public async Task&lt;Product?&gt; GetAsync(int id) {
        var key = $"product:{id}";
        var cached = await _cache.GetStringAsync(key);
        if (cached != null)
            return JsonSerializer.Deserialize&lt;Product&gt;(cached);
        
        var product = await _repo.GetByIdAsync(id);
        if (product != null) {
            await _cache.SetStringAsync(key, 
                JsonSerializer.Serialize(product),
                new DistributedCacheEntryOptions {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
                });
        }
        return product;
    }
    
    // Invalidation on update
    public async Task UpdateAsync(Product product) {
        await _repo.UpdateAsync(product);
        await _cache.RemoveAsync($"product:{product.Id}");
        await _cache.RemoveAsync("products:list");  // Invalidate list too
    }
}

// Output Caching (.NET 7+)
builder.Services.AddOutputCache(options => {
    options.AddBasePolicy(builder => builder.Expire(TimeSpan.FromMinutes(5)));
    options.AddPolicy("Products", builder => builder
        .Expire(TimeSpan.FromMinutes(10))
        .Tag("products")
        .SetVaryByQuery("category", "page"));
});

app.MapGet("/api/products", async (IProductService svc) => 
    await svc.GetAllAsync())
    .CacheOutput("Products");

// Tag-based invalidation
app.MapPost("/api/products", async (Product p, IOutputCacheStore store) => {
    await SaveProduct(p);
    await store.EvictByTagAsync("products", default);  // Invalidate all product caches
});

// Event-driven invalidation with Redis Pub/Sub
public class CacheInvalidationSubscriber : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken ct) {
        var sub = _redis.GetSubscriber();
        await sub.SubscribeAsync("cache:invalidate", (channel, message) => {
            _memoryCache.Remove(message.ToString());
        });
    }
}</div>`,
  en: `<p><strong>IMemoryCache:</strong> In-process, fastest, lost on restart. For single-instance apps.</p>
<p><strong>Redis:</strong> Distributed, shared across instances, survives restarts. Serialization overhead.</p>
<p><strong>Output Caching:</strong> .NET 7+ server-side response caching with tag-based invalidation.</p>
<p><strong>Invalidation:</strong> TTL, event-driven (pub/sub), tag-based, or cache-aside pattern.</p>
<div class="code-block">// Output Caching with tag invalidation
app.MapGet("/products", GetAll).CacheOutput("Products");
await store.EvictByTagAsync("products", default);</div>`,
  tip: "Cache invalidation là 'one of the two hard things in CS'. Nói rõ strategy bạn chọn và WHY: TTL cho tolerance, events cho consistency."
},
{
  n: "Minimal APIs vs Controllers",
  l: "senior",
  p: ["Performance & simplicity trade-offs", "Endpoint filters", "API versioning approaches", "When to use each"],
  q: "So sánh Minimal APIs và Controllers. Khi nào chọn cái nào?",
  vi: `<p><strong>Trade-offs:</strong> Minimal APIs: ít ceremony, nhanh hơn (no model binding overhead), tốt cho microservices/small APIs. Controllers: structured, built-in model validation, better cho large APIs với nhiều conventions.</p>
<p><strong>Endpoint Filters:</strong> Minimal API equivalent của Action Filters. Chain filters cho validation, logging, auth checks. Typed filters với IEndpointFilter.</p>
<p><strong>Versioning:</strong> URL path (/api/v1/), query string (?version=1), header (X-Api-Version). Asp.Versioning package hỗ trợ cả hai styles.</p>
<p><strong>When to use:</strong> Minimal APIs cho microservices, simple CRUD, prototyping. Controllers cho enterprise apps, complex validation, team familiarity.</p>
<div class="code-block">// Minimal API - concise
var app = builder.Build();

app.MapGet("/api/products/{id}", async (int id, IProductService svc) => {
    var product = await svc.GetByIdAsync(id);
    return product is not null ? Results.Ok(product) : Results.NotFound();
})
.WithName("GetProduct")
.WithOpenApi()
.RequireAuthorization("AdminPolicy")
.AddEndpointFilter&lt;ValidationFilter&gt;();

// Endpoint Filter
public class ValidationFilter : IEndpointFilter {
    public async ValueTask&lt;object?&gt; InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next) {
        var dto = context.GetArgument&lt;CreateProductDto&gt;(0);
        if (string.IsNullOrEmpty(dto.Name))
            return Results.ValidationProblem(
                new Dictionary&lt;string, string[]&gt; {
                    ["Name"] = ["Name is required"]
                });
        return await next(context);
    }
}

// Route Groups for organization
var products = app.MapGroup("/api/products")
    .RequireAuthorization()
    .AddEndpointFilter&lt;LoggingFilter&gt;();

products.MapGet("/", GetAll);
products.MapGet("/{id}", GetById);
products.MapPost("/", Create);
products.MapPut("/{id}", Update);

// Controller equivalent - more structured
[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
public class ProductsController : ControllerBase {
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ProductDto), 200)]
    [ProducesResponseType(404)]
    public async Task&lt;IActionResult&gt; GetById(int id) {
        var product = await _service.GetByIdAsync(id);
        return product is not null ? Ok(product) : NotFound();
    }
}

// API Versioning
builder.Services.AddApiVersioning(options => {
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("X-Api-Version"));
});</div>`,
  en: `<p><strong>Trade-offs:</strong> Minimal APIs are faster and simpler. Controllers offer more structure and conventions.</p>
<p><strong>Filters:</strong> IEndpointFilter for Minimal APIs, equivalent to Action Filters.</p>
<p><strong>Versioning:</strong> URL path, query string, or header-based with Asp.Versioning package.</p>
<p><strong>Decision:</strong> Minimal for microservices/simple APIs, Controllers for enterprise/complex apps.</p>
<div class="code-block">// Minimal API with group and filter
var group = app.MapGroup("/api/products").RequireAuthorization();
group.MapGet("/{id}", GetById).AddEndpointFilter&lt;ValidationFilter&gt;();</div>`,
  tip: "Không có câu trả lời đúng/sai - show interviewer bạn hiểu trade-offs và chọn based on context (team size, complexity, performance needs)."
},
{
  n: "Rate Limiting & Resilience",
  l: "senior",
  p: ["Built-in Rate Limiting (.NET 7+)", "Polly v8 resilience pipelines", "Circuit Breaker pattern", "Retry with exponential backoff"],
  q: "Implement rate limiting và resilience patterns (Circuit Breaker, Retry) trong ASP.NET Core?",
  vi: `<p><strong>Rate Limiting (.NET 7+):</strong> Built-in middleware với 4 algorithms: Fixed Window, Sliding Window, Token Bucket, Concurrency. Apply per-endpoint hoặc global. Support custom partitioning (per user, per IP).</p>
<p><strong>Polly v8:</strong> Resilience library mới với pipeline-based API. Compose multiple strategies: retry → circuit breaker → timeout. Integrate với HttpClientFactory.</p>
<p><strong>Circuit Breaker:</strong> 3 states: Closed (normal), Open (fail fast), Half-Open (test). Prevent cascade failures khi downstream service down. Configure failure threshold và break duration.</p>
<p><strong>Retry:</strong> Exponential backoff + jitter tránh thundering herd. Chỉ retry transient errors (5xx, timeout), KHÔNG retry 4xx (client errors).</p>
<div class="code-block">// Built-in Rate Limiting (.NET 7+)
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = 429;
    
    // Fixed window - 100 requests per minute
    options.AddFixedWindowLimiter("fixed", opt => {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 100;
        opt.QueueLimit = 10;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    
    // Sliding window - smoother distribution
    options.AddSlidingWindowLimiter("sliding", opt => {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 6;  // 10-second segments
        opt.PermitLimit = 100;
    });
    
    // Per-user partitioning
    options.AddPolicy("per-user", context => {
        var userId = context.User?.Identity?.Name ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(userId,
            _ => new FixedWindowRateLimiterOptions {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 50
            });
    });
});

app.UseRateLimiter();
app.MapGet("/api/data", GetData).RequireRateLimiting("per-user");

// Polly v8 Resilience Pipeline
builder.Services.AddHttpClient("PaymentApi")
    .AddResilienceHandler("payment-pipeline", builder => {
        // Retry with exponential backoff + jitter
        builder.AddRetry(new HttpRetryStrategyOptions {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromMilliseconds(500),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,
            ShouldHandle = new PredicateBuilder&lt;HttpResponseMessage&gt;()
                .HandleResult(r => r.StatusCode >= HttpStatusCode.InternalServerError)
                .Handle&lt;HttpRequestException&gt;()
                .Handle&lt;TimeoutRejectedException&gt;()
        });
        
        // Circuit Breaker
        builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions {
            FailureRatio = 0.5,           // 50% failure rate
            SamplingDuration = TimeSpan.FromSeconds(30),
            MinimumThroughput = 10,       // Need 10 requests before evaluating
            BreakDuration = TimeSpan.FromSeconds(30),
            ShouldHandle = new PredicateBuilder&lt;HttpResponseMessage&gt;()
                .HandleResult(r => !r.IsSuccessStatusCode)
        });
        
        // Timeout
        builder.AddTimeout(TimeSpan.FromSeconds(10));
    });

// Usage
public class PaymentService {
    private readonly HttpClient _client;
    public PaymentService(IHttpClientFactory factory) {
        _client = factory.CreateClient("PaymentApi");
        // Resilience pipeline automatically applied!
    }
    public async Task&lt;PaymentResult&gt; ProcessAsync(Payment payment) {
        var response = await _client.PostAsJsonAsync("/charge", payment);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync&lt;PaymentResult&gt;();
    }
}</div>`,
  en: `<p><strong>Rate Limiting:</strong> .NET 7+ built-in with Fixed/Sliding Window, Token Bucket, Concurrency algorithms.</p>
<p><strong>Polly v8:</strong> Pipeline-based resilience - compose retry, circuit breaker, timeout strategies.</p>
<p><strong>Circuit Breaker:</strong> Closed → Open → Half-Open states. Prevents cascade failures.</p>
<p><strong>Retry:</strong> Exponential backoff + jitter for transient errors only (not 4xx).</p>
<div class="code-block">builder.AddRetry(new { MaxRetryAttempts = 3, BackoffType = Exponential });
builder.AddCircuitBreaker(new { FailureRatio = 0.5, BreakDuration = 30s });</div>`,
  tip: "Vẽ state diagram Circuit Breaker (Closed→Open→Half-Open). Nhấn mạnh: jitter tránh thundering herd khi nhiều clients retry cùng lúc."
},
{
  n: "SignalR & Real-time Communication",
  l: "senior",
  p: ["Hub architecture", "Groups & user management", "Scale-out with Redis backplane", "Connection lifecycle & reconnection"],
  q: "Thiết kế real-time features với SignalR. Làm sao scale-out khi có nhiều server instances?",
  vi: `<p><strong>Hub Architecture:</strong> Hub là central point cho client-server communication. Clients gọi Hub methods, Hub broadcast tới clients. Support strongly-typed hubs cho type safety.</p>
<p><strong>Groups:</strong> Logical grouping of connections. Add/remove connections to groups. Send messages to specific groups (chat rooms, notifications per team). User-based addressing cho multi-device.</p>
<p><strong>Scale-out Redis Backplane:</strong> Khi có multiple server instances, connection A ở server 1 cần nhận message từ server 2. Redis backplane pub/sub đồng bộ messages across servers.</p>
<p><strong>Connection Lifecycle:</strong> OnConnectedAsync/OnDisconnectedAsync cho tracking. Automatic reconnection với exponential backoff. Handle disconnection gracefully.</p>
<div class="code-block">// Strongly-typed Hub
public interface IChatClient {
    Task ReceiveMessage(string user, string message);
    Task UserJoined(string user);
    Task UserLeft(string user);
}

public class ChatHub : Hub&lt;IChatClient&gt; {
    private readonly IUserPresenceService _presence;
    
    public override async Task OnConnectedAsync() {
        var userId = Context.UserIdentifier;  // From ClaimTypes.NameIdentifier
        await _presence.SetOnlineAsync(userId!);
        await base.OnConnectedAsync();
    }
    
    public override async Task OnDisconnectedAsync(Exception? ex) {
        var userId = Context.UserIdentifier;
        await _presence.SetOfflineAsync(userId!);
        await base.OnDisconnectedAsync(ex);
    }
    
    public async Task JoinRoom(string roomId) {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).UserJoined(Context.UserIdentifier!);
    }
    
    public async Task SendToRoom(string roomId, string message) {
        // Send to all in group EXCEPT sender
        await Clients.OthersInGroup(roomId)
            .ReceiveMessage(Context.UserIdentifier!, message);
    }
    
    // Send to specific user (all their connections/devices)
    public async Task SendDirect(string userId, string message) {
        await Clients.User(userId)
            .ReceiveMessage(Context.UserIdentifier!, message);
    }
}

// Scale-out with Redis Backplane
builder.Services.AddSignalR()
    .AddStackExchangeRedis("localhost:6379", options => {
        options.Configuration.ChannelPrefix = 
            RedisChannel.Literal("MyApp");
    });

// Send from outside Hub (e.g., from API controller or background service)
public class NotificationService {
    private readonly IHubContext&lt;ChatHub, IChatClient&gt; _hubContext;
    
    public async Task NotifyUserAsync(string userId, string message) {
        await _hubContext.Clients.User(userId)
            .ReceiveMessage("System", message);
    }
    
    public async Task BroadcastAsync(string message) {
        await _hubContext.Clients.All
            .ReceiveMessage("System", message);
    }
}

// Client-side (JavaScript)
// const connection = new signalR.HubConnectionBuilder()
//     .withUrl("/chatHub")
//     .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
//     .build();
// connection.on("ReceiveMessage", (user, msg) => { });
// await connection.start();</div>`,
  en: `<p><strong>Hubs:</strong> Central communication point. Strongly-typed hubs for type safety.</p>
<p><strong>Groups:</strong> Logical connection grouping for targeted messaging (rooms, teams).</p>
<p><strong>Redis Backplane:</strong> Synchronizes messages across multiple server instances via pub/sub.</p>
<p><strong>Lifecycle:</strong> OnConnected/OnDisconnected for presence tracking. Auto-reconnect with backoff.</p>
<div class="code-block">builder.Services.AddSignalR()
    .AddStackExchangeRedis("localhost:6379"); // Scale-out</div>`,
  tip: "Nhấn mạnh: SignalR tự handle transport negotiation (WebSocket → SSE → Long Polling). Redis backplane là MUST cho production multi-instance."
},
{
  n: "Background Services",
  l: "senior",
  p: ["IHostedService vs BackgroundService", "Scoped services in background tasks", "Hangfire for scheduled jobs", "Health monitoring of background tasks"],
  q: "Implement background processing trong ASP.NET Core. Sự khác biệt giữa IHostedService và BackgroundService?",
  vi: `<p><strong>IHostedService:</strong> Interface cơ bản với StartAsync/StopAsync. Dùng cho one-time setup/teardown (warm cache, start listeners). Chạy trong app lifetime.</p>
<p><strong>BackgroundService:</strong> Abstract class implement IHostedService, cung cấp ExecuteAsync method chạy liên tục. Dùng cho long-running tasks (queue processing, polling).</p>
<p><strong>Scoped Services:</strong> Background services là Singleton - không thể inject Scoped services trực tiếp. Phải tạo scope manually với IServiceScopeFactory.</p>
<p><strong>Hangfire:</strong> Library cho scheduled/recurring jobs với persistence (survive restarts), dashboard, retry. Dùng cho: email sending, report generation, data cleanup.</p>
<div class="code-block">// IHostedService - startup/shutdown tasks
public class CacheWarmupService : IHostedService {
    private readonly IServiceScopeFactory _scopeFactory;
    
    public async Task StartAsync(CancellationToken ct) {
        using var scope = _scopeFactory.CreateScope();
        var cache = scope.ServiceProvider.GetRequiredService&lt;ICacheService&gt;();
        await cache.WarmupAsync(ct);  // Pre-load cache at startup
    }
    
    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}

// BackgroundService - continuous processing
public class OrderProcessingService : BackgroundService {
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly Channel&lt;OrderMessage&gt; _channel;
    private readonly ILogger&lt;OrderProcessingService&gt; _logger;
    
    protected override async Task ExecuteAsync(CancellationToken ct) {
        _logger.LogInformation("Order processor started");
        
        await foreach (var message in _channel.Reader.ReadAllAsync(ct)) {
            try {
                using var scope = _scopeFactory.CreateScope();
                var handler = scope.ServiceProvider
                    .GetRequiredService&lt;IOrderHandler&gt;();
                await handler.ProcessAsync(message, ct);
            } catch (Exception ex) when (ex is not OperationCanceledException) {
                _logger.LogError(ex, "Error processing order {Id}", message.OrderId);
                // Don't rethrow - keep processing other messages
            }
        }
    }
}

// Timed Background Service
public class DataCleanupService : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken ct) {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(ct)) {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService&lt;AppDbContext&gt;();
            var deleted = await db.TempData
                .Where(t => t.CreatedAt < DateTime.UtcNow.AddDays(-7))
                .ExecuteDeleteAsync(ct);
            _logger.LogInformation("Cleaned {Count} old records", deleted);
        }
    }
}

// Hangfire - scheduled jobs with persistence
builder.Services.AddHangfire(config => config
    .UsePostgreSqlStorage(connectionString));
builder.Services.AddHangfireServer();

// Recurring job
RecurringJob.AddOrUpdate&lt;IReportService&gt;(
    "daily-report",
    service => service.GenerateDailyReportAsync(),
    Cron.Daily(hour: 6));

// Fire-and-forget
BackgroundJob.Enqueue&lt;IEmailService&gt;(
    service => service.SendWelcomeAsync(userId));

// Health check for background services
public class BackgroundServiceHealthCheck : IHealthCheck {
    public Task&lt;HealthCheckResult&gt; CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct) {
        var lastRun = _service.LastSuccessfulRun;
        if (DateTime.UtcNow - lastRun > TimeSpan.FromMinutes(5))
            return Task.FromResult(HealthCheckResult.Unhealthy("Stale"));
        return Task.FromResult(HealthCheckResult.Healthy());
    }
}</div>`,
  en: `<p><strong>IHostedService:</strong> Start/Stop interface for one-time setup tasks.</p>
<p><strong>BackgroundService:</strong> Long-running ExecuteAsync for continuous processing.</p>
<p><strong>Scoped Services:</strong> Create scope manually with IServiceScopeFactory in background tasks.</p>
<p><strong>Hangfire:</strong> Persistent scheduled jobs with dashboard, retry, and recurring support.</p>
<div class="code-block">protected override async Task ExecuteAsync(CancellationToken ct) {
    using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
    while (await timer.WaitForNextTickAsync(ct)) { /* work */ }
}</div>`,
  tip: "Key point: BackgroundService là Singleton → phải tạo scope cho DbContext. Quên điều này = memory leak và concurrency bugs."
},
{
  n: "API Versioning & Documentation",
  l: "senior",
  p: ["Versioning strategies (URL, header, query)", "OpenAPI/Swagger configuration", "API deprecation workflow", "Generating typed clients"],
  q: "Implement API versioning và documentation strategy cho production API?",
  vi: `<p><strong>Versioning Strategies:</strong> URL path (/api/v1/) - explicit, cacheable, breaking change friendly. Header (X-Api-Version) - clean URLs nhưng harder to test. Query (?api-version=1) - easy testing. Recommendation: URL path cho public APIs.</p>
<p><strong>OpenAPI/Swagger:</strong> Tự động generate API documentation từ code. Swashbuckle hoặc NSwag. Configure XML comments, response types, authentication schemes.</p>
<p><strong>Deprecation:</strong> Mark old versions deprecated (still working), set sunset date, return Deprecation header, document migration guide. Give clients time to migrate.</p>
<p><strong>Typed Clients:</strong> Generate client SDKs từ OpenAPI spec. NSwag, Kiota, AutoRest. Ensure API contract consistency between frontend/backend.</p>
<div class="code-block">// API Versioning Setup
builder.Services.AddApiVersioning(options => {
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;  // Response header: api-supported-versions
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("X-Api-Version"),
        new QueryStringApiVersionReader("api-version"));
}).AddApiExplorer(options => {
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// Versioned Controllers
[ApiController]
[Route("api/v{version:apiVersion}/products")]
[ApiVersion("1.0")]
[ApiVersion("2.0")]
public class ProductsController : ControllerBase {
    [HttpGet("{id}")]
    [MapToApiVersion("1.0")]
    public IActionResult GetV1(int id) => Ok(new ProductV1Dto());
    
    [HttpGet("{id}")]
    [MapToApiVersion("2.0")]
    public IActionResult GetV2(int id) => Ok(new ProductV2Dto());
}

// Deprecated version
[ApiVersion("1.0", Deprecated = true)]  // Still works, but marked deprecated
[ApiController]
[Route("api/v{version:apiVersion}/orders")]
public class OrdersV1Controller : ControllerBase { }

// OpenAPI/Swagger Configuration
builder.Services.AddSwaggerGen(options => {
    options.SwaggerDoc("v1", new OpenApiInfo {
        Title = "My API", Version = "v1",
        Description = "Production API",
        Contact = new OpenApiContact { Name = "Dev Team" }
    });
    options.SwaggerDoc("v2", new OpenApiInfo {
        Title = "My API", Version = "v2"
    });
    
    // JWT Authentication in Swagger
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    
    // Include XML comments
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));
});

// Minimal API versioning
var v1 = app.NewVersionedApi().MapGroup("/api/v{version:apiVersion}");
var productsV1 = v1.MapGroup("/products").HasApiVersion(1.0);
productsV1.MapGet("/", GetAllV1);

// Generate typed client (NSwag)
// dotnet tool install NSwag.ConsoleCore
// nswag openapi2csclient /input:swagger.json /output:ApiClient.cs</div>`,
  en: `<p><strong>Strategies:</strong> URL path (recommended for public APIs), header, or query string versioning.</p>
<p><strong>OpenAPI:</strong> Auto-generate docs from code with Swashbuckle/NSwag. Include auth schemes and XML comments.</p>
<p><strong>Deprecation:</strong> Mark deprecated, set sunset date, return headers, provide migration guide.</p>
<p><strong>Typed Clients:</strong> Generate SDKs from OpenAPI spec with NSwag/Kiota for contract consistency.</p>
<div class="code-block">[ApiVersion("1.0", Deprecated = true)]
[ApiVersion("2.0")]
// Response: api-supported-versions: 2.0, api-deprecated-versions: 1.0</div>`,
  tip: "URL versioning cho public APIs (explicit, cacheable). Header versioning cho internal APIs (clean URLs). Luôn có deprecation policy rõ ràng."
}
]
});
