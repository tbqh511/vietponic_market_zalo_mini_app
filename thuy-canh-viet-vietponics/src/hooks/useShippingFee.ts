import {
  cartState,
  cartTotalState,
  deliveryModeState,
  selectedShippingServiceState,
  shippingAddressState,
} from "@/state";
import { ShippingService } from "@/types";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { getConfig } from "@/utils/template";

const API_URL = getConfig((c) => c.template.apiUrl).replace(/\/+$/, "");

export function useShippingFee() {
  const cart = useAtomValue(cartState);
  const address = useAtomValue(shippingAddressState);
  const deliveryMode = useAtomValue(deliveryModeState);
  const { totalAmount } = useAtomValue(cartTotalState);
  const setSelectedService = useSetAtom(selectedShippingServiceState);

  const [services, setServices] = useState<ShippingService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (deliveryMode !== "shipping") {
      setServices([]);
      setError(null);
      return;
    }
    if (!address?.ward_id || !address?.province_id) {
      setServices([]);
      setError(null);
      return;
    }
    if (cart.length === 0) {
      setServices([]);
      setError(null);
      return;
    }
    if (!API_URL) {
      // Đang chạy offline với mock — trả về fallback tĩnh
      setServices([
        {
          service_code: "FLAT_SHORT",
          service_name: "Vận chuyển tiêu chuẩn (ước tính)",
          fee: 35000,
          vat: 0,
          total_fee: 35000,
          kpi_ht: "2-3 ngày",
          exchange_weight: null,
        },
      ]);
      return;
    }

    const ctrl = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      console.log("[ShippingFee] Bắt đầu tính phí vận chuyển", {
        province_id: address.province_id,
        district_id: address.district_id,
        ward_id: address.ward_id,
        cartItems: cart.length,
        totalAmount,
      });
      try {
        const token = localStorage.getItem("jwt_token") ?? "";
        const payload = {
          items: cart.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
          })),
          receiver_province_id: address.province_id,
          receiver_district_id: address.district_id,
          receiver_ward_id: address.ward_id,
          product_price: totalAmount,
          is_cod: false,
        };

        console.log("[ShippingFee] Payload gửi lên:", payload);

        const res = await fetch(`${API_URL}/shipping/estimate`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.status === 422) {
          const j = await res.json().catch(() => ({} as any));
          if (j?.code === "NO_PICKUP_STATION") {
            console.warn("[ShippingFee] Không có trạm cấu hình VTP", j);
            setError(
              j.message ??
                "Hiện chưa có trạm lấy hàng phù hợp, vui lòng liên hệ shop"
            );
            setServices([]);
            setSelectedService(undefined);
            return;
          }
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error("[ShippingFee] API lỗi", res.status, errText);
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        console.log("[ShippingFee] API response:", json);
        const data: ShippingService[] = json?.data ?? json ?? [];
        setServices(data);

        // Auto-select dịch vụ đầu tiên nếu chưa chọn
        if (data.length > 0) {
          setSelectedService((prev) => prev ?? data[0]);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[ShippingFee] Lỗi:", err);
        setError("Không thể tải phí vận chuyển");
        setServices([]);
      } finally {
        setLoading(false);
      }
    }, 500); // debounce 500ms

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [
    deliveryMode,
    address?.ward_id,
    address?.province_id,
    cart.length,
    totalAmount,
  ]);

  // Disable checkout khi cần thiết: shipping mode, có địa chỉ đầy đủ,
  // không loading, và (có lỗi hoặc không có dịch vụ nào khả dụng).
  const disableCheckout =
    deliveryMode === "shipping" &&
    !!address?.ward_id &&
    !!address?.province_id &&
    !loading &&
    (!!error || services.length === 0);

  return { services, loading, error, disableCheckout };
}
