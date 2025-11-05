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
import { Product } from "@/types";
import { getConfig } from "@/utils/template";
import { prepareOrder, createOrderAPI } from "@/utils/request";
import { authorize, createOrder, openChat } from "zmp-sdk/apis";
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
      
      // Prepare order data and get MAC from server
      const orderData = {
        amount: totalAmount,
        desc: "Thanh toán đơn hàng",
        item: cart.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          price: parseFloat(item.product.price.toString()), // Ensure price is number
          quantity: item.quantity,
        })),
      };
     
      console.warn("Order data for MAC generation:", JSON.stringify(orderData));
      const prepareResponse = await prepareOrder(orderData);
      console.warn("Prepare order response:", prepareResponse);
      const { mac } = prepareResponse;
      console.warn("Received MAC:", mac);

      // Create order with MAC (Zalo payment)
      console.warn("Calling createOrder with data:", { ...orderData, mac });
      await createOrder({
        ...orderData,
        mac: mac
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
      
      const apiOrderData = {
        customer_id: userInfo?.id || "",
        items: cart.map((item) => ({
          product_id: item.product.id.toString(),
          name: item.product.name,
          price: item.product.price.toString(),
          quantity: item.quantity.toString(),
          image: item.product.image,
          detail: item.product.detail || "",
        })),
        delivery: deliveryData,
        total: totalAmount.toString(),
        note: note,
        created_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', 'T') + '+07:00',
      };
      
      console.warn("User info:", userInfo);
      console.warn("API order data:", apiOrderData);
      
      // Save order to database
      await createOrderAPI(apiOrderData);
      
      setCart([]);
      setNote("");
      refreshNewOrders();
      navigate("/orders", {
        viewTransition: true,
      });
      toast.success("Thanh toán thành công. Cảm ơn bạn đã mua hàng!", {
        icon: "🎉",
        duration: 5000,
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
