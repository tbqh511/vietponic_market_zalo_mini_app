import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { MutableRefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { UIMatch, useMatches, useNavigate } from "react-router-dom";
import {
  appliedVoucherState,
  cartState,
  cartTotalState,
  customerProfileState,
  ordersState,
  payableCartState,
  userInfoKeyState,
  userInfoState,
  productsState,
  shippingAddressState,
  selectedShippingServiceState,
  selectedStationState,
  deliveryModeState,
  noteState,
  phoneState,
  farmInventoryFiltersState,
  farmInventoryStatsState,
  farmInventoryRefreshTokenState,
  shortcutPromptedAtom,
  oaFollowPromptedAtom,
} from "@/state";
import { promptCreateShortcut, promptFollowOA } from "@/utils/zalo-prompts";
import {
  Product,
  CreateOrderRequest,
  CreateOrderResponse,
  InventoryFilters,
  InventoryProduct,
  InventoryStats,
  InventoryMeta,
  StockInSuggestion,
  StockInMeta,
  ApiOrder,
  Order,
} from "@/types";
import { getConfig } from "@/utils/template";
import { requestWithPost, request, requestWithFallback, authenticate } from "@/utils/request";
import { getAccessToken } from "@/utils/zma";
import { applyPendingReferral } from "@/utils/affiliate";
import { authorize,createOrder,events,EventName, openChat,CheckoutSDK, Payment } from "zmp-sdk/apis";
import { useAtomCallback } from "jotai/utils";

export function useRealHeight(
  element: MutableRefObject<HTMLDivElement | null>,
  defaultValue?: number
) {
  const [height, setHeight] = useState(defaultValue ?? 0);
  useLayoutEffect(() => {
    if (element.current && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        const [{ contentRect }] = entries;
        setHeight(contentRect.height);
      });
      ro.observe(element.current);
      return () => ro.disconnect();
    }
    return () => {};
  }, [element.current]);

  if (typeof ResizeObserver === "undefined") {
    return -1;
  }
  return height;
}

export function useRequestInformation() {
  const getStoredUserInfo = useAtomCallback(async (get) => {
    const userInfo = await get(userInfoState);
    return userInfo;
  });
  const setInfoKey = useSetAtom(userInfoKeyState);
  const refreshPermissions = () => setInfoKey((key) => key + 1);

  return async () => {
    const userInfo = await getStoredUserInfo();
    if (!userInfo) {
      await authorize({
        scopes: ["scope.userInfo", "scope.userPhonenumber"],
      }).then(refreshPermissions);
      return await getStoredUserInfo();
    }
    return userInfo;
  };
}

export function useAddToCart(product: Product) {
  const [cart, setCart] = useAtom(cartState);

   // prefer normalized product object from productsState when available
  const normalizedProducts = useAtomValue(productsState);
  const normalizedProduct =
    normalizedProducts.find((p) => p.id === product.id) ?? product;

  const currentCartItem = useMemo(
    () => cart.find((item) => item.product.id === normalizedProduct.id),
    [cart, normalizedProduct.id]
  );

  const addToCart = (
    quantity: number | ((oldQuantity: number) => number),
    options?: { toast: boolean }
  ) => {
    setCart((cart) => {
      const newQuantity =
        typeof quantity === "function"
          ? quantity(currentCartItem?.quantity ?? 0)
          : quantity;
      if (newQuantity <= 0) {
        if (currentCartItem) {
          cart.splice(cart.indexOf(currentCartItem), 1);
        }
      } else {
        if (currentCartItem) {
          currentCartItem.quantity = newQuantity;
        } else {
          cart.push({
            product: normalizedProduct as Product,
            quantity: newQuantity,
          });
        }
      }
      return [...cart];
    });
    if (options?.toast) {
      toast.success("Đã thêm vào giỏ hàng");
    }
  };

  return { addToCart, cartQuantity: currentCartItem?.quantity ?? 0 };
}

export function useCustomerSupport() {
  return () =>
    openChat({
      type: "oa",
      id: getConfig((config) => config.template.oaIDtoOpenChat),
    });
}

export function useToBeImplemented() {
  return () =>
    toast("Chức năng dành cho các bên tích hợp phát triển...", {
      icon: "🛠️",
    });
}

function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

export function useEnsureJwt() {
  const setCustomerProfile = useSetAtom(customerProfileState);

  return async (): Promise<string | null> => {
    let token = localStorage.getItem("jwt_token");
    if (token && !isJwtExpired(token)) return token;
    if (token) localStorage.removeItem("jwt_token");
    try {
      const [accessToken, phoneTokenResult] = await Promise.allSettled([
        getAccessToken(),
        import("zmp-sdk/apis").then(({ getPhoneNumber }) => getPhoneNumber({})),
      ]);
      if (accessToken.status !== "fulfilled" || !accessToken.value) return null;
      const phoneToken =
        phoneTokenResult.status === "fulfilled"
          ? phoneTokenResult.value?.token ?? undefined
          : undefined;
      const result = await authenticate(accessToken.value, phoneToken);
      const newToken = result.data?.token;
      if (newToken) {
        localStorage.setItem("jwt_token", newToken);
        // Lưu customer profile (bao gồm is_farm_partner) vào state
        if (result.data?.user) {
          setCustomerProfile(result.data.user);
        }
        applyPendingReferral(newToken);
        return newToken;
      }
    } catch (err) {
      console.warn("[useEnsureJwt] authenticate failed", err);
    }
    return null;
  };
}

// Gọi trong Layout để đảm bảo customerProfile luôn được load khi app khởi động.
// Mỗi lần mở mini app sẽ gọi /authenticate để refresh profile mới nhất —
// quan trọng cho các flag thay đổi từ phía admin (is_farm_partner, mobile sync).
// Profile cached trong localStorage chỉ dùng để render ngay trên cold start;
// re-auth chạy nền sẽ ghi đè bằng giá trị fresh từ backend.
export function useInitAuth() {
  const setProfile = useSetAtom(customerProfileState);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Luôn gọi /authenticate khi app khởi động để refresh profile mới nhất
      // (bao gồm is_farm_partner — flag này có thể bị admin thay đổi mà JWT
      // hiện tại không biết). Bỏ qua nhánh ensureJwt vì sẽ là request trùng.
      try {
        const { getSetting, getPhoneNumber } = await import("zmp-sdk/apis");
        const { authSetting } = await getSetting({});
        const phoneGranted = !!authSetting["scope.userPhonenumber"];

        let phoneToken: string | undefined;
        if (phoneGranted) {
          try {
            const result = await getPhoneNumber({});
            phoneToken = result?.token ?? undefined;
          } catch {
            // ignore — vẫn có thể auth không có phone_token để load profile
          }
        }

        const accessToken = await getAccessToken();
        if (cancelled || !accessToken) return;

        const result = await authenticate(accessToken, phoneToken);
        if (cancelled) return;
        if (result.data?.user) {
          setProfile(result.data.user);
          if (result.data.token) {
            localStorage.setItem("jwt_token", result.data.token);
            applyPendingReferral(result.data.token);
          }
        }
      } catch {
        // silent — PhoneRequiredGate sẽ xử lý nếu vẫn thiếu mobile
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useFarmGuard() {
  const navigate = useNavigate();
  const profile = useAtomValue(customerProfileState);

  useEffect(() => {
    if (profile !== null && !profile.is_farm_partner) {
      navigate("/");
    }
  }, [profile, navigate]);

  return profile?.is_farm_partner ?? false;
}

export function useFarmInventory() {
  const [filters, setFilters] = useAtom(farmInventoryFiltersState);
  const [stats, setStats] = useAtom(farmInventoryStatsState);
  const [refreshToken, setRefreshToken] = useAtom(farmInventoryRefreshTokenState);

  const [items, setItems] = useState<InventoryProduct[]>([]);
  const [meta, setMeta] = useState<InventoryMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce only the search query — category/status/sort apply immediately.
  const [debouncedQ, setDebouncedQ] = useState(filters.q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        q: debouncedQ.trim(),
        category_id: filters.category_id,
        stock_status: filters.stock_status,
        sort: filters.sort,
        refreshToken,
      }),
    [debouncedQ, filters.category_id, filters.stock_status, filters.sort, refreshToken]
  );

  const fetchPage = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        setItems([]);
        setMeta(null);
        setStats(null);
        return;
      }

      const params = new URLSearchParams();
      const qTrimmed = debouncedQ.trim();
      if (qTrimmed) params.set("q", qTrimmed);
      if (filters.category_id !== "all")
        params.set("category_id", String(filters.category_id));
      if (filters.stock_status !== "all")
        params.set("stock_status", filters.stock_status);
      if (filters.sort !== "name") params.set("sort", filters.sort);
      params.set("page", String(targetPage));
      params.set("per_page", "20");

      const isFirstPage = targetPage === 1;
      isFirstPage ? setLoading(true) : setLoadingMore(true);
      setError(null);

      try {
        const res = await request<{
          error: boolean;
          data: InventoryProduct[];
          meta: InventoryMeta;
          stats: InventoryStats;
        }>(`/farm/inventory?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        if (signal?.aborted) return;

        setItems((prev) =>
          isFirstPage ? res.data ?? [] : [...prev, ...(res.data ?? [])]
        );
        setMeta(res.meta ?? null);
        if (res.stats) setStats(res.stats);
        setPage(targetPage);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError("Không thể tải danh sách tồn kho.");
      } finally {
        if (!signal?.aborted) {
          isFirstPage ? setLoading(false) : setLoadingMore(false);
        }
      }
    },
    [debouncedQ, filters.category_id, filters.stock_status, filters.sort, setStats]
  );

  // Refetch page 1 whenever filters/sort/refreshToken change.
  useEffect(() => {
    const controller = new AbortController();
    fetchPage(1, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const hasMore = meta ? meta.current_page < meta.last_page : false;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchPage(page + 1);
  }, [loading, loadingMore, hasMore, page, fetchPage]);

  const refresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, [setRefreshToken]);

  const updateFilters = useCallback(
    (patch: Partial<InventoryFilters>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
    },
    [setFilters]
  );

  return {
    items,
    meta,
    stats,
    filters,
    loading,
    loadingMore,
    hasMore,
    error,
    setFilters: updateFilters,
    loadMore,
    refresh,
  };
}

// Dữ liệu cho màn "Khai báo nhập kho buổi sáng" — gợi ý nhập theo TB 7 ngày,
// giá, cảnh báo cháy hàng. Read-only fetch (không paginate).
export function useStockInSuggestions() {
  const [items, setItems] = useState<StockInSuggestion[]>([]);
  const [meta, setMeta] = useState<StockInMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      setItems([]);
      setMeta(null);
      return;
    }
    setLoading(true);
    setError(null);
    request<{ error: boolean; data: StockInSuggestion[]; meta: StockInMeta }>(
      "/farm/stock-in/suggestions",
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setItems(res.data ?? []);
        setMeta(res.meta ?? null);
      })
      .catch((err: any) => {
        if (err?.name === "AbortError") return;
        setError("Không thể tải gợi ý nhập kho.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshToken]);

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  return { items, meta, loading, error, refresh };
}

export function useCheckout() {
  const { totalAmount } = useAtomValue(cartTotalState);
  const [cart, setCart] = useAtom(cartState);
  const payableCart = useAtomValue(payableCartState);
  const requestInfo = useRequestInformation();
  const navigate = useNavigate();
  const refreshNewOrders = useSetAtom(ordersState("pending"));
  const shippingAddress = useAtomValue(shippingAddressState);
  const selectedShippingService = useAtomValue(selectedShippingServiceState);
  const selectedStation = useAtomValue(selectedStationState);
  const deliveryMode = useAtomValue(deliveryModeState);
  const note = useAtomValue(noteState);
  const setNote = useSetAtom(noteState);
  const phone = useAtomValue(phoneState);
  const shortcutPrompted = useAtomValue(shortcutPromptedAtom);
  const setShortcutPrompted = useSetAtom(shortcutPromptedAtom);
  const oaFollowPrompted = useAtomValue(oaFollowPromptedAtom);
  const setOaFollowPrompted = useSetAtom(oaFollowPromptedAtom);
  const appliedVoucher = useAtomValue(appliedVoucherState);
  const setAppliedVoucher = useSetAtom(appliedVoucherState);
  const oaId = getConfig((c) => c.template.oaIDtoOpenChat);
  const inFlightRef = useRef(false);


  return async () => {
    // Chặn double-click: nếu luồng checkout đang chạy thì bỏ qua click mới.
    // Tránh tạo đơn trùng khi UI không phản hồi (PaymentDone event không fire
    // ngay với COD/sandbox channels).
    if (inFlightRef.current) {
      console.warn("[ZaloCheckout] Bỏ qua click — luồng checkout đang chạy");
      return;
    }
    inFlightRef.current = true;
    try {
      if (payableCart.length === 0) {
        toast.error("Tất cả sản phẩm trong giỏ đã hết hàng. Vui lòng xoá hoặc chọn sản phẩm khác.");
        return;
      }
      const userInfo = await requestInfo();

      // Lấy JWT token (authenticate nếu chưa có hoặc đã hết hạn)
      let jwtToken = localStorage.getItem("jwt_token");
      if (!jwtToken || isJwtExpired(jwtToken)) {
        if (jwtToken) localStorage.removeItem("jwt_token");
        const accessToken = await getAccessToken();
        if (!accessToken) {
          toast.error("Không thể xác thực. Vui lòng thử lại.");
          return;
        }
        try {
          const authResult = await authenticate(accessToken);
          jwtToken = authResult.data?.token;
          if (jwtToken) {
            localStorage.setItem("jwt_token", jwtToken);
            applyPendingReferral(jwtToken);
          }
        } catch (authError: any) {
          console.error("[ZaloCheckout] /authenticate - error:", {
            status: authError?.status,
            message: authError?.message,
            body: authError?.body,
          });
          const isTimeout =
            authError?.status === 503 ||
            String(authError?.message).includes("timeout") ||
            String(authError?.message).includes("timed out");
          toast.error(
            isTimeout
              ? "Xác thực Zalo bị timeout. Vui lòng thử lại sau."
              : "Không thể xác thực. Vui lòng thử lại."
          );
          return;
        }
      }

      if (!jwtToken) {
        toast.error("Không thể lấy token xác thực. Vui lòng thử lại.");
        return;
      }

      // Helper để tạo headers có JWT
      let authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${jwtToken}`,
      };

      // Chọn phương thức thanh toán
      const selectedMethod = await new Promise<{ method: string; isCustom?: boolean; logo?: string; displayName?: string; subMethod?: string }>((resolve, reject) => {
        Payment.selectPaymentMethod({
          channels: [
            { method: "COD_SANDBOX" },
            { method: "BANK_SANDBOX" },
            // { method: "ZALOPAY_SANDBOX" }, // Tạm tắt — chưa cấu hình MAC/secret production. Bật lại khi có nhu cầu dùng ZaloPay.
            { method: "MOMO_SANDBOX" },
          ],
          success: (data) => {
            console.log("Selected payment method:", data);
            resolve(data);
          },
          fail: (err) => {
            console.log("Payment method selection failed:", err);
            reject(new Error("Chọn phương thức thanh toán thất bại"));
          },
        });
      });

      // Tính finalTotal = subtotal + shipping_fee - voucher discount trước khi build payload
      const subtotal = totalAmount;
      const shippingFee = deliveryMode === "shipping"
        ? (selectedShippingService?.total_fee ?? 0)
        : 0;
      const voucherDiscountSubtotal = appliedVoucher?.discount_subtotal ?? 0;
      const voucherDiscountShipping = appliedVoucher?.discount_shipping ?? 0;
      const voucherDiscountTotal = voucherDiscountSubtotal + voucherDiscountShipping;
      const finalTotal = Math.max(0, subtotal + shippingFee - voucherDiscountTotal);

      // Validate: nếu mode shipping mà chưa chọn dịch vụ ship → báo lỗi
      if (deliveryMode === "shipping" && !selectedShippingService) {
        toast.error("Vui lòng chọn dịch vụ vận chuyển trước khi thanh toán.");
        return;
      }

      // Prepare order data for API
      const deliveryData = deliveryMode === "shipping"
        ? {
            type: "shipping" as const,
            address: shippingAddress?.address || "",
            name: shippingAddress?.name || userInfo?.name || "",
            phone: phone || shippingAddress?.phone || userInfo?.phone || "",
            province_id: shippingAddress?.province_id,
            district_id: shippingAddress?.district_id,
            ward_id: shippingAddress?.ward_id,
            province_name: shippingAddress?.province_name,
            district_name: shippingAddress?.district_name,
            ward_name: shippingAddress?.ward_name,
          }
        : {
            type: "pickup" as const,
            address: selectedStation?.address || "",
            name: userInfo?.name || "",
            phone: phone || userInfo?.phone || "",
            station_id: selectedStation?.id.toString(),
          };
      const mappedItems = payableCart.map((item) => ({
          product_id: item.product.id.toString(),
          name: item.product.name,
          price: item.product.price.toString(),
          quantity: item.quantity.toString(),
          image: item.product.image,
          detail: item.product.detail || "",
      }));
      const orderPayload = {
          customer_id: userInfo?.id || "",
          items: mappedItems,
          delivery: deliveryData,
          subtotal: subtotal.toString(),
          shipping_fee: shippingFee.toString(),
          shipping_service_code: selectedShippingService?.service_code ?? undefined,
          shipping_service_name: selectedShippingService?.service_name ?? undefined,
          voucher_code: appliedVoucher?.voucher.code,
          discount_amount: voucherDiscountTotal,
          // Backend dùng payment_method để: (1) quyết định gửi VTP với ORDER_PAYMENT=4
          // (COD thu hộ) hay 1 (đã trả online); (2) xác định luồng refund khi cancel.
          // Bỏ qua isCustom (gateway tự chọn) — chỉ gửi method khi là 1 trong các
          // mã chuẩn backend whitelist.
          payment_method: selectedMethod.isCustom ? undefined : selectedMethod.method,
          total: finalTotal.toString(),
          note: note,
          created_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', 'T') + '+07:00',
      };
      // 1. Tạo đơn hàng ở phía hệ thống (với JWT auth)
      const apiBase = getConfig((c) => c.template.apiUrl).replace(/\/+$/, "");
      const checkoutUrl = `${apiBase}/checkout`;
      console.log("[ZaloCheckout] POST URL:", checkoutUrl);
      console.log("[ZaloCheckout] API order data:", orderPayload);
      const createOrderResponse = await fetch(checkoutUrl, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(orderPayload),
      });
      console.log("[ZaloCheckout] checkout response status:", createOrderResponse.status, "url:", createOrderResponse.url);
      let finalOrderResponse = createOrderResponse;
      if (createOrderResponse.status === 401) {
        localStorage.removeItem("jwt_token");
        const newAccessToken = await getAccessToken();
        const newAuthResult = await authenticate(newAccessToken);
        const newToken = newAuthResult.data?.token;
        if (!newToken) throw new Error("Không thể xác thực lại.");
        localStorage.setItem("jwt_token", newToken);
        applyPendingReferral(newToken);
        authHeaders["Authorization"] = `Bearer ${newToken}`;
        finalOrderResponse = await fetch(checkoutUrl, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(orderPayload),
        });
        console.log("[ZaloCheckout] checkout retry status:", finalOrderResponse.status, "url:", finalOrderResponse.url);
      }
      if (!finalOrderResponse.ok) {
        const errBody = await finalOrderResponse.text();
        const respHeaders: Record<string, string> = {};
        finalOrderResponse.headers.forEach((value, key) => {
          respHeaders[key] = value;
        });
        console.error("[ZaloCheckout] checkout failed:", {
          status: finalOrderResponse.status,
          url: finalOrderResponse.url,
          headers: respHeaders,
          bodyPreview: errBody.slice(0, 500),
        });

        let parsed: any = null;
        try {
          parsed = JSON.parse(errBody);
        } catch {
          /* keep parsed = null */
        }

        // 422 voucher invalid → clear applied voucher để khách chọn lại
        if (finalOrderResponse.status === 422 && parsed?.reason === "voucher_invalid") {
          setAppliedVoucher(null);
          const err = new Error(parsed?.message || "Mã giảm giá không hợp lệ");
          (err as any).status = 422;
          throw err;
        }

        // 422 với danh sách shortages → hiện đúng tên sản phẩm hết hàng
        if (finalOrderResponse.status === 422 && Array.isArray(parsed?.shortages) && parsed.shortages.length > 0) {
          const lines = parsed.shortages.map((s: any) => {
            const name = s?.product_name ?? `Sản phẩm #${s?.product_id ?? "?"}`;
            const available = Number(s?.available ?? 0);
            const requested = Number(s?.requested ?? 0);
            if (available <= 0) return `• ${name}: đã hết hàng`;
            return `• ${name}: chỉ còn ${available} (bạn đặt ${requested})`;
          });
          const err = new Error(`Một số sản phẩm không đủ tồn kho:\n${lines.join("\n")}`);
          (err as any).status = 422;
          throw err;
        }

        // Các lỗi 4xx khác có message từ backend → dùng luôn
        if (finalOrderResponse.status >= 400 && finalOrderResponse.status < 500 && parsed?.message) {
          const err = new Error(parsed.message);
          (err as any).status = finalOrderResponse.status;
          throw err;
        }

        throw new Error(`Tạo đơn hàng thất bại (${finalOrderResponse.status} từ ${finalOrderResponse.url}): ${errBody.slice(0, 200)}`);
      }
      const { orderId: myOrderId } = await finalOrderResponse.json();
      console.log("My order created by id:", myOrderId);

      // 2. Chuẩn bị params để tạo MAC ngay trước khi mở SDK
      // amount PHẢI là finalTotal (subtotal + shipping_fee) — nếu đổi dịch vụ ship thì MAC cũ vô hiệu
      const amount = finalTotal;
      const desc = `Thanh toán cho đơn hàng ${myOrderId}`;
      const item = payableCart.map<{ id: number; amount: number }>((cartItem) => ({
        id: cartItem.product.id,
        amount: cartItem.product.price * cartItem.quantity,
      }));
      const extradata = JSON.stringify({ myOrderId });
      const method = selectedMethod.isCustom
        ? { id: selectedMethod.method, isCustom: true as const }
        : selectedMethod.method;

      // prepare-order gọi ngay trước SDK Checkout (không gọi sớm hơn)
      const payload = { amount, desc, item, extradata, method };
      const payloadJson = JSON.stringify(payload);
      console.log("[ZaloCheckout] prepare-order payload:", payload);
      console.log("[ZaloCheckout] prepare-order payload (raw JSON sent):", payloadJson);
      const prepareResponse = await fetch(`${apiBase}/prepare-order`, {
        method: "POST",
        headers: authHeaders,
        body: payloadJson,
      });
      const prepareBodyText = await prepareResponse.text();
      console.log("[ZaloCheckout] prepare-order response:", {
        status: prepareResponse.status,
        ok: prepareResponse.ok,
        body: prepareBodyText.slice(0, 1000),
      });
      if (!prepareResponse.ok) {
        throw new Error(`Tạo MAC thất bại (${prepareResponse.status}): ${prepareBodyText.slice(0, 200)}`);
      }
      let prepareJson: any;
      try {
        prepareJson = JSON.parse(prepareBodyText);
      } catch (parseErr) {
        throw new Error(`prepare-order trả về JSON không hợp lệ: ${prepareBodyText.slice(0, 200)}`);
      }
      const { mac } = prepareJson;
      console.log("[ZaloCheckout] mac:", mac);
      console.log("[ZaloCheckout] prepare-order orderData echo:", prepareJson?.orderData);

      // 3. Kích hoạt giao dịch thanh toán (amount = finalTotal, không phải subtotal)
      const sdkArgs = { desc, item, amount, extradata, method, mac };
      console.log("[ZaloCheckout] createOrder - SDK args:", sdkArgs);
      console.log("[ZaloCheckout] createOrder - SDK args (raw JSON):", JSON.stringify(sdkArgs));
      // Debug panel: khi bật localStorage.DEBUG_ZALO_PAY='1' sẽ hiện alert ngay trước
      // khi gọi SDK để dump payload trên thiết bị thật (không có DevTools).
      if (typeof localStorage !== "undefined" && localStorage.getItem("DEBUG_ZALO_PAY") === "1") {
        try {
          // eslint-disable-next-line no-alert
          window.alert(
            "[ZaloCheckout] Sắp gọi createOrder SDK:\n" +
              JSON.stringify(sdkArgs, null, 2)
          );
        } catch {
          /* ignore */
        }
      }
      let checkoutSdkOrderId: string | undefined;
      try {
        const sdkResp = await createOrder({
          desc,
          item,
          amount,
          extradata,
          method,
          mac,
        });
        checkoutSdkOrderId = sdkResp?.orderId;
        console.log("[ZaloCheckout] createOrder - SDK response:", sdkResp);
        console.log("[ZaloCheckout] createOrder - orderId trả về:", checkoutSdkOrderId);
      } catch (sdkError: any) {
        // SDK Zalo Pay reject (popup "Đã có lỗi xảy ra"). Dump TẤT CẢ các field
        // có thể có của error object — Zalo SDK trả về shape không nhất quán
        // ({code, message}, {errorCode, errorMessage}, hoặc plain Error).
        const errorDump = {
          raw: sdkError,
          message: sdkError?.message,
          code: sdkError?.code,
          errorCode: sdkError?.errorCode,
          errorMessage: sdkError?.errorMessage,
          name: sdkError?.name,
          stack: sdkError?.stack,
          stringified: (() => {
            try {
              return JSON.stringify(sdkError, Object.getOwnPropertyNames(sdkError ?? {}));
            } catch {
              return String(sdkError);
            }
          })(),
          sdkArgs,
          macSent: mac,
        };
        console.error("[ZaloCheckout] createOrder SDK lỗi - dump đầy đủ:", errorDump);
        if (typeof localStorage !== "undefined" && localStorage.getItem("DEBUG_ZALO_PAY") === "1") {
          try {
            // eslint-disable-next-line no-alert
            window.alert(
              "[ZaloCheckout] createOrder SDK lỗi:\n" +
                JSON.stringify(
                  {
                    message: errorDump.message,
                    code: errorDump.code,
                    errorCode: errorDump.errorCode,
                    errorMessage: errorDump.errorMessage,
                    stringified: errorDump.stringified,
                  },
                  null,
                  2
                )
            );
          } catch {
            /* ignore */
          }
        }
        const reason =
          sdkError?.errorMessage ||
          sdkError?.message ||
          sdkError?.errorCode ||
          sdkError?.code ||
          "Lỗi không xác định";
        const wrapped = new Error(`Zalo Pay SDK từ chối: ${reason}`);
        (wrapped as any).sdkError = sdkError;
        throw wrapped;
      }

      // 4. Liên kết đơn hàng với giao dịch Zalo (với JWT auth)
      const linkPayload = { orderId: myOrderId, checkoutSdkOrderId, miniAppId: window.APP_ID };
      console.log("[ZaloCheckout] getOrderStatus/link - payload gửi:", linkPayload);
      try {
        const linkResponse = await fetch(
          `${apiBase}/link`,
          {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify(linkPayload),
          }
        );
        const linkResult = await linkResponse.json().catch(() => null);
        console.log("[ZaloCheckout] getOrderStatus/link - result:", linkResult);
      } catch (linkError) {
        console.warn("[ZaloCheckout] getOrderStatus/link - lỗi:", linkError);
      }

      // Cleanup UI sau khi đơn đã được tạo thành công ở backend + link xong.
      // Dùng chung cho cả luồng COD (cleanup ngay) và luồng online (cleanup khi
      // PaymentDone fire hoặc timeout fallback).
      const finalizeCheckoutUI = () => {
        setCart([]);
        setNote("");
        setAppliedVoucher(null);
        refreshNewOrders();
        // Bỏ viewTransition cho navigate sau thanh toán: trên Zalo WebView (device thật),
        // document.visibilityState chưa kịp restore khi sheet native đóng → startViewTransition
        // ném InvalidStateError. Đây là route push thường, không cần shared-element animation.
        requestAnimationFrame(() => {
          navigate("/orders");
        });
        // Poll thêm để bắt update payment_status từ webhook /notify hoặc job fallback.
        setTimeout(() => refreshNewOrders(), 2500);
        setTimeout(() => refreshNewOrders(), 7000);
        // Pop một lần các dialog Zalo native sau khi user đã thấy success.
        // Set flag true bất kể accept/cancel để không spam đơn sau.
        setTimeout(async () => {
          if (!shortcutPrompted) {
            await promptCreateShortcut();
            setShortcutPrompted(true);
          }
          if (!oaFollowPrompted && oaId) {
            await promptFollowOA(oaId);
            setOaFollowPrompted(true);
          }
        }, 1800);
      };

      // COD/BANK sandbox không thực hiện giao dịch tiền thật → SDK không fire
      // EventName.PaymentDone đồng bộ. Cleanup + navigate ngay sau khi link xong,
      // không chờ event. Backend sẽ update payment_status qua webhook /notify
      // hoặc job CheckPaymentStatus (poll lại bằng setTimeout refreshNewOrders).
      const codePrefix = selectedMethod.method?.toUpperCase() ?? "";
      const isOfflineFlow = codePrefix.startsWith("COD") || codePrefix.startsWith("BANK");
      if (isOfflineFlow) {
        toast.success("Đặt hàng thành công. Cảm ơn bạn đã mua hàng!", {
          icon: "🎉",
          duration: 5000,
        });
        finalizeCheckoutUI();
        return;
      }

      // 5. Thông báo kết quả giao dịch (verify real-time) — luồng online gateway
      // Race với timeout 10s: nếu PaymentDone không về trong 10s, vẫn finalize UI
      // (đơn đã có ở backend, webhook /notify sẽ update payment_status sau).
      let paymentDoneFired = false;
      const paymentDonePromise = new Promise<void>((resolve) => {
        events.once(EventName.PaymentDone, async (data) => {
          paymentDoneFired = true;
          console.log("[ZaloCheckout] notify/PaymentDone - data nhận được:", data);
          console.log("[ZaloCheckout] notify - checkTransaction params:", { data });
          const result = await CheckoutSDK.checkTransaction({ data });
          console.log("[ZaloCheckout] notify - checkTransaction result:", result);

          if (result.resultCode >= 0) {
            finalizeCheckoutUI();
          }
          switch (result.resultCode) {
            case 1:
              toast.success("Thanh toán thành công. Cảm ơn bạn đã mua hàng!", {
                icon: "🎉",
                duration: 5000,
              });
              break;
            case 0:
              toast("Giao dịch đang xử lý. Cảm ơn bạn đã mua hàng!", {
                icon: "⏳",
                duration: 5000,
              });
              break;
            case -1:
              toast.error("Giao dịch không thành công. Vui lòng thử lại sau.");
              break;
            case -2:
              toast.error("Vui lòng chọn phương thức thanh toán!");
              break;
            default:
              console.error(result);
              toast.error(result.msg);
          }
          resolve();
        });
      });

      // Timeout fallback: 10s không có PaymentDone → finalize UI (đơn đã có ở
      // backend, webhook /notify sẽ update payment_status). Tránh việc khách
      // mắc kẹt ở giỏ hàng + click lại tạo đơn trùng.
      await Promise.race([
        paymentDonePromise,
        new Promise<void>((resolve) => setTimeout(resolve, 10000)),
      ]);
      if (!paymentDoneFired) {
        console.warn("[ZaloCheckout] PaymentDone không fire trong 10s — fallback finalize");
        toast("Giao dịch đang xử lý. Vui lòng kiểm tra trong mục Đơn hàng.", {
          icon: "⏳",
          duration: 5000,
        });
        finalizeCheckoutUI();
      }
    } catch (error: any) {
      console.error("[ZaloCheckout] Lỗi thanh toán:", {
        error,
        message: error?.message,
        status: error?.status,
        body: error?.body,
        stack: error?.stack,
      });
      const msg = error?.message || (typeof error === "string" ? error : null);
      const isStockError = error?.status === 422 && typeof msg === "string" && msg.includes("tồn kho");
      toast.error(msg || "Thanh toán thất bại. Vui lòng thử lại.", {
        duration: isStockError ? 6000 : 4000,
        style: isStockError ? { whiteSpace: "pre-line", maxWidth: "90vw" } : undefined,
      });
    } finally {
      inFlightRef.current = false;
    }
  };
}

export function useRouteHandle() {
  const matches = useMatches() as UIMatch<
    undefined,
    | {
        title?: string | Function;
        logo?: boolean;
        search?: boolean;
        noFooter?: boolean;
        noBack?: boolean;
        noFloatingCart?: boolean;
        scrollRestoration?: number;
      }
    | undefined
  >[];
  const lastMatch = matches[matches.length - 1];

  return [lastMatch.handle, lastMatch, matches] as const;
}

/**
 * Huỷ đơn hàng từ phía khách. Gọi POST /orders/{id}/cancel với JWT.
 * Refresh atom orders cho cả tab pending (nguồn) và cancelled (đích).
 * Re-auth on 401 giống pattern useCheckout.
 */
export function useCancelOrder() {
  const refreshPending = useSetAtom(ordersState("pending"));
  const refreshCancelled = useSetAtom(ordersState("cancelled"));

  return useCallback(
    async (
      orderId: number,
      reasonCode: string,
      reasonText?: string
    ): Promise<Order> => {
      const apiBase = getConfig((c) => c.template.apiUrl).replace(/\/+$/, "");
      const url = `${apiBase}/orders/${orderId}/cancel`;
      const body = JSON.stringify({
        reason_code: reasonCode,
        reason: reasonText ?? "",
      });

      let token = localStorage.getItem("jwt_token") || "";
      const buildHeaders = (t: string): Record<string, string> => ({
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${t}`,
      });

      let response = await fetch(url, {
        method: "POST",
        headers: buildHeaders(token),
        body,
      });

      // 401 → re-auth once và retry
      if (response.status === 401) {
        localStorage.removeItem("jwt_token");
        const newAccessToken = await getAccessToken();
        const newAuthResult = await authenticate(newAccessToken);
        const newToken = newAuthResult.data?.token;
        if (!newToken) throw new Error("Không thể xác thực lại.");
        localStorage.setItem("jwt_token", newToken);
        response = await fetch(url, {
          method: "POST",
          headers: buildHeaders(newToken),
          body,
        });
      }

      if (!response.ok) {
        const errBody = await response.text();
        let msg = "Huỷ đơn thất bại";
        try {
          const parsed = JSON.parse(errBody);
          if (parsed?.message) msg = parsed.message;
        } catch {
          /* ignore parse error */
        }
        const err = new Error(msg);
        (err as any).status = response.status;
        throw err;
      }

      const json = (await response.json()) as { error: boolean; data: ApiOrder };
      refreshPending();
      refreshCancelled();

      // Tái sử dụng converter từ state.ts để giữ shape Order nhất quán
      const apiOrder = json.data;
      return {
        id: parseInt(apiOrder.id),
        status: apiOrder.status,
        paymentStatus: apiOrder.payment_status,
        paymentMethod: apiOrder.payment_method ?? undefined,
        createdAt: new Date(apiOrder.created_at),
        receivedAt: new Date(apiOrder.received_at),
        items: [],
        delivery: { type: "shipping", alias: "", address: "", name: "", phone: "" },
        total: parseFloat(apiOrder.total),
        note: apiOrder.note,
        cancelledAt: apiOrder.cancelled_at ? new Date(apiOrder.cancelled_at) : undefined,
        cancelledBy: (apiOrder.cancelled_by as Order["cancelledBy"]) ?? undefined,
        cancellationReason: apiOrder.cancellation_reason ?? undefined,
        refundStatus: (apiOrder.refund_status as Order["refundStatus"]) ?? undefined,
        refundAmount: apiOrder.refund_amount ? parseFloat(apiOrder.refund_amount) : undefined,
        refundedAt: apiOrder.refunded_at ? new Date(apiOrder.refunded_at) : undefined,
      };
    },
    [refreshPending, refreshCancelled]
  );
}

// ─── Voucher hooks ──────────────────────────────────────────────────────────

import type { Voucher, AppliedVoucher } from "@/types";

async function ensureJwtToken(): Promise<string | null> {
  let jwt = localStorage.getItem("jwt_token");
  if (jwt && !isJwtExpired(jwt)) return jwt;
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;
    const authResult = await authenticate(accessToken);
    jwt = authResult.data?.token ?? null;
    if (jwt) {
      localStorage.setItem("jwt_token", jwt);
      applyPendingReferral(jwt);
    }
    return jwt;
  } catch (e) {
    console.warn("[voucher] auth failed", e);
    return null;
  }
}

/**
 * Lấy danh sách voucher khả dụng cho giỏ hàng hiện tại. Auto refetch khi
 * subtotal hoặc shippingFee thay đổi. Trả về `vouchers` đã include cờ
 * `usable` + `unusable_reason` từ backend.
 */
export function useAvailableVouchers() {
  const { totalAmount } = useAtomValue(cartTotalState);
  const selectedShippingService = useAtomValue(selectedShippingServiceState);
  const deliveryMode = useAtomValue(deliveryModeState);
  const shippingFee =
    deliveryMode === "shipping" ? selectedShippingService?.total_fee ?? 0 : 0;

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVouchers = useCallback(async () => {
    const apiBase = getConfig((c) => c.template.apiUrl).replace(/\/+$/, "");
    if (!apiBase) {
      // Mock mode: trả về danh sách từ vouchers.json (xử lý qua requestWithFallback)
      try {
        const mock = await requestWithFallback<any>("/vouchers", { data: [] });
        const arr = Array.isArray(mock?.data) ? mock.data : Array.isArray(mock) ? mock : [];
        // Trong mock, tự tính usable đơn giản: subtotal >= min_order_amount.
        const enriched = arr.map((v: any) => ({
          ...v,
          usable: totalAmount >= (Number(v.min_order_amount) || 0),
          unusable_reason: totalAmount < (Number(v.min_order_amount) || 0)
            ? `Đơn tối thiểu ${(Number(v.min_order_amount) || 0).toLocaleString("vi-VN")}đ`
            : null,
        }));
        setVouchers(enriched);
        return;
      } catch (e: any) {
        setError(e?.message ?? "Lỗi tải voucher");
        return;
      }
    }

    const token = await ensureJwtToken();
    if (!token) {
      setError("Chưa xác thực");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${apiBase}/vouchers/available`);
      url.searchParams.set("subtotal", String(totalAmount));
      url.searchParams.set("shipping_fee", String(shippingFee));
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) {
        setError(`Lỗi ${res.status}`);
        setVouchers([]);
        return;
      }
      const json = await res.json();
      const arr: Voucher[] = Array.isArray(json?.data) ? json.data : [];
      setVouchers(arr);
    } catch (e: any) {
      setError(e?.message ?? "Lỗi mạng");
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [totalAmount, shippingFee]);

  useEffect(() => {
    // Debounce nhẹ để tránh fetch liên tục khi user đang gõ số lượng.
    const t = setTimeout(fetchVouchers, 250);
    return () => clearTimeout(t);
  }, [fetchVouchers]);

  return { vouchers, loading, error, refresh: fetchVouchers };
}

/**
 * Validate 1 voucher code cho giỏ hiện tại. Dùng khi khách nhập mã thủ công.
 * Không tự apply — caller quyết định set vào appliedVoucherState.
 */
export function useValidateVoucher() {
  const { totalAmount } = useAtomValue(cartTotalState);
  const selectedShippingService = useAtomValue(selectedShippingServiceState);
  const deliveryMode = useAtomValue(deliveryModeState);
  const shippingFee =
    deliveryMode === "shipping" ? selectedShippingService?.total_fee ?? 0 : 0;

  return useCallback(
    async (code: string): Promise<AppliedVoucher | { error: string }> => {
      const trimmed = code.trim();
      if (!trimmed) return { error: "Vui lòng nhập mã" };

      const apiBase = getConfig((c) => c.template.apiUrl).replace(/\/+$/, "");
      if (!apiBase) {
        // Mock fallback: match code trong vouchers.json
        try {
          const mock = await requestWithFallback<any>("/vouchers", { data: [] });
          const arr: any[] = Array.isArray(mock?.data) ? mock.data : Array.isArray(mock) ? mock : [];
          const found = arr.find(
            (v: any) => String(v.code).toUpperCase() === trimmed.toUpperCase()
          );
          if (!found) return { error: "Mã giảm giá không tồn tại" };
          if ((Number(found.min_order_amount) || 0) > totalAmount) {
            return { error: `Đơn tối thiểu ${(Number(found.min_order_amount) || 0).toLocaleString("vi-VN")}đ` };
          }
          const previewSubtotal = Number(found.preview_subtotal ?? 0);
          const previewShipping = Number(found.preview_shipping ?? 0);
          return {
            voucher: found,
            discount_subtotal: previewSubtotal,
            discount_shipping: previewShipping,
          };
        } catch (e: any) {
          return { error: e?.message ?? "Lỗi tải voucher" };
        }
      }

      const token = await ensureJwtToken();
      if (!token) return { error: "Chưa xác thực — vui lòng thử lại" };

      try {
        const res = await fetch(`${apiBase}/vouchers/validate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code: trimmed,
            subtotal: totalAmount,
            shipping_fee: shippingFee,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          return { error: json?.message ?? `Lỗi ${res.status}` };
        }
        return {
          voucher: json.data.voucher,
          discount_subtotal: Number(json.data.discount_subtotal ?? 0),
          discount_shipping: Number(json.data.discount_shipping ?? 0),
        };
      } catch (e: any) {
        return { error: e?.message ?? "Lỗi mạng" };
      }
    },
    [totalAmount, shippingFee]
  );
}
