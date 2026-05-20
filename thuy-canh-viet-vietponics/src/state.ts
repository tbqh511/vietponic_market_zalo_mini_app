import { atom } from "jotai";
import {
  atomFamily,
  atomWithRefresh,
  atomWithStorage,
  loadable,
  unwrap,
} from "jotai/utils";
import {
  BackendOrderStatus,
  Cart,
  CartItem,
  Category,
  CustomerProfile,
  Delivery,
  InventoryFilters,
  InventoryStats,
  Location,
  Order,
  OrderStatus,
  Product,
  ProductUnit,
  ShippingAddress,
  ShippingService,
  Station,
  SystemUnit,
  UserInfo,
  VtpLocation,
  ApiOrder,
  ApiOrderItem,
} from "@/types";
import { requestWithFallback, request, authenticate } from "@/utils/request";
import { getAccessToken, decodeToken, decodeLocationToken } from "@/utils/zma";
import {
  getLocation,
  getPhoneNumber,
  getSetting,
  getUserInfo,
} from "zmp-sdk/apis";
import toast from "react-hot-toast";
import { calculateDistance } from "./utils/location";
import { formatDistant } from "./utils/format";
import CONFIG from "./config";

// undefined stockAvailable = không biết (mock / offline / response thiếu field) → coi như còn hàng,
// để app fallback an toàn về behaviour cũ. Chỉ disable khi backend khẳng định = 0.
export function isOutOfStock(p: Pick<Product, "stockAvailable">): boolean {
  return typeof p.stockAvailable === "number" && p.stockAvailable <= 0;
}

function normalizeUnit(raw: any): ProductUnit | undefined {
  if (!raw) return undefined;
  const label = raw.unit_label ?? raw.unitLabel ?? null;
  const sys = (raw.system_unit ?? raw.systemUnit) as SystemUnit | undefined;
  const factor = Number(raw.conversion_factor ?? raw.conversionFactor);
  if (!sys && !label && (!Number.isFinite(factor) || factor === 1)) {
    return undefined;
  }
  return {
    unitLabel: label,
    systemUnit: (sys ?? "piece") as SystemUnit,
    conversionFactor: Number.isFinite(factor) && factor > 0 ? factor : 1,
  };
}

// Helper to normalize API responses that may wrap arrays in different shapes
function extractArray<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (res.data && Array.isArray(res.data)) return res.data as T[];
  if (res.banners && Array.isArray(res.banners)) return res.banners as T[];
  if (res.categories && Array.isArray(res.categories)) return res.categories as T[];
  if (res.products && Array.isArray(res.products)) return res.products as T[];
  if (res.stations && Array.isArray(res.stations)) return res.stations as T[];
  if (res.payload && Array.isArray(res.payload)) return res.payload as T[];
  if (res.payload && Array.isArray(res.payload.data)) return res.payload.data as T[];
  // unexpected shape - return empty array silently
  return [];
}

// Convert ApiOrderItem to CartItem format for UI compatibility
function convertApiOrderItemToCartItem(item: ApiOrderItem): CartItem {
  return {
    product: {
      id: parseInt(item.product_id),
      name: item.name,
      price: parseFloat(item.price),
      image: item.image,
      category: { id: 0, name: '', image: '' }, // Placeholder
      detail: item.detail,
      unit: normalizeUnit(item),
    },
    quantity: parseInt(item.quantity)
  };
}

// Convert ApiOrder to Order format for UI compatibility
export function convertApiOrderToOrder(apiOrder: ApiOrder): Order {
  let delivery: Delivery;

  if (apiOrder.delivery.type === 'shipping') {
    const d = apiOrder.delivery;
    delivery = {
      type: 'shipping',
      alias: d.alias || '',
      address: d.address,
      name: d.name,
      phone: d.phone || '',
      province_id: d.province_id ?? undefined,
      district_id: d.district_id ?? undefined,
      ward_id: d.ward_id ?? undefined,
      province_name: d.province_name ?? undefined,
      district_name: d.district_name ?? undefined,
      ward_name: d.ward_name ?? undefined,
      vtpOrderNumber: d.vtp_order_number ?? undefined,
      vtpStatusCode: d.vtp_status_code ?? undefined,
      vtpStatusName: d.vtp_status_name ?? undefined,
      vtpLocation: d.vtp_location ?? undefined,
      vtpStatusAt: d.vtp_status_at ? new Date(d.vtp_status_at) : undefined,
      vtpIsReturning: !!d.vtp_is_returning,
    };
  } else {
    delivery = {
      type: 'pickup',
      stationId: parseInt(apiOrder.delivery.station_id || '0')
    };
  }

  return {
    id: parseInt(apiOrder.id),
    status: apiOrder.status,
    paymentStatus: apiOrder.payment_status,
    paymentMethod: apiOrder.payment_method ?? undefined,
    createdAt: new Date(apiOrder.created_at),
    receivedAt: new Date(apiOrder.received_at),
    items: apiOrder.items.map(convertApiOrderItemToCartItem),
    delivery,
    total: parseFloat(apiOrder.total),
    note: apiOrder.note,
    cancelledAt: apiOrder.cancelled_at ? new Date(apiOrder.cancelled_at) : undefined,
    cancelledBy: (apiOrder.cancelled_by as Order["cancelledBy"]) ?? undefined,
    cancellationReason: apiOrder.cancellation_reason ?? undefined,
    refundStatus: (apiOrder.refund_status as Order["refundStatus"]) ?? undefined,
    refundAmount: apiOrder.refund_amount ? parseFloat(apiOrder.refund_amount) : undefined,
    refundedAt: apiOrder.refunded_at ? new Date(apiOrder.refunded_at) : undefined,
    trackingEvents: apiOrder.tracking_events ?? undefined,
  };
}
export const userInfoKeyState = atom(0);

export const userInfoState = atom<Promise<UserInfo>>(async (get) => {
  get(userInfoKeyState);

  // Nếu người dùng đã chỉnh sửa thông tin tài khoản trước đó, sử dụng thông tin đã lưu trữ
  const savedUserInfo = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_INFO);
  // Phía tích hợp có thể thay đổi logic này thành fetch từ server
  // const savedUserInfo = await fetchUserInfo({ token: await getAccessToken() });
  if (savedUserInfo) {
    return JSON.parse(savedUserInfo);
  }

  const {
    authSetting: {
      "scope.userInfo": grantedUserInfo,
      "scope.userPhonenumber": grantedPhoneNumber,
    },
  } = await getSetting({});
  const isDev = !window.ZJSBridge;
  if (grantedUserInfo || isDev) {
    // Người dùng cho phép truy cập tên và ảnh đại diện
    const { userInfo } = await getUserInfo({});
    const phone =
      grantedPhoneNumber || isDev // Người dùng cho phép truy cập số điện thoại
        ? await get(phoneState)
        : "";
    return {
      id: userInfo.id,
      name: userInfo.name,
      avatar: userInfo.avatar,
      phone,
      email: "",
      address: "",
    };
  }
});

export const loadableUserInfoState = loadable(userInfoState);

export const phoneState = atom(async () => {
  let phone = "";
  try {
    const { token } = await getPhoneNumber({});
    // Phía tích hợp làm theo hướng dẫn tại https://mini.zalo.me/documents/api/getPhoneNumber/ để chuyển đổi token thành số điện thoại người dùng ở server.
    if (token) {
      phone = await decodeToken(token);
    }
  } catch (error) {
    console.warn("Error retrieving phone number:", error);
  }
  return phone;
});

const BANNERS_CACHE_KEY = "cache:banners.v2";

export type BannerItem = {
  image: string;
  intrinsic_width?: number;
  intrinsic_height?: number;
};

function readCachedBanners(): BannerItem[] {
  try {
    const raw = localStorage.getItem(BANNERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const bannersBaseAtom = atom<BannerItem[]>(readCachedBanners());

// SWR-style: returns cached value synchronously, refresh fires in effect.
export const bannersState = atom<BannerItem[]>((get) => get(bannersBaseAtom));

export const bannersRefresh = atom(null, async (_get, set) => {
  const res = await requestWithFallback<any>("/banners", []);
  const arr: BannerItem[] = extractArray<any>(res)
    .map((b: any): BannerItem => ({
      image:
        typeof b === "string"
          ? b
          : b?.image ?? b?.url ?? b?.src ?? b?.path ?? "",
      intrinsic_width: b?.intrinsic_width,
      intrinsic_height: b?.intrinsic_height,
    }))
    .filter((b) => typeof b.image === "string" && b.image.length > 0);
  set(bannersBaseAtom, arr);
  try {
    localStorage.setItem(BANNERS_CACHE_KEY, JSON.stringify(arr));
  } catch {
    // localStorage quota or disabled — silent
  }
});

export const tabsState = atom(["Tất cả", "Nam", "Nữ", "Trẻ em"]);

export const selectedTabIndexState = atom(0);

export const categoriesState = atom(async () => {
  const res = await requestWithFallback<any>("/categories", []);
  return extractArray<Category>(res);
});

export const categoriesStateUpwrapped = unwrap(
  categoriesState,
  (prev) => prev ?? []
);

// Tất cả sản phẩm (kể cả hết hàng) — chỉ dùng cho cart lookup fresh stock của item
// đã add từ trước, hoặc khi truy cập product detail trực tiếp qua URL/share.
// Mọi list UI phải dùng `productsState` (đã filter).
export const allProductsState = atom(async (get) => {
  const categories = await get(categoriesState);
  const res = await requestWithFallback<any>("/products", []);
  // Extract and normalize product fields (coerce ids to numbers) to avoid type mismatch
  const productsRaw = extractArray<any>(res);
  const products = productsRaw.map((p: any) => {
    // Accept multiple possible field names from backend (categoryId, category_id, catId, cat_id)
    const rawId = p.id ?? p._id;
    const rawCategory =
      p.categoryId ?? p.category_id ?? p.catId ?? p.cat_id ?? p.category;
    const id = Number(rawId);
    const categoryId = Number(rawCategory);
    const rawStock =
      p.stockAvailable ?? p.stock_available ?? p.available ?? p.stock;
    const stockNum = rawStock === undefined || rawStock === null ? undefined : Number(rawStock);
    return {
      // keep original fields but normalize id/categoryId
      ...p,
      id: Number.isFinite(id) ? id : NaN,
      categoryId: Number.isFinite(categoryId) ? categoryId : NaN,
      unit: normalizeUnit(p),
      stockAvailable: typeof stockNum === "number" && Number.isFinite(stockNum) ? stockNum : undefined,
    } as Product & { categoryId: number };
  });

  // Dev-only: warn if some products couldn't be normalized (helps detect unexpected field names)
  try {
    const isLocal = typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname);
    const debugFlag = typeof window !== "undefined" && localStorage.getItem("DEBUG_API") === "1";
    if (isLocal || debugFlag) {
      const bad = products.filter((p) => Number.isNaN(p.categoryId) || Number.isNaN(p.id));
      if (bad.length) {
        // show a small sample (max 5) to avoid spamming logs
        console.warn("productsState: some products have invalid id/categoryId after normalization", bad.slice(0, 5));
      }
    }
  } catch (e) {
    /* ignore in non-browser environments */
  }
  return products.map((product) => ({
    ...product,
    category: categories.find((category) => category.id === product.categoryId)!,
  }));
});

// Sản phẩm hiển thị cho khách: ẩn item đã hết hàng (stockAvailable === 0).
// Item có stockAvailable === undefined (mock/offline) coi như còn hàng → vẫn hiển thị.
export const productsState = atom(async (get) => {
  const all = await get(allProductsState);
  return all.filter((p) => !isOutOfStock(p));
});

export const flashSaleProductsState = atom((get) => get(productsState));

export const recommendedProductsState = atom((get) => get(productsState));

// Lookup theo id phải fall back qua `allProductsState` vì cart có thể giữ
// item nay đã hết hàng — UI cart-item cần đọc được stock fresh để show badge.
export const productState = atomFamily((id: number) =>
  atom(async (get) => {
    const products = await get(allProductsState);
    return products.find((product) => product.id === id);
  })
);

export const cartState = atom<Cart>([]);

export const selectedCartItemIdsState = atom<number[]>([]);

// Cart items lưu snapshot product cũ → đọc fresh stockAvailable từ allProductsState
// (productsState đã filter mất item hết hàng, không lookup được).
export const payableCartState = atom(async (get) => {
  const cart = get(cartState);
  const products = await get(allProductsState);
  const productMap = new Map(products.map((p) => [p.id, p]));
  return cart.filter((item) => {
    const fresh = productMap.get(item.product.id) ?? item.product;
    return !isOutOfStock(fresh);
  });
});

export const cartTotalState = atom(async (get) => {
  const items = await get(payableCartState);
  return {
    totalItems: items.length,
    totalAmount: items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    ),
  };
});

export const keywordState = atom("");

export const searchResultState = atom(async (get) => {
  const keyword = get(keywordState);
  const products = await get(productsState);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return products.filter((product) =>
    product.name.toLowerCase().includes(keyword.toLowerCase())
  );
});

export const productsByCategoryState = atomFamily((id: String) =>
  atom(async (get) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const products = await get(productsState);
    return products.filter((product) => String(product.categoryId) === id);
  })
);

export const stationsState = atom(async () => {
  let location: Location | undefined;
  try {
    const { token } = await getLocation({});
    // Phía tích hợp làm theo hướng dẫn tại https://mini.zalo.me/documents/api/getLocation/ để chuyển đổi token thành thông tin vị trí người dùng ở server.
    if (token) {
      location = await decodeLocationToken(token);
    }
  } catch (error) {
    console.warn("Failed to get user location:", error);
  }

  const res = await requestWithFallback<any>("/stations", []);
  const stations = extractArray<Station>(res);
  const stationsWithDistance = stations.map((station) => {
    // normalize possible location shapes and guard missing data
    const rawLoc: any = station.location ?? (station as any).coords ?? (station as any).latlng ?? null;
    let lat: number | undefined;
    let lng: number | undefined;
    if (rawLoc) {
      // support { lat, lng } or { latitude, longitude } or [lng, lat]
      lat = Number(rawLoc.lat ?? rawLoc.latitude ?? rawLoc[0] ?? rawLoc.latitude_deg);
      lng = Number(rawLoc.lng ?? rawLoc.longitude ?? rawLoc[1] ?? rawLoc.longitude_deg);
      if (Number.isNaN(lat)) lat = undefined;
      if (Number.isNaN(lng)) lng = undefined;
    }

    const hasLoc = typeof lat === "number" && typeof lng === "number";

    // Dev-only warn when station lacks location info
    // try {
    //   const isLocal = typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname);
    //   const debugFlag = typeof window !== "undefined" && localStorage.getItem("DEBUG_API") === "1";
    //   if (isLocal || debugFlag) {
    //     if (!hasLoc) {
    //       console.warn("stationsState: station missing/invalid location", station);
    //     }
    //   }
    // } catch (e) {
    //   /* ignore */
    // }

    const distance =
      hasLoc && location
        ? formatDistant(calculateDistance(location.lat, location.lng, lat!, lng!))
        : undefined;

    // ensure returned station has a normalized location when available
    const normalizedStation = hasLoc ? { ...station, location: { lat: lat!, lng: lng! } } : station;
    return {
      ...normalizedStation,
      distance,
    };
  });

  return stationsWithDistance;
});

export const selectedStationIndexState = atom(0);

export const selectedStationState = atom(async (get) => {
  const index = get(selectedStationIndexState);
  const stations = await get(stationsState);
  return stations[index];
});

export const shippingAddressState = atomWithStorage<
  ShippingAddress | undefined
>(CONFIG.STORAGE_KEYS.SHIPPING_ADDRESS, undefined);

export const shortcutPromptedAtom = atomWithStorage<boolean>(
  CONFIG.STORAGE_KEYS.SHORTCUT_PROMPTED,
  false
);

export const oaFollowPromptedAtom = atomWithStorage<boolean>(
  CONFIG.STORAGE_KEYS.OA_FOLLOW_PROMPTED,
  false
);



// Maps frontend tab key to the set of backend statuses it represents
const ORDER_STATUS_MAP: Record<OrderStatus, BackendOrderStatus[]> = {
  pending:   ["pending", "confirmed", "preparing"],
  shipping:  ["delivering"],
  completed: ["delivered"],
  cancelled: ["cancelled"],
};

export const ordersState = atomFamily((status: OrderStatus) =>
  atomWithRefresh(async (get) => {
    try {
      const userInfo = await get(userInfoState);
      if (!userInfo || !userInfo.id) {
        return [];
      }

      const token = localStorage.getItem("jwt_token");
      if (!token) {
        return [];
      }

      const res = await request("/orders", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const apiOrders = extractArray<ApiOrder>(res);
      const convertedOrders = apiOrders.map(convertApiOrderToOrder);

      const allowedStatuses = ORDER_STATUS_MAP[status];
      return convertedOrders.filter(order => allowedStatuses.includes(order.status));

    } catch (error) {
      return [];
    }
  })
);

export const deliveryModeState = atomWithStorage<Delivery["type"]>(
  CONFIG.STORAGE_KEYS.DELIVERY,
  "shipping"
);

export const noteState = atom("");

// Customer profile sau khi authenticate (bao gồm is_farm_partner flag)
// Persist sang localStorage để không mất sau khi refresh
export const customerProfileState = atomWithStorage<CustomerProfile | null>(
  "customer_profile",
  null
);

// Farm inventory filter state (persisted across navigation within session)
export const farmInventoryFiltersState = atom<InventoryFilters>({
  q: "",
  category_id: "all",
  stock_status: "all",
  sort: "name",
});

export const farmInventoryStatsState = atom<InventoryStats | null>(null);

// Bumped after every successful import/export to force the inventory hook to refetch.
export const farmInventoryRefreshTokenState = atom(0);

// ── Shipping ──────────────────────────────────────────────────────────────────

// Dịch vụ vận chuyển user đã chọn (sau khi estimate trả về danh sách)
export const selectedShippingServiceState = atom<ShippingService | null>(null);

// Cache tạm danh sách tỉnh/xã (v3 bỏ cấp quận/huyện)
export const vtpProvincesState = atom<VtpLocation[]>([]);
export const vtpWardsState = atom<VtpLocation[]>([]);
