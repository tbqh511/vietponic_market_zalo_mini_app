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

  const response = await fetch(url as string, options);

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

export async function authenticate(accessToken: string): Promise<{
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    profile: string | null;
    mobile: string | null;
  };
}> {
  return await requestWithPost("/authenticate", { access_token: accessToken });
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

export async function createOrderAPI(orderData: {
  customer_id: string;
  items: Array<{
    product_id: string;
    name: string;
    price: string;
    quantity: string;
    image: string;
    detail: string;
  }>;
  delivery: {
    type: "shipping" | "pickup";
    address: string;
    name: string;
    phone?: string;
    station_id?: string;
  };
  total: string;
  note: string;
}): Promise<{
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  received_at: string;
  total: string;
  note: string;
  items: any[];
  delivery: any;
}> {
  try {
    // Get JWT token from localStorage or authenticate if needed
    //let token = localStorage.getItem("jwt_token");
    
    //if (!token) {
      // console.log("No JWT token found, authenticating...");
      // // If no token, authenticate first
      // const accessToken = await import("@/utils/zma").then(m => m.getAccessToken());
      // console.log("Got access token:", accessToken);
      // const authResult = await authenticate(accessToken);
      // token = authResult.token;
      // localStorage.setItem("jwt_token", token);
      // console.log("Got JWT token:", token);
    //}

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        //"Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    };

    console.log("Creating order with URL:", `${API_URL}/orders`);
    console.log("Request options:", requestOptions);

    return await request("/orders", requestOptions);
  } catch (error) {
    console.error("Failed to create order:", {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      status: (error as any).status,
      body: (error as any).body,
      url: `${API_URL}/orders`,
      orderData: orderData
    });
    
    // Check if we're running on localhost - if so, show a warning but don't fail
    const isLocalhost = typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname);
    if (isLocalhost) {
      console.warn("Running on localhost - order creation may fail due to CORS or backend not running locally");
      console.warn("Order data that would be sent:", orderData);
      
      // Return a mock successful response for development
      return {
        id: Date.now().toString(),
        status: "pending",
        payment_status: "success",
        created_at: new Date().toISOString(),
        received_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours later
        total: orderData.total,
        note: orderData.note,
        items: orderData.items,
        delivery: orderData.delivery,
      };
    }
    
    // Re-throw error for production (no fallback)
    throw error;
  }
}
