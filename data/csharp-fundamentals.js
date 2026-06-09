window.GUIDE_DATA = window.GUIDE_DATA || [];
window.GUIDE_DATA.push({
t: "C# Fundamentals",
c: "bg-1",
items: [
{
  n: "Value Types vs Reference Types",
  l: "junior",
  p: ["Stack vs Heap allocation", "Boxing/Unboxing", "Nullable value types", "Struct vs Class differences"],
  q: "Giải thích sự khác biệt giữa Value Types và Reference Types trong C#. Khi nào nên dùng struct thay vì class?",
  vi: `<p><strong>Stack vs Heap:</strong> Value types (int, bool, struct) được lưu trên Stack - vùng nhớ có tốc độ truy cập nhanh, tự động giải phóng khi ra khỏi scope. Reference types (class, string, array) lưu trên Heap - cần Garbage Collector để thu hồi.</p>
<p><strong>Boxing/Unboxing:</strong> Boxing là quá trình wrap value type vào object (heap allocation). Unboxing là ngược lại. Cả hai đều tốn performance.</p>
<p><strong>Nullable:</strong> Value types mặc định không thể null. Dùng <code>int?</code> (Nullable&lt;int&gt;) để cho phép null.</p>
<p><strong>Struct vs Class:</strong> Struct là value type, không hỗ trợ inheritance, nên dùng khi data nhỏ (&lt;16 bytes), immutable, và được tạo/hủy thường xuyên.</p>
<div class="code-block">// Boxing/Unboxing
int value = 42;
object boxed = value;       // Boxing - allocates on heap
int unboxed = (int)boxed;   // Unboxing

// Nullable
int? nullableInt = null;
int result = nullableInt ?? 0;  // Null-coalescing

// Struct vs Class
public struct Point {
    public readonly double X;
    public readonly double Y;
    public Point(double x, double y) => (X, Y) = (x, y);
}

public class Customer {
    public string Name { get; set; }
    public string Email { get; set; }
}

// Value type semantics - copy by value
Point p1 = new Point(1, 2);
Point p2 = p1;  // p2 is a COPY, modifying p2 won't affect p1

// Reference type semantics - copy by reference
Customer c1 = new Customer { Name = "A" };
Customer c2 = c1;  // c2 points to SAME object
c2.Name = "B";     // c1.Name is also "B"</div>`,
  en: `<p><strong>Stack vs Heap:</strong> Value types (int, bool, struct) are stored on the Stack with fast access and automatic cleanup. Reference types (class, string, array) are stored on the Heap and require GC.</p>
<p><strong>Boxing/Unboxing:</strong> Boxing wraps a value type into an object (heap allocation). Both operations have performance cost.</p>
<p><strong>Nullable:</strong> Value types cannot be null by default. Use <code>int?</code> to allow null values.</p>
<p><strong>Struct vs Class:</strong> Structs are value types, no inheritance, best for small (&lt;16 bytes), immutable, frequently created/destroyed data.</p>
<div class="code-block">// Boxing/Unboxing
int value = 42;
object boxed = value;       // Boxing - heap allocation
int unboxed = (int)boxed;   // Unboxing

// Struct - value semantics (copy)
Point p1 = new(1, 2);
Point p2 = p1;  // Independent copy

// Class - reference semantics (shared)
Customer c1 = new() { Name = "A" };
Customer c2 = c1;  // Same object reference</div>`,
  tip: "Nhấn mạnh bạn hiểu performance implications: boxing gây GC pressure, struct nên immutable và nhỏ."
},
{
  n: "SOLID Principles",
  l: "junior",
  p: ["Single Responsibility", "Open/Closed", "Liskov Substitution", "Interface Segregation", "Dependency Inversion"],
  q: "Trình bày 5 nguyên tắc SOLID với ví dụ code thực tế trong C#?",
  vi: `<p><strong>S - Single Responsibility:</strong> Mỗi class chỉ có MỘT lý do để thay đổi. Tách biệt concerns.</p>
<p><strong>O - Open/Closed:</strong> Open for extension, closed for modification. Dùng abstraction để mở rộng mà không sửa code cũ.</p>
<p><strong>L - Liskov Substitution:</strong> Subclass phải thay thế được base class mà không làm hỏng logic.</p>
<p><strong>I - Interface Segregation:</strong> Không ép client implement interface methods mà họ không dùng. Tách interface nhỏ.</p>
<p><strong>D - Dependency Inversion:</strong> High-level modules không phụ thuộc low-level modules. Cả hai phụ thuộc abstractions.</p>
<div class="code-block">// S - Single Responsibility
// BAD: class làm quá nhiều việc
public class UserService {
    public void Register(User user) { /* ... */ }
    public void SendEmail(string to) { /* ... */ }  // Vi phạm SRP
}
// GOOD: tách riêng
public class UserService {
    private readonly IEmailService _email;
    public UserService(IEmailService email) => _email = email;
    public void Register(User user) {
        // save user
        _email.SendWelcome(user.Email);
    }
}

// O - Open/Closed
public interface IDiscountStrategy {
    decimal Calculate(Order order);
}
public class VIPDiscount : IDiscountStrategy {
    public decimal Calculate(Order order) => order.Total * 0.2m;
}
// Thêm discount mới mà KHÔNG sửa code cũ
public class SeasonalDiscount : IDiscountStrategy {
    public decimal Calculate(Order order) => order.Total * 0.1m;
}

// L - Liskov Substitution
// BAD: Square override Width/Height breaks Rectangle logic
// GOOD: dùng interface
public interface IShape { double Area(); }
public class Rectangle : IShape {
    public double Width { get; set; }
    public double Height { get; set; }
    public double Area() => Width * Height;
}

// I - Interface Segregation
// BAD
public interface IWorker { void Work(); void Eat(); void Sleep(); }
// GOOD
public interface IWorkable { void Work(); }
public interface IFeedable { void Eat(); }

// D - Dependency Inversion
public interface IOrderRepository {
    Task&lt;Order&gt; GetByIdAsync(int id);
}
public class OrderService {
    private readonly IOrderRepository _repo;  // Depend on abstraction
    public OrderService(IOrderRepository repo) => _repo = repo;
}</div>`,
  en: `<p><strong>S - Single Responsibility:</strong> Each class has only ONE reason to change.</p>
<p><strong>O - Open/Closed:</strong> Open for extension, closed for modification via abstractions.</p>
<p><strong>L - Liskov Substitution:</strong> Subtypes must be substitutable for their base types.</p>
<p><strong>I - Interface Segregation:</strong> Don't force clients to depend on methods they don't use.</p>
<p><strong>D - Dependency Inversion:</strong> Depend on abstractions, not concretions.</p>
<div class="code-block">// Dependency Inversion example
public interface IOrderRepository {
    Task&lt;Order&gt; GetByIdAsync(int id);
}
public class OrderService {
    private readonly IOrderRepository _repo;
    public OrderService(IOrderRepository repo) => _repo = repo;
}
// High-level (OrderService) depends on abstraction (IOrderRepository)
// Low-level (SqlOrderRepository) implements the abstraction</div>`,
  tip: "Đưa ví dụ thực tế từ project bạn đã làm. Interviewer thích nghe bạn áp dụng SOLID trong thực tế hơn là lý thuyết."
},
{
  n: "Exception Handling Best Practices",
  l: "junior",
  p: ["throw vs throw ex", "Custom exceptions", "Result pattern", "Global exception handler"],
  q: "Trình bày best practices cho Exception Handling trong C#. So sánh throw vs throw ex và khi nào dùng Result pattern?",
  vi: `<p><strong>throw vs throw ex:</strong> <code>throw</code> giữ nguyên stack trace gốc, <code>throw ex</code> reset stack trace khiến mất thông tin debug. Luôn dùng <code>throw</code> khi re-throw.</p>
<p><strong>Custom Exceptions:</strong> Tạo exception riêng cho domain-specific errors, kế thừa từ Exception, thêm context data.</p>
<p><strong>Result Pattern:</strong> Thay vì throw exception cho business logic errors (tốn performance), dùng Result object chứa Success/Failure. Exception chỉ cho exceptional cases.</p>
<p><strong>Global Handler:</strong> Dùng middleware trong ASP.NET Core để catch unhandled exceptions, log, và trả response chuẩn.</p>
<div class="code-block">// throw vs throw ex
try {
    DoSomething();
} catch (Exception ex) {
    Log(ex);
    throw;      // ✅ Preserves original stack trace
    // throw ex; // ❌ Resets stack trace - loses origin info
}

// Custom Exception
public class OrderNotFoundException : Exception {
    public int OrderId { get; }
    public OrderNotFoundException(int orderId)
        : base($"Order {orderId} not found") {
        OrderId = orderId;
    }
}

// Result Pattern - avoid exceptions for flow control
public class Result&lt;T&gt; {
    public bool IsSuccess { get; }
    public T Value { get; }
    public string Error { get; }
    private Result(T value) { IsSuccess = true; Value = value; }
    private Result(string error) { IsSuccess = false; Error = error; }
    public static Result&lt;T&gt; Success(T value) => new(value);
    public static Result&lt;T&gt; Failure(string error) => new(error);
}

public Result&lt;Order&gt; CreateOrder(OrderDto dto) {
    if (dto.Items.Count == 0)
        return Result&lt;Order&gt;.Failure("Order must have items");
    var order = new Order(dto);
    return Result&lt;Order&gt;.Success(order);
}

// Global Exception Handler Middleware
public class ExceptionMiddleware {
    private readonly RequestDelegate _next;
    private readonly ILogger _logger;
    public ExceptionMiddleware(RequestDelegate next, ILogger&lt;ExceptionMiddleware&gt; logger) {
        _next = next; _logger = logger;
    }
    public async Task InvokeAsync(HttpContext context) {
        try {
            await _next(context);
        } catch (Exception ex) {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new {
                error = "Internal server error",
                traceId = Activity.Current?.Id
            });
        }
    }
}</div>`,
  en: `<p><strong>throw vs throw ex:</strong> <code>throw</code> preserves original stack trace, <code>throw ex</code> resets it. Always use <code>throw</code> for re-throwing.</p>
<p><strong>Custom Exceptions:</strong> Create domain-specific exceptions with context data.</p>
<p><strong>Result Pattern:</strong> Use Result objects for expected failures instead of exceptions (better performance, explicit error handling).</p>
<p><strong>Global Handler:</strong> Use middleware to catch unhandled exceptions, log them, and return standardized error responses.</p>
<div class="code-block">// Result Pattern
public Result&lt;Order&gt; CreateOrder(OrderDto dto) {
    if (dto.Items.Count == 0)
        return Result&lt;Order&gt;.Failure("Order must have items");
    return Result&lt;Order&gt;.Success(new Order(dto));
}

// Global Exception Middleware
app.UseMiddleware&lt;ExceptionMiddleware&gt;();</div>`,
  tip: "Nói rõ: Exception cho exceptional cases (DB down, network fail), Result pattern cho business validation. Đây là dấu hiệu senior thinking."
},
{
  n: "Collections & LINQ",
  l: "junior",
  p: ["List/Dictionary/HashSet differences", "Deferred execution", "IEnumerable vs IQueryable", "Common LINQ pitfalls"],
  q: "So sánh các collection types trong C# và giải thích deferred execution trong LINQ. Khi nào dùng IEnumerable vs IQueryable?",
  vi: `<p><strong>Collections:</strong> List&lt;T&gt; - ordered, index access O(1), add O(1) amortized. Dictionary&lt;K,V&gt; - key-value lookup O(1). HashSet&lt;T&gt; - unique elements, contains check O(1).</p>
<p><strong>Deferred Execution:</strong> LINQ query không execute ngay khi khai báo, chỉ execute khi enumerate (foreach, ToList, Count...). Cho phép compose queries và tối ưu.</p>
<p><strong>IEnumerable vs IQueryable:</strong> IEnumerable xử lý in-memory (LINQ to Objects). IQueryable build expression tree, translate sang SQL - filter tại database, không load toàn bộ data.</p>
<p><strong>Pitfalls:</strong> Multiple enumeration gây multiple DB calls, deferred execution trong loop gây N+1.</p>
<div class="code-block">// Collection choices
var list = new List&lt;int&gt; { 1, 2, 3 };          // Ordered, duplicates OK
var dict = new Dictionary&lt;string, int&gt;();       // Fast key lookup
var set = new HashSet&lt;string&gt;();                // Unique, fast Contains

// Deferred Execution
var query = orders.Where(o => o.Total > 100);  // NOT executed yet!
var result = query.ToList();                    // NOW it executes

// IEnumerable - processes in memory
IEnumerable&lt;Order&gt; memoryQuery = orders
    .AsEnumerable()
    .Where(o => o.Total > 100);  // Loads ALL orders, filters in C#

// IQueryable - translates to SQL
IQueryable&lt;Order&gt; dbQuery = dbContext.Orders
    .Where(o => o.Total > 100);  // SQL: WHERE Total > 100
    // Only matching rows transferred from DB

// ⚠️ Multiple Enumeration pitfall
IEnumerable&lt;Order&gt; expensive = GetOrders().Where(o => o.IsActive);
var count = expensive.Count();    // Executes query
var list2 = expensive.ToList();   // Executes AGAIN!
// Fix: materialize once
var materialized = expensive.ToList();

// Useful LINQ patterns
var grouped = orders.GroupBy(o => o.CustomerId)
    .Select(g => new { CustomerId = g.Key, Total = g.Sum(o => o.Amount) });

var paged = orders.OrderBy(o => o.Date)
    .Skip(20).Take(10);  // Pagination</div>`,
  en: `<p><strong>Collections:</strong> List - ordered O(1) index, Dictionary - O(1) key lookup, HashSet - O(1) unique contains.</p>
<p><strong>Deferred Execution:</strong> LINQ queries execute only when enumerated (ToList, foreach, Count).</p>
<p><strong>IEnumerable vs IQueryable:</strong> IEnumerable processes in-memory. IQueryable builds expression trees translated to SQL - filtering happens at database level.</p>
<p><strong>Pitfalls:</strong> Multiple enumeration causes repeated execution; materialize with ToList() when reusing results.</p>
<div class="code-block">// IQueryable - SQL translation
var dbQuery = dbContext.Orders
    .Where(o => o.Total > 100);  // Translated to SQL WHERE

// Avoid multiple enumeration
var results = query.ToList();  // Materialize once</div>`,
  tip: "Khi được hỏi về LINQ, luôn nhắc đến deferred execution và sự khác biệt IEnumerable/IQueryable - đây là điểm phân biệt junior vs mid."
},
{
  n: "Interfaces vs Abstract Classes",
  l: "junior",
  p: ["When to use each", "Default interface methods (C# 8+)", "DI implications", "Multiple inheritance via interfaces"],
  q: "Khi nào dùng Interface vs Abstract Class? Default interface methods thay đổi gì?",
  vi: `<p><strong>Khi nào dùng:</strong> Interface khi cần contract/capability (IDisposable, IComparable) - "can do". Abstract class khi có shared implementation và IS-A relationship - "is a".</p>
<p><strong>Default Interface Methods (C# 8+):</strong> Interface có thể có method body mặc định. Cho phép evolve interface mà không break existing implementations. Tuy nhiên không thể access instance state.</p>
<p><strong>DI Implications:</strong> Interface là foundation của DI - register abstraction, resolve implementation. Dễ mock trong unit test. Abstract class khó mock hơn.</p>
<p><strong>Multiple Inheritance:</strong> C# không hỗ trợ multiple class inheritance nhưng cho phép implement nhiều interfaces - giải quyết diamond problem.</p>
<div class="code-block">// Interface - contract/capability
public interface INotificationSender {
    Task SendAsync(string to, string message);
    
    // Default method (C# 8+) - backward compatible evolution
    Task SendBatchAsync(IEnumerable&lt;string&gt; recipients, string message) {
        return Task.WhenAll(recipients.Select(r => SendAsync(r, message)));
    }
}

// Abstract class - shared implementation + IS-A
public abstract class NotificationBase {
    protected readonly ILogger _logger;
    protected NotificationBase(ILogger logger) => _logger = logger;
    
    public async Task SendWithRetryAsync(string to, string msg) {
        for (int i = 0; i < 3; i++) {
            try {
                await SendCoreAsync(to, msg);
                return;
            } catch (Exception ex) {
                _logger.LogWarning(ex, "Retry {Attempt}", i + 1);
            }
        }
    }
    protected abstract Task SendCoreAsync(string to, string message);
}

// Multiple interfaces
public class EmailService : INotificationSender, IHealthCheck, IDisposable {
    public Task SendAsync(string to, string message) { /* ... */ }
    public Task&lt;bool&gt; CheckHealthAsync() { /* ... */ }
    public void Dispose() { /* ... */ }
}

// DI Registration - easy to swap implementations
services.AddScoped&lt;INotificationSender, EmailService&gt;();
// For testing:
services.AddScoped&lt;INotificationSender, FakeNotificationSender&gt;();

// Unit test with mock
var mock = new Mock&lt;INotificationSender&gt;();
mock.Setup(x => x.SendAsync(It.IsAny&lt;string&gt;(), It.IsAny&lt;string&gt;()))
    .ReturnsAsync(true);</div>`,
  en: `<p><strong>When to use:</strong> Interface for contracts/capabilities ("can do"). Abstract class for shared implementation with IS-A relationship.</p>
<p><strong>Default Methods:</strong> C# 8+ allows method bodies in interfaces for backward-compatible evolution.</p>
<p><strong>DI:</strong> Interfaces are the foundation of DI - easy to register, resolve, and mock.</p>
<p><strong>Multiple Inheritance:</strong> C# supports multiple interface implementation but not multiple class inheritance.</p>
<div class="code-block">// Interface for DI
services.AddScoped&lt;INotificationSender, EmailService&gt;();
// Easy to mock in tests
var mock = new Mock&lt;INotificationSender&gt;();</div>`,
  tip: "Trả lời: 'Interface cho contract và DI, Abstract class khi cần shared behavior với template method pattern.' Cho ví dụ thực tế."
},
{
  n: "Generics & Constraints",
  l: "junior",
  p: ["Generic type constraints (where T:)", "Covariance (out T)", "Contravariance (in T)", "Generic repository pattern"],
  q: "Giải thích Generics constraints trong C# và khi nào cần Covariance/Contravariance?",
  vi: `<p><strong>Constraints (where T:):</strong> Giới hạn type parameter: <code>where T : class</code> (reference type), <code>where T : struct</code> (value type), <code>where T : new()</code> (parameterless constructor), <code>where T : IComparable</code> (implement interface), <code>where T : BaseClass</code>.</p>
<p><strong>Covariance (out T):</strong> Cho phép dùng derived type thay cho base type trong generic. <code>IEnumerable&lt;out T&gt;</code> - có thể assign IEnumerable&lt;Dog&gt; cho IEnumerable&lt;Animal&gt;. Chỉ dùng T ở output position.</p>
<p><strong>Contravariance (in T):</strong> Ngược lại - dùng base type thay cho derived. <code>Action&lt;in T&gt;</code> - Action&lt;Animal&gt; có thể assign cho Action&lt;Dog&gt;. Chỉ dùng T ở input position.</p>
<p><strong>Generic Repository:</strong> Pattern phổ biến dùng generics để tạo reusable data access layer.</p>
<div class="code-block">// Constraints
public class Repository&lt;T&gt; where T : class, IEntity, new() {
    public T Create() => new T();  // new() constraint allows this
    public void Save(T entity) { /* ... */ }
}

public interface IEntity {
    int Id { get; }
}

// Multiple constraints
public T DeepClone&lt;T&gt;(T obj) where T : class, ICloneable {
    return (T)obj.Clone();
}

// Covariance (out) - output only
public interface IReadRepository&lt;out T&gt; {
    T GetById(int id);
    IEnumerable&lt;T&gt; GetAll();
}
// Can assign IReadRepository&lt;Dog&gt; to IReadRepository&lt;Animal&gt;
IReadRepository&lt;Animal&gt; repo = new DogRepository();

// Contravariance (in) - input only
public interface IComparer&lt;in T&gt; {
    int Compare(T x, T y);
}
// Can assign IComparer&lt;Animal&gt; to IComparer&lt;Dog&gt;
IComparer&lt;Dog&gt; dogComparer = new AnimalComparer();

// Generic Repository Pattern
public interface IRepository&lt;T&gt; where T : class, IEntity {
    Task&lt;T?&gt; GetByIdAsync(int id);
    Task&lt;IReadOnlyList&lt;T&gt;&gt; GetAllAsync();
    Task&lt;T&gt; AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(int id);
}

public class EfRepository&lt;T&gt; : IRepository&lt;T&gt; where T : class, IEntity {
    private readonly DbContext _context;
    private readonly DbSet&lt;T&gt; _dbSet;
    public EfRepository(DbContext context) {
        _context = context;
        _dbSet = context.Set&lt;T&gt;();
    }
    public async Task&lt;T?&gt; GetByIdAsync(int id) => await _dbSet.FindAsync(id);
    public async Task&lt;IReadOnlyList&lt;T&gt;&gt; GetAllAsync() => await _dbSet.ToListAsync();
    public async Task&lt;T&gt; AddAsync(T entity) { _dbSet.Add(entity); await _context.SaveChangesAsync(); return entity; }
    public async Task UpdateAsync(T entity) { _context.Entry(entity).State = EntityState.Modified; await _context.SaveChangesAsync(); }
    public async Task DeleteAsync(int id) { var e = await _dbSet.FindAsync(id); if (e != null) { _dbSet.Remove(e); await _context.SaveChangesAsync(); } }
}</div>`,
  en: `<p><strong>Constraints:</strong> Restrict type parameters: class, struct, new(), interface, base class.</p>
<p><strong>Covariance (out T):</strong> Use derived type where base is expected. IEnumerable&lt;Dog&gt; assignable to IEnumerable&lt;Animal&gt;.</p>
<p><strong>Contravariance (in T):</strong> Use base type where derived is expected. Action&lt;Animal&gt; assignable to Action&lt;Dog&gt;.</p>
<p><strong>Generic Repository:</strong> Reusable data access pattern using generics with entity constraints.</p>
<div class="code-block">// Covariance
IReadRepository&lt;Animal&gt; repo = new DogRepository(); // out T
// Contravariance
IComparer&lt;Dog&gt; comparer = new AnimalComparer(); // in T</div>`,
  tip: "Nhớ mẹo: OUT = output = covariance (derived → base), IN = input = contravariance (base → derived)."
},
{
  n: "Delegates, Events & Lambda",
  l: "junior",
  p: ["Action/Func/Predicate delegates", "Event pattern & EventHandler", "Lambda expressions & closures", "Closure pitfalls in loops"],
  q: "Giải thích Delegates, Events và Lambda trong C#. Closure pitfalls là gì?",
  vi: `<p><strong>Action/Func/Predicate:</strong> Action&lt;T&gt; - delegate không return (void). Func&lt;T,TResult&gt; - delegate có return value. Predicate&lt;T&gt; - delegate return bool. Đây là built-in generic delegates thay thế custom delegate declarations.</p>
<p><strong>Event Pattern:</strong> Events dùng delegate nhưng thêm encapsulation - chỉ class chứa event mới có thể raise (invoke). Bên ngoài chỉ += hoặc -=. Dùng EventHandler&lt;TEventArgs&gt; convention.</p>
<p><strong>Lambda & Closures:</strong> Lambda là anonymous function ngắn gọn. Closure xảy ra khi lambda capture biến từ outer scope - compiler tạo class ẩn để giữ reference.</p>
<p><strong>Closure Pitfalls:</strong> Trong loop, tất cả lambda capture CÙNG biến loop variable. Kết quả: tất cả lambda reference giá trị cuối cùng của biến.</p>
<div class="code-block">// Built-in delegates
Action&lt;string&gt; log = msg => Console.WriteLine(msg);
Func&lt;int, int, int&gt; add = (a, b) => a + b;
Predicate&lt;int&gt; isEven = n => n % 2 == 0;

// Event Pattern
public class OrderService {
    public event EventHandler&lt;OrderEventArgs&gt;? OrderCreated;
    
    public void CreateOrder(Order order) {
        // ... create logic
        OrderCreated?.Invoke(this, new OrderEventArgs(order));
    }
}

public class OrderEventArgs : EventArgs {
    public Order Order { get; }
    public OrderEventArgs(Order order) => Order = order;
}

// Subscribe
var service = new OrderService();
service.OrderCreated += (sender, args) => {
    Console.WriteLine($"Order {args.Order.Id} created");
};

// ⚠️ Closure Pitfall in Loop
var actions = new List&lt;Action&gt;();
for (int i = 0; i < 5; i++) {
    actions.Add(() => Console.WriteLine(i));
}
actions.ForEach(a => a());  // Prints: 5,5,5,5,5 (NOT 0,1,2,3,4)

// ✅ Fix: capture copy
for (int i = 0; i < 5; i++) {
    int captured = i;  // Local copy
    actions.Add(() => Console.WriteLine(captured));
}
// Now prints: 0,1,2,3,4

// Closure memory leak risk
public class Processor {
    private byte[] _largeBuffer = new byte[10_000_000];
    
    public Action GetAction() {
        // Lambda captures 'this', keeping _largeBuffer alive!
        return () => Console.WriteLine(_largeBuffer.Length);
    }
}</div>`,
  en: `<p><strong>Delegates:</strong> Action (void return), Func (with return), Predicate (bool return).</p>
<p><strong>Events:</strong> Encapsulated delegates - only declaring class can invoke. Use EventHandler&lt;T&gt; pattern.</p>
<p><strong>Closures:</strong> Lambdas capture outer variables by reference, compiler generates hidden class.</p>
<p><strong>Pitfall:</strong> Loop variable capture - all lambdas share same variable, seeing final value. Fix: create local copy.</p>
<div class="code-block">// Closure pitfall
for (int i = 0; i < 5; i++)
    actions.Add(() => Console.WriteLine(i)); // All print 5!
// Fix:
for (int i = 0; i < 5; i++) {
    int copy = i;
    actions.Add(() => Console.WriteLine(copy)); // 0,1,2,3,4
}</div>`,
  tip: "Closure pitfall là câu hỏi trick phổ biến. Giải thích rõ mechanism: lambda capture reference, không capture value."
},
{
  n: "String Handling & Performance",
  l: "junior",
  p: ["String immutability", "StringBuilder for concatenation", "String interpolation internals", "Span<char> for zero-allocation parsing"],
  q: "Tại sao String là immutable trong C#? Khi nào dùng StringBuilder và Span<char>?",
  vi: `<p><strong>String Immutability:</strong> String trong C# là immutable - mỗi thao tác tạo string MỚI trên heap. Điều này đảm bảo thread-safety và cho phép string interning, nhưng concatenation trong loop tạo nhiều garbage.</p>
<p><strong>StringBuilder:</strong> Dùng khi concatenate nhiều lần (>3-4 lần hoặc trong loop). StringBuilder dùng internal buffer, resize khi cần, chỉ allocate 1 string cuối cùng khi ToString().</p>
<p><strong>String Interpolation:</strong> <code>$"Hello {name}"</code> compile thành String.Format hoặc (C# 10+) interpolated string handler - có thể zero-allocation với Span.</p>
<p><strong>Span&lt;char&gt;:</strong> Cho phép slice string mà KHÔNG allocate substring mới. ReadOnlySpan&lt;char&gt; cho parsing, splitting mà không tạo garbage.</p>
<div class="code-block">// ❌ BAD: String concatenation in loop - O(n²) allocations
string result = "";
for (int i = 0; i < 10000; i++) {
    result += i.ToString();  // Creates new string each iteration!
}

// ✅ GOOD: StringBuilder - O(n)
var sb = new StringBuilder(capacity: 50000);
for (int i = 0; i < 10000; i++) {
    sb.Append(i);
}
string result2 = sb.ToString();  // Single allocation

// String Interpolation (C# 10+ handler)
int age = 25;
string msg = $"Age: {age}";  // Optimized by compiler

// Span&lt;char&gt; - zero allocation parsing
ReadOnlySpan&lt;char&gt; text = "2024-01-15 Hello World".AsSpan();
ReadOnlySpan&lt;char&gt; date = text[..10];    // No allocation! Just a view
ReadOnlySpan&lt;char&gt; content = text[11..];  // No allocation!

// Parsing CSV without allocations
public static void ParseCsv(ReadOnlySpan&lt;char&gt; line) {
    while (!line.IsEmpty) {
        int comma = line.IndexOf(',');
        ReadOnlySpan&lt;char&gt; field = comma == -1 ? line : line[..comma];
        ProcessField(field);  // No string allocation
        line = comma == -1 ? ReadOnlySpan&lt;char&gt;.Empty : line[(comma + 1)..];
    }
}

// String.Create for efficient string building
string result3 = string.Create(10, 42, (span, state) => {
    state.TryFormat(span, out int written);
    span[written..].Fill('0');
});</div>`,
  en: `<p><strong>Immutability:</strong> Every string operation creates a new string on heap. Thread-safe but costly for repeated concatenation.</p>
<p><strong>StringBuilder:</strong> Use for 3+ concatenations or loops. Internal buffer, single final allocation.</p>
<p><strong>Interpolation:</strong> C# 10+ uses interpolated string handlers for potential zero-allocation.</p>
<p><strong>Span&lt;char&gt;:</strong> Zero-allocation string slicing and parsing - no substring copies needed.</p>
<div class="code-block">// Span - zero allocation slicing
ReadOnlySpan&lt;char&gt; text = "Hello World".AsSpan();
ReadOnlySpan&lt;char&gt; word = text[..5]; // No allocation</div>`,
  tip: "Biết Span<char> cho thấy bạn quan tâm performance. Mention benchmark numbers nếu có: StringBuilder nhanh hơn 100x+ cho large concatenations."
}
]
});
