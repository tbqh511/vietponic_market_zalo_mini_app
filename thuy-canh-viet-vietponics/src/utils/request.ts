import { getConfig } from "./template";

const API_URL = getConfig((config) => config.template.apiUrl);

const mockUrls = import.meta.glob<{ default: string }>("../mock/*.json", {
  query: "url",
  eager: true,
});

export async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  // Normalize base URL and path to avoid double slashes
  const normalizeBase = (u?: string | null) => (u ? u.replace(/\/+$/, "") : u);
  const ensureLeading = (p: string) => (p.startsWith("/") ? p : `/${p}`);

  const normalizedBase = normalizeBase(API_URL);
  const safePath = ensureLeading(path);

  const url = normalizedBase
    ? `${normalizedBase}${safePath}`
    : mockUrls[`../mock${safePath}.json`]?.default;

  if (!normalizedBase) {
    // keep a small delay to emulate network latency for mocks
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(url as string, { ...options, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      const err = new Error("Request timed out after 15s");
      (err as any).status = 503;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  // Validate response and parse JSON when appropriate.
  const contentType = response.headers.get("content-type") || "";
  const clone = response.clone();
  const bodyText = await clone.text();

  // Conditional debug logging. Enable by setting localStorage.DEBUG_API = '1' in the runtime
  // or when running on localhost.
  try {
    const isLocalhost = typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname);
    const debugFlag = typeof window !== "undefined" && localStorage.getItem("DEBUG_API") === "1";
    const DEBUG = isLocalhost || debugFlag;
    // if (DEBUG) {
    //   console.warn("fetch response debug", {
    //     url,
    //     status: response.status,
    //     ok: response.ok,
    //     contentType,
    //     bodyPreview: bodyText.slice(0, 2000),
    //   });
    // }
  } catch (e) {
    // ignore logging errors
  }

  if (!response.ok) {
    const err = new Error(`Request failed with status ${response.status}`);
    (err as any).status = response.status;
    (err as any).body = bodyText;
    throw err;
  }

  if (contentType.includes("application/json") || contentType.includes("application/ld+json")) {
    return (await response.json()) as T;
  }

  const err = new Error(`Expected JSON response but got '${contentType}'`);
  (err as any).status = response.status;
  (err as any).body = bodyText;
  throw err;
}

export async function requestWithFallback<T>(
  path: string,
  fallbackValue: T
): Promise<T> {
  try {
    return await request<T>(path);
  } catch (error) {
    // Silent fallback: return fallbackValue without noisy debug logs
    return fallbackValue;
  }
}

export async function requestWithPost<P, T>(
  path: string,
  payload: P
): Promise<T> {
  console.log("POST request to", path, "with payload:", JSON.stringify(payload));
  return await request<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Origin": window.location.origin,
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ZaloMiniApp",
    },
    
    body: JSON.stringify(payload),
  });
}

export async function requestWithGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;
  return await request<T>(url);
}

export async function authenticate(
  accessToken: string,
  phoneToken?: string,
  profile?: { name?: string; avatar?: string }
): Promise<{
  error: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: number;
      name: string;
      email: string;
      profile: string | null;
      mobile: string | null;
      is_farm_partner: boolean;
    };
  };
}> {
  console.log("[ZaloCheckout] /authenticate - access_token gửi:", accessToken);
  // Gửi kèm name/avatar lấy từ SDK getUserInfo() (sau khi user đồng ý popup).
  // Backend ưu tiên dùng tên này để ghi xuống DB ngay, không phải đợi Graph API
  // trả tên (Graph API chỉ trả tên thật khi đã cấp scope.userInfo).
  const body: {
    access_token: string;
    phone_token?: string;
    name?: string;
    avatar?: string;
  } = { access_token: accessToken };
  if (phoneToken) body.phone_token = phoneToken;
  const zaloName = profile?.name?.trim();
  // Chỉ gửi khi là tên thật — bỏ qua các placeholder mà SDK trả khi user CHƯA
  // cấp scope.userInfo ("Khách Zalo" của app, "Người dùng Zalo"/"Zalo User" của
  // Zalo SDK), để không ghi đè giá trị rác lên DB (backend tự fallback khi thiếu).
  const PLACEHOLDER_NAMES = ["Khách Zalo", "Người dùng Zalo", "Zalo User"];
  if (zaloName && !PLACEHOLDER_NAMES.includes(zaloName)) body.name = zaloName;
  if (profile?.avatar) body.avatar = profile.avatar;
  const result = await requestWithPost<
    { access_token: string; phone_token?: string; name?: string; avatar?: string },
    {
      error: boolean;
      message: string;
      data: {
        token: string;
        user: {
          id: number;
          name: string;
          email: string;
          profile: string | null;
          mobile: string | null;
          is_farm_partner: boolean;
        };
      };
    }
  >("/authenticate", body);
  console.log("[ZaloCheckout] /authenticate - result:", result);
  return result;
}

export async function prepareOrder(orderData: {
  amount: number;
  desc: string;
  item: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
  }>;
  extradata?: any;
  method?: string;
}): Promise<{
  mac: string;
  orderData: typeof orderData;
}> {
  return await requestWithPost("/prepare-order", orderData);
}

// export async function createOrderAPI(orderData: {
//   customer_id: string;
//   items: Array<{
//     product_id: string;
//     name: string;
//     price: string;
//     quantity: string;
//     image: string;
//     detail: string;
//   }>;
//   delivery: {
//     type: "shipping" | "pickup";
//     address: string;
//     name: string;
//     phone?: string;
//     station_id?: string;
//   };
//   total: string;
//   note: string;
// }): Promise<{
//   id: string;
//   status: string;
//   payment_status: string;
//   created_at: string;
//   received_at: string;
//   total: string;
//   note: string;
//   items: any[];
//   delivery: any;
// }> {
//   try {
//     // Get JWT token from localStorage or authenticate if needed
//     //let token = localStorage.getItem("jwt_token");
    
//     //if (!token) {
//       // console.log("No JWT token found, authenticating...");
//       // // If no token, authenticate first
//       // const accessToken = await import("@/utils/zma").then(m => m.getAccessToken());
//       // console.log("Got access token:", accessToken);
//       // const authResult = await authenticate(accessToken);
//       // token = authResult.token;
//       // localStorage.setItem("jwt_token", token);
//       // console.log("Got JWT token:", token);
//     //}

//     const requestOptions = {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         //"Authorization": `Bearer ${token}`,
//       },
//       body: JSON.stringify(orderData),
//     };

//     console.log("Creating order with URL:", `${API_URL}/orders`);
//     console.log("Request options:", requestOptions);

//     return await request("/orders", requestOptions);
//   } catch (error) {
//     console.error("Failed to create order:", {
//       error: error,
//       message: error instanceof Error ? error.message : String(error),
//       status: (error as any).status,
//       body: (error as any).body,
//       url: `${API_URL}/orders`,
//       orderData: orderData
//     });
    
//     // Check if we're running on localhost - if so, show a warning but don't fail
//     const isLocalhost = typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname);
//     if (isLocalhost) {
//       console.warn("Running on localhost - order creation may fail due to CORS or backend not running locally");
//       console.warn("Order data that would be sent:", orderData);
      
//       // Return a mock successful response for development
//       return {
//         id: Date.now().toString(),
//         status: "pending",
//         payment_status: "success",
//         created_at: new Date().toISOString(),
//         received_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours later
//         total: orderData.total,
//         note: orderData.note,
//         items: orderData.items,
//         delivery: orderData.delivery,
//       };
//     }
    
//     // Re-throw error for production (no fallback)
//     throw error;
//   }
// }
