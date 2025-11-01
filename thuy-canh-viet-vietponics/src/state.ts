import { atom } from "jotai";
import {
  atomFamily,
  atomWithRefresh,
  atomWithStorage,
  loadable,
  unwrap,
} from "jotai/utils";
import {
  Cart,
  CartItem,
  Category,
  Delivery,
  Location,
  Order,
  OrderStatus,
  Product,
  ShippingAddress,
  Station,
  UserInfo,
  ApiOrder,
  ApiOrderItem,
} from "@/types";
import { requestWithFallback, authenticate } from "@/utils/request";
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
      detail: item.detail
    },
    quantity: parseInt(item.quantity)
  };
}

// Convert ApiOrder to Order format for UI compatibility
function convertApiOrderToOrder(apiOrder: ApiOrder): Order {
  let delivery: Delivery;
  
  if (apiOrder.delivery.type === 'shipping') {
    delivery = {
      type: 'shipping',
      alias: apiOrder.delivery.alias || '',
      address: apiOrder.delivery.address,
      name: apiOrder.delivery.name,
      phone: apiOrder.delivery.phone || ''
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
    createdAt: new Date(apiOrder.created_at),
    receivedAt: new Date(apiOrder.received_at),
    items: apiOrder.items.map(convertApiOrderItemToCartItem),
    delivery,
    total: parseFloat(apiOrder.total),
    note: apiOrder.note
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
    console.warn(error);
  }
  return phone;
});

export const bannersState = atom(async () => {
  const res = await requestWithFallback<any>("/banners", []);
  return extractArray<string>(res);
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

export const productsState = atom(async (get) => {
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
    return {
      // keep original fields but normalize id/categoryId
      ...p,
      id: Number.isFinite(id) ? id : NaN,
      categoryId: Number.isFinite(categoryId) ? categoryId : NaN,
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

export const flashSaleProductsState = atom((get) => get(productsState));

export const recommendedProductsState = atom((get) => get(productsState));

export const productState = atomFamily((id: number) =>
  atom(async (get) => {
    const products = await get(productsState);
    return products.find((product) => product.id === id);
  })
);

export const cartState = atom<Cart>([]);

export const selectedCartItemIdsState = atom<number[]>([]);

export const cartTotalState = atom((get) => {
  const items = get(cartState);
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

export const ordersState = atomFamily((status: OrderStatus) =>
  atomWithRefresh(async () => {
    try {
      // Try to fetch from API first
      const res = await requestWithFallback<any>("/orders", []);
      const apiOrders = extractArray<ApiOrder>(res);
      
      // Convert API orders to UI-compatible format
      const convertedOrders = apiOrders.map(convertApiOrderToOrder);
      
      // Filter by status
      return convertedOrders.filter(order => order.status === status);
    } catch (error) {
      console.warn("Failed to fetch orders from API, falling back to mock data:", error);
      
      // Fallback to mock data
      const res = await requestWithFallback<any>("/orders", []);
      const allMockOrders = extractArray<Order>(res);
      return allMockOrders.filter(order => order.status === status);
    }
  })
);

export const deliveryModeState = atomWithStorage<Delivery["type"]>(
  CONFIG.STORAGE_KEYS.DELIVERY,
  "shipping"
);
