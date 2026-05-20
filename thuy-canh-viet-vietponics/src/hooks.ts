import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { MutableRefObject, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { UIMatch, useMatches, useNavigate } from "react-router-dom";
import {
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
  ApiOrder,
  Order,
} from "@/types";
import { getConfig } from "@/utils/template";
import { requestWithPost, request, authenticate } from "@/utils/request";
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
// Mỗi lần mở mini app, nếu cột `mobile` của customer chưa có giá trị (DB NULL),
// sẽ tự động sync số điện thoại bằng cách gửi phone_token (nếu user đã cấp quyền)
// đến /authenticate để backend decode và update DB.
export function useInitAuth() {
  const ensureJwt = useEnsureJwt();
  const setProfile = useSetAtom(customerProfileState);
  const getProfile = useAtomCallback(
    useCallback((get) => get(customerProfileState), [])
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Đảm bảo có JWT (re-auth nếu cần — nhánh này có thể đã set profile)
      const token = await ensureJwt();
      if (cancelled || !token) return;

      // 2. Đọc profile mới nhất sau khi ensureJwt chạy xong
      const profile = getProfile();

      // 3. Nếu profile chưa có HOẶC mobile rỗng → re-auth (silent) với phone_token
      //    để backend update mobile vào DB. Không show prompt nếu chưa cấp quyền —
      //    PhoneRequiredGate sẽ xử lý trường hợp đó.
      if (profile && profile.mobile) return;

      try {
        const { getSetting, getPhoneNumber } = await import("zmp-sdk/apis");
        const { authSetting } = await getSetting({});
        const phoneGranted = !!authSetting["scope.userPhonenumber"];

        // Nếu profile null (cần load) HOẶC mobile null + đã cấp quyền (cần sync)
        // thì mới gọi authenticate. Nếu profile đã có nhưng mobile null + chưa cấp quyền
        // → để PhoneRequiredGate xử lý, không làm gì thêm.
        if (profile && !phoneGranted) return;

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
  const oaId = getConfig((c) => c.template.oaIDtoOpenChat);


  return async () => {
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
            { method: "ZALOPAY_SANDBOX" },
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

      // Tính finalTotal = subtotal + shipping_fee trước khi build payload
      const subtotal = totalAmount;
      const shippingFee = deliveryMode === "shipping"
        ? (selectedShippingService?.total_fee ?? 0)
        : 0;
      const finalTotal = subtotal + shippingFee;

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
      console.log("[ZaloCheckout] prepare-order payload:", payload);
      const prepareResponse = await fetch(`${apiBase}/prepare-order`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!prepareResponse.ok) {
        throw new Error("Tạo MAC thất bại");
      }
      const { mac } = await prepareResponse.json();
      console.log("[ZaloCheckout] mac:", mac);

      // 3. Kích hoạt giao dịch thanh toán (amount = finalTotal, không phải subtotal)
      console.log("[ZaloCheckout] createOrder:", { desc, item, amount, extradata, method, mac });
      const { orderId: checkoutSdkOrderId } = await createOrder({
        desc,
        item,
        amount,
        extradata,
        method,
        mac,
      });
      console.log("[ZaloCheckout] createOrder - orderId trả về:", checkoutSdkOrderId);

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

      // 5. Thông báo kết quả giao dịch (verify real-time)
      events.once(EventName.PaymentDone, async (data) => {
        console.log("[ZaloCheckout] notify/PaymentDone - data nhận được:", data);
        console.log("[ZaloCheckout] notify - checkTransaction params:", { data });
        const result = await CheckoutSDK.checkTransaction({ data });
        console.log("[ZaloCheckout] notify - checkTransaction result:", result);

        if (result.resultCode >= 0) {
          setCart([]);
          setNote("");
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
      });

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
