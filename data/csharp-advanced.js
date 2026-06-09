window.GUIDE_DATA = window.GUIDE_DATA || [];
window.GUIDE_DATA.push({
t: "C# Advanced",
c: "bg-1",
items: [
{
  n: "Async/Await Internals",
  l: "senior",
  p: ["State machine generation", "Deadlock scenarios", "ConfigureAwait(false)", "ValueTask vs Task", "CancellationToken usage"],
  q: "Giải thích cơ chế hoạt động bên trong của async/await. Làm sao tránh deadlock và khi nào dùng ValueTask?",
  vi: `<p><strong>State Machine:</strong> Compiler biến async method thành state machine (IAsyncStateMachine). Mỗi await là một state. Method được chia thành continuations, cho phép thread trả về pool khi chờ I/O.</p>
<p><strong>Deadlock:</strong> Xảy ra khi sync code (.Result/.Wait()) block thread đang giữ SynchronizationContext, trong khi continuation cần context đó để resume. Classic: ASP.NET Framework + .Result. Fix: async all the way down.</p>
<p><strong>ConfigureAwait(false):</strong> Không capture SynchronizationContext cho continuation. Dùng trong library code để tránh deadlock và improve performance. Không cần trong ASP.NET Core (không có SyncContext).</p>
<p><strong>ValueTask:</strong> Struct-based, tránh heap allocation khi result đã available (hot path). Dùng khi method thường return synchronously (cache hit). KHÔNG được await nhiều lần hoặc giữ reference.</p>
<p><strong>CancellationToken:</strong> Cooperative cancellation pattern. Pass token vào async methods, check token.IsCancellationRequested hoặc token.ThrowIfCancellationRequested().</p>
<div class="code-block">// State Machine (simplified compiler output)
// async Task&lt;int&gt; GetDataAsync() { var x = await FetchAsync(); return x + 1; }
// Becomes:
struct GetDataAsyncStateMachine : IAsyncStateMachine {
    public int state;
    public AsyncTaskMethodBuilder&lt;int&gt; builder;
    private TaskAwaiter&lt;int&gt; awaiter;
    
    public void MoveNext() {
        switch (state) {
            case 0:
                awaiter = FetchAsync().GetAwaiter();
                if (!awaiter.IsCompleted) {
                    state = 1;
                    builder.AwaitUnsafeOnCompleted(ref awaiter, ref this);
                    return;  // Return thread to pool
                }
                goto case 1;
            case 1:
                int x = awaiter.GetResult();
                builder.SetResult(x + 1);
                break;
        }
    }
}

// ⚠️ Deadlock scenario
public string GetData() {
    // DEADLOCK in ASP.NET Framework!
    return GetDataAsync().Result;  // Blocks SyncContext thread
}
// ✅ Fix: async all the way
public async Task&lt;string&gt; GetData() => await GetDataAsync();

// ConfigureAwait in library code
public async Task&lt;byte[]&gt; DownloadAsync(string url) {
    var response = await _httpClient.GetAsync(url)
        .ConfigureAwait(false);  // Don't capture context
    return await response.Content.ReadAsByteArrayAsync()
        .ConfigureAwait(false);
}

// ValueTask - when result often available synchronously
private readonly ConcurrentDictionary&lt;int, User&gt; _cache = new();
public ValueTask&lt;User&gt; GetUserAsync(int id) {
    if (_cache.TryGetValue(id, out var user))
        return ValueTask.FromResult(user);  // No allocation!
    return new ValueTask&lt;User&gt;(LoadFromDbAsync(id));
}

// CancellationToken
public async Task&lt;List&lt;Item&gt;&gt; ProcessAsync(CancellationToken ct = default) {
    var items = new List&lt;Item&gt;();
    await foreach (var item in GetItemsAsync(ct)) {
        ct.ThrowIfCancellationRequested();
        items.Add(await TransformAsync(item, ct));
    }
    return items;
}

// Timeout with CancellationToken
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
try {
    await LongRunningAsync(cts.Token);
} catch (OperationCanceledException) {
    // Handle timeout
}</div>`,
  en: `<p><strong>State Machine:</strong> Compiler transforms async methods into state machines with continuations at each await point.</p>
<p><strong>Deadlock:</strong> Occurs when .Result/.Wait() blocks a thread holding SynchronizationContext needed by continuation. Fix: async all the way.</p>
<p><strong>ConfigureAwait(false):</strong> Skip context capture in library code for performance and deadlock prevention.</p>
<p><strong>ValueTask:</strong> Avoids allocation when result is often synchronously available. Cannot be awaited multiple times.</p>
<p><strong>CancellationToken:</strong> Cooperative cancellation - pass tokens through async call chain.</p>
<div class="code-block">// ValueTask for cache-first pattern
public ValueTask&lt;User&gt; GetUserAsync(int id) {
    if (_cache.TryGetValue(id, out var user))
        return ValueTask.FromResult(user); // No alloc
    return new ValueTask&lt;User&gt;(LoadFromDbAsync(id));
}</div>`,
  tip: "Vẽ diagram state machine trên whiteboard. Giải thích: mỗi await = 1 state, thread trả về pool, continuation scheduled khi I/O complete."
},
{
  n: "Memory Management & GC",
  l: "senior",
  p: ["Generation 0/1/2 & LOH", "Span<T> & Memory<T>", "ArrayPool & ObjectPool", "Avoiding closures for GC pressure", "IDisposable pattern"],
  q: "Giải thích cơ chế GC trong .NET và các kỹ thuật tối ưu memory?",
  vi: `<p><strong>Generations:</strong> Gen0 - short-lived objects, collected thường xuyên (~ms). Gen1 - buffer giữa Gen0 và Gen2. Gen2 - long-lived objects, collected hiếm (costly). LOH (Large Object Heap) - objects ≥85KB, collected với Gen2, không compact (fragmentation risk).</p>
<p><strong>Span&lt;T&gt; & Memory&lt;T&gt;:</strong> Span là ref struct, stack-only, zero-allocation view vào memory (array, string, native). Memory&lt;T&gt; có thể store trên heap, dùng trong async methods (Span không được vì ref struct).</p>
<p><strong>ArrayPool & ObjectPool:</strong> ArrayPool&lt;T&gt;.Shared.Rent(size) - mượn array thay vì allocate mới, trả lại bằng Return(). ObjectPool cho expensive objects (StringBuilder, HttpClient).</p>
<p><strong>Avoiding Closures:</strong> Lambda capture biến tạo hidden class allocation. Dùng static lambda hoặc pass state qua parameter để tránh.</p>
<p><strong>IDisposable:</strong> Pattern giải phóng unmanaged resources. Implement Dispose pattern với finalizer cho safety net.</p>
<div class="code-block">// GC Generations
// Gen0: new objects, fast collection (~1ms)
// Gen1: survived Gen0, buffer zone
// Gen2: long-lived, expensive collection (~100ms)
// LOH: objects >= 85KB, no compaction

// Span&lt;T&gt; - zero allocation slicing
public int SumFirstN(int[] array, int n) {
    Span&lt;int&gt; slice = array.AsSpan(0, n);  // No copy!
    int sum = 0;
    foreach (var item in slice) sum += item;
    return sum;
}

// ArrayPool - rent instead of allocate
public async Task ProcessDataAsync(Stream stream) {
    byte[] buffer = ArrayPool&lt;byte&gt;.Shared.Rent(4096);
    try {
        int bytesRead = await stream.ReadAsync(buffer);
        // Process buffer[..bytesRead]
    } finally {
        ArrayPool&lt;byte&gt;.Shared.Return(buffer, clearArray: true);
    }
}

// ObjectPool
private static readonly ObjectPool&lt;StringBuilder&gt; _sbPool =
    new DefaultObjectPoolProvider().CreateStringBuilderPool();

public string BuildReport(IEnumerable&lt;Item&gt; items) {
    var sb = _sbPool.Get();
    try {
        foreach (var item in items)
            sb.AppendLine($"{item.Name}: {item.Value}");
        return sb.ToString();
    } finally {
        _sbPool.Return(sb);
    }
}

// ⚠️ Closure allocation
list.Where(x => x.Id == targetId);  // Captures targetId → allocation
// ✅ Static lambda (no capture)
list.Where(static x => x.IsActive);  // No allocation

// IDisposable Pattern
public class DatabaseConnection : IDisposable {
    private IntPtr _handle;
    private bool _disposed;
    
    public void Dispose() {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
    protected virtual void Dispose(bool disposing) {
        if (!_disposed) {
            if (disposing) { /* managed cleanup */ }
            CloseHandle(_handle);  // unmanaged cleanup
            _disposed = true;
        }
    }
    ~DatabaseConnection() => Dispose(false);
}</div>`,
  en: `<p><strong>Generations:</strong> Gen0 (short-lived, fast), Gen1 (buffer), Gen2 (long-lived, expensive). LOH for objects ≥85KB.</p>
<p><strong>Span/Memory:</strong> Zero-allocation views. Span is stack-only, Memory works in async.</p>
<p><strong>Pooling:</strong> ArrayPool and ObjectPool reuse allocations instead of creating new ones.</p>
<p><strong>Closures:</strong> Lambda captures create hidden allocations. Use static lambdas when possible.</p>
<p><strong>IDisposable:</strong> Deterministic cleanup of unmanaged resources with Dispose pattern.</p>
<div class="code-block">byte[] buffer = ArrayPool&lt;byte&gt;.Shared.Rent(4096);
try { /* use buffer */ }
finally { ArrayPool&lt;byte&gt;.Shared.Return(buffer); }</div>`,
  tip: "Mention cụ thể: 'Trong project tôi dùng ArrayPool cho file processing, giảm Gen0 collections 40%.' Số liệu cụ thể gây ấn tượng."
},
{
  n: "Dependency Injection Deep Dive",
  l: "senior",
  p: ["Transient/Scoped/Singleton lifetimes", "Captive dependency problem", "IServiceScopeFactory", "Options pattern (IOptions/IOptionsSnapshot/IOptionsMonitor)"],
  q: "Giải thích DI lifetimes trong .NET và captive dependency problem. Khi nào dùng IOptionsSnapshot vs IOptionsMonitor?",
  vi: `<p><strong>Lifetimes:</strong> Transient - tạo mới mỗi lần resolve. Scoped - 1 instance per request/scope. Singleton - 1 instance toàn app. Rule: service chỉ inject dependency có lifetime bằng hoặc dài hơn.</p>
<p><strong>Captive Dependency:</strong> Singleton inject Scoped/Transient service → giữ reference vĩnh viễn, Scoped service hoạt động như Singleton (stale data, concurrency bugs). ValidateScopes trong Development để detect.</p>
<p><strong>IServiceScopeFactory:</strong> Giải pháp cho Singleton cần Scoped service - tạo scope mới mỗi lần dùng, dispose sau khi xong.</p>
<p><strong>Options Pattern:</strong> IOptions&lt;T&gt; - singleton, read once at startup. IOptionsSnapshot&lt;T&gt; - scoped, re-read mỗi request. IOptionsMonitor&lt;T&gt; - singleton nhưng detect changes real-time (OnChange callback).</p>
<div class="code-block">// Lifetime registration
services.AddTransient&lt;IEmailService, EmailService&gt;();   // New each time
services.AddScoped&lt;IOrderService, OrderService&gt;();      // Per request
services.AddSingleton&lt;ICacheService, CacheService&gt;();   // App lifetime

// ⚠️ Captive Dependency - BUG!
services.AddSingleton&lt;IReportService, ReportService&gt;();
services.AddScoped&lt;IDbContext, AppDbContext&gt;();
public class ReportService : IReportService {
    private readonly IDbContext _db;  // CAPTURED! Scoped in Singleton
    public ReportService(IDbContext db) => _db = db;
    // _db is now shared across ALL requests - concurrency bugs!
}

// ✅ Fix with IServiceScopeFactory
public class ReportService : IReportService {
    private readonly IServiceScopeFactory _scopeFactory;
    public ReportService(IServiceScopeFactory scopeFactory) 
        => _scopeFactory = scopeFactory;
    
    public async Task GenerateAsync() {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService&lt;IDbContext&gt;();
        // db is properly scoped and disposed
    }
}

// Enable validation in Development
builder.Host.UseDefaultServiceProvider(options => {
    options.ValidateScopes = true;   // Detect captive dependencies
    options.ValidateOnBuild = true;  // Validate all registrations
});

// Options Pattern
services.Configure&lt;SmtpSettings&gt;(config.GetSection("Smtp"));

public class EmailService {
    private readonly SmtpSettings _settings;
    // IOptions - singleton, never changes
    public EmailService(IOptions&lt;SmtpSettings&gt; options) 
        => _settings = options.Value;
}

public class NotificationService {
    private readonly IOptionsSnapshot&lt;SmtpSettings&gt; _options;
    // IOptionsSnapshot - scoped, re-reads each request
    public NotificationService(IOptionsSnapshot&lt;SmtpSettings&gt; options) 
        => _options = options;
    public void Send() => Use(_options.Value);  // Fresh value per request
}

public class MonitorService {
    // IOptionsMonitor - singleton with change detection
    public MonitorService(IOptionsMonitor&lt;SmtpSettings&gt; monitor) {
        monitor.OnChange(settings => {
            Console.WriteLine("Settings changed!");
        });
    }
}</div>`,
  en: `<p><strong>Lifetimes:</strong> Transient (new each resolve), Scoped (per request), Singleton (app lifetime).</p>
<p><strong>Captive Dependency:</strong> Singleton capturing Scoped service - causes stale data and concurrency bugs.</p>
<p><strong>IServiceScopeFactory:</strong> Create new scope inside Singleton to safely use Scoped services.</p>
<p><strong>Options:</strong> IOptions (singleton, startup), IOptionsSnapshot (scoped, per-request), IOptionsMonitor (singleton, real-time changes).</p>
<div class="code-block">// Fix captive dependency
public class MySingleton {
    private readonly IServiceScopeFactory _factory;
    public async Task DoWork() {
        using var scope = _factory.CreateScope();
        var scoped = scope.ServiceProvider.GetRequiredService&lt;IScopedService&gt;();
    }
}</div>`,
  tip: "Captive dependency là câu hỏi phân biệt senior. Nói: 'Tôi luôn enable ValidateScopes trong Development và dùng IServiceScopeFactory trong background services.'"
},
{
  n: "Concurrency Patterns",
  l: "senior",
  p: ["lock & SemaphoreSlim", "ConcurrentDictionary pitfalls", "Interlocked operations", "Channel<T> for producer-consumer"],
  q: "Giải thích các concurrency patterns trong C#. ConcurrentDictionary có thread-safe hoàn toàn không?",
  vi: `<p><strong>lock & SemaphoreSlim:</strong> lock (Monitor) cho synchronous mutual exclusion - chỉ 1 thread vào critical section. SemaphoreSlim cho async scenarios - hỗ trợ WaitAsync(), có thể limit concurrent access (throttling).</p>
<p><strong>ConcurrentDictionary Pitfalls:</strong> Từng operation là atomic, nhưng COMPOUND operations không atomic. GetOrAdd có thể gọi factory nhiều lần (race condition). AddOrUpdate delegate có thể chạy nhiều lần.</p>
<p><strong>Interlocked:</strong> Lock-free atomic operations cho simple counters/flags. Interlocked.Increment, CompareExchange - nhanh hơn lock cho single-variable operations.</p>
<p><strong>Channel&lt;T&gt;:</strong> High-performance async producer-consumer queue. Bounded channel cho backpressure. Unbounded cho fire-and-forget. Thay thế BlockingCollection trong async code.</p>
<div class="code-block">// SemaphoreSlim - async throttling
private readonly SemaphoreSlim _semaphore = new(maxCount: 10);
public async Task&lt;T&gt; ThrottledCallAsync&lt;T&gt;(Func&lt;Task&lt;T&gt;&gt; action) {
    await _semaphore.WaitAsync();
    try {
        return await action();
    } finally {
        _semaphore.Release();
    }
}

// ⚠️ ConcurrentDictionary pitfall
var cache = new ConcurrentDictionary&lt;string, ExpensiveObject&gt;();
// Factory may execute MULTIPLE times for same key!
var value = cache.GetOrAdd("key", _ => CreateExpensive());
// ✅ Fix: use Lazy to ensure single creation
var lazyCache = new ConcurrentDictionary&lt;string, Lazy&lt;ExpensiveObject&gt;&gt;();
var value2 = lazyCache.GetOrAdd("key", 
    _ => new Lazy&lt;ExpensiveObject&gt;(() => CreateExpensive())).Value;

// Interlocked - lock-free atomic operations
private int _requestCount;
public void HandleRequest() {
    Interlocked.Increment(ref _requestCount);
}
// CompareExchange for lock-free state machine
private int _state; // 0=idle, 1=running, 2=stopped
public bool TryStart() {
    return Interlocked.CompareExchange(ref _state, 1, 0) == 0;
}

// Channel&lt;T&gt; - producer/consumer
var channel = Channel.CreateBounded&lt;WorkItem&gt;(new BoundedChannelOptions(100) {
    FullMode = BoundedChannelFullMode.Wait  // Backpressure
});

// Producer
async Task ProduceAsync(ChannelWriter&lt;WorkItem&gt; writer) {
    await foreach (var item in GetItemsAsync()) {
        await writer.WriteAsync(item);
    }
    writer.Complete();
}

// Consumer
async Task ConsumeAsync(ChannelReader&lt;WorkItem&gt; reader) {
    await foreach (var item in reader.ReadAllAsync()) {
        await ProcessAsync(item);
    }
}

// Multiple consumers for parallelism
var tasks = Enumerable.Range(0, 4)
    .Select(_ => ConsumeAsync(channel.Reader))
    .ToArray();
await Task.WhenAll(tasks);</div>`,
  en: `<p><strong>lock/SemaphoreSlim:</strong> lock for sync exclusion, SemaphoreSlim for async with throttling support.</p>
<p><strong>ConcurrentDictionary:</strong> Individual operations are atomic, but compound operations are NOT. GetOrAdd factory may run multiple times.</p>
<p><strong>Interlocked:</strong> Lock-free atomic operations for simple counters - faster than lock.</p>
<p><strong>Channel&lt;T&gt;:</strong> High-performance async producer-consumer with backpressure support.</p>
<div class="code-block">// Channel producer-consumer
var channel = Channel.CreateBounded&lt;WorkItem&gt;(100);
await channel.Writer.WriteAsync(item);
await foreach (var item in channel.Reader.ReadAllAsync()) { }</div>`,
  tip: "Nêu rõ: ConcurrentDictionary.GetOrAdd factory KHÔNG atomic - đây là pitfall nhiều senior không biết. Đề xuất Lazy wrapper."
},
{
  n: "Expression Trees & IQueryable",
  l: "senior",
  p: ["How EF Core translates expressions to SQL", "Building dynamic queries", "Custom expression visitors", "Performance considerations"],
  q: "Expression Trees hoạt động thế nào trong EF Core? Làm sao build dynamic queries?",
  vi: `<p><strong>EF Translation:</strong> Khi dùng IQueryable, lambda expressions KHÔNG compile thành IL code mà thành Expression Trees - cấu trúc dữ liệu mô tả logic. EF Core's query provider duyệt tree này và translate sang SQL.</p>
<p><strong>Dynamic Queries:</strong> Dùng Expression API để build predicate tại runtime. Useful cho search/filter với nhiều optional conditions.</p>
<p><strong>Custom Visitors:</strong> ExpressionVisitor cho phép traverse và modify expression tree. Dùng để inject soft-delete filter, multi-tenancy, audit logic.</p>
<p><strong>Performance:</strong> Expression compilation tốn ~100ms. Cache compiled expressions. Avoid building complex trees trong hot paths.</p>
<div class="code-block">// How EF translates - Expression Tree vs Delegate
// This builds an Expression Tree (translated to SQL)
IQueryable&lt;Order&gt; query = dbContext.Orders
    .Where(o => o.Status == "Active" && o.Total > 100);
// SQL: SELECT * FROM Orders WHERE Status = 'Active' AND Total > 100

// This is a delegate (runs in memory - BAD!)
IEnumerable&lt;Order&gt; inMemory = dbContext.Orders.AsEnumerable()
    .Where(o => o.Status == "Active");  // Loads ALL rows first!

// Dynamic Query Builder
public static class PredicateBuilder {
    public static Expression&lt;Func&lt;T, bool&gt;&gt; And&lt;T&gt;(
        this Expression&lt;Func&lt;T, bool&gt;&gt; left,
        Expression&lt;Func&lt;T, bool&gt;&gt; right) {
        var parameter = Expression.Parameter(typeof(T));
        var body = Expression.AndAlso(
            Expression.Invoke(left, parameter),
            Expression.Invoke(right, parameter));
        return Expression.Lambda&lt;Func&lt;T, bool&gt;&gt;(body, parameter);
    }
}

// Usage: dynamic search
public IQueryable&lt;Product&gt; Search(ProductFilter filter) {
    var query = _context.Products.AsQueryable();
    if (!string.IsNullOrEmpty(filter.Name))
        query = query.Where(p => p.Name.Contains(filter.Name));
    if (filter.MinPrice.HasValue)
        query = query.Where(p => p.Price >= filter.MinPrice);
    if (filter.CategoryId.HasValue)
        query = query.Where(p => p.CategoryId == filter.CategoryId);
    return query;  // Single SQL with only relevant WHERE clauses
}

// Custom ExpressionVisitor - inject soft delete
public class SoftDeleteVisitor : ExpressionVisitor {
    protected override Expression VisitMethodCall(MethodCallExpression node) {
        if (node.Method.Name == "Where") {
            // Inject IsDeleted == false condition
        }
        return base.VisitMethodCall(node);
    }
}

// Compiled Expression caching
private static readonly Func&lt;AppDbContext, int, Task&lt;Order?&gt;&gt; _getOrder =
    EF.CompileAsyncQuery((AppDbContext db, int id) =>
        db.Orders.FirstOrDefault(o => o.Id == id));
// Usage - no expression tree compilation overhead
var order = await _getOrder(dbContext, orderId);</div>`,
  en: `<p><strong>EF Translation:</strong> IQueryable lambdas become Expression Trees (data structures), not compiled code. EF traverses these trees to generate SQL.</p>
<p><strong>Dynamic Queries:</strong> Build predicates at runtime using Expression API for flexible search/filter.</p>
<p><strong>Visitors:</strong> ExpressionVisitor traverses and modifies trees - useful for cross-cutting concerns.</p>
<p><strong>Performance:</strong> Cache compiled expressions with EF.CompileAsyncQuery for hot paths.</p>
<div class="code-block">// Compiled query - cached, no tree compilation overhead
private static readonly Func&lt;AppDbContext, int, Task&lt;Order?&gt;&gt; _getOrder =
    EF.CompileAsyncQuery((AppDbContext db, int id) =>
        db.Orders.FirstOrDefault(o => o.Id == id));</div>`,
  tip: "Giải thích rõ: IQueryable = Expression Tree = data, IEnumerable = compiled delegate = code. Đây là lý do .AsEnumerable() phá vỡ SQL translation."
},
{
  n: "Source Generators",
  l: "senior",
  p: ["Compile-time code generation", "Replacing reflection with source gen", "Incremental generators", "Real-world use cases (JSON, logging)"],
  q: "Source Generators là gì? Tại sao chúng thay thế reflection trong nhiều scenarios?",
  vi: `<p><strong>Compile-time Codegen:</strong> Source Generators chạy tại compile time, analyze source code và generate thêm C# code. Output trở thành part of compilation - full IntelliSense, type-safe, no runtime cost.</p>
<p><strong>Replacing Reflection:</strong> Reflection tốn performance (late binding, no inlining, GC pressure). Source generators generate strongly-typed code tại compile time - System.Text.Json, ILogger, AutoMapper đều đã chuyển sang source gen.</p>
<p><strong>Incremental Generators:</strong> V2 API - chỉ re-generate khi relevant source changes. Caching pipeline tránh re-process toàn bộ compilation mỗi keystroke.</p>
<p><strong>Use Cases:</strong> JSON serialization (JsonSerializerContext), logging (LoggerMessage), DI registration, mapping, validation, API clients.</p>
<div class="code-block">// System.Text.Json Source Generator
[JsonSerializable(typeof(WeatherForecast))]
[JsonSerializable(typeof(List&lt;WeatherForecast&gt;))]
public partial class AppJsonContext : JsonSerializerContext { }

// Usage - no reflection, AOT-compatible
var json = JsonSerializer.Serialize(forecast, AppJsonContext.Default.WeatherForecast);
var obj = JsonSerializer.Deserialize(json, AppJsonContext.Default.WeatherForecast);

// LoggerMessage Source Generator - high-performance logging
public static partial class LogMessages {
    [LoggerMessage(Level = LogLevel.Information, 
        Message = "Processing order {OrderId} for customer {CustomerId}")]
    public static partial void OrderProcessing(
        this ILogger logger, int orderId, string customerId);
}
// Usage - no boxing, no string interpolation at runtime
_logger.OrderProcessing(order.Id, order.CustomerId);

// Custom Source Generator (simplified)
[Generator]
public class AutoMapperGenerator : IIncrementalGenerator {
    public void Initialize(IncrementalGeneratorInitializationContext context) {
        // Find all classes with [AutoMap] attribute
        var classes = context.SyntaxProvider
            .ForAttributeWithMetadataName(
                "AutoMapAttribute",
                predicate: (node, _) => node is ClassDeclarationSyntax,
                transform: (ctx, _) => GetMapInfo(ctx))
            .Where(m => m is not null);
        
        // Generate mapping code
        context.RegisterSourceOutput(classes, (spc, mapInfo) => {
            var code = GenerateMappingCode(mapInfo);
            spc.AddSource($"{mapInfo.Name}_Mapper.g.cs", code);
        });
    }
}

// Generated output (compile-time, full IntelliSense)
public static class OrderMapper {
    public static OrderDto ToDto(this Order order) => new OrderDto {
        Id = order.Id,
        CustomerName = order.Customer.Name,
        Total = order.Items.Sum(i => i.Price * i.Quantity)
    };
}

// Performance comparison:
// Reflection: ~1000ns per serialization
// Source Gen:  ~100ns per serialization (10x faster)</div>`,
  en: `<p><strong>Compile-time:</strong> Source Generators analyze code and emit additional C# at compile time - zero runtime cost.</p>
<p><strong>vs Reflection:</strong> Eliminates runtime reflection overhead (10x+ faster), enables AOT compilation.</p>
<p><strong>Incremental:</strong> V2 API only regenerates when relevant source changes - IDE-friendly.</p>
<p><strong>Use Cases:</strong> JSON (JsonSerializerContext), Logging (LoggerMessage), mapping, validation.</p>
<div class="code-block">[JsonSerializable(typeof(WeatherForecast))]
public partial class AppJsonContext : JsonSerializerContext { }
// 10x faster than reflection-based serialization</div>`,
  tip: "Mention: 'Source generators là tương lai của .NET - System.Text.Json, Logging, Regex đều đã adopt. Tôi dùng cho DTO mapping trong project.'"
},
{
  n: "Pattern Matching (C# 8-12)",
  l: "senior",
  p: ["Switch expressions", "Property patterns", "Relational & logical patterns", "List patterns (C# 11)"],
  q: "Trình bày các pattern matching features từ C# 8 đến 12 với ví dụ thực tế?",
  vi: `<p><strong>Switch Expressions:</strong> Concise syntax thay thế switch statement. Expression-based, exhaustive checking, discard pattern (_) cho default.</p>
<p><strong>Property Patterns:</strong> Match dựa trên property values của object. Nested property patterns cho deep matching. Kết hợp với deconstruction.</p>
<p><strong>Relational & Logical:</strong> Dùng >, <, >=, <= trong patterns. Combine với and, or, not. Tạo readable range checks.</p>
<p><strong>List Patterns (C# 11):</strong> Match array/list structure. [first, .., last] syntax. Powerful cho parsing và validation.</p>
<div class="code-block">// Switch Expression
public decimal CalculateDiscount(Customer customer) => customer.Tier switch {
    "Gold" => 0.2m,
    "Silver" => 0.1m,
    "Bronze" => 0.05m,
    _ => 0m
};

// Property Pattern
public string GetShippingCost(Order order) => order switch {
    { Total: > 500, IsPremium: true } => "Free",
    { Total: > 200 } => "$5",
    { Weight: < 1 } => "$3",
    _ => "$10"
};

// Nested Property Pattern
public bool IsEligible(Order order) => order is {
    Customer: { IsVerified: true, Age: >= 18 },
    Status: "Confirmed" or "Processing"
};

// Relational & Logical Patterns
public string GetTemperatureDescription(double temp) => temp switch {
    < 0 => "Freezing",
    >= 0 and < 15 => "Cold",
    >= 15 and < 25 => "Comfortable",
    >= 25 and < 35 => "Warm",
    >= 35 => "Hot"
};

// Type Pattern with when clause
public decimal CalculateTax(Vehicle vehicle) => vehicle switch {
    Car { EngineType: "Electric" } => 0,
    Car c when c.Year > 2020 => c.Price * 0.05m,
    Car c => c.Price * 0.1m,
    Truck t => t.Price * 0.15m,
    _ => throw new ArgumentException("Unknown vehicle")
};

// List Patterns (C# 11)
public string AnalyzeSequence(int[] numbers) => numbers switch {
    [] => "Empty",
    [var single] => $"Single: {single}",
    [var first, .., var last] => $"First: {first}, Last: {last}",
    [1, 2, 3, ..] => "Starts with 1,2,3",
    [.., > 100] => "Ends with large number"
};

// Practical: Command parsing
public ICommand ParseCommand(string[] args) => args switch {
    ["help"] => new HelpCommand(),
    ["add", var name] => new AddCommand(name),
    ["remove", var name, "--force"] => new RemoveCommand(name, Force: true),
    ["list", "--filter", var filter] => new ListCommand(filter),
    [var cmd, ..] => throw new InvalidOperationException($"Unknown: {cmd}"),
    [] => new HelpCommand()
};</div>`,
  en: `<p><strong>Switch Expressions:</strong> Concise, expression-based pattern matching with exhaustiveness checking.</p>
<p><strong>Property Patterns:</strong> Match on object property values, supports nesting.</p>
<p><strong>Relational/Logical:</strong> Use comparison operators and and/or/not combinators.</p>
<p><strong>List Patterns:</strong> C# 11 - match array structure with [first, .., last] syntax.</p>
<div class="code-block">public string Classify(Order o) => o switch {
    { Total: > 500, IsPremium: true } => "VIP Free Shipping",
    { Total: > 200 } => "Standard Shipping",
    _ => "Economy"
};</div>`,
  tip: "Pattern matching làm code declarative và readable. Show interviewer bạn dùng nó thay vì if-else chains phức tạp."
},
{
  n: "Records & Immutability",
  l: "senior",
  p: ["Record vs Class vs Struct", "With expressions for non-destructive mutation", "Value equality semantics", "Record struct (C# 10)", "Immutability benefits for concurrency"],
  q: "Records khác gì Class? Khi nào dùng record và lợi ích của immutability?",
  vi: `<p><strong>Record vs Class:</strong> Record là reference type với value equality (so sánh theo giá trị properties, không phải reference). Compiler auto-generate: Equals, GetHashCode, ToString, Deconstruct, copy constructor.</p>
<p><strong>With Expressions:</strong> Tạo bản copy với một số properties thay đổi (non-destructive mutation). Giữ immutability mà vẫn flexible.</p>
<p><strong>Value Equality:</strong> Hai record instances bằng nhau nếu tất cả properties bằng nhau. Khác class (reference equality by default). Useful cho DTOs, domain value objects.</p>
<p><strong>Record Struct (C# 10):</strong> Value type với record features. Tránh heap allocation, vẫn có value equality và with expressions.</p>
<p><strong>Immutability & Concurrency:</strong> Immutable objects inherently thread-safe - không cần lock. Functional programming style: transform data thay vì mutate.</p>
<div class="code-block">// Record declaration (positional syntax)
public record OrderDto(int Id, string Customer, decimal Total, DateTime Date);

// Equivalent to class with:
// - Value equality (Equals, GetHashCode)
// - ToString override
// - Deconstruct method
// - Copy constructor + with expression support

// With expression - non-destructive mutation
var original = new OrderDto(1, "Alice", 100m, DateTime.Now);
var updated = original with { Total = 150m };  // New instance, only Total changed
// original.Total is still 100m (immutable)

// Value Equality
var order1 = new OrderDto(1, "Alice", 100m, DateTime.Now);
var order2 = new OrderDto(1, "Alice", 100m, DateTime.Now);
Console.WriteLine(order1 == order2);  // TRUE (value equality)
// With class: would be FALSE (reference equality)

// Record with custom logic
public record Money(decimal Amount, string Currency) {
    // Can add methods and validation
    public Money Add(Money other) {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Currency mismatch");
        return this with { Amount = Amount + other.Amount };
    }
}

// Record struct (C# 10) - value type, no heap allocation
public readonly record struct Point(double X, double Y) {
    public double Distance => Math.Sqrt(X * X + Y * Y);
}

// Immutability for thread safety
public record AppState(
    ImmutableList&lt;User&gt; Users,
    ImmutableDictionary&lt;string, Setting&gt; Settings) {
    
    public AppState AddUser(User user) =>
        this with { Users = Users.Add(user) };
    // No locks needed! Each "mutation" creates new instance
}

// DDD Value Object as record
public record Address(string Street, string City, string ZipCode) {
    // Value equality built-in - perfect for Value Objects
}

public record Email {
    public string Value { get; }
    public Email(string value) {
        if (!value.Contains('@'))
            throw new ArgumentException("Invalid email");
        Value = value;
    }
}

// Inheritance with records
public abstract record Shape;
public record Circle(double Radius) : Shape;
public record Rectangle(double Width, double Height) : Shape;

double Area(Shape shape) => shape switch {
    Circle c => Math.PI * c.Radius * c.Radius,
    Rectangle r => r.Width * r.Height,
    _ => 0
};</div>`,
  en: `<p><strong>Record vs Class:</strong> Records have value equality, auto-generated Equals/GetHashCode/ToString, and with-expression support.</p>
<p><strong>With Expressions:</strong> Create copies with modified properties - non-destructive mutation.</p>
<p><strong>Value Equality:</strong> Two records are equal if all properties match (unlike class reference equality).</p>
<p><strong>Record Struct:</strong> C# 10 - value type with record features, no heap allocation.</p>
<p><strong>Immutability:</strong> Thread-safe by design - no locks needed for concurrent reads.</p>
<div class="code-block">public record OrderDto(int Id, string Customer, decimal Total);
var updated = original with { Total = 150m }; // Immutable copy</div>`,
  tip: "Records hoàn hảo cho DTOs, Value Objects (DDD), và event data. Nói: 'Tôi dùng records cho domain events và API responses - value equality giúp testing dễ hơn.'"
}
]
});
