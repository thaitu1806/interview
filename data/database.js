window.GUIDE_DATA = window.GUIDE_DATA || [];
window.GUIDE_DATA.push({
t: "Database & EF Core",
c: "bg-4",
items: [
{
  n: "SQL Joins & Fundamentals",
  l: "junior",
  p: ["INNER JOIN vs LEFT JOIN vs CROSS JOIN", "GROUP BY with HAVING", "Subqueries vs JOINs performance", "Common SQL anti-patterns"],
  q: "Giải thích các loại JOIN trong SQL và khi nào dùng GROUP BY với HAVING?",
  vi: `<p><strong>INNER JOIN:</strong> Chỉ trả rows có match ở CẢ HAI bảng. Dùng khi cần data tồn tại ở cả hai sides.</p>
<p><strong>LEFT JOIN:</strong> Trả TẤT CẢ rows từ bảng trái + matched rows từ bảng phải (NULL nếu không match). Dùng khi cần giữ tất cả records từ bảng chính.</p>
<p><strong>CROSS JOIN:</strong> Cartesian product - mỗi row bảng A kết hợp với mỗi row bảng B. Hiếm dùng, thường cho generating combinations.</p>
<p><strong>GROUP BY + HAVING:</strong> GROUP BY gom rows theo column(s), dùng aggregate functions (COUNT, SUM, AVG). HAVING filter AFTER grouping (WHERE filter BEFORE grouping).</p>
<p><strong>Subquery vs JOIN:</strong> JOIN thường nhanh hơn vì optimizer có thể optimize. Correlated subquery chạy cho TỪNG row - O(n²). Prefer JOIN hoặc CTE.</p>
<div class="code-block">-- INNER JOIN: Orders with customer info (only orders that HAVE a customer)
SELECT o.Id, o.Total, c.Name
FROM Orders o
INNER JOIN Customers c ON o.CustomerId = c.Id;

-- LEFT JOIN: ALL customers, even those without orders
SELECT c.Name, COUNT(o.Id) as OrderCount
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
GROUP BY c.Name;
-- Customers with 0 orders will show OrderCount = 0

-- GROUP BY + HAVING
-- Find customers who spent more than 1 million
SELECT c.Name, SUM(o.Total) as TotalSpent
FROM Customers c
INNER JOIN Orders o ON c.Id = o.CustomerId
WHERE o.Status = 'Completed'        -- WHERE: filter BEFORE grouping
GROUP BY c.Name
HAVING SUM(o.Total) > 1000000;      -- HAVING: filter AFTER grouping

-- ❌ Anti-pattern: Correlated subquery (runs per row)
SELECT c.Name,
    (SELECT COUNT(*) FROM Orders WHERE CustomerId = c.Id) as OrderCount
FROM Customers c;

-- ✅ Better: JOIN with GROUP BY
SELECT c.Name, COUNT(o.Id) as OrderCount
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
GROUP BY c.Name;

-- CTE (Common Table Expression) for readability
WITH MonthlyRevenue AS (
    SELECT 
        DATEPART(MONTH, OrderDate) as Month,
        SUM(Total) as Revenue
    FROM Orders
    WHERE YEAR(OrderDate) = 2024
    GROUP BY DATEPART(MONTH, OrderDate)
)
SELECT Month, Revenue,
    Revenue - LAG(Revenue) OVER (ORDER BY Month) as GrowthFromPrevMonth
FROM MonthlyRevenue;</div>`,
  en: `<p><strong>INNER JOIN:</strong> Only matching rows from both tables.</p>
<p><strong>LEFT JOIN:</strong> All rows from left table + matches from right (NULL if no match).</p>
<p><strong>GROUP BY + HAVING:</strong> GROUP BY aggregates rows, HAVING filters after grouping (WHERE filters before).</p>
<p><strong>Performance:</strong> JOINs generally outperform correlated subqueries. Use CTEs for readability.</p>
<div class="code-block">-- LEFT JOIN: keep all customers even without orders
SELECT c.Name, COUNT(o.Id) as OrderCount
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
GROUP BY c.Name;</div>`,
  tip: "Vẽ Venn diagram cho JOINs. Key: WHERE filter trước GROUP BY, HAVING filter sau. Correlated subquery = performance killer."
},
{
  n: "EF Core N+1 Problem",
  l: "senior",
  p: ["What is N+1 and how to detect", "Fix with Include (Eager Loading)", "Fix with Projection (Select)", "SplitQuery for large includes"],
  q: "N+1 problem trong EF Core là gì? Các cách fix và trade-offs?",
  vi: `<p><strong>N+1 Problem:</strong> Load 1 query cho parent entities, rồi N queries cho mỗi child entity khi access navigation property. Ví dụ: 1 query lấy 100 orders + 100 queries lấy items cho mỗi order = 101 queries thay vì 1-2.</p>
<p><strong>Detect:</strong> Enable EF Core logging, look for repeated similar queries. Tools: MiniProfiler, EF Core query tags. Warning: QuerySplittingBehavior log.</p>
<p><strong>Include (Eager Loading):</strong> .Include(o => o.Items) - load related data trong cùng query (JOIN). Simple nhưng có thể tạo cartesian explosion với multiple includes.</p>
<p><strong>Projection:</strong> .Select() chỉ lấy fields cần thiết - best performance, no tracking overhead. Recommended cho read-only scenarios.</p>
<p><strong>SplitQuery:</strong> Thay vì 1 big JOIN, tách thành multiple queries. Tránh cartesian explosion nhưng multiple round-trips.</p>
<div class="code-block">// ⚠️ N+1 Problem
var orders = await _db.Orders.ToListAsync();  // 1 query
foreach (var order in orders) {
    // Each access triggers a NEW query! (Lazy Loading)
    var items = order.Items;  // N queries (one per order)
    Console.WriteLine($"Order {order.Id}: {items.Count} items");
}
// Total: 1 + N queries = 101 queries for 100 orders!

// ✅ Fix 1: Eager Loading with Include
var orders = await _db.Orders
    .Include(o => o.Items)           // JOIN in single query
    .Include(o => o.Customer)
    .Where(o => o.Status == OrderStatus.Active)
    .ToListAsync();
// SQL: SELECT ... FROM Orders JOIN OrderItems JOIN Customers

// ⚠️ Cartesian explosion with multiple collection includes
var orders = await _db.Orders
    .Include(o => o.Items)       // 10 items per order
    .Include(o => o.Payments)    // 3 payments per order
    .ToListAsync();
// Result rows: orders × 10 × 3 = 30x data duplication!

// ✅ Fix 2: SplitQuery (avoids cartesian explosion)
var orders = await _db.Orders
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .AsSplitQuery()              // Separate queries, no explosion
    .ToListAsync();
// Query 1: SELECT * FROM Orders
// Query 2: SELECT * FROM OrderItems WHERE OrderId IN (...)
// Query 3: SELECT * FROM Payments WHERE OrderId IN (...)

// ✅ Fix 3: Projection (BEST for read-only)
var orderDtos = await _db.Orders
    .Where(o => o.Status == OrderStatus.Active)
    .Select(o => new OrderDto {
        Id = o.Id,
        CustomerName = o.Customer.Name,
        ItemCount = o.Items.Count,
        Total = o.Items.Sum(i => i.Price * i.Quantity),
        TopItems = o.Items
            .OrderByDescending(i => i.Price)
            .Take(3)
            .Select(i => new ItemDto { Name = i.Name, Price = i.Price })
            .ToList()
    })
    .ToListAsync();
// Single optimized SQL query, only needed columns, no tracking

// Detection: Enable sensitive logging
builder.Services.AddDbContext&lt;AppDbContext&gt;(options => {
    options.UseSqlServer(connectionString)
        .LogTo(Console.WriteLine, LogLevel.Information)
        .EnableSensitiveDataLogging();  // Shows parameter values
});

// Global SplitQuery configuration
options.UseSqlServer(conn, o => o.UseQuerySplittingBehavior(
    QuerySplittingBehavior.SplitQuery));</div>`,
  en: `<p><strong>N+1:</strong> 1 query for parents + N queries for each child's navigation property = 101 queries for 100 records.</p>
<p><strong>Include:</strong> Eager load with JOIN. Simple but risks cartesian explosion with multiple collections.</p>
<p><strong>Projection:</strong> Select only needed fields. Best performance, no tracking overhead.</p>
<p><strong>SplitQuery:</strong> Multiple separate queries instead of one big JOIN. Avoids cartesian explosion.</p>
<div class="code-block">// Best: Projection
var dtos = await _db.Orders.Select(o => new OrderDto {
    Id = o.Id, Total = o.Items.Sum(i => i.Price)
}).ToListAsync();</div>`,
  tip: "Luôn check SQL output trong Development. Rule: Projection cho reads, Include cho writes (cần tracking). SplitQuery khi có multiple collection includes."
},
{
  n: "AsNoTracking & Change Tracker",
  l: "senior",
  p: ["Change Tracker states (Added, Modified, Deleted, Unchanged, Detached)", "AsNoTracking performance benefits", "When to use tracking vs no-tracking", "Bulk operations bypassing tracker"],
  q: "Change Tracker trong EF Core hoạt động thế nào? Khi nào dùng AsNoTracking?",
  vi: `<p><strong>Change Tracker States:</strong> EF Core track mọi entity loaded từ DB. States: Added (new, will INSERT), Modified (changed, will UPDATE), Deleted (will DELETE), Unchanged (tracked, no changes), Detached (not tracked).</p>
<p><strong>AsNoTracking Benefits:</strong> Không track entities = less memory, faster queries (skip snapshot creation). Entities returned là read-only (changes won't be saved). 30-50% faster cho read-only queries.</p>
<p><strong>When to Use:</strong> AsNoTracking cho read-only scenarios (API responses, reports, projections). Tracking khi cần modify và SaveChanges. AsNoTrackingWithIdentityResolution khi cần dedup nhưng không track.</p>
<p><strong>Bulk Operations:</strong> ExecuteUpdate/ExecuteDelete (.NET 7+) bypass Change Tracker entirely - execute SQL directly. Massive performance gain cho bulk operations.</p>
<div class="code-block">// Change Tracker States
var order = await _db.Orders.FindAsync(1);  // State: Unchanged
order.Status = OrderStatus.Shipped;          // State: Modified (auto-detected)
_db.Orders.Add(new Order());                 // State: Added
_db.Orders.Remove(order);                    // State: Deleted
await _db.SaveChangesAsync();                // Generates INSERT/UPDATE/DELETE SQL

// Check entity state
var entry = _db.Entry(order);
Console.WriteLine(entry.State);  // EntityState.Modified

// See what changed
foreach (var prop in entry.Properties.Where(p => p.IsModified)) {
    Console.WriteLine($"{prop.Metadata.Name}: {prop.OriginalValue} → {prop.CurrentValue}");
}

// ✅ AsNoTracking for read-only (30-50% faster)
var products = await _db.Products
    .AsNoTracking()
    .Where(p => p.IsActive)
    .ToListAsync();
// products are NOT tracked - modifying them won't save to DB

// Global NoTracking for read-heavy apps
services.AddDbContext&lt;AppDbContext&gt;(options => {
    options.UseSqlServer(conn)
        .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
});
// Then explicitly track when needed:
var order = await _db.Orders.AsTracking().FirstAsync(o => o.Id == id);

// AsNoTrackingWithIdentityResolution
// Deduplicates entities (same PK = same instance) but doesn't track changes
var orders = await _db.Orders
    .Include(o => o.Customer)
    .AsNoTrackingWithIdentityResolution()  // Same customer shared across orders
    .ToListAsync();

// ✅ Bulk Operations (.NET 7+) - bypass Change Tracker
// Delete all old orders in single SQL statement
await _db.Orders
    .Where(o => o.CreatedAt < DateTime.UtcNow.AddYears(-2))
    .ExecuteDeleteAsync();
// SQL: DELETE FROM Orders WHERE CreatedAt < @p0

// Update all prices in single SQL statement
await _db.Products
    .Where(p => p.CategoryId == categoryId)
    .ExecuteUpdateAsync(s => s
        .SetProperty(p => p.Price, p => p.Price * 1.1m)
        .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));
// SQL: UPDATE Products SET Price = Price * 1.1, UpdatedAt = @p0 WHERE CategoryId = @p1

// Performance comparison:
// Traditional (tracked): Load 10000 entities → modify → SaveChanges = slow
// Bulk: Single SQL statement = 100x faster for large datasets</div>`,
  en: `<p><strong>States:</strong> Added, Modified, Deleted, Unchanged, Detached. EF auto-detects changes on SaveChanges.</p>
<p><strong>AsNoTracking:</strong> Skip tracking for read-only queries. 30-50% faster, less memory.</p>
<p><strong>Usage:</strong> NoTracking for reads/API responses. Tracking when modifying entities.</p>
<p><strong>Bulk:</strong> ExecuteUpdate/ExecuteDelete (.NET 7+) bypass tracker - single SQL for mass operations.</p>
<div class="code-block">// Bulk update - 100x faster than load-modify-save
await _db.Products
    .Where(p => p.CategoryId == catId)
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Price, p => p.Price * 1.1m));</div>`,
  tip: "Default NoTracking globally, AsTracking() explicitly khi cần modify. ExecuteUpdate/Delete cho bulk operations - đây là game changer trong .NET 7."
},
{
  n: "Database Indexing Strategy",
  l: "expert",
  p: ["Clustered vs Non-clustered indexes", "Covering indexes (INCLUDE)", "Execution plan analysis", "Index maintenance & fragmentation"],
  q: "Giải thích indexing strategy cho SQL Server. Làm sao đọc execution plan?",
  vi: `<p><strong>Clustered Index:</strong> Determines physical order of data on disk. Mỗi table chỉ có 1 (thường là PK). Data IS the index. Range queries trên clustered key rất nhanh.</p>
<p><strong>Non-clustered:</strong> Separate structure pointing to data rows. Có thể nhiều per table. Leaf nodes chứa index key + pointer to clustered index key (hoặc RID).</p>
<p><strong>Covering Index (INCLUDE):</strong> Include thêm columns trong leaf level mà không thêm vào index key. Query chỉ cần đọc index, không cần lookup table (Key Lookup eliminated).</p>
<p><strong>Execution Plan:</strong> Đọc từ phải sang trái, trên xuống dưới. Look for: Table Scan (bad), Index Scan (ok), Index Seek (good). Key Lookup = cần covering index. High cost % = bottleneck.</p>
<div class="code-block">-- Clustered Index (usually PK - physical data order)
CREATE CLUSTERED INDEX IX_Orders_Id ON Orders(Id);
-- Data physically sorted by Id on disk

-- Non-clustered Index
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId 
ON Orders(CustomerId);
-- Separate B-tree structure, points to clustered key

-- Covering Index with INCLUDE
-- Query: SELECT OrderDate, Total FROM Orders WHERE CustomerId = @id
CREATE NONCLUSTERED INDEX IX_Orders_Customer_Cover
ON Orders(CustomerId)
INCLUDE (OrderDate, Total);
-- All needed columns in index → no Key Lookup needed!

-- Composite Index (column order matters!)
CREATE INDEX IX_Orders_Status_Date 
ON Orders(Status, OrderDate DESC);
-- Good for: WHERE Status = 'Active' ORDER BY OrderDate DESC
-- Bad for: WHERE OrderDate > '2024-01-01' (Status not filtered)

-- Filtered Index (partial index)
CREATE INDEX IX_Orders_Active 
ON Orders(CustomerId, OrderDate)
WHERE Status = 'Active';
-- Smaller index, only for active orders

-- Execution Plan Analysis
-- Look for these operators:
-- ✅ Index Seek: O(log n) - using index efficiently
-- ⚠️ Index Scan: Reading entire index - may need better index
-- ❌ Table Scan: Reading entire table - needs index!
-- ❌ Key Lookup: Found in index but needs more columns → add INCLUDE

-- Check missing indexes (SQL Server suggests)
SELECT * FROM sys.dm_db_missing_index_details;

-- Index fragmentation check
SELECT 
    OBJECT_NAME(ips.object_id) as TableName,
    i.name as IndexName,
    ips.avg_fragmentation_in_percent
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > 30;

-- Maintenance
-- < 30% fragmentation: REORGANIZE (online, lightweight)
ALTER INDEX IX_Orders_CustomerId ON Orders REORGANIZE;
-- > 30% fragmentation: REBUILD (heavier, can be online)
ALTER INDEX IX_Orders_CustomerId ON Orders REBUILD;

-- EF Core Index configuration
modelBuilder.Entity&lt;Order&gt;(entity => {
    entity.HasIndex(e => e.CustomerId);
    entity.HasIndex(e => new { e.Status, e.OrderDate })
        .HasDatabaseName("IX_Orders_Status_Date");
    entity.HasIndex(e => e.Email).IsUnique();
});</div>`,
  en: `<p><strong>Clustered:</strong> Physical data order, one per table (usually PK). Range queries are fast.</p>
<p><strong>Non-clustered:</strong> Separate B-tree structure. Multiple per table. Points to clustered key.</p>
<p><strong>Covering (INCLUDE):</strong> Include extra columns in leaf level to eliminate Key Lookups.</p>
<p><strong>Execution Plan:</strong> Read right-to-left. Seek=good, Scan=ok, Table Scan=bad, Key Lookup=needs covering index.</p>
<div class="code-block">-- Covering index eliminates Key Lookup
CREATE INDEX IX_Orders_Cover ON Orders(CustomerId)
INCLUDE (OrderDate, Total);</div>`,
  tip: "Nói: 'Tôi luôn check execution plan cho slow queries. Rule: Seek > Scan, và INCLUDE columns để eliminate Key Lookups.' Show bạn biết đọc execution plans."
},
{
  n: "Migrations & Zero-Downtime Deployment",
  l: "expert",
  p: ["Expand-Contract pattern", "Backward compatible migrations", "Data migrations vs schema migrations", "Rollback strategies"],
  q: "Làm sao thực hiện database migrations mà không downtime? Expand-Contract pattern là gì?",
  vi: `<p><strong>Expand-Contract:</strong> 2-phase migration. Phase 1 (Expand): thêm new column/table, deploy code đọc/ghi cả old và new. Phase 2 (Contract): sau khi tất cả instances dùng new schema, remove old column. Không bao giờ breaking change trong 1 step.</p>
<p><strong>Backward Compatible:</strong> Mỗi migration phải compatible với BOTH old và new code versions (vì rolling deployment). Rules: chỉ ADD columns (nullable hoặc có default), không RENAME/DROP trong cùng release.</p>
<p><strong>Data vs Schema:</strong> Schema migrations (DDL) thay đổi structure. Data migrations (DML) transform existing data. Tách riêng để có thể rollback independently. Data migrations nên idempotent.</p>
<p><strong>Rollback:</strong> Mỗi migration có Down() method. Nhưng data loss possible khi rollback. Better: forward-fix (deploy fix nhanh hơn rollback). Feature flags cho safe rollout.</p>
<div class="code-block">// Expand-Contract Example: Rename column Email → EmailAddress

// Step 1: EXPAND - Add new column (backward compatible)
public partial class AddEmailAddress : Migration {
    protected override void Up(MigrationBuilder migrationBuilder) {
        // Add new column with default from old
        migrationBuilder.AddColumn&lt;string&gt;("EmailAddress", "Users", 
            nullable: true);
        // Copy data
        migrationBuilder.Sql(
            "UPDATE Users SET EmailAddress = Email WHERE EmailAddress IS NULL");
    }
}
// Deploy code v2: writes to BOTH Email and EmailAddress, reads from EmailAddress

// Step 2: CONTRACT - Remove old column (after all instances updated)
public partial class RemoveOldEmail : Migration {
    protected override void Up(MigrationBuilder migrationBuilder) {
        migrationBuilder.DropColumn("Email", "Users");
        migrationBuilder.AlterColumn&lt;string&gt;("EmailAddress", "Users",
            nullable: false);
    }
}

// Backward Compatible Rules:
// ✅ Safe: Add nullable column, Add table, Add index (CONCURRENTLY)
// ❌ Unsafe: Drop column, Rename column, Change type, Add NOT NULL without default

// Safe column addition
public partial class AddPhoneNumber : Migration {
    protected override void Up(MigrationBuilder migrationBuilder) {
        migrationBuilder.AddColumn&lt;string&gt;("PhoneNumber", "Customers",
            nullable: true,           // Nullable = backward compatible
            defaultValue: null);
    }
    protected override void Down(MigrationBuilder migrationBuilder) {
        migrationBuilder.DropColumn("PhoneNumber", "Customers");
    }
}

// Large table migration without locking
// PostgreSQL: CREATE INDEX CONCURRENTLY
// SQL Server: CREATE INDEX ... WITH (ONLINE = ON)
migrationBuilder.Sql(@"
    CREATE INDEX CONCURRENTLY IX_Orders_Date 
    ON Orders(OrderDate);
");

// Data migration (separate from schema)
public class DataMigration_BackfillFullName : Migration {
    protected override void Up(MigrationBuilder migrationBuilder) {
        // Batch processing to avoid long locks
        migrationBuilder.Sql(@"
            DECLARE @BatchSize INT = 10000;
            WHILE EXISTS (SELECT 1 FROM Users WHERE FullName IS NULL)
            BEGIN
                UPDATE TOP (@BatchSize) Users 
                SET FullName = FirstName + ' ' + LastName
                WHERE FullName IS NULL;
            END
        ");
    }
}

// CI/CD Pipeline for migrations
// 1. Run migrations BEFORE deploying new code
// 2. New code must work with BOTH old and new schema
// 3. After all instances updated, run cleanup migration
// 
// Timeline:
// T0: Schema expand (add column)
// T1: Deploy new code (reads/writes both)
// T2: Verify all instances healthy
// T3: Schema contract (remove old column)</div>`,
  en: `<p><strong>Expand-Contract:</strong> Two-phase: add new structure → deploy compatible code → remove old structure.</p>
<p><strong>Backward Compatible:</strong> Each migration works with both old and new code. Only ADD, never DROP in same release.</p>
<p><strong>Data vs Schema:</strong> Separate DDL and DML migrations. Data migrations should be idempotent and batched.</p>
<p><strong>Rollback:</strong> Prefer forward-fix over rollback. Feature flags for safe rollout.</p>
<div class="code-block">// Expand: add new column (nullable)
// Deploy: code writes to both old + new
// Contract: remove old column after verification</div>`,
  tip: "Zero-downtime migrations = Expand-Contract + backward compatible changes. Nói: 'Tôi KHÔNG BAO GIỜ rename/drop column trong cùng release với code change.'"
},
{
  n: "Optimistic Concurrency",
  l: "senior",
  p: ["RowVersion/Timestamp mechanism", "Conflict detection in EF Core", "Conflict resolution strategies", "Pessimistic vs Optimistic locking"],
  q: "Implement Optimistic Concurrency trong EF Core. Xử lý conflicts thế nào?",
  vi: `<p><strong>RowVersion:</strong> Column tự động increment mỗi khi row được update. EF Core include RowVersion trong WHERE clause của UPDATE. Nếu row đã bị modify bởi người khác → WHERE không match → DbUpdateConcurrencyException.</p>
<p><strong>Conflict Detection:</strong> EF Core so sánh RowVersion lúc load vs lúc save. Nếu khác = someone else modified. Throw exception cho application handle.</p>
<p><strong>Resolution Strategies:</strong> (1) Last-write-wins (overwrite). (2) First-write-wins (reject). (3) Merge (combine changes). (4) User decides (show conflict UI).</p>
<p><strong>Pessimistic vs Optimistic:</strong> Pessimistic lock row trong DB (SELECT FOR UPDATE) - blocks other readers/writers. Optimistic không lock, detect conflict at save time. Optimistic tốt cho web apps (low contention), Pessimistic cho high-contention scenarios.</p>
<div class="code-block">// Entity with RowVersion
public class Product {
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    
    [Timestamp]  // SQL Server: rowversion type, auto-incremented
    public byte[] RowVersion { get; set; }
}

// Fluent API configuration
modelBuilder.Entity&lt;Product&gt;()
    .Property(p => p.RowVersion)
    .IsRowVersion();  // Configures as concurrency token

// EF Core generates:
// UPDATE Products SET Name=@p0, Price=@p1 
// WHERE Id=@p2 AND RowVersion=@p3  ← includes version check!
// If 0 rows affected → DbUpdateConcurrencyException

// Handling concurrency conflict
public async Task&lt;Result&gt; UpdateProductAsync(UpdateProductDto dto) {
    var product = await _db.Products.FindAsync(dto.Id);
    product.Name = dto.Name;
    product.Price = dto.Price;
    
    try {
        await _db.SaveChangesAsync();
        return Result.Success();
    }
    catch (DbUpdateConcurrencyException ex) {
        var entry = ex.Entries.Single();
        var dbValues = await entry.GetDatabaseValuesAsync();
        
        if (dbValues == null)
            return Result.Failure("Product was deleted by another user");
        
        // Strategy 1: Database wins (reject user's changes)
        entry.OriginalValues.SetValues(dbValues);
        return Result.Failure("Product was modified. Please refresh and try again.");
        
        // Strategy 2: Client wins (overwrite)
        // entry.OriginalValues.SetValues(dbValues);
        // await _db.SaveChangesAsync();  // Retry with new RowVersion
        
        // Strategy 3: Merge
        // var dbProduct = (Product)dbValues.ToObject();
        // Merge logic: keep user's Name but DB's Price, etc.
    }
}

// Retry pattern for optimistic concurrency
public async Task&lt;Result&gt; UpdateWithRetryAsync(int id, Action&lt;Product&gt; update) {
    for (int attempt = 0; attempt < 3; attempt++) {
        try {
            var product = await _db.Products.FindAsync(id);
            update(product);
            await _db.SaveChangesAsync();
            return Result.Success();
        }
        catch (DbUpdateConcurrencyException) {
            _db.ChangeTracker.Clear();  // Reset tracker
            if (attempt == 2) throw;
        }
    }
    return Result.Failure("Concurrency conflict after 3 retries");
}

// Pessimistic Locking (when needed)
// SQL Server: WITH (UPDLOCK, ROWLOCK)
var product = await _db.Products
    .FromSqlRaw("SELECT * FROM Products WITH (UPDLOCK) WHERE Id = {0}", id)
    .FirstAsync();
// Row is locked until transaction commits</div>`,
  en: `<p><strong>RowVersion:</strong> Auto-incremented on each update. EF includes it in WHERE clause to detect conflicts.</p>
<p><strong>Detection:</strong> If RowVersion changed since load → DbUpdateConcurrencyException.</p>
<p><strong>Resolution:</strong> Last-write-wins, first-write-wins, merge, or user-decides strategies.</p>
<p><strong>Optimistic vs Pessimistic:</strong> Optimistic for web apps (low contention). Pessimistic (SELECT FOR UPDATE) for high contention.</p>
<div class="code-block">[Timestamp]
public byte[] RowVersion { get; set; }
// UPDATE ... WHERE Id=@id AND RowVersion=@version</div>`,
  tip: "Optimistic concurrency cho 99% web apps (low contention). Pessimistic chỉ khi PHẢI guarantee exclusive access (inventory decrement, financial transactions)."
}
]
});
