# Vietponics — Farm Partner Hub
## Thiết kế tái cấu trúc chức năng "Nhập/Xuất kho" → "Báo cáo real-time đối tác"

> **Tóm tắt:** Thay vì làm thêm form nhập/xuất kho nhàm chán, ta xây "Farm Partner Hub" — một dashboard real-time hiển thị cho farm partner biết Vietponics đang bán sản phẩm của họ ra sao theo từng phút. Đây là chức năng "wow" thực sự giúp giữ chân partner và tạo lợi thế cạnh tranh.

---

## 1. Triết lý thiết kế

### Vấn đề cũ
- Form nhập/xuất kho hiện tại chỉ trả lời: *"Còn bao nhiêu?"*
- Đây là kế toán, không phải kinh doanh.
- Farm không cần kế toán — họ cần biết: *Rau tôi bán có chạy không? Có ai mua chưa? Khi nào được trả tiền?*

### Triết lý mới: 4 câu hỏi farm partner thực sự quan tâm
1. **Hôm nay Vietponics bán được bao nhiêu rau của tôi?** → Live revenue
2. **Sản phẩm nào đang cháy hàng / ế?** → Sell-through rate
3. **Có ai đang đặt hàng cần rau tôi không?** → Pending orders feed
4. **Tôi được trả tiền khi nào, bao nhiêu?** → Payout tracker

---

## 2. Database Schema

### 2.1. Bảng mới: `farms`

```sql
CREATE TABLE farms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT 'slug: joiley-farm',
  name VARCHAR(255) NOT NULL,
  owner_customer_id BIGINT UNSIGNED NULL COMMENT 'FK customers.id - chủ farm đăng nhập Zalo',
  
  logo VARCHAR(500) NULL,
  cover_image VARCHAR(500) NULL,
  description TEXT NULL,
  
  address VARCHAR(500) NULL,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  
  commission_rate DECIMAL(5,4) DEFAULT 0.8500 COMMENT 'farm nhận 85%, Vietponics giữ 15%',
  payment_cycle ENUM('weekly','biweekly','monthly') DEFAULT 'weekly',
  
  is_active BOOLEAN DEFAULT TRUE,
  approved_at TIMESTAMP NULL COMMENT 'admin duyệt thì set timestamp',
  approved_by BIGINT UNSIGNED NULL COMMENT 'FK users.id (admin)',
  
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  
  INDEX idx_owner (owner_customer_id),
  INDEX idx_active (is_active, approved_at),
  FOREIGN KEY (owner_customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
```

### 2.2. Bảng nối many-to-many: `farm_product` (pivot)

```sql
CREATE TABLE farm_product (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL COMMENT 'FK zalo_products.id',
  
  cost_price DECIMAL(12,2) NOT NULL COMMENT 'giá Vietponics trả farm cho 1kg/đơn vị',
  is_primary BOOLEAN DEFAULT FALSE COMMENT 'farm chính cung cấp khi nhiều farm cùng có',
  
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  
  UNIQUE KEY uniq_farm_product (farm_id, product_id),
  INDEX idx_product (product_id),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES zalo_products(id) ON DELETE CASCADE
);
```

### 2.3. Bảng quan trọng nhất: `farm_stock_batches` (lô nhập)

Mỗi lần farm giao rau cho Vietponics = 1 batch. Đây là cách phân bổ doanh thu khi nhiều farm cùng có 1 sản phẩm.

```sql
CREATE TABLE farm_stock_batches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  
  batch_date DATE NOT NULL COMMENT 'ngày nhập kho',
  quantity_in DECIMAL(10,2) NOT NULL COMMENT 'kg hoặc đơn vị nhập vào',
  quantity_sold DECIMAL(10,2) DEFAULT 0 COMMENT 'đã trừ khi có đơn',
  quantity_remaining DECIMAL(10,2) GENERATED ALWAYS AS (quantity_in - quantity_sold) STORED,
  
  cost_price DECIMAL(12,2) NOT NULL COMMENT 'snapshot giá lúc nhập',
  expire_date DATE NULL COMMENT 'rau Đà Lạt tươi 5-7 ngày',
  
  status ENUM('active','depleted','expired','recalled') DEFAULT 'active',
  note TEXT NULL,
  
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  
  INDEX idx_farm_date (farm_id, batch_date),
  INDEX idx_product_active (product_id, status),
  INDEX idx_fefo (product_id, expire_date, status) COMMENT 'First-Expired-First-Out',
  FOREIGN KEY (farm_id) REFERENCES farms(id),
  FOREIGN KEY (product_id) REFERENCES zalo_products(id)
);
```

### 2.4. Mở rộng `zalo_order_items` (để biết item nào của batch nào)

```sql
ALTER TABLE zalo_order_items
  ADD COLUMN farm_stock_batch_id BIGINT UNSIGNED NULL AFTER product_id,
  ADD COLUMN farm_id BIGINT UNSIGNED NULL AFTER farm_stock_batch_id,
  ADD COLUMN cost_price_snapshot DECIMAL(12,2) NULL AFTER price COMMENT 'giá vốn lúc bán',
  ADD INDEX idx_farm (farm_id),
  ADD INDEX idx_batch (farm_stock_batch_id);
```

> **Logic phân bổ**: Khi 1 đơn hàng tạo, hệ thống chọn batch theo FEFO (rau gần hết hạn trước). Nếu đơn 5kg mà 1 batch chỉ còn 3kg → tự split thành 2 order_items với 2 batch khác nhau.

### 2.5. Bảng `farm_payouts` (đối soát công nợ)

```sql
CREATE TABLE farm_payouts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id BIGINT UNSIGNED NOT NULL,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  total_sold DECIMAL(12,2) DEFAULT 0 COMMENT 'tổng kg đã bán',
  gross_revenue DECIMAL(14,2) DEFAULT 0 COMMENT 'doanh thu gộp = sum(cost_price * qty)',
  adjustment DECIMAL(14,2) DEFAULT 0 COMMENT 'cộng/trừ thủ công',
  net_payout DECIMAL(14,2) DEFAULT 0 COMMENT 'số thực trả farm',
  
  status ENUM('draft','pending','paid','cancelled') DEFAULT 'draft',
  paid_at TIMESTAMP NULL,
  payment_method VARCHAR(100) NULL,
  transaction_ref VARCHAR(255) NULL,
  note TEXT NULL,
  
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  
  INDEX idx_farm_status (farm_id, status),
  INDEX idx_period (period_start, period_end),
  FOREIGN KEY (farm_id) REFERENCES farms(id)
);
```

### 2.6. Mở rộng `customers` (đánh dấu role farm partner)

```sql
ALTER TABLE customers
  ADD COLUMN role ENUM('customer','farm_partner','admin') DEFAULT 'customer' AFTER zalo_id,
  ADD COLUMN farm_partner_status ENUM('none','requested','approved','suspended') DEFAULT 'none',
  ADD INDEX idx_role (role, farm_partner_status);
```

---

## 3. Phân quyền Farm Partner

### Luồng đăng ký
```
1. Customer (Zalo user) đăng nhập Mini App như bình thường
2. Vào trang "Trở thành Farm Partner" → điền thông tin → submit
   → tạo row farms (is_active=false, approved_at=NULL)
   → customers.farm_partner_status = 'requested'
3. Admin Vietponics vào web admin Laravel duyệt
   → farms.approved_at = now(), is_active=true
   → customers.role = 'farm_partner', farm_partner_status = 'approved'
4. Lần sau Mini App phát hiện role=farm_partner → hiển thị tab "Farm Hub"
```

### Middleware Laravel: `EnsureFarmPartner`

```php
// app/Http/Middleware/EnsureFarmPartner.php
public function handle($request, Closure $next)
{
    $customer = auth('zalo')->user(); // hoặc JWT
    
    if (!$customer || $customer->role !== 'farm_partner') {
        return response()->json([
            'error' => true,
            'message' => 'Chức năng dành riêng cho Farm Partner đã duyệt'
        ], 403);
    }
    
    if ($customer->farm_partner_status !== 'approved') {
        return response()->json([
            'error' => true,
            'message' => 'Tài khoản Farm Partner chưa được duyệt hoặc đã bị tạm ngưng'
        ], 403);
    }
    
    // Gắn farm vào request để controller dùng
    $farm = \App\Models\Farm::where('owner_customer_id', $customer->id)->first();
    if (!$farm) {
        return response()->json(['error' => true, 'message' => 'Không tìm thấy farm'], 404);
    }
    $request->attributes->set('farm', $farm);
    
    return $next($request);
}
```

---

## 4. API Endpoints

Tất cả các endpoint dưới đây đặt prefix `/api/farm/` và bọc middleware `auth:zalo` + `farm.partner`.

### 4.1. GET `/api/farm/me`
Trả về thông tin farm của user đang đăng nhập.

```json
{
  "error": false,
  "data": {
    "id": 1,
    "code": "joiley-farm",
    "name": "Joiley Farm",
    "logo": "https://...",
    "address": "Đà Lạt",
    "commission_rate": 0.85,
    "payment_cycle": "weekly",
    "products_count": 12,
    "is_active": true
  }
}
```

### 4.2. GET `/api/farm/dashboard?date=2026-05-18`
Tổng quan ngày (mặc định hôm nay).

```json
{
  "error": false,
  "data": {
    "date": "2026-05-18",
    "summary": {
      "revenue_today": 2847000,
      "revenue_yesterday": 2410000,
      "change_pct": 18.13,
      "sold_qty": 47.0,
      "stocked_qty": 50.0,
      "sellthrough_rate": 0.94,
      "orders_count": 23,
      "orders_pending": 5
    },
    "ranking": {
      "rank_today": 1,
      "total_farms": 8,
      "is_top_farm": true
    },
    "ai_hint": {
      "type": "restock_suggestion",
      "message": "Xà lách lolo xanh đang cháy hàng. Nhập thêm 10kg cho ngày mai?",
      "product_id": 23
    }
  }
}
```

### 4.3. GET `/api/farm/products/today`
Danh sách sản phẩm hôm nay + tiến độ bán.

```json
{
  "error": false,
  "data": [
    {
      "product_id": 5,
      "name": "Xà lách romaine",
      "image": "https://...",
      "stocked_today": 30.0,
      "sold_today": 28.0,
      "remaining": 2.0,
      "sellthrough_pct": 93.3,
      "revenue_today": 1260000,
      "status": "good",
      "color": "green"
    },
    {
      "product_id": 8,
      "name": "Cải xoăn kale",
      "stocked_today": 15.0,
      "sold_today": 12.0,
      "remaining": 3.0,
      "sellthrough_pct": 80.0,
      "revenue_today": 840000,
      "status": "ok",
      "color": "amber"
    },
    {
      "product_id": 23,
      "name": "Xà lách lolo xanh",
      "stocked_today": 5.0,
      "sold_today": 7.0,
      "remaining": 0,
      "sellthrough_pct": 140.0,
      "revenue_today": 747000,
      "status": "sold_out",
      "color": "red"
    }
  ]
}
```

> Logic `status`:
> - `green` (≥85% bán hết): tốt
> - `amber` (50-85%): bình thường
> - `red` (<50% và còn 1 ngày): cảnh báo ế
> - `sold_out` (=100%): cháy hàng

### 4.4. GET `/api/farm/analytics?range=7d|30d|90d`
Dữ liệu cho biểu đồ.

```json
{
  "error": false,
  "data": {
    "range": "7d",
    "series": [
      {"date": "2026-05-12", "revenue": 1850000, "sold_qty": 32},
      {"date": "2026-05-13", "revenue": 2100000, "sold_qty": 38},
      ...
    ],
    "top_products": [
      {"product_id": 5, "name": "Xà lách romaine", "revenue": 8400000, "qty": 145.0},
      {"product_id": 8, "name": "Cải xoăn kale", "revenue": 6200000, "qty": 89.0}
    ],
    "comparison": {
      "this_period_revenue": 18500000,
      "last_period_revenue": 15200000,
      "growth_pct": 21.7
    }
  }
}
```

### 4.5. GET `/api/farm/orders/incoming`
Đơn hàng pending có chứa sản phẩm của farm (giúp farm chuẩn bị trước).

```json
{
  "error": false,
  "data": [
    {
      "order_id": 1234,
      "created_at": "2026-05-18T08:30:00Z",
      "customer_name": "N.V.A",
      "delivery_type": "shipping",
      "items_from_my_farm": [
        {"product_name": "Xà lách romaine", "quantity": 2}
      ],
      "total_kg": 2.0
    }
  ]
}
```

### 4.6. GET `/api/farm/payouts`
Lịch sử công nợ.

```json
{
  "error": false,
  "data": {
    "pending": {
      "period_start": "2026-05-13",
      "period_end": "2026-05-19",
      "accrued_amount": 12450000,
      "estimated_payout_date": "2026-05-20"
    },
    "history": [
      {
        "id": 45,
        "period_start": "2026-05-06",
        "period_end": "2026-05-12",
        "net_payout": 18200000,
        "status": "paid",
        "paid_at": "2026-05-13T10:00:00Z"
      }
    ]
  }
}
```

### 4.7. POST `/api/farm/stock-in` (farm tự khai báo nhập kho buổi sáng)

```json
// Request
{
  "items": [
    {"product_id": 5, "quantity": 30.0, "expire_date": "2026-05-23"},
    {"product_id": 8, "quantity": 15.0, "expire_date": "2026-05-22"}
  ]
}

// Response
{
  "error": false,
  "data": {
    "batches_created": 2,
    "message": "Đã ghi nhận nhập kho. Vietponics sẽ duyệt và đưa lên app."
  }
}
```

---

## 5. Service tính toán doanh thu farm

File: `app/Services/FarmDashboardService.php`

```php
namespace App\Services;

use App\Models\Farm;
use App\Models\ZaloOrderItem;
use App\Models\FarmStockBatch;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FarmDashboardService
{
    public function getDashboardData(Farm $farm, ?Carbon $date = null): array
    {
        $date = $date ?? today();
        $yesterday = $date->copy()->subDay();
        
        return [
            'date' => $date->toDateString(),
            'summary' => $this->getSummary($farm, $date, $yesterday),
            'ranking' => $this->getRanking($farm, $date),
            'ai_hint' => $this->getAiHint($farm, $date),
        ];
    }
    
    private function getSummary(Farm $farm, Carbon $date, Carbon $yesterday): array
    {
        // Doanh thu = sum(cost_price_snapshot * quantity) cho các order item thuộc farm
        $todayRevenue = $this->revenueForDay($farm, $date);
        $yesterdayRevenue = $this->revenueForDay($farm, $yesterday);
        
        $changePct = $yesterdayRevenue > 0
            ? round((($todayRevenue - $yesterdayRevenue) / $yesterdayRevenue) * 100, 2)
            : null;
        
        // Tổng kg nhập hôm nay (từ farm_stock_batches)
        $stockedQty = FarmStockBatch::where('farm_id', $farm->id)
            ->whereDate('batch_date', $date)
            ->sum('quantity_in');
        
        $soldQty = FarmStockBatch::where('farm_id', $farm->id)
            ->whereDate('batch_date', $date)
            ->sum('quantity_sold');
        
        $sellthroughRate = $stockedQty > 0 ? round($soldQty / $stockedQty, 4) : 0;
        
        // Số đơn hàng có chứa item của farm hôm nay
        $ordersCount = DB::table('zalo_order_items as oi')
            ->join('zalo_orders as o', 'o.id', '=', 'oi.order_id')
            ->where('oi.farm_id', $farm->id)
            ->whereDate('o.created_at', $date)
            ->distinct('oi.order_id')
            ->count('oi.order_id');
        
        $ordersPending = DB::table('zalo_order_items as oi')
            ->join('zalo_orders as o', 'o.id', '=', 'oi.order_id')
            ->where('oi.farm_id', $farm->id)
            ->whereDate('o.created_at', $date)
            ->where('o.status', 'pending')
            ->distinct('oi.order_id')
            ->count('oi.order_id');
        
        return [
            'revenue_today' => (float) $todayRevenue,
            'revenue_yesterday' => (float) $yesterdayRevenue,
            'change_pct' => $changePct,
            'sold_qty' => (float) $soldQty,
            'stocked_qty' => (float) $stockedQty,
            'sellthrough_rate' => $sellthroughRate,
            'orders_count' => $ordersCount,
            'orders_pending' => $ordersPending,
        ];
    }
    
    private function revenueForDay(Farm $farm, Carbon $date): float
    {
        return (float) DB::table('zalo_order_items as oi')
            ->join('zalo_orders as o', 'o.id', '=', 'oi.order_id')
            ->where('oi.farm_id', $farm->id)
            ->whereDate('o.created_at', $date)
            ->whereIn('o.status', ['pending', 'shipping', 'completed'])
            ->sum(DB::raw('oi.cost_price_snapshot * oi.quantity'));
    }
    
    private function getRanking(Farm $farm, Carbon $date): array
    {
        // Xếp hạng các farm theo doanh thu hôm nay
        $rankings = DB::table('zalo_order_items as oi')
            ->join('zalo_orders as o', 'o.id', '=', 'oi.order_id')
            ->whereNotNull('oi.farm_id')
            ->whereDate('o.created_at', $date)
            ->whereIn('o.status', ['pending', 'shipping', 'completed'])
            ->select('oi.farm_id', DB::raw('SUM(oi.cost_price_snapshot * oi.quantity) as revenue'))
            ->groupBy('oi.farm_id')
            ->orderByDesc('revenue')
            ->get();
        
        $rank = $rankings->search(fn($r) => $r->farm_id == $farm->id);
        
        return [
            'rank_today' => $rank !== false ? $rank + 1 : null,
            'total_farms' => $rankings->count(),
            'is_top_farm' => $rank === 0,
        ];
    }
    
    private function getAiHint(Farm $farm, Carbon $date): ?array
    {
        // Tìm sản phẩm cháy hàng (sellthrough > 95%)
        $hotProduct = FarmStockBatch::where('farm_id', $farm->id)
            ->whereDate('batch_date', $date)
            ->whereRaw('(quantity_sold / quantity_in) >= 0.95')
            ->with('product')
            ->orderByRaw('(quantity_sold / quantity_in) DESC')
            ->first();
        
        if ($hotProduct) {
            $suggestedQty = ceil($hotProduct->quantity_in * 1.3);
            return [
                'type' => 'restock_suggestion',
                'message' => "{$hotProduct->product->name} đang cháy hàng. Nhập thêm {$suggestedQty}kg cho ngày mai?",
                'product_id' => $hotProduct->product_id,
            ];
        }
        
        // Tìm sản phẩm ế (sellthrough < 30% và đã quá nửa ngày)
        if (now()->hour >= 14) {
            $coldProduct = FarmStockBatch::where('farm_id', $farm->id)
                ->whereDate('batch_date', $date)
                ->whereRaw('(quantity_sold / quantity_in) < 0.3')
                ->where('quantity_in', '>', 5)
                ->with('product')
                ->first();
            
            if ($coldProduct) {
                return [
                    'type' => 'slow_warning',
                    'message' => "{$coldProduct->product->name} bán chậm hôm nay. Vietponics sẽ chạy flash sale chiều nay.",
                    'product_id' => $coldProduct->product_id,
                ];
            }
        }
        
        return null;
    }
}
```

---

## 6. Phân bổ batch khi tạo đơn hàng (FEFO)

Sửa lại `ZaloApiController::createOrder` để khi tạo order item, tự gán `farm_stock_batch_id` và `farm_id`:

```php
// Trong vòng lặp foreach ($items as $item)
$product = $products->get($item['product_id']);
$qtyNeeded = (int) $item['quantity'];

// Lấy các batch active của sản phẩm, sắp xếp theo expire_date (FEFO)
$batches = FarmStockBatch::where('product_id', $item['product_id'])
    ->where('status', 'active')
    ->where('quantity_remaining', '>', 0)
    ->orderByRaw('IFNULL(expire_date, "9999-12-31") ASC')
    ->orderBy('batch_date', 'ASC')
    ->lockForUpdate()
    ->get();

foreach ($batches as $batch) {
    if ($qtyNeeded <= 0) break;
    
    $allocateQty = min($batch->quantity_remaining, $qtyNeeded);
    
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
    if ($batch->quantity_remaining <= 0) {
        $batch->update(['status' => 'depleted']);
    }
    
    $qtyNeeded -= $allocateQty;
}

if ($qtyNeeded > 0) {
    // Không đủ stock — tạo item không gán farm (backorder)
    ZaloOrderItem::create([
        'order_id' => $order->id,
        'product_id' => $item['product_id'],
        'name' => $product->name . ' (đặt thêm)',
        'price' => $product->price,
        'quantity' => $qtyNeeded,
    ]);
}
```

---

## 7. Cron job snapshot daily

File: `app/Console/Commands/FarmsSnapshotDaily.php`

```php
namespace App\Console\Commands;

use App\Models\Farm;
use App\Models\FarmStockBatch;
use Illuminate\Console\Command;

class FarmsSnapshotDaily extends Command
{
    protected $signature = 'farms:snapshot-daily {--date=}';
    protected $description = 'Chốt số liệu batch cuối ngày, đánh dấu expired, tạo accrual payout';
    
    public function handle()
    {
        $date = $this->option('date') ?? today()->toDateString();
        $this->info("Snapshot cho ngày {$date}...");
        
        // 1. Đánh dấu batch hết hạn
        $expired = FarmStockBatch::where('status', 'active')
            ->whereDate('expire_date', '<', $date)
            ->update(['status' => 'expired']);
        $this->info("Đã đánh dấu {$expired} batch expired");
        
        // 2. Cập nhật accrued amount cho payout đang mở của mỗi farm
        foreach (Farm::where('is_active', true)->get() as $farm) {
            $this->updateAccruedPayout($farm, $date);
        }
        
        $this->info("Snapshot xong");
    }
    
    private function updateAccruedPayout(Farm $farm, string $date)
    {
        // Logic tính period theo payment_cycle (weekly/biweekly/monthly)
        // ... tạo hoặc cập nhật farm_payouts record với status='draft'
    }
}
```

Schedule trong `app/Console/Kernel.php`:
```php
$schedule->command('farms:snapshot-daily')->dailyAt('23:30');
```

---

## 8. UI Mini App — Cấu trúc thư mục

```
src/
  pages/
    farm/
      index.tsx           # Dashboard chính (home của Farm Hub)
      analytics.tsx       # Biểu đồ 7/30/90 ngày
      orders.tsx          # Đơn đang đến
      payouts.tsx         # Công nợ
      stock-in.tsx        # Form khai báo nhập kho buổi sáng
      register.tsx        # Trang đăng ký trở thành partner
  components/
    farm/
      stat-card.tsx       # Card metric tổng quan
      product-progress.tsx # Item sản phẩm + thanh tiến độ
      ai-hint-card.tsx    # Card gợi ý AI
      revenue-chart.tsx   # Biểu đồ doanh thu (dùng recharts)
  state/
    farm.ts               # Jotai atoms cho farm data
  utils/
    farm-api.ts           # Helper gọi /api/farm/*
```

### Polling 30s với SWR (nếu chưa có, cài: `yarn add swr`)

```tsx
// src/utils/farm-api.ts
import useSWR from 'swr';
import { requestWithGet } from '@/utils/request';

const fetcher = (url: string) => requestWithGet(url);

export function useFarmDashboard() {
  return useSWR('/api/farm/dashboard', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
}

export function useFarmProductsToday() {
  return useSWR('/api/farm/products/today', fetcher, {
    refreshInterval: 30_000,
  });
}

export function useFarmOrders() {
  return useSWR('/api/farm/orders/incoming', fetcher, {
    refreshInterval: 15_000, // đơn hàng cập nhật nhanh hơn
  });
}
```

---

## 9. Lộ trình triển khai (4 tuần)

### Tuần 1: Database + Backend core
- [ ] Tạo 4 migration mới (farms, farm_product, farm_stock_batches, farm_payouts)
- [ ] Alter customers, zalo_order_items
- [ ] Tạo Model + relationships
- [ ] Seeder demo: 3 farm (Joiley, Vietponics Home, Đà Lạt Fresh)
- [ ] Middleware `EnsureFarmPartner`

### Tuần 2: API + FEFO logic
- [ ] Sửa `ZaloApiController::createOrder` thêm allocation FEFO
- [ ] `FarmDashboardService` đầy đủ
- [ ] 7 API endpoints `/api/farm/*`
- [ ] Cron `farms:snapshot-daily`
- [ ] Unit test: tính revenue, allocation FEFO

### Tuần 3: UI Mini App
- [ ] Tab "Farm Hub" trong bottom navigation (chỉ hiện khi role=farm_partner)
- [ ] 4 màn hình chính (Dashboard, Analytics, Orders, Payouts)
- [ ] Form đăng ký trở thành Farm Partner
- [ ] Polling 30s với SWR

### Tuần 4: Admin + polish
- [ ] Trang duyệt Farm Partner trong web admin Laravel
- [ ] Form admin tạo/sửa payout, đánh dấu đã trả
- [ ] Thông báo Zalo OA khi farm có batch hết hạn / sản phẩm cháy hàng
- [ ] Test end-to-end với 1 farm thật

---

## 10. Mockup UI (xem trong chat)

Dashboard chính hiển thị:
- Header farm: logo + tên + trạng thái Live
- 4 metric card (doanh thu, đã bán, đơn hàng, sellthrough)
- List sản phẩm hôm nay với thanh tiến độ màu
- AI hint card cuối trang

Đây chính là điểm khác biệt với "form nhập/xuất số liệu nhàm chán":
- Thông tin đối xứng hai chiều (farm thấy được Vietponics đang làm gì với rau của họ)
- Có cảm xúc (top farm, ranking, AI hint)
- Có hành động (xem đơn đến, đặt nhập thêm)
- Có niềm tin (công nợ minh bạch, lịch trả tiền rõ ràng)
