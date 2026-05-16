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
      return;
    }
    if (!address?.ward_id || !address?.district_id || !address?.province_id) {
      setServices([]);
      return;
    }
    if (cart.length === 0) {
      setServices([]);
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
      try {
        const token = localStorage.getItem("jwt_token") ?? "";
        const body = JSON.stringify({
          items: cart.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
          })),
          receiver_province_id: address.province_id,
          receiver_district_id: address.district_id,
          receiver_ward_id: address.ward_id,
          product_price: totalAmount,
          is_cod: false,
        });

        const res = await fetch(`${API_URL}/shipping/estimate`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        const data: ShippingService[] = json?.data ?? json ?? [];
        setServices(data);

        // Auto-select dịch vụ đầu tiên nếu chưa chọn
        if (data.length > 0) {
          setSelectedService((prev) => prev ?? data[0]);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
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
    address?.district_id,
    address?.province_id,
    cart.length,
    totalAmount,
  ]);

  return { services, loading, error };
}
