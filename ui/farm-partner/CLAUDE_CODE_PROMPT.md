# Prompt Claude Code: Farm Partner Hub cho Vietponics

> Copy nguyên đoạn dưới đây paste vào Claude Code trong VS Code.

---

## CONTEXT

Tôi đang phát triển Vietponics - một Zalo Mini App marketplace bán rau thủy canh + Laravel backend. Tôi cần xây dựng "Farm Partner Hub" - chức năng báo cáo real-time cho các farm đối tác (như Joiley Farm) biết Vietponics đang bán rau của họ ra sao theo từng phút.

### Stack hiện tại
- Backend: Laravel (PHP), JWT auth qua `tymon/jwt-auth`, package `socialiteproviders/zalo`
- Frontend: Zalo Mini App (TypeScript + React + Jotai), thư mục `thuy-canh-viet-vietponics/`
- DB: MySQL, đã có các bảng: `customers`, `zalo_products`, `zalo_categories`, `zalo_orders`, `zalo_order_items`, `zalo_deliveries`, `stations`
- Đã có `ZaloApiController` xử lý CRUD products + orders

### Quan hệ business
- 1 sản phẩm có thể của NHIỀU farm (m-m) — ví dụ "Xà lách romaine" có thể do Joiley Farm và Đà Lạt Fresh cùng cung cấp
- Farm partner đăng nhập như customer Zalo bình thường, admin duyệt thì mới có quyền farm
- Real-time bằng polling 30 giây qua SWR (không dùng WebSocket)
- Phân bổ doanh thu theo từng batch (lô nhập) — dùng FEFO (First-Expired-First-Out)

---

## TASK 1: Tạo migrations

Tạo file migration trong `database/migrations/` theo thứ tự:

### 1.1. `create_farms_table.php`
```sql
- id (bigIncrements)
- code (string 50, unique) -- slug
- name (string)
- owner_customer_id (foreignId nullable, references customers.id)
- logo, cover_image, description (string nullable)
- address (string nullable), lat (decimal 10,7), lng (decimal 10,7)
- commission_rate (decimal 5,4 default 0.8500)
- payment_cycle (enum: weekly/biweekly/monthly, default weekly)
- is_active (boolean default false)
- approved_at (timestamp nullable)
- approved_by (foreignId nullable, references users.id)
- timestamps
- index: (is_active, approved_at)
```

### 1.2. `create_farm_product_table.php` (pivot)
```sql
- id
- farm_id (foreignId references farms.id onDelete cascade)
- product_id (unsignedBigInteger, references zalo_products.id onDelete cascade)
- cost_price (decimal 12,2)
- is_primary (boolean default false)
- timestamps
- unique([farm_id, product_id])
- index(product_id)
```

### 1.3. `create_farm_stock_batches_table.php`
```sql
- id
- farm_id (foreignId references farms.id)
- product_id (unsignedBigInteger, references zalo_products.id)
- batch_date (date)
- quantity_in (decimal 10,2)
- quantity_sold (decimal 10,2 default 0)
- quantity_remaining: dùng raw expression cho generated column:
  $table->decimal('quantity_remaining', 10, 2)->storedAs('quantity_in - quantity_sold');
- cost_price (decimal 12,2)
- expire_date (date nullable)
- status (enum: active/depleted/expired/recalled, default active)
- note (text nullable)
- timestamps
- index([farm_id, batch_date])
- index([product_id, status])
- index([product_id, expire_date, status]) -- cho FEFO
```

### 1.4. `create_farm_payouts_table.php`
```sql
- id
- farm_id (foreignId references farms.id)
- period_start (date), period_end (date)
- total_sold (decimal 12,2 default 0)
- gross_revenue (decimal 14,2 default 0)
- adjustment (decimal 14,2 default 0)
- net_payout (decimal 14,2 default 0)
- status (enum: draft/pending/paid/cancelled, default draft)
- paid_at (timestamp nullable)
- payment_method (string nullable), transaction_ref (string nullable)
- note (text nullable)
- timestamps
- index([farm_id, status])
- index([period_start, period_end])
```

### 1.5. `alter_zalo_order_items_add_farm_columns.php`
```sql
- thêm: farm_stock_batch_id (foreignId nullable references farm_stock_batches.id)
- thêm: farm_id (foreignId nullable references farms.id)
- thêm: cost_price_snapshot (decimal 12,2 nullable)
- index(farm_id)
- index(farm_stock_batch_id)
```

### 1.6. `alter_customers_add_role.php`
```sql
- thêm: role (enum: customer/farm_partner/admin, default customer)
- thêm: farm_partner_status (enum: none/requested/approved/suspended, default none)
- index([role, farm_partner_status])
```

---

## TASK 2: Tạo Eloquent Models

### 2.1. `app/Models/Farm.php`
- $table = 'farms'
- $fillable đầy đủ
- Relationships:
  - `owner()` → belongsTo Customer, foreign 'owner_customer_id'
  - `products()` → belongsToMany ZaloProduct qua `farm_product`, withPivot('cost_price', 'is_primary'), withTimestamps()
  - `stockBatches()` → hasMany FarmStockBatch
  - `payouts()` → hasMany FarmPayout
  - `orderItems()` → hasMany ZaloOrderItem
- Scope: `scopeActive()` filter is_active=true AND approved_at IS NOT NULL

### 2.2. `app/Models/FarmStockBatch.php`
- $table = 'farm_stock_batches'
- $fillable: farm_id, product_id, batch_date, quantity_in, quantity_sold, cost_price, expire_date, status, note
- $casts: batch_date => date, expire_date => date, quantity_in/sold/remaining => decimal:2
- Relationships:
  - `farm()` → belongsTo Farm
  - `product()` → belongsTo ZaloProduct, foreign 'product_id'
- Scope: `scopeActive()`, `scopeFefo()` orderBy expire_date ASC nulls last
- Lưu ý: quantity_remaining là generated column → KHÔNG đưa vào $fillable, chỉ đọc

### 2.3. `app/Models/FarmPayout.php`
- $fillable đầy đủ
- $casts: period_start/end => date, paid_at => datetime
- Relationship: `farm()`

### 2.4. Cập nhật `app/Models/Customer.php`
- Thêm vào $fillable: 'role', 'farm_partner_status'
- Thêm relationship: `farm()` → hasOne Farm, foreign 'owner_customer_id'
- Thêm helper: `public function isFarmPartner(): bool { return $this->role === 'farm_partner' && $this->farm_partner_status === 'approved'; }`

### 2.5. Cập nhật `app/Models/ZaloProduct.php`
- Thêm relationship: `farms()` → belongsToMany Farm qua 'farm_product', withPivot('cost_price', 'is_primary')
- Thêm: `activeBatches()` → hasMany FarmStockBatch, with constraint status='active'

### 2.6. Cập nhật `app/Models/ZaloOrderItem.php`
- Thêm vào $fillable: 'farm_stock_batch_id', 'farm_id', 'cost_price_snapshot'
- Thêm relationships: `farm()`, `batch()` → belongsTo FarmStockBatch foreign 'farm_stock_batch_id'

---

## TASK 3: Middleware `EnsureFarmPartner`

File: `app/Http/Middleware/EnsureFarmPartner.php`

```php
public function handle($request, Closure $next)
{
    $customer = auth()->user(); // JWT guard hiện tại
    
    if (!$customer || !$customer->isFarmPartner()) {
        return response()->json([
            'error' => true,
            'message' => 'Chức năng dành riêng cho Farm Partner đã duyệt'
        ], 403);
    }
    
    $farm = \App\Models\Farm::where('owner_customer_id', $customer->id)
        ->active()
        ->first();
    
    if (!$farm) {
        return response()->json([
            'error' => true,
            'message' => 'Không tìm thấy farm'
        ], 404);
    }
    
    $request->attributes->set('farm', $farm);
    return $next($request);
}
```

Đăng ký trong `app/Http/Kernel.php` với alias `'farm.partner'`.

---

## TASK 4: Service `FarmDashboardService`

File: `app/Services/FarmDashboardService.php`

Implement đầy đủ các method (xem chi tiết trong file design):
- `getDashboardData(Farm $farm, ?Carbon $date = null): array`
- `getProductsToday(Farm $farm, ?Carbon $date = null): array`
- `getAnalytics(Farm $farm, string $range = '7d'): array`
- `getIncomingOrders(Farm $farm): array`
- `getPayoutInfo(Farm $farm): array`

Quy tắc tính doanh thu: `cost_price_snapshot * quantity` từ `zalo_order_items` JOIN `zalo_orders` với status IN ('pending', 'shipping', 'completed').

AI hint logic:
- Nếu có sản phẩm sellthrough ≥ 95% → suggest restock (qty_in * 1.3)
- Nếu sau 14h và có sản phẩm sellthrough < 30% (qty_in > 5) → warning slow + suggest flash sale

---

## TASK 5: Controller `FarmHubController`

File: `app/Http/Controllers/Api/FarmHubController.php`

7 method, mỗi method ngắn gọn, gọi service:

```php
public function me(Request $request) {
    $farm = $request->attributes->get('farm');
    return response()->json([
        'error' => false,
        'data' => [
            'id' => $farm->id,
            'code' => $farm->code,
            'name' => $farm->name,
            'logo' => $farm->logo,
            'address' => $farm->address,
            'commission_rate' => (float) $farm->commission_rate,
            'payment_cycle' => $farm->payment_cycle,
            'products_count' => $farm->products()->count(),
            'is_active' => $farm->is_active,
        ]
    ]);
}

public function dashboard(Request $request, FarmDashboardService $service) {
    $farm = $request->attributes->get('farm');
    $date = $request->date ? Carbon::parse($request->date) : today();
    return response()->json([
        'error' => false,
        'data' => $service->getDashboardData($farm, $date)
    ]);
}

public function productsToday(...) { ... }
public function analytics(...) { ... }
public function incomingOrders(...) { ... }
public function payouts(...) { ... }
public function stockIn(Request $request) { ... } // POST
public function requestPartnership(Request $request) { ... } // customer xin trở thành farm partner
```

---

## TASK 6: Routes

Thêm vào `routes/api.php`:

```php
// Customer xin trở thành farm partner (không cần middleware farm.partner)
Route::middleware('auth:api')->group(function () {
    Route::post('/farm/request-partnership', [FarmHubController::class, 'requestPartnership']);
});

// Các API farm hub (cần middleware)
Route::middleware(['auth:api', 'farm.partner'])->prefix('farm')->group(function () {
    Route::get('/me', [FarmHubController::class, 'me']);
    Route::get('/dashboard', [FarmHubController::class, 'dashboard']);
    Route::get('/products/today', [FarmHubController::class, 'productsToday']);
    Route::get('/analytics', [FarmHubController::class, 'analytics']);
    Route::get('/orders/incoming', [FarmHubController::class, 'incomingOrders']);
    Route::get('/payouts', [FarmHubController::class, 'payouts']);
    Route::post('/stock-in', [FarmHubController::class, 'stockIn']);
});
```

---

## TASK 7: Sửa logic tạo order trong `ZaloApiController` để phân bổ FEFO

Trong method tạo order hiện tại, thay đoạn `foreach ($items as $item)` thành:

```php
foreach ($items as $item) {
    $product = $products->get($item['product_id']);
    $qtyNeeded = (float) $item['quantity'];
    
    $batches = FarmStockBatch::where('product_id', $item['product_id'])
        ->where('status', 'active')
        ->where('quantity_remaining', '>', 0)
        ->orderByRaw('IFNULL(expire_date, "9999-12-31") ASC')
        ->orderBy('batch_date', 'ASC')
        ->lockForUpdate()
        ->get();
    
    foreach ($batches as $batch) {
        if ($qtyNeeded <= 0) break;
        
        $allocateQty = min((float) $batch->quantity_remaining, $qtyNeeded);
        
        ZaloOrderItem::create([
            'order_id' => $order->id,
            'product_id' => $item['product_id'],
            'farm_stock_batch_id' => $batch->id,
            'farm_id' => $batch->farm_id,
            'name' => $product->name,
            'price' => $product->price,
            'cost_price_snapshot' => $batch->cost_price,
            'quantity' => $allocateQty,
            'image' => $item['image'] ?? '',
        ]);
        
        $batch->increment('quantity_sold', $allocateQty);
        $batch->refresh();
        if ($batch->quantity_remaining <= 0.01) {
            $batch->update(['status' => 'depleted']);
        }
        
        $qtyNeeded -= $allocateQty;
    }
    
    if ($qtyNeeded > 0.01) {
        // Backorder — không có batch nào đủ
        ZaloOrderItem::create([
            'order_id' => $order->id,
            'product_id' => $item['product_id'],
            'name' => $product->name . ' (đặt thêm)',
            'price' => $product->price,
            'quantity' => $qtyNeeded,
            'image' => $item['image'] ?? '',
        ]);
    }
}
```

Bọc trong DB transaction (đã có sẵn).

---

## TASK 8: Cron `farms:snapshot-daily`

File: `app/Console/Commands/FarmsSnapshotDaily.php`

```php
namespace App\Console\Commands;

use App\Models\Farm;
use App\Models\FarmStockBatch;
use App\Models\FarmPayout;
use Illuminate\Console\Command;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FarmsSnapshotDaily extends Command
{
    protected $signature = 'farms:snapshot-daily {--date=}';
    protected $description = 'Chốt số liệu daily, expire batches, tính accrued payout';
    
    public function handle()
    {
        $date = $this->option('date') 
            ? Carbon::parse($this->option('date'))
            : today();
        
        $this->info("Snapshot ngày {$date->toDateString()}");
        
        // 1. Expire batches quá hạn
        $expired = FarmStockBatch::where('status', 'active')
            ->whereNotNull('expire_date')
            ->whereDate('expire_date', '<', $date)
            ->update(['status' => 'expired']);
        $this->info("Đã expired {$expired} batch");
        
        // 2. Update accrued payout cho từng farm
        foreach (Farm::active()->get() as $farm) {
            $this->updateAccrued($farm, $date);
        }
    }
    
    private function updateAccrued(Farm $farm, Carbon $date)
    {
        // Xác định period dựa trên payment_cycle
        [$periodStart, $periodEnd] = $this->calculatePeriod($farm, $date);
        
        // Tính doanh thu accrued trong period
        $revenue = DB::table('zalo_order_items as oi')
            ->join('zalo_orders as o', 'o.id', '=', 'oi.order_id')
            ->where('oi.farm_id', $farm->id)
            ->whereBetween(DB::raw('DATE(o.created_at)'), [$periodStart, $periodEnd])
            ->whereIn('o.status', ['shipping', 'completed'])
            ->sum(DB::raw('oi.cost_price_snapshot * oi.quantity'));
        
        $totalSold = DB::table('zalo_order_items as oi')
            ->join('zalo_orders as o', 'o.id', '=', 'oi.order_id')
            ->where('oi.farm_id', $farm->id)
            ->whereBetween(DB::raw('DATE(o.created_at)'), [$periodStart, $periodEnd])
            ->whereIn('o.status', ['shipping', 'completed'])
            ->sum('oi.quantity');
        
        FarmPayout::updateOrCreate(
            [
                'farm_id' => $farm->id,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'status' => 'draft',
            ],
            [
                'gross_revenue' => $revenue,
                'total_sold' => $totalSold,
                'net_payout' => $revenue, // chưa adjustment
            ]
        );
    }
    
    private function calculatePeriod(Farm $farm, Carbon $date): array
    {
        return match ($farm->payment_cycle) {
            'weekly' => [$date->copy()->startOfWeek(), $date->copy()->endOfWeek()],
            'biweekly' => [$date->copy()->startOfWeek()->subWeek(), $date->copy()->endOfWeek()],
            'monthly' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
        };
    }
}
```

Thêm vào `app/Console/Kernel.php`:
```php
$schedule->command('farms:snapshot-daily')->dailyAt('23:30');
```

---

## TASK 9: Seeder demo

File: `database/seeders/FarmDemoSeeder.php`

Tạo 3 farm demo (Joiley Farm, Vietponics Home Farm, Đà Lạt Fresh) + gắn với 5-7 sản phẩm rau có sẵn + tạo 1-2 batch active cho mỗi farm.

---

## TASK 10: Frontend - Mini App

Tạo các file trong `thuy-canh-viet-vietponics/src/`:

### 10.1. `src/utils/farm-api.ts`
SWR hooks cho 6 endpoints (xem chi tiết trong file design).

### 10.2. `src/pages/farm/index.tsx` (Dashboard chính)
- Header farm (logo + tên + live indicator)
- Grid 2x2 metric cards (revenue, sold qty, orders, sellthrough)
- List `ProductProgress` component
- `AiHintCard` ở dưới cùng

### 10.3. `src/components/farm/stat-card.tsx`
Props: label, value, change_pct?, subtitle?
Hiển thị: muted label, large number, change indicator (xanh/đỏ + icon trending)

### 10.4. `src/components/farm/product-progress.tsx`
Props: product (id, name, stocked, sold, remaining, sellthrough_pct, status)
- Thanh dọc bên trái màu theo status (green/amber/red)
- Tên sản phẩm + "X kg / Y kg · còn Z kg"
- Bên phải: revenue + % sellthrough

### 10.5. Bottom navigation
Thêm tab "Farm Hub" (icon ti-plant hoặc 🌱 SVG), CHỈ HIỂN THỊ khi user có role='farm_partner'.

Logic check: gọi `/api/customer/me` lúc app load, lưu role vào atom, conditionally render tab.

### 10.6. `src/pages/farm/register.tsx`
Form để customer xin trở thành farm partner:
- Tên farm
- Địa chỉ
- Mô tả ngắn
- (Tùy chọn) upload logo
- Submit → POST `/api/farm/request-partnership` → show toast "Đã gửi yêu cầu, đợi Vietponics duyệt"

---

## TASK 11: Tests cơ bản

`tests/Feature/FarmHubTest.php`:
- Test middleware: customer thường không truy cập được /api/farm/me
- Test middleware: farm partner đã duyệt truy cập được
- Test allocation FEFO: tạo 2 batch (1 batch expire sớm hơn), tạo order → batch expire sớm bị trừ trước
- Test dashboard service: tính revenue đúng

---

## YÊU CẦU CODE STYLE

- Comment tiếng Việt cho các đoạn business logic phức tạp
- Bảo toàn quy ước hiện tại: `$timestamps = false` trên các bảng cũ, nhưng các bảng MỚI có timestamps
- Sử dụng strict types: `declare(strict_types=1);` ở đầu các Service
- DI qua constructor (không dùng app()->make() trong method)
- Throw exception thay vì return false khi có lỗi nghiêm trọng
- Format tiền: chỉ trả về số raw (Frontend tự format `toLocaleString('vi-VN')`)

---

## OUTPUT MONG MUỐN

Sau khi xong, tôi cần:
1. Toàn bộ migration files (chạy được `php artisan migrate`)
2. Toàn bộ Model files
3. Service + Controller + Routes
4. Cron command
5. Seeder demo (chạy được `php artisan db:seed --class=FarmDemoSeeder`)
6. Frontend pages + components Mini App
7. README mini ghi rõ các bước test thử (kèm sample curl)

Bắt đầu từ Task 1 và làm tuần tự. Sau mỗi task, dừng lại để tôi review.
