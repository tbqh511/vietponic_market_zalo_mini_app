export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  address: string;
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
  address: string;
  name: string;
  phone: string;
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
    } & ShippingAddress)
  | {
      type: "pickup";
      stationId: number;
    };

export type OrderStatus = "pending" | "shipping" | "completed";
export type PaymentStatus = "pending" | "success" | "failed";

export interface Order {
  id: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  receivedAt: Date;
  items: CartItem[];
  delivery: Delivery;
  total: number;
  note: string;
}

// Order interface từ API response
export interface ApiOrder {
  id: string;
  customer_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
  received_at: string;
  total: string;
  note: string;
  items: ApiOrderItem[];
  delivery: ApiDelivery;
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
}

interface CreateOrderRequest {
  customer_id: string;
  items: CreateOrderItem[];
  delivery: CreateOrderDelivery;
  total: string;
  note: string;
  created_at: string;
}

interface CreateOrderResponse {
  message: string;
  orderId: number;
}