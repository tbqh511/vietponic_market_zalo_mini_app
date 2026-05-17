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
export type PaymentStatus = "pending" | "success" | "failed";

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

// Customer profile trả về từ /authenticate (bao gồm is_farm_partner)
export interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  profile: string | null;
  mobile: string | null;
  is_farm_partner: boolean;
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