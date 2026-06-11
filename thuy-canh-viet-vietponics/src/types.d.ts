export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  address: string;
}

export type SystemUnit = "g" | "ml" | "piece";

export interface ProductUnit {
  unitLabel?: string | null;
  systemUnit: SystemUnit;
  conversionFactor: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: Category;
  detail?: string;
  sizes?: Size[];
  colors?: Color[];
  unit?: ProductUnit;
  weight?: number;   // gam — dùng để tính phí ship
  stockAvailable?: number;   // undefined = không biết (mock/offline) → coi như còn hàng
}

export interface Category {
  id: number;
  name: string;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type Cart = CartItem[];

export interface Location {
  lat: number;
  lng: number;
}

export interface ShippingAddress {
  alias: string;
  address: string;       // chi tiết: số nhà, tên đường
  name: string;
  phone: string;
  // VTP administrative IDs — bắt buộc khi type === 'shipping'
  province_id?: number;
  district_id?: number;
  ward_id?: number;
  province_name?: string;
  district_name?: string;
  ward_name?: string;
}

export interface VtpLocation {
  id: number;
  code?: string | null;
  name: string;
  district_id?: number | null; // có trong ward response v3 — dùng cho shipping estimate
}

export interface ShippingService {
  service_code: string;
  service_name: string;
  fee: number;
  vat: number;
  total_fee: number;
  kpi_ht: string | null;   // thời gian giao cam kết từ VTP
  exchange_weight: number | null;
}

export interface Station {
  id: number;
  name: string;
  image: string;
  address: string;
  location: Location;
}

export type Delivery =
  | ({
      type: "shipping";
      vtpOrderNumber?: string;
      vtpStatusCode?: string;
      vtpStatusName?: string;
      vtpLocation?: string;
      vtpStatusAt?: Date;
      vtpIsReturning?: boolean;
    } & ShippingAddress)
  | {
      type: "pickup";
      stationId: number;
      stationName?: string;
      stationAddress?: string;
    };

export interface VtpTrackingEvent {
  status_code: number;
  status_name: string;
  location: string | null;
  note: string | null;
  employee_name: string | null;
  employee_phone: string | null;
  reason_code: string | null;
  is_returning: boolean;
  status_at: string; // ISO datetime
}

// Statuses trả về từ backend (chính xác như trong DB)
export type BackendOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled";

// Frontend tab identifiers (dùng trong URL params và ordersState atom key)
export type OrderStatus = "pending" | "shipping" | "completed" | "cancelled";
// 'cod' = đơn thu tiền khi nhận (chưa thanh toán online); backend set khi
// payment_method bắt đầu bằng 'COD'. 'pending' chỉ dùng cho đơn online chờ
// webhook /notify xác nhận. Xem ZaloApiController.php (initialPaymentStatus).
export type PaymentStatus = "cod" | "pending" | "success" | "failed";

export type RefundStatus =
  | "not_required"
  | "pending_manual"
  | "processing"
  | "refunded"
  | "failed";

export type CancelledBy = "customer" | "admin";

export interface Order {
  id: number;
  status: BackendOrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  createdAt: Date;
  receivedAt: Date;
  items: CartItem[];
  delivery: Delivery;
  total: number;
  note: string;
  cancelledAt?: Date;
  cancelledBy?: CancelledBy;
  cancellationReason?: string;
  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundedAt?: Date;
  trackingEvents?: VtpTrackingEvent[];
}

// Order interface từ API response
export interface ApiOrder {
  id: string;
  customer_id: string;
  status: BackendOrderStatus;
  payment_status: PaymentStatus;
  payment_method?: string | null;
  created_at: string;
  received_at: string;
  total: string;
  note: string;
  items: ApiOrderItem[];
  delivery: ApiDelivery;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  refund_status?: string | null;
  refund_amount?: string | null;
  refund_method?: string | null;
  refund_transaction_id?: string | null;
  refund_provider_id?: string | null;
  refunded_at?: string | null;
  refund_note?: string | null;
  tracking_events?: VtpTrackingEvent[];
}

export interface ApiOrderItem {
  id: number;
  order_id: string;
  product_id: string;
  name: string;
  price: string;
  quantity: string;
  image: string;
  detail: string;
  unit_label?: string | null;
  system_unit?: SystemUnit | null;
  conversion_factor?: string | number | null;
  system_total?: string | number | null;
}

export interface ApiDelivery {
  id: number;
  order_id: string;
  type: "shipping" | "pickup";
  alias: string | null;
  address: string;
  name: string;
  phone: string | null;
  station_id?: string;
  station_name?: string;
  station_image?: string;
  lat?: string;
  lng?: string;
  province_id?: number | null;
  district_id?: number | null;
  ward_id?: number | null;
  province_name?: string | null;
  district_name?: string | null;
  ward_name?: string | null;
  vtp_order_number?: string | null;
  vtp_order_reference?: string | null;
  vtp_status_code?: string | null;
  vtp_status_name?: string | null;
  vtp_location?: string | null;
  vtp_status_at?: string | null;
  vtp_is_returning?: boolean | number | null;
}
interface CreateOrderItem {
  product_id: string;
  name: string;
  price: string;
  quantity: string;
  image: string;
  detail: string;
}

interface CreateOrderDelivery {
  type: "shipping" | "pickup";
  address: string;
  name: string;
  phone: string;
  station_id?: string;
  province_id?: number;
  district_id?: number;
  ward_id?: number;
  province_name?: string;
  district_name?: string;
  ward_name?: string;
}

interface CreateOrderRequest {
  customer_id: string;
  items: CreateOrderItem[];
  delivery: CreateOrderDelivery;
  total: string;
  subtotal: string;
  shipping_fee: string;
  shipping_service_code?: string;
  shipping_service_name?: string;
  note: string;
  created_at: string;
}

interface CreateOrderResponse {
  message: string;
  orderId: number;
}

// ─── Voucher / mã giảm giá ────────────────────────────────────────────────
export type VoucherDiscountType = "percent" | "fixed" | "free_shipping";

export interface Voucher {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  discount_type: VoucherDiscountType;
  discount_value: number;
  max_discount_amount?: number | null;
  min_order_amount: number;
  valid_from?: string | null;
  valid_to?: string | null;
  is_public?: boolean;
  // Computed bởi backend khi GET /vouchers/available:
  usable?: boolean;
  unusable_reason?: string | null;
  preview_subtotal?: number;
  preview_shipping?: number;
  preview_total?: number;
}

// Voucher đang được áp dụng vào giỏ — số tiền đã được backend tính sẵn.
export interface AppliedVoucher {
  voucher: Voucher;
  discount_subtotal: number;  // giảm trên subtotal
  discount_shipping: number;  // giảm trên shipping (free_shipping)
}

// Customer profile trả về từ /authenticate (bao gồm is_farm_partner)
export interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  profile: string | null;
  mobile: string | null;
  is_farm_partner: boolean;
  // Trạng thái đối tác farm thô từ backend (/authenticate). Dùng để phân biệt
  // màn chặn ở guard Farm: 'requested' → "Đang chờ duyệt", 'suspended' → "tạm
  // dừng", còn lại → "khu vực dành cho đối tác". Optional vì profile cached
  // cold-start (trước B8) chưa có field — re-auth lúc mount (useInitAuth) backfill.
  farm_partner_status?: "approved" | "requested" | "suspended" | "none";
}

// Tồn kho sản phẩm (dùng trong farm dashboard)
export interface InventoryProduct {
  id: number;
  name: string;
  category: string | null;
  category_id: number | null;
  image_url: string;
  stock: number;
  stock_reserved: number;
  stock_available: number;
  reorder_point: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export type InventoryStockStatus = "all" | "low" | "out" | "in_stock";
export type InventorySort = "name" | "stock_asc" | "stock_desc" | "low_first";

export interface InventoryFilters {
  q: string;
  category_id: number | "all";
  stock_status: InventoryStockStatus;
  sort: InventorySort;
}

export interface InventoryMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface InventoryStats {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock: number;
}

export interface InventoryResponse {
  error: boolean;
  data: InventoryProduct[];
  meta: InventoryMeta;
  stats: InventoryStats;
}

// Gợi ý khai báo nhập kho buổi sáng (Stock-In)
export interface StockInSuggestion {
  product_id: number;
  name: string;
  category: string | null;
  image_url: string;
  price: number;
  cost_price: number;
  stock: number;
  avg_daily_sold: number;
  window_days: number;
  suggested_qty: number;
  sold_out_yesterday: boolean;
  shelf_life_days: number;
  suggested_expire_date: string;
}

export interface StockInMeta {
  date: string;
  window_days: number;
  suggested_total: number;
  shelf_life_days: number;
}

export interface StockInResponse {
  error: boolean;
  data: StockInSuggestion[];
  meta: StockInMeta;
}

// Biến động tồn kho
export interface StockMovement {
  id: number;
  movement_type: "import" | "export" | "adjustment" | "reserved" | "unreserved" | "return" | "damage";
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  note: string | null;
  created_at: string;
}

// ─── Farm Partner Hub (dashboard) ───────────────────────────────────────────

export interface FarmProfile {
  id: number;
  code: string;
  name: string;
  logo: string | null;
  cover_image: string | null;
  description: string | null;
  address: string | null;
  payment_cycle: "weekly" | "biweekly" | "monthly";
  // Phần farm GIỮ LẠI (vd 0.85 = farm nhận 85%). Phí Vietponics = 1 - commission_rate.
  commission_rate: number;
  approved_at: string | null;
  // Farm hiện tại là "bộ phận đóng gói" (Package Hub) — chỉ hub mới thao tác đơn.
  is_packing_hub?: boolean;
  // Vai trò người đang đăng nhập — bật/tắt UI chỉ-owner (vd nút "Phân công").
  viewer?: {
    customer_id: number;
    name: string;
    farm_role: "owner" | "staff" | null;
    is_owner: boolean;
    // Lặp lại ở cấp viewer để đọc gọn cùng chỗ với is_owner.
    is_packing_hub: boolean;
  };
}

export type FarmDashboardRange = "today" | "7d" | "30d";

export interface FarmOverview {
  range: { from: string; to: string; key: string };
  revenue: number;
  cost: number;
  profit: number;
  orders_count: number;
  items_sold: number;
  avg_order_value: number;
  top_product:
    | {
        product_id: number;
        name: string;
        qty: number;
        revenue: number;
      }
    | null;
}

// Mỗi row "Sản phẩm hôm nay" trên dashboard. Backend tính status (good/warning/danger)
// dựa trên sellthrough + remaining; FE chỉ render màu theo status.
export interface FarmProductToday {
  product_id: number;
  name: string;
  stocked: number;
  sold: number;
  remaining: number;
  revenue: number;
  sellthrough_pct: number;
  status: "good" | "warning" | "danger";
}

export interface FarmAiHint {
  type: "restock" | "flash_sale";
  product: string;
  message: string;
}

export interface FarmProductsTodayResponse {
  products: FarmProductToday[];
  hint: FarmAiHint | null;
}

// Một điểm trên biểu đồ doanh thu. bucket = 'YYYY-MM-DD' (day) hoặc 'YYYY-Www' (week).
export interface FarmRevenuePoint {
  bucket: string;
  revenue: number;
  orders: number;
  items: number;
}

// Top sản phẩm trong range (GET /farm/analytics → top_products[]).
export interface FarmTopProduct {
  product_id: number;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  orders_count: number;
}

// GET /farm/analytics?range=7d|30d|custom&bucket=day|week
export interface FarmAnalyticsResponse {
  overview: FarmOverview;
  revenue: {
    bucket: "day" | "week";
    range: string;
    series: FarmRevenuePoint[];
  };
  top_products: FarmTopProduct[];
}

// Trạng thái đóng gói của phiếu (order, farm). Khớp OrderFarmAssignment::STATUS_*.
export type PackingStatus = "unassigned" | "assigned" | "packing" | "packed";

export interface FarmIncomingOrder {
  item_id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  order_status: "pending" | "confirmed" | "preparing" | "delivering";
  order_created_at: string;
  order_total: number;
  is_pickup: boolean;
  station_name: string | null;
  // customer_name/delivery_address đã được server che một phần (bảo mật).
  customer_name: string | null;
  // SĐT đã che giữa (vd "0937***739"). null nếu đơn không có SĐT.
  customer_phone: string | null;
  delivery_address: string | null;
  // Khâu đóng gói: trạng thái phiếu + ai đang/đã đóng + có phải của mình không.
  assignment_status: PackingStatus;
  assigned_customer_id: number | null;
  // Tên người được gán/đang đóng (để hiện "Đang đóng: NV. Tuấn"). null nếu chưa ai nhận.
  assigned_customer_name: string | null;
  // Mốc thời gian đóng gói (ISO/datetime string). null nếu chưa diễn ra.
  packing_started_at: string | null;
  packed_at: string | null;
  is_mine: boolean;
  // Farm thường = xem chỉ-đọc (đơn được xử lý bởi Package Hub). Hub → false/undefined.
  read_only?: boolean;
}

// Thành viên farm có thể được gán đóng gói (GET /farm/staff).
export interface FarmStaffMember {
  id: number;
  name: string;
  farm_role: "owner" | "staff" | null;
}

// Kết quả thao tác đóng gói cấp phiếu (claim/assign/start-packing/confirm-packed).
export interface PackingActionResult {
  order_id: number;
  assignment_status: PackingStatus;
  assigned_customer_id: number | null;
  is_mine: boolean;
}

// Kết quả thao tác cấp đơn của chủ farm (confirm-order/handoff-ship).
export interface OrderActionResult {
  order_id: number;
  order_status: "pending" | "confirmed" | "preparing" | "delivering";
}

export type FarmPayoutStatus = "draft" | "pending" | "paid" | "cancelled";

export interface FarmPayout {
  id: number;
  period_start: string | null; // YYYY-MM-DD
  period_end: string | null; // YYYY-MM-DD
  total_sold: number; // tổng kg đã bán trong kỳ
  gross_revenue: number; // doanh thu gộp (giá vốn farm)
  commission_rate: number; // phần farm giữ (0..1)
  commission_amount: number; // phí Vietponics = gross * (1 - commission_rate)
  adjustment: number; // điều chỉnh (+/-) do admin
  net_payout: number; // số chốt trên DB
  net_estimated: number; // gross * commission_rate + adjustment (FE hiển thị)
  status: FarmPayoutStatus;
  expected_pay_date: string | null; // YYYY-MM-DD; null nếu đã trả/huỷ
  paid_at: string | null;
  payment_method: string | null;
  transaction_ref: string | null;
  note: string | null;
}

// Một đơn đóng góp vào payout (GET /farm/payouts/{id} → orders[]).
export interface FarmPayoutOrder {
  order_id: number;
  order_created_at: string;
  order_status: "delivering" | "delivered";
  qty: number; // kg của farm trong đơn này
  gross: number; // doanh thu gộp của farm trong đơn này
}

export interface FarmPayoutDetail {
  payout: FarmPayout;
  orders: FarmPayoutOrder[];
}