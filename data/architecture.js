window.GUIDE_DATA = window.GUIDE_DATA || [];
window.GUIDE_DATA.push({
t: "Architecture & Design Patterns",
c: "bg-3",
items: [
{
  n: "Clean Architecture",
  l: "senior",
  p: [{t:"Layer responsibilities",d:"Domain (entities, value objects, zero deps) → Application (use cases, interfaces, DTOs) → Infrastructure (EF Core, external APIs, implementations) → Presentation (controllers, UI)"},{t:"Dependency Rule",d:"Dependencies chỉ point INWARD. Domain không biết DB hay HTTP. Application define interfaces, Infrastructure implement. Outer depend inner, NEVER ngược lại"},{t:"When overkill",d:"Simple CRUD (<5 entities), prototypes, small microservices. Overhead: nhiều projects, mapping layers, abstractions không cần thiết cho simple logic"},{t:"Vertical Slice alternative",d:"Organize by feature thay vì layer. Mỗi feature chứa handler + model + validation riêng. Giảm coupling giữa features, dễ modify independently"}],
  q: "Giải thích Clean Architecture và Dependency Rule. Khi nào nó overkill?",
  vi: `<p><strong>Layers:</strong> Domain (entities, value objects, domain events - zero dependencies). Application (use cases, interfaces, DTOs - depends only on Domain). Infrastructure (EF Core, external services, implementations - depends on Application). Presentation (API controllers, UI - depends on Application).</p>
<p><strong>Dependency Rule:</strong> Dependencies chỉ point INWARD. Outer layers depend on inner layers, NEVER ngược lại. Domain không biết về database hay HTTP. Application define interfaces, Infrastructure implement.</p>
<p><strong>When Overkill:</strong> Simple CRUD apps, prototypes, small microservices (<5 entities). Overhead: nhiều projects, mapping layers, abstractions không cần thiết. Rule of thumb: nếu business logic đơn giản, Clean Architecture thêm complexity không cần thiết.</p>
<p><strong>Vertical Slice:</strong> Alternative - organize by feature thay vì layer. Mỗi feature chứa handler, model, validation riêng. Giảm coupling giữa features, dễ modify independently.</p>
<div class="code-block">// Solution Structure
// src/
//   Domain/           → Entities, ValueObjects, Interfaces, DomainEvents
//   Application/      → UseCases, DTOs, Validators, Interfaces
//   Infrastructure/   → EF DbContext, Repositories, External Services
//   WebApi/           → Controllers, Middleware, DI Configuration

// Domain Layer - ZERO external dependencies
public class Order {
    public int Id { get; private set; }
    public OrderStatus Status { get; private set; }
    private readonly List&lt;OrderItem&gt; _items = new();
    public IReadOnlyList&lt;OrderItem&gt; Items => _items.AsReadOnly();
    
    public Result AddItem(Product product, int quantity) {
        if (Status != OrderStatus.Draft)
            return Result.Failure("Cannot modify confirmed order");
        _items.Add(new OrderItem(product.Id, product.Price, quantity));
        return Result.Success();
    }
}

// Application Layer - defines interfaces
public interface IOrderRepository {
    Task&lt;Order?&gt; GetByIdAsync(int id, CancellationToken ct);
    Task&lt;Order&gt; AddAsync(Order order, CancellationToken ct);
}

public class CreateOrderHandler {
    private readonly IOrderRepository _repo;
    private readonly IUnitOfWork _uow;
    public CreateOrderHandler(IOrderRepository repo, IUnitOfWork uow) {
        _repo = repo; _uow = uow;
    }
    public async Task&lt;Result&lt;int&gt;&gt; Handle(CreateOrderCommand cmd, CancellationToken ct) {
        var order = new Order(cmd.CustomerId);
        foreach (var item in cmd.Items)
            order.AddItem(item.Product, item.Quantity);
        await _repo.AddAsync(order, ct);
        await _uow.SaveChangesAsync(ct);
        return Result&lt;int&gt;.Success(order.Id);
    }
}

// Infrastructure Layer - implements interfaces
public class OrderRepository : IOrderRepository {
    private readonly AppDbContext _context;
    public OrderRepository(AppDbContext context) => _context = context;
    public async Task&lt;Order?&gt; GetByIdAsync(int id, CancellationToken ct) =>
        await _context.Orders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
}

// Dependency Rule: Domain ← Application ← Infrastructure/Presentation
// Domain knows NOTHING about EF Core, HTTP, or external services</div>`,
  en: `<p><strong>Layers:</strong> Domain (entities, no deps), Application (use cases, interfaces), Infrastructure (implementations), Presentation (API).</p>
<p><strong>Dependency Rule:</strong> Dependencies point inward only. Domain has zero external dependencies.</p>
<p><strong>Overkill:</strong> Simple CRUD, prototypes, small services. Adds unnecessary abstraction layers.</p>
<p><strong>Vertical Slice:</strong> Organize by feature instead of layer - reduces cross-feature coupling.</p>
<div class="code-block">// Dependency Rule: outer depends on inner
// Domain ← Application ← Infrastructure/Presentation</div>`,
  tip: "Nói: 'Clean Architecture cho complex domain logic. Cho simple CRUD, tôi dùng Vertical Slices hoặc minimal layering.' Show bạn pragmatic, không dogmatic."
},
{
  n: "CQRS + MediatR",
  l: "senior",
  p: [{t:"Commands vs Queries",d:"Commands thay đổi state (return void/Result). Queries đọc data (return DTO). Tách cho phép optimize read/write independently với different models"},{t:"MediatR pipeline behaviors",d:"Cross-cutting concerns: ValidationBehavior (auto-validate), LoggingBehavior (timing), TransactionBehavior (auto-commit). Execute trước/sau handler mà không modify handler code"},{t:"3 levels of CQRS",d:"Level 1: Same DB, tách handlers (free, code org). Level 2: Write DB + Read Replica/materialized views (performance). Level 3: Event Sourcing + projections (full audit, complex)"},{t:"When unnecessary",d:"Simple CRUD không có complex business logic. Nếu Command handler chỉ map DTO → entity → save, CQRS không thêm value. Overhead: more classes, indirection"}],
  q: "Giải thích CQRS pattern và 3 levels of implementation. Khi nào CQRS quá phức tạp?",
  vi: `<p><strong>Commands vs Queries:</strong> Commands thay đổi state (return void/Result), Queries đọc data (return DTO). Tách biệt cho phép optimize read/write independently, different models cho mỗi side.</p>
<p><strong>Pipeline Behaviors:</strong> MediatR middleware - cross-cutting concerns: validation, logging, caching, transaction. Execute trước/sau handler mà không modify handler code.</p>
<p><strong>3 Levels:</strong> Level 1: Same DB, separate models (simple). Level 2: Read replicas/materialized views (performance). Level 3: Event Sourcing + projections (full audit, complex but powerful).</p>
<p><strong>When Overkill:</strong> Simple CRUD without complex business logic. Overhead: more classes, indirection, learning curve. Rule: nếu Command handler chỉ map DTO → entity → save, CQRS không thêm value.</p>
<div class="code-block">// Command
public record CreateOrderCommand(int CustomerId, List&lt;OrderItemDto&gt; Items) 
    : IRequest&lt;Result&lt;int&gt;&gt;;

// Query
public record GetOrderQuery(int OrderId) : IRequest&lt;OrderDetailsDto?&gt;;

// Command Handler
public class CreateOrderHandler : IRequestHandler&lt;CreateOrderCommand, Result&lt;int&gt;&gt; {
    private readonly IOrderRepository _repo;
    private readonly IUnitOfWork _uow;
    
    public async Task&lt;Result&lt;int&gt;&gt; Handle(
        CreateOrderCommand request, CancellationToken ct) {
        var order = Order.Create(request.CustomerId);
        foreach (var item in request.Items)
            order.AddItem(item.ProductId, item.Quantity);
        await _repo.AddAsync(order, ct);
        await _uow.SaveChangesAsync(ct);
        return Result&lt;int&gt;.Success(order.Id);
    }
}

// Query Handler - can use different model/DB
public class GetOrderHandler : IRequestHandler&lt;GetOrderQuery, OrderDetailsDto?&gt; {
    private readonly IReadDbContext _readDb;  // Could be read replica
    
    public async Task&lt;OrderDetailsDto?&gt; Handle(
        GetOrderQuery request, CancellationToken ct) {
        return await _readDb.Orders
            .Where(o => o.Id == request.OrderId)
            .Select(o => new OrderDetailsDto {
                Id = o.Id,
                CustomerName = o.Customer.Name,
                Items = o.Items.Select(i => new OrderItemDto(i.Name, i.Price))
            })
            .FirstOrDefaultAsync(ct);
    }
}

// Pipeline Behavior - Validation
public class ValidationBehavior&lt;TRequest, TResponse&gt; 
    : IPipelineBehavior&lt;TRequest, TResponse&gt;
    where TRequest : IRequest&lt;TResponse&gt; {
    private readonly IEnumerable&lt;IValidator&lt;TRequest&gt;&gt; _validators;
    
    public async Task&lt;TResponse&gt; Handle(TRequest request,
        RequestHandlerDelegate&lt;TResponse&gt; next, CancellationToken ct) {
        var failures = _validators
            .Select(v => v.Validate(request))
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();
        if (failures.Any())
            throw new ValidationException(failures);
        return await next();
    }
}

// Pipeline Behavior - Logging
public class LoggingBehavior&lt;TRequest, TResponse&gt; 
    : IPipelineBehavior&lt;TRequest, TResponse&gt; {
    public async Task&lt;TResponse&gt; Handle(TRequest request,
        RequestHandlerDelegate&lt;TResponse&gt; next, CancellationToken ct) {
        _logger.LogInformation("Handling {Request}", typeof(TRequest).Name);
        var sw = Stopwatch.StartNew();
        var response = await next();
        _logger.LogInformation("Handled {Request} in {Ms}ms", 
            typeof(TRequest).Name, sw.ElapsedMilliseconds);
        return response;
    }
}

// Registration
services.AddMediatR(cfg => {
    cfg.RegisterServicesFromAssembly(typeof(CreateOrderHandler).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior&lt;,&gt;), typeof(ValidationBehavior&lt;,&gt;));
    cfg.AddBehavior(typeof(IPipelineBehavior&lt;,&gt;), typeof(LoggingBehavior&lt;,&gt;));
});

// 3 Levels:
// Level 1: Same DB, different models for read/write
// Level 2: Write DB + Read Replica (or materialized views)
// Level 3: Event Store (write) + Projections (read) = Event Sourcing</div>`,
  en: `<p><strong>Separation:</strong> Commands mutate state, Queries read data. Optimize each side independently.</p>
<p><strong>Behaviors:</strong> MediatR pipeline for cross-cutting: validation, logging, caching, transactions.</p>
<p><strong>3 Levels:</strong> Same DB/different models → Read replicas → Event Sourcing + projections.</p>
<p><strong>Overkill:</strong> Simple CRUD without complex business logic. More classes without added value.</p>
<div class="code-block">// Pipeline: Validation → Logging → Handler
services.AddMediatR(cfg => {
    cfg.AddBehavior(typeof(IPipelineBehavior&lt;,&gt;), typeof(ValidationBehavior&lt;,&gt;));
});</div>`,
  tip: "Nói: 'Tôi dùng CQRS Level 1 cho hầu hết projects - tách read/write models nhưng cùng DB. Level 2-3 chỉ khi có performance/audit requirements rõ ràng.'"
},
{
  n: "Microservices vs Monolith",
  l: "expert",
  p: [{t:"Decision framework",d:"Tách khi: >3 teams cần deploy independently, scaling needs khác nhau, fault isolation. KHÔNG tách khi: team nhỏ <5, chưa hiểu domain boundaries, không có DevOps maturity"},{t:"Modular Monolith",d:"Single deployment nhưng internal modules có clear boundaries, own DbContext, communicate qua events. Dễ extract thành microservice sau khi boundaries rõ ràng"},{t:"Strangler Fig pattern",d:"Gradually migrate: route new features to new service, slowly replace old modules qua API Gateway/proxy. Không big-bang rewrite. Rollback = route lại traffic"},{t:"Inter-service communication",d:"Sync (HTTP/gRPC): simple, immediate response, tạo coupling + cascade failure risk. Async (Message Queue): decoupled, resilient, eventual consistency. Prefer async cho inter-service"}],
  q: "Khi nào nên chuyển từ Monolith sang Microservices? Modular Monolith là gì?",
  vi: `<p><strong>Decision Framework:</strong> Microservices khi: team lớn (>20 devs), cần scale independently, different tech stacks, independent deployment. Monolith khi: team nhỏ, startup phase, simple domain, shared data model.</p>
<p><strong>Modular Monolith:</strong> Middle ground - single deployment unit nhưng internal modules có clear boundaries, own data, communicate qua interfaces/events. Dễ extract thành microservice sau. Best of both worlds.</p>
<p><strong>Strangler Fig:</strong> Gradually migrate monolith → microservices. Route new features to new services, slowly replace old modules. Facade/proxy layer routes traffic. Zero big-bang rewrite risk.</p>
<p><strong>Communication:</strong> Sync (HTTP/gRPC) - simple, immediate response, creates coupling. Async (message queue) - decoupled, resilient, eventual consistency. Prefer async cho inter-service, sync cho client-facing.</p>
<div class="code-block">// Modular Monolith Structure
// src/
//   Modules/
//     Orders/
//       Orders.Domain/
//       Orders.Application/
//       Orders.Infrastructure/
//       Orders.Api/          → Internal API (module boundary)
//     Inventory/
//       Inventory.Domain/
//       Inventory.Application/
//       Inventory.Infrastructure/
//     Shared/
//       Shared.Contracts/    → Shared DTOs/Events between modules

// Module Communication via Events (decoupled)
// Orders module publishes:
public record OrderCreatedEvent(int OrderId, List&lt;OrderItem&gt; Items);

// Inventory module subscribes:
public class OrderCreatedHandler : INotificationHandler&lt;OrderCreatedEvent&gt; {
    public async Task Handle(OrderCreatedEvent notification, CancellationToken ct) {
        foreach (var item in notification.Items)
            await _inventory.ReserveStockAsync(item.ProductId, item.Quantity, ct);
    }
}

// Module Registration
public static class OrdersModule {
    public static IServiceCollection AddOrdersModule(
        this IServiceCollection services, IConfiguration config) {
        services.AddScoped&lt;IOrderService, OrderService&gt;();
        services.AddDbContext&lt;OrdersDbContext&gt;(opt => 
            opt.UseNpgsql(config.GetConnectionString("Orders")));
        return services;
    }
}

// Strangler Fig Pattern
// 1. Add API Gateway/Proxy
// 2. New features → new service
// 3. Gradually route old endpoints to new services
// 4. Old monolith shrinks over time

// API Gateway routing
app.MapWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/api/orders"),
    app => app.UseReverseProxy(new { Destination = "http://orders-service" }));

// Inter-service Communication
// Sync - gRPC (internal service-to-service)
public class OrderGrpcClient {
    private readonly OrderService.OrderServiceClient _client;
    public async Task&lt;OrderDto&gt; GetOrderAsync(int id) {
        var response = await _client.GetOrderAsync(new GetOrderRequest { Id = id });
        return MapToDto(response);
    }
}

// Async - Message Queue (decoupled)
public class OrderCreatedPublisher {
    private readonly IMessageBus _bus;
    public async Task PublishAsync(Order order) {
        await _bus.PublishAsync(new OrderCreatedMessage {
            OrderId = order.Id,
            Items = order.Items.Select(i => new ItemMessage(i.ProductId, i.Qty))
        });
    }
}</div>`,
  en: `<p><strong>Decision:</strong> Microservices for large teams, independent scaling/deployment. Monolith for small teams, simple domains.</p>
<p><strong>Modular Monolith:</strong> Single deployment with clear module boundaries - easy to extract later.</p>
<p><strong>Strangler Fig:</strong> Gradual migration via proxy routing. No big-bang rewrite.</p>
<p><strong>Communication:</strong> Sync (HTTP/gRPC) for immediate needs, Async (queues) for decoupling.</p>
<div class="code-block">// Modular Monolith: modules communicate via events
public record OrderCreatedEvent(int OrderId, List&lt;OrderItem&gt; Items);
// Each module has own DbContext and clear boundaries</div>`,
  tip: "Golden rule: 'Start with Modular Monolith, extract to microservices when you have clear scaling/team boundaries.' Premature microservices = distributed monolith."
},
{
  n: "Event-Driven Architecture",
  l: "expert",
  p: [{t:"Outbox pattern",d:"Save event vào Outbox table CÙNG transaction với business data. Background worker publish. Đảm bảo: nếu business save OK → event chắc chắn được publish (at-least-once)"},{t:"Idempotency handling",d:"Consumer có thể nhận duplicate messages. Fix: store processed message IDs, check trước khi process. Idempotency key trong API requests"},{t:"Saga pattern",d:"Distributed transaction: Choreography (events trigger next step, decentralized) hoặc Orchestration (central coordinator). Compensating actions cho rollback khi step fail"},{t:"Event ordering & deduplication",d:"Message queues không guarantee order across partitions. Partition by entity ID cho ordering. Sequence numbers + processed ID tracking cho deduplication"}],
  q: "Implement Event-Driven Architecture với Outbox pattern và Saga. Làm sao đảm bảo reliability?",
  vi: `<p><strong>Outbox Pattern:</strong> Thay vì publish event trực tiếp (có thể fail sau DB commit), lưu event vào Outbox table CÙNG transaction với business data. Background process poll Outbox và publish. Đảm bảo at-least-once delivery.</p>
<p><strong>Idempotency:</strong> Vì at-least-once, consumer có thể nhận duplicate messages. Giải pháp: store processed message IDs, check trước khi process. Idempotency key trong request.</p>
<p><strong>Saga Pattern:</strong> Distributed transaction across services. Choreography (events trigger next step) hoặc Orchestration (central coordinator). Compensating actions cho rollback.</p>
<p><strong>Ordering & Dedup:</strong> Message queues không guarantee order across partitions. Dùng partition key (e.g., OrderId) cho ordering within entity. Sequence numbers cho deduplication.</p>
<div class="code-block">// Outbox Pattern
public class OrderService {
    private readonly AppDbContext _db;
    
    public async Task CreateOrderAsync(CreateOrderCommand cmd) {
        var order = new Order(cmd.CustomerId);
        
        // Save entity AND outbox message in SAME transaction
        _db.Orders.Add(order);
        _db.OutboxMessages.Add(new OutboxMessage {
            Id = Guid.NewGuid(),
            Type = nameof(OrderCreatedEvent),
            Payload = JsonSerializer.Serialize(new OrderCreatedEvent(order.Id)),
            CreatedAt = DateTime.UtcNow,
            ProcessedAt = null
        });
        
        await _db.SaveChangesAsync();  // Single transaction!
    }
}

// Outbox Publisher (Background Service)
public class OutboxPublisher : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken ct) {
        while (!ct.IsCancellationRequested) {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService&lt;AppDbContext&gt;();
            
            var messages = await db.OutboxMessages
                .Where(m => m.ProcessedAt == null)
                .OrderBy(m => m.CreatedAt)
                .Take(100)
                .ToListAsync(ct);
            
            foreach (var msg in messages) {
                await _messageBus.PublishAsync(msg.Type, msg.Payload);
                msg.ProcessedAt = DateTime.UtcNow;
            }
            await db.SaveChangesAsync(ct);
            await Task.Delay(TimeSpan.FromSeconds(1), ct);
        }
    }
}

// Idempotent Consumer
public class OrderCreatedConsumer : IConsumer&lt;OrderCreatedEvent&gt; {
    public async Task Consume(ConsumeContext&lt;OrderCreatedEvent&gt; context) {
        var messageId = context.MessageId.ToString();
        
        // Check if already processed
        if (await _db.ProcessedMessages.AnyAsync(m => m.Id == messageId))
            return;  // Already handled - skip
        
        // Process
        await _inventoryService.ReserveStockAsync(context.Message);
        
        // Mark as processed
        _db.ProcessedMessages.Add(new ProcessedMessage { 
            Id = messageId, ProcessedAt = DateTime.UtcNow 
        });
        await _db.SaveChangesAsync();
    }
}

// Saga - Order Processing (Orchestration)
public class OrderSaga {
    public async Task&lt;Result&gt; ExecuteAsync(CreateOrderCommand cmd) {
        // Step 1: Reserve inventory
        var reserved = await _inventory.ReserveAsync(cmd.Items);
        if (!reserved.IsSuccess) return Result.Failure("Out of stock");
        
        // Step 2: Process payment
        var payment = await _payment.ChargeAsync(cmd.Amount);
        if (!payment.IsSuccess) {
            // Compensate Step 1
            await _inventory.ReleaseAsync(cmd.Items);
            return Result.Failure("Payment failed");
        }
        
        // Step 3: Create order
        var order = await _orders.CreateAsync(cmd);
        if (!order.IsSuccess) {
            // Compensate Steps 1 & 2
            await _payment.RefundAsync(payment.TransactionId);
            await _inventory.ReleaseAsync(cmd.Items);
            return Result.Failure("Order creation failed");
        }
        
        return Result.Success();
    }
}</div>`,
  en: `<p><strong>Outbox:</strong> Save events in same transaction as business data. Background publisher ensures delivery.</p>
<p><strong>Idempotency:</strong> Track processed message IDs to handle duplicates from at-least-once delivery.</p>
<p><strong>Saga:</strong> Distributed transactions via choreography or orchestration with compensating actions.</p>
<p><strong>Ordering:</strong> Partition by entity ID for ordering guarantees. Sequence numbers for deduplication.</p>
<div class="code-block">// Outbox: save event + business data in ONE transaction
_db.Orders.Add(order);
_db.OutboxMessages.Add(new OutboxMessage { ... });
await _db.SaveChangesAsync(); // Atomic!</div>`,
  tip: "Outbox pattern là MUST cho event-driven systems. Nói: 'Không bao giờ publish event ngoài transaction - dual-write problem sẽ gây data inconsistency.'"
},
{
  n: "DDD Aggregates & Value Objects",
  l: "expert",
  p: [{t:"Aggregate Root boundaries",d:"Cluster of entities = 1 unit cho data changes. Root = entry point duy nhất. External chỉ reference Root. Boundary dựa trên transactional consistency requirements"},{t:"Value Objects vs Entities",d:"Value Objects: immutable, no identity, equality by value (Money, Address, Email). Entities: có identity (Id), mutable, equality by Id. Record types perfect cho Value Objects"},{t:"Domain Events",d:"Something happened in domain (OrderPlaced, PaymentReceived). Raised by aggregate, handled by other aggregates/services. Decouple side effects từ core logic"},{t:"Invariant enforcement",d:"Aggregate đảm bảo business rules LUÔN đúng. Validate trong constructor và methods. Không expose setters — chỉ behavior methods. Rich domain model vs anemic"}],
  q: "Giải thích Aggregate Root, Value Objects và Domain Events trong DDD. Làm sao xác định Aggregate boundaries?",
  vi: `<p><strong>Aggregate Root:</strong> Cluster of entities treated as single unit for data changes. Root entity controls access - external code chỉ reference Root. Boundaries dựa trên transactional consistency - data phải consistent WITHIN aggregate, eventually consistent BETWEEN aggregates.</p>
<p><strong>Value Objects:</strong> Immutable, no identity, equality by value. Ví dụ: Money, Address, Email. Encapsulate validation logic. Dùng record trong C# cho value equality tự động.</p>
<p><strong>Domain Events:</strong> Something happened in domain. Raised by aggregate, handled by other aggregates/services. Decouple side effects từ core logic. OrderPlaced, PaymentReceived, InventoryReserved.</p>
<p><strong>Invariant Enforcement:</strong> Aggregate đảm bảo business rules luôn đúng. Validate trong constructor và methods. Không expose setters - chỉ behavior methods.</p>
<div class="code-block">// Aggregate Root
public class Order : AggregateRoot {
    public OrderId Id { get; private set; }
    public CustomerId CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public Money TotalAmount { get; private set; }
    
    private readonly List&lt;OrderLine&gt; _lines = new();
    public IReadOnlyList&lt;OrderLine&gt; Lines => _lines.AsReadOnly();
    
    // Factory method - enforces invariants at creation
    public static Order Create(CustomerId customerId) {
        var order = new Order {
            Id = OrderId.New(),
            CustomerId = customerId,
            Status = OrderStatus.Draft,
            TotalAmount = Money.Zero("USD")
        };
        order.AddDomainEvent(new OrderCreatedEvent(order.Id));
        return order;
    }
    
    // Behavior method - enforces invariants
    public Result AddLine(ProductId productId, Money price, int quantity) {
        if (Status != OrderStatus.Draft)
            return Result.Failure("Cannot modify non-draft order");
        if (quantity <= 0)
            return Result.Failure("Quantity must be positive");
        if (_lines.Count >= 50)
            return Result.Failure("Maximum 50 items per order");
        
        var line = new OrderLine(productId, price, quantity);
        _lines.Add(line);
        RecalculateTotal();
        return Result.Success();
    }
    
    public Result Confirm() {
        if (!_lines.Any())
            return Result.Failure("Cannot confirm empty order");
        Status = OrderStatus.Confirmed;
        AddDomainEvent(new OrderConfirmedEvent(Id, TotalAmount));
        return Result.Success();
    }
    
    private void RecalculateTotal() {
        TotalAmount = _lines.Aggregate(Money.Zero("USD"),
            (sum, line) => sum.Add(line.SubTotal));
    }
}

// Value Object (using record)
public record Money(decimal Amount, string Currency) {
    public static Money Zero(string currency) => new(0, currency);
    
    public Money Add(Money other) {
        if (Currency != other.Currency)
            throw new DomainException("Currency mismatch");
        return new Money(Amount + other.Amount, Currency);
    }
    
    public Money Multiply(int factor) => new(Amount * factor, Currency);
}

public record Address(string Street, string City, string ZipCode, string Country) {
    // Validation in constructor
    public Address {
        if (string.IsNullOrWhiteSpace(Street))
            throw new DomainException("Street required");
        if (string.IsNullOrWhiteSpace(ZipCode))
            throw new DomainException("ZipCode required");
    }
}

// Domain Event
public record OrderConfirmedEvent(OrderId OrderId, Money Total) : IDomainEvent;

// Base class
public abstract class AggregateRoot {
    private readonly List&lt;IDomainEvent&gt; _events = new();
    public IReadOnlyList&lt;IDomainEvent&gt; DomainEvents => _events.AsReadOnly();
    protected void AddDomainEvent(IDomainEvent evt) => _events.Add(evt);
    public void ClearDomainEvents() => _events.Clear();
}

// Dispatch events after SaveChanges
public override async Task&lt;int&gt; SaveChangesAsync(CancellationToken ct) {
    var events = ChangeTracker.Entries&lt;AggregateRoot&gt;()
        .SelectMany(e => e.Entity.DomainEvents).ToList();
    var result = await base.SaveChangesAsync(ct);
    foreach (var evt in events)
        await _mediator.Publish(evt, ct);
    return result;
}</div>`,
  en: `<p><strong>Aggregate Root:</strong> Consistency boundary - external access only through root. Transactional consistency within, eventual between.</p>
<p><strong>Value Objects:</strong> Immutable, identity-less, value equality. Encapsulate domain rules (Money, Email, Address).</p>
<p><strong>Domain Events:</strong> Decouple side effects. Raised by aggregates, dispatched after persistence.</p>
<p><strong>Invariants:</strong> Business rules enforced in aggregate methods. No public setters - only behavior.</p>
<div class="code-block">public record Money(decimal Amount, string Currency);
// Value equality: new Money(10, "USD") == new Money(10, "USD")</div>`,
  tip: "Aggregate boundary rule: 'Nếu 2 entities PHẢI consistent trong cùng transaction → same aggregate. Nếu eventual consistency OK → separate aggregates.'"
},
{
  n: "Strategy + Factory Patterns",
  l: "senior",
  p: [{t:"Strategy pattern",d:"Define family of algorithms, encapsulate each, make interchangeable. Client không biết implementation cụ thể. Dùng khi có nhiều cách xử lý cùng task (payments, discounts, notifications)"},{t:"Factory pattern",d:"Encapsulate object creation. Client request by type/key, factory return correct implementation. Kết hợp DI container cho automatic resolution"},{t:"Real-world example",d:"Payment processing: IPaymentProcessor interface, Stripe/PayPal/VNPay implementations. Factory chọn processor dựa trên payment method. Thêm mới = thêm class + register DI"},{t:"DI integration",d:"Register all strategies trong DI. Inject IEnumerable<IStrategy> hoặc dùng .NET 8 Keyed Services. Factory resolve từ container, không hard-code"}],
  q: "Implement Strategy + Factory patterns cho payment processing system thực tế?",
  vi: `<p><strong>Strategy Pattern:</strong> Define family of algorithms, encapsulate each one, make them interchangeable. Client code không cần biết implementation cụ thể. Dùng khi có nhiều cách xử lý cùng một task.</p>
<p><strong>Factory Pattern:</strong> Encapsulate object creation logic. Client request object by type/key, factory return correct implementation. Kết hợp với DI container cho automatic resolution.</p>
<p><strong>Payment Example:</strong> IPaymentProcessor interface, implementations cho Stripe/PayPal/VNPay. Factory chọn processor dựa trên payment method. Strategy cho discount calculation.</p>
<p><strong>DI Integration:</strong> Register all strategies, inject IEnumerable hoặc dùng keyed services (.NET 8). Factory resolve từ DI container.</p>
<div class="code-block">// Strategy Interface
public interface IPaymentProcessor {
    string Provider { get; }
    Task&lt;PaymentResult&gt; ProcessAsync(PaymentRequest request);
    Task&lt;RefundResult&gt; RefundAsync(string transactionId, decimal amount);
}

// Concrete Strategies
public class StripePaymentProcessor : IPaymentProcessor {
    public string Provider => "Stripe";
    private readonly StripeClient _client;
    
    public async Task&lt;PaymentResult&gt; ProcessAsync(PaymentRequest request) {
        var charge = await _client.Charges.CreateAsync(new ChargeCreateOptions {
            Amount = (long)(request.Amount * 100),
            Currency = request.Currency,
            Source = request.Token
        });
        return new PaymentResult(charge.Id, charge.Status == "succeeded");
    }
}

public class VNPayPaymentProcessor : IPaymentProcessor {
    public string Provider => "VNPay";
    public async Task&lt;PaymentResult&gt; ProcessAsync(PaymentRequest request) {
        var url = BuildVNPayUrl(request);
        return new PaymentResult(url, true) { RequiresRedirect = true };
    }
}

// Factory with DI
public interface IPaymentProcessorFactory {
    IPaymentProcessor GetProcessor(string provider);
}

public class PaymentProcessorFactory : IPaymentProcessorFactory {
    private readonly IEnumerable&lt;IPaymentProcessor&gt; _processors;
    
    public PaymentProcessorFactory(IEnumerable&lt;IPaymentProcessor&gt; processors) {
        _processors = processors;
    }
    
    public IPaymentProcessor GetProcessor(string provider) {
        return _processors.FirstOrDefault(p => 
            p.Provider.Equals(provider, StringComparison.OrdinalIgnoreCase))
            ?? throw new NotSupportedException($"Provider {provider} not supported");
    }
}

// .NET 8 Keyed Services (simpler alternative)
builder.Services.AddKeyedScoped&lt;IPaymentProcessor, StripePaymentProcessor&gt;("Stripe");
builder.Services.AddKeyedScoped&lt;IPaymentProcessor, VNPayPaymentProcessor&gt;("VNPay");

public class PaymentService {
    private readonly IServiceProvider _sp;
    public async Task&lt;PaymentResult&gt; ProcessAsync(string provider, PaymentRequest req) {
        var processor = _sp.GetRequiredKeyedService&lt;IPaymentProcessor&gt;(provider);
        return await processor.ProcessAsync(req);
    }
}

// Registration
services.AddScoped&lt;IPaymentProcessor, StripePaymentProcessor&gt;();
services.AddScoped&lt;IPaymentProcessor, VNPayPaymentProcessor&gt;();
services.AddScoped&lt;IPaymentProcessorFactory, PaymentProcessorFactory&gt;();

// Usage in Controller
[HttpPost("pay")]
public async Task&lt;IActionResult&gt; Pay(PaymentDto dto) {
    var processor = _factory.GetProcessor(dto.Provider);
    var result = await processor.ProcessAsync(new PaymentRequest {
        Amount = dto.Amount,
        Currency = "VND",
        Token = dto.Token
    });
    return result.Success ? Ok(result) : BadRequest(result.Error);
}

// Strategy for Discount Calculation
public interface IDiscountStrategy {
    decimal Calculate(Order order, Customer customer);
}
public class VIPDiscount : IDiscountStrategy {
    public decimal Calculate(Order order, Customer customer) =>
        customer.TotalSpent > 10_000_000 ? order.Total * 0.15m : 0;
}
public class SeasonalDiscount : IDiscountStrategy {
    public decimal Calculate(Order order, Customer customer) =>
        DateTime.Now.Month == 12 ? order.Total * 0.1m : 0;
}</div>`,
  en: `<p><strong>Strategy:</strong> Interchangeable algorithms behind common interface. Client doesn't know implementation.</p>
<p><strong>Factory:</strong> Encapsulate creation logic. Resolve correct implementation by key/type.</p>
<p><strong>Payment:</strong> IPaymentProcessor with Stripe/VNPay implementations. Factory selects by provider name.</p>
<p><strong>DI:</strong> Register all implementations, inject IEnumerable or use .NET 8 keyed services.</p>
<div class="code-block">var processor = _factory.GetProcessor("Stripe");
await processor.ProcessAsync(request);</div>`,
  tip: "Ví dụ payment processing rất thực tế và dễ hiểu. Mention .NET 8 keyed services như modern alternative cho factory pattern."
},
{
  n: "Decorator Pattern",
  l: "senior",
  p: [{t:"Adding behavior transparently",d:"Wrap existing implementation để thêm caching/logging/retry mà KHÔNG modify original code. Tuân thủ Open/Closed principle. Caller không biết decorator tồn tại"},{t:"Caching decorator",d:"Check cache trước khi gọi inner. Cache result sau khi gọi. Transparent cho caller. Invalidate khi data thay đổi"},{t:"Scrutor library",d:"Auto-register decorators: services.Decorate<IService, CachedService>(). Wrap existing registration. Giảm manual wiring code đáng kể"},{t:"Stacking decorators",d:"Multiple decorators wrap nhau: Logging → Caching → Retry → Actual. Order matters — outermost executes first. Mỗi decorator single responsibility"}],
  q: "Implement Decorator pattern cho caching và logging. Scrutor giúp gì?",
  vi: `<p><strong>Decorator:</strong> Wrap existing implementation để thêm behavior (caching, logging, retry, validation) mà KHÔNG modify original code. Tuân thủ Open/Closed principle.</p>
<p><strong>Caching Decorator:</strong> Wrap repository/service, check cache trước khi gọi inner implementation. Cache result sau khi gọi. Transparent cho caller.</p>
<p><strong>Scrutor:</strong> Library tự động register decorators trong DI container. Decorate&lt;TInterface, TDecorator&gt;() - wrap existing registration. Giảm manual wiring.</p>
<p><strong>Stacking:</strong> Multiple decorators wrap nhau: Logging → Caching → Retry → Actual Implementation. Order matters - outermost executes first.</p>
<div class="code-block">// Base interface and implementation
public interface IProductRepository {
    Task&lt;Product?&gt; GetByIdAsync(int id);
    Task&lt;IReadOnlyList&lt;Product&gt;&gt; GetAllAsync();
}

public class ProductRepository : IProductRepository {
    private readonly AppDbContext _db;
    public async Task&lt;Product?&gt; GetByIdAsync(int id) =>
        await _db.Products.FindAsync(id);
    public async Task&lt;IReadOnlyList&lt;Product&gt;&gt; GetAllAsync() =>
        await _db.Products.ToListAsync();
}

// Caching Decorator
public class CachedProductRepository : IProductRepository {
    private readonly IProductRepository _inner;
    private readonly IMemoryCache _cache;
    
    public CachedProductRepository(IProductRepository inner, IMemoryCache cache) {
        _inner = inner;
        _cache = cache;
    }
    
    public async Task&lt;Product?&gt; GetByIdAsync(int id) {
        return await _cache.GetOrCreateAsync($"product:{id}", async entry => {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return await _inner.GetByIdAsync(id);
        });
    }
    
    public async Task&lt;IReadOnlyList&lt;Product&gt;&gt; GetAllAsync() {
        return await _cache.GetOrCreateAsync("products:all", async entry => {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return await _inner.GetAllAsync();
        });
    }
}

// Logging Decorator
public class LoggedProductRepository : IProductRepository {
    private readonly IProductRepository _inner;
    private readonly ILogger _logger;
    
    public async Task&lt;Product?&gt; GetByIdAsync(int id) {
        _logger.LogDebug("Getting product {Id}", id);
        var sw = Stopwatch.StartNew();
        var result = await _inner.GetByIdAsync(id);
        _logger.LogDebug("Got product {Id} in {Ms}ms", id, sw.ElapsedMilliseconds);
        return result;
    }
}

// Manual registration (stacking order)
services.AddScoped&lt;ProductRepository&gt;();
services.AddScoped&lt;IProductRepository&gt;(sp => {
    var repo = sp.GetRequiredService&lt;ProductRepository&gt;();
    var cache = sp.GetRequiredService&lt;IMemoryCache&gt;();
    var logger = sp.GetRequiredService&lt;ILogger&lt;LoggedProductRepository&gt;&gt;();
    // Stack: Logging → Caching → Repository
    var cached = new CachedProductRepository(repo, cache);
    return new LoggedProductRepository(cached, logger);
});

// Scrutor - automatic decoration (much simpler!)
services.AddScoped&lt;IProductRepository, ProductRepository&gt;();
services.Decorate&lt;IProductRepository, CachedProductRepository&gt;();
services.Decorate&lt;IProductRepository, LoggedProductRepository&gt;();
// Execution order: Logging → Caching → ProductRepository

// Generic Decorator for any repository
public class CachedRepository&lt;T&gt; : IRepository&lt;T&gt; where T : class, IEntity {
    private readonly IRepository&lt;T&gt; _inner;
    private readonly IDistributedCache _cache;
    
    public async Task&lt;T?&gt; GetByIdAsync(int id) {
        var key = $"{typeof(T).Name}:{id}";
        var cached = await _cache.GetStringAsync(key);
        if (cached != null)
            return JsonSerializer.Deserialize&lt;T&gt;(cached);
        var entity = await _inner.GetByIdAsync(id);
        if (entity != null)
            await _cache.SetStringAsync(key, JsonSerializer.Serialize(entity));
        return entity;
    }
}</div>`,
  en: `<p><strong>Decorator:</strong> Add behavior (caching, logging) without modifying original code. Open/Closed principle.</p>
<p><strong>Caching:</strong> Wrap repository, check cache first, call inner on miss, cache result.</p>
<p><strong>Scrutor:</strong> Auto-register decorators in DI. services.Decorate&lt;I, D&gt;() wraps existing registration.</p>
<p><strong>Stacking:</strong> Multiple decorators wrap each other. Order matters - outermost first.</p>
<div class="code-block">services.AddScoped&lt;IProductRepository, ProductRepository&gt;();
services.Decorate&lt;IProductRepository, CachedProductRepository&gt;();
services.Decorate&lt;IProductRepository, LoggedProductRepository&gt;();</div>`,
  tip: "Decorator + Scrutor là cách elegant nhất để thêm cross-cutting concerns. Nói: 'Tôi prefer decorator over AOP vì explicit, testable, và dễ debug.'"
},
{
  n: "Repository Pattern Debate",
  l: "senior",
  p: [{t:"Repository over EF Core",d:"Pros: testability (mock repo), encapsulate queries, decorator support. Cons: EF DbContext đã là UoW+Repository, thêm layer = thêm code, leaky abstraction khi expose IQueryable"},{t:"When to use",d:"Complex domain logic, multiple data sources, need caching decorator, Clean Architecture projects, team prefers explicit boundaries"},{t:"When to skip",d:"Simple CRUD, small projects, Vertical Slice architecture. DbContext inject trực tiếp vào handlers. Generic repository chỉ wrap DbSet 1:1 = no value"},{t:"Specification pattern",d:"Middle ground: reusable query logic as objects. Composable (And/Or). Testable. Không cần full repository abstraction nhưng vẫn encapsulate query logic"}],
  q: "Repository pattern có cần thiết khi đã có EF Core không? Khi nào nên dùng/bỏ?",
  vi: `<p><strong>Pros of Repository:</strong> Abstraction cho testability (mock repository thay vì mock DbContext). Encapsulate query logic. Dễ switch ORM (hiếm khi xảy ra). Clean Architecture compliance.</p>
<p><strong>Cons:</strong> EF Core DbContext đã là Unit of Work + Repository pattern. Thêm layer = thêm code, mapping, maintenance. Leaky abstraction khi expose IQueryable. Generic repository quá generic - không capture domain intent.</p>
<p><strong>When to Use:</strong> Complex domain logic, multiple data sources, need caching decorator, team prefers explicit boundaries, Clean Architecture projects.</p>
<p><strong>When to Skip:</strong> Simple CRUD, small projects, team comfortable with EF directly, Vertical Slice architecture. DbContext inject trực tiếp vào handlers.</p>
<div class="code-block">// Approach 1: Repository Pattern
public interface IOrderRepository {
    Task&lt;Order?&gt; GetByIdWithItemsAsync(int id);
    Task&lt;IReadOnlyList&lt;Order&gt;&gt; GetPendingOrdersAsync();
    Task AddAsync(Order order);
}

public class OrderRepository : IOrderRepository {
    private readonly AppDbContext _db;
    
    public async Task&lt;Order?&gt; GetByIdWithItemsAsync(int id) =>
        await _db.Orders
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == id);
    
    public async Task&lt;IReadOnlyList&lt;Order&gt;&gt; GetPendingOrdersAsync() =>
        await _db.Orders
            .Where(o => o.Status == OrderStatus.Pending)
            .OrderBy(o => o.CreatedAt)
            .ToListAsync();
}

// Approach 2: No Repository - EF directly in handler
public class GetOrderHandler : IRequestHandler&lt;GetOrderQuery, OrderDto?&gt; {
    private readonly AppDbContext _db;  // Direct EF usage
    
    public async Task&lt;OrderDto?&gt; Handle(GetOrderQuery request, CancellationToken ct) {
        return await _db.Orders
            .Where(o => o.Id == request.OrderId)
            .Select(o => new OrderDto {
                Id = o.Id,
                Customer = o.Customer.Name,
                Total = o.Items.Sum(i => i.Price * i.Quantity)
            })
            .FirstOrDefaultAsync(ct);
    }
}

// Approach 3: Specification Pattern (middle ground)
public abstract class Specification&lt;T&gt; {
    public abstract Expression&lt;Func&lt;T, bool&gt;&gt; ToExpression();
    public bool IsSatisfiedBy(T entity) => ToExpression().Compile()(entity);
}

public class PendingOrderSpec : Specification&lt;Order&gt; {
    public override Expression&lt;Func&lt;Order, bool&gt;&gt; ToExpression() =>
        order => order.Status == OrderStatus.Pending 
              && order.CreatedAt > DateTime.UtcNow.AddDays(-30);
}

public class HighValueOrderSpec : Specification&lt;Order&gt; {
    private readonly decimal _threshold;
    public HighValueOrderSpec(decimal threshold) => _threshold = threshold;
    public override Expression&lt;Func&lt;Order, bool&gt;&gt; ToExpression() =>
        order => order.Total >= _threshold;
}

// Generic repository with specifications
public interface IRepository&lt;T&gt; where T : class {
    Task&lt;IReadOnlyList&lt;T&gt;&gt; FindAsync(Specification&lt;T&gt; spec);
    Task&lt;T?&gt; FindOneAsync(Specification&lt;T&gt; spec);
}

// Usage
var pendingOrders = await _repo.FindAsync(new PendingOrderSpec());
var vipOrders = await _repo.FindAsync(
    new PendingOrderSpec().And(new HighValueOrderSpec(1000)));

// My recommendation:
// - Complex domain → Repository with specific methods (not generic)
// - Simple CRUD → DbContext directly in handlers
// - Reusable queries → Specification pattern</div>`,
  en: `<p><strong>Pros:</strong> Testability, query encapsulation, decorator support, Clean Architecture.</p>
<p><strong>Cons:</strong> EF Core IS already UoW + Repository. Extra layer, leaky abstractions, maintenance overhead.</p>
<p><strong>Use when:</strong> Complex domain, multiple data sources, need decorators, Clean Architecture.</p>
<p><strong>Skip when:</strong> Simple CRUD, small projects, Vertical Slice architecture.</p>
<div class="code-block">// Specification pattern - reusable query logic
var orders = await _repo.FindAsync(new PendingOrderSpec());
// Combines testability with flexibility</div>`,
  tip: "Đây là câu hỏi controversial. Nói: 'Tôi pragmatic - dùng Repository cho complex domains, skip cho simple CRUD. Specification pattern là middle ground tốt.' Không dogmatic."
}
]
});
