import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { MutableRefObject, useLayoutEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { UIMatch, useMatches, useNavigate } from "react-router-dom";
import {
  cartState,
  cartTotalState,
  ordersState,
  userInfoKeyState,
  userInfoState,
  productsState,
  shippingAddressState,
  selectedStationState,
  deliveryModeState,
  noteState,
  phoneState,
} from "@/state";
import { Product, CreateOrderRequest, CreateOrderResponse } from "@/types";
import { getConfig } from "@/utils/template";
import { requestWithPost, authenticate } from "@/utils/request";
import { getAccessToken } from "@/utils/zma";
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

export function useCheckout() {
  const { totalAmount } = useAtomValue(cartTotalState);
  const [cart, setCart] = useAtom(cartState);
  const requestInfo = useRequestInformation();
  const navigate = useNavigate();
  const refreshNewOrders = useSetAtom(ordersState("pending"));
  const shippingAddress = useAtomValue(shippingAddressState);
  const selectedStation = useAtomValue(selectedStationState);
  const deliveryMode = useAtomValue(deliveryModeState);
  const note = useAtomValue(noteState);
  const setNote = useSetAtom(noteState);
  const phone = useAtomValue(phoneState);


  return async () => {
    try {
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

      // Prepare order data for API
      const deliveryData = deliveryMode === "shipping" 
        ? {
            type: "shipping" as const,
            address: shippingAddress?.address || "",
            name: shippingAddress?.name || userInfo?.name || "",
            phone: phone || shippingAddress?.phone || userInfo?.phone || "",
          }
        : {
            type: "pickup" as const,
            address: selectedStation?.address || "",
            name: userInfo?.name || "",
            phone: phone || userInfo?.phone || "",
            station_id: selectedStation?.id.toString(),
          };
      const mappedItems = cart.map((item) => ({
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
          total: totalAmount.toString(),
          note: note,
          created_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', 'T') + '+07:00',
      };
      // 1. Tạo đơn hàng ở phía hệ thống (với JWT auth)
      console.log("API order data:", orderPayload);
      const createOrderResponse = await fetch(
        `${window.APP_CONFIG?.template?.apiUrl}/orders`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(orderPayload),
        }
      );
      let finalOrderResponse = createOrderResponse;
      if (createOrderResponse.status === 401) {
        localStorage.removeItem("jwt_token");
        const newAccessToken = await getAccessToken();
        const newAuthResult = await authenticate(newAccessToken);
        const newToken = newAuthResult.data?.token;
        if (!newToken) throw new Error("Không thể xác thực lại.");
        localStorage.setItem("jwt_token", newToken);
        authHeaders["Authorization"] = `Bearer ${newToken}`;
        finalOrderResponse = await fetch(
          `${window.APP_CONFIG?.template?.apiUrl}/orders`,
          { method: "POST", headers: authHeaders, body: JSON.stringify(orderPayload) }
        );
      }
      if (!finalOrderResponse.ok) {
        const errBody = await finalOrderResponse.text();
        throw new Error(`Tạo đơn hàng thất bại: ${errBody}`);
      }
      const { orderId: myOrderId } = await finalOrderResponse.json();
      console.log("My order created by id:", myOrderId);

      // 2. Chuẩn bị params để tạo MAC (với JWT auth)
      const amount = totalAmount;
      const desc = `Thanh toán cho đơn hàng ${myOrderId}`;
      const item = cart.map<{ id: number; amount: number }>((cartItem) => ({
        id: cartItem.product.id,
        amount: cartItem.product.price * cartItem.quantity,
      }));
      const extradata = JSON.stringify({
        myOrderId,
      });
      const method = JSON.stringify({
        id: selectedMethod.method,
        isCustom: selectedMethod.isCustom || false,
      });

      const payload = { amount, desc, item, extradata, method };
      console.log("[ZaloCheckout] callback/overallMac - payload gửi đi:", payload);
      const prepareResponse = await fetch(
        `${window.APP_CONFIG?.template?.apiUrl}/prepare-order`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );
      if (!prepareResponse.ok) {
        throw new Error("Tạo MAC thất bại");
      }
      const { mac } = await prepareResponse.json();
      console.log("[ZaloCheckout] callback/overallMac - mac nhận về:", mac);

      // 3. Kích hoạt giao dịch thanh toán
      console.log("[ZaloCheckout] createOrder - params gửi đi:", { desc, item, amount: totalAmount, extradata, method, mac });
      const { orderId: checkoutSdkOrderId } = await createOrder({
        desc,
        item,
        amount: totalAmount,
        extradata,
        method,
        mac,
        success: async (res) => {
          console.log("[ZaloCheckout] createOrder - success callback:", res);
        },
        fail: (err) => {
          toast.error("Thanh toán thất bại!");
          console.log("[ZaloCheckout] createOrder - fail callback:", err);
        },
      });
      console.log("[ZaloCheckout] createOrder - orderId trả về:", checkoutSdkOrderId);

      // 4. Liên kết đơn hàng với giao dịch Zalo (với JWT auth)
      const linkPayload = { orderId: myOrderId, checkoutSdkOrderId, miniAppId: window.APP_ID };
      console.log("[ZaloCheckout] getOrderStatus/link - payload gửi:", linkPayload);
      try {
        const linkResponse = await fetch(
          `${window.APP_CONFIG?.template?.apiUrl}/link`,
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
          navigate("/orders", {
            viewTransition: true,
          });
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

    } catch (error) {
      console.warn(error);
      toast.error(
        "Thanh toán thất bại. Vui lòng kiểm tra nội dung lỗi bên trong Console."
      );
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
