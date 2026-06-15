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
import { useEnsureJwt } from "@/hooks";

const API_URL = getConfig((c) => c.template.apiUrl).replace(/\/+$/, "");

export function useShippingFee() {
  const cart = useAtomValue(cartState);
  const address = useAtomValue(shippingAddressState);
  const deliveryMode = useAtomValue(deliveryModeState);
  const { totalAmount } = useAtomValue(cartTotalState);
  const setSelectedService = useSetAtom(selectedShippingServiceState);
  const ensureJwt = useEnsureJwt();

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
        // Đảm bảo có JWT hợp lệ (auto refresh nếu expired) trước khi gọi
        // protected endpoint, tránh 401 do token cũ.
        const token = await ensureJwt();
        if (!token) {
          console.warn("[ShippingFee] Không lấy được JWT token");
          setError("Vui lòng đăng nhập lại để tính phí vận chuyển");
          setServices([]);
          setSelectedService(null);
          return;
        }

        const payload = {
          items: cart.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
          })),
          receiver_province_id: address.province_id,
          // VTP API v3 đã bỏ cấp huyện → district_id thường là null/undefined,
          // backend tự lookup từ ward và set = 0. Chỉ gửi khi thực sự có giá trị.
          ...(address.district_id
            ? { receiver_district_id: address.district_id }
            : {}),
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

        // Đọc body 1 lần duy nhất để tránh "body already consumed"
        const bodyText = await res.text();
        let bodyJson: any = null;
        try {
          bodyJson = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          // backend trả non-JSON (HTML error page, proxy timeout, …)
        }

        if (res.status === 422) {
          if (bodyJson?.code === "NO_PICKUP_STATION") {
            console.warn("[ShippingFee] Không có trạm cấu hình VTP", bodyJson);
            setError(
              bodyJson.message ??
                "Hiện chưa có trạm lấy hàng phù hợp, vui lòng liên hệ shop"
            );
            setServices([]);
            setSelectedService(null);
            return;
          }
          // Validation error khác — hiển thị message cụ thể từ backend
          const msg = bodyJson?.message ?? "Địa chỉ không hợp lệ";
          console.error("[ShippingFee] Validation lỗi 422", bodyJson);
          setError(msg);
          setServices([]);
          setSelectedService(null);
          return;
        }

        if (!res.ok) {
          console.error(
            "[ShippingFee] API lỗi HTTP",
            res.status,
            bodyJson ?? bodyText?.slice(0, 500)
          );
          if (res.status === 401) {
            setError("Phiên đăng nhập đã hết hạn, vui lòng thử lại");
          } else {
            setError(
              bodyJson?.message ??
                `Không thể tải phí vận chuyển (lỗi ${res.status})`
            );
          }
          setServices([]);
          setSelectedService(null);
          return;
        }

        console.log("[ShippingFee] API response:", bodyJson);
        const data: ShippingService[] = bodyJson?.data ?? bodyJson ?? [];
        setServices(data);

        if (data.length === 0) {
          setError("Không có dịch vụ vận chuyển khả dụng cho địa chỉ này");
          setSelectedService(null);
        } else {
          // Auto-select dịch vụ đầu tiên nếu chưa chọn
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

  // Disable checkout khi:
  // 1. Shipping mode mà chưa có địa chỉ (ward_id hoặc province_id trống)
  // 2. Shipping mode, có địa chỉ, nhưng không loading và (có lỗi hoặc không có dịch vụ)
  const noAddress =
    deliveryMode === "shipping" &&
    (!address?.ward_id || !address?.province_id);

  const noService =
    deliveryMode === "shipping" &&
    !!address?.ward_id &&
    !!address?.province_id &&
    !loading &&
    (!!error || services.length === 0);

  const disableCheckout = noAddress || noService;

  const addressError = noAddress ? "Vui lòng thêm địa chỉ nhận hàng trước khi thanh toán." : null;

  return { services, loading, error: addressError ?? error, disableCheckout };
}
