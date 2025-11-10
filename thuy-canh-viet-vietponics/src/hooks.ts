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
import {  requestWithPost } from "@/utils/request";
import { authorize,createOrder,events,EventName, openChat,CheckoutSDK } from "zmp-sdk/apis";
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
          items: mappedItems, // Sử dụng biến đã ánh xạ
          delivery: deliveryData,
          total: totalAmount.toString(),
          note: note,
          created_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', 'T') + '+07:00',
      };
      // 1. Tạo đơn hàng ở phía hệ thống của bạn
      //Chuẩn bị dữ liệu đơn hàng cho API tạo đơn hàng trên database
      console.log("User info:", userInfo);
      // Save order to database
      console.log("API order data:",  orderPayload);
      const { orderId: myOrderId } = await requestWithPost<
        CreateOrderRequest,
        CreateOrderResponse
      >("/orders", orderPayload);
      console.log("My order created by id:", myOrderId);
      // Chuẩn bị params để tạo MAC
      const amount = totalAmount;
      const desc = `Thanh toán cho đơn hàng #${myOrderId}`;
      const item = cart.map<{ id: number; amount: number }>((cartItem) => ({
        id: cartItem.product.id,
        amount: cartItem.product.price * cartItem.quantity,
      }));
      const extradata = JSON.stringify({
        myOrderId, // truyền theo định danh của đơn hàng đã được tạo ở phía hệ thống của bạn
      });
      const method = JSON.stringify({
        id: "COD_SANDBOX", // Phương thức thanh toán
        isCustom: false, // false: Phương thức thanh toán của Platform, true: Phương thức thanh toán riêng của đối tác
      });

      const payload = { amount, desc, item, extradata, method };
      const { mac } = await requestWithPost<typeof payload, { mac: string }>(
        "/prepare-order",
        payload
      );
      console.log("MAC number created:", mac);
      // 2. Kích hoạt giao dịch thanh toán
      const { orderId: checkoutSdkOrderId } = await createOrder({
        desc,
        item,
        amount: totalAmount,
        extradata,
        method,
        mac,
        success: async (res) => {
          setCart([]);
          setNote("");
          refreshNewOrders();
          console.log("Checkout SDK order id:", res);
          navigate("/orders", {
            viewTransition: true,
          });
          toast.success("Đặt hàng thành công. Thanh toán khi nhận hàng!", {
            icon: "🎉",
            duration: 5000,
          });
        },
        fail: (err) => {
          toast.error("Thanh toán thất bại!");
          console.log("Checkout SDK thất bại:", err);
        },
      });
      console.log("Checkout SDK order id:", checkoutSdkOrderId);
      // 3. Liên kết đơn hàng với giao dịch
      // await requestWithPost("/link", {
      //   orderId: myOrderId,
      //   checkoutSdkOrderId,
      //   miniAppId: window.APP_ID,
      // });
      
      // 5. Thông báo kết quả giao dịch
      // events.once(EventName.PaymentDone, async (data) => {
      //   const result = await CheckoutSDK.checkTransaction({ data });

      //   if (result.resultCode >= 0) {
      //     setCart([]);
      //     refreshNewOrders();
      //     navigate("/orders", {
      //       viewTransition: true,
      //     });
      //   }
      //   console.log("Payment result:", result);
      //   switch (result.resultCode) {
      //     case 1:
      //       toast.success("Thanh toán thành công. Cảm ơn bạn đã mua hàng!", {
      //         icon: "🎉",
      //         duration: 5000,
      //       });
      //       break;
      //     case 0:
      //       toast("Giao dịch đang xử lý. Cảm ơn bạn đã mua hàng!", {
      //         icon: "⏳",
      //         duration: 5000,
      //       });
      //       break;
      //     case -1:
      //       toast.error("Giao dịch không thành công. Vui lòng thử lại sau.");
      //       break;
      //     case -2:
      //       toast.error("Vui lòng chọn phương thức thanh toán!");
      //       break;
      //     default:
      //       // Giao dịch không hợp lệ, kiểm tra `result.err` & `result.msg` để biết thêm thông tin
      //       console.error(result);
      //       toast.error(result.msg);
      //   }
      // });

      // setCart([]);
      // setNote("");
      // refreshNewOrders();
      // navigate("/orders", {
      //   viewTransition: true,
      // });
      // toast.success("Đặt hàng thành công. Thanh toán khi nhận hàng!", {
      //   icon: "🎉",
      //   duration: 5000,
      // });
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
