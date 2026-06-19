import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "zmp-ui";
import { ApiOrder, Order } from "@/types";
import { convertApiOrderToOrder } from "@/state";
import { request } from "@/utils/request";
import OrderSummary from "./order-summary";
import OrderInfo from "./order-info";
import OrderTracking from "./order-tracking";
import CancelOrderModal from "./cancel-modal";

const CANCELLABLE_STATUSES: Order["status"][] = ["pending", "confirmed", "preparing"];

/**
 * Nhãn hoàn tiền SAU khi huỷ — phản ánh refund_status THẬT, key theo cả
 * payment_method (đồng bộ RefundService backend). Trả null khi không cần hiện.
 *
 *  not_required (COD/chưa trả) → ẩn dòng hoàn tiền.
 *  processing                  → ZaloPay tự hoàn (5–15′); method khác: chung.
 *  pending_manual              → SLA theo method (MoMo ~24h / Bank 2–7 ngày);
 *                                ZaloPay (auto-refund fail) / method lạ → xử lý thủ công.
 *  refunded / failed           → trạng thái cuối.
 */
function refundStatusInfo(order: Order): { text: string; tone: "info" | "ok" | "warn" } | null {
  const status = order.refundStatus;
  if (!status || status === "not_required") return null;

  const method = (order.paymentMethod ?? "").toUpperCase();

  if (status === "refunded") return { text: "Đã hoàn tiền ✓", tone: "ok" };
  if (status === "failed") {
    return { text: "Hoàn tiền thất bại — bộ phận hỗ trợ sẽ liên hệ bạn.", tone: "warn" };
  }
  if (status === "processing") {
    if (method.startsWith("ZALOPAY")) {
      return { text: "Đang hoàn tiền về ví ZaloPay (trong 5–15 phút).", tone: "warn" };
    }
    return { text: "Đang hoàn tiền về ví thanh toán…", tone: "warn" };
  }
  // pending_manual
  if (method.startsWith("MOMO")) {
    return { text: "Chờ hoàn tiền về ví MoMo (~24 giờ).", tone: "warn" };
  }
  if (method.startsWith("BANK")) {
    return { text: "Chờ hoàn tiền về tài khoản ngân hàng (2–7 ngày làm việc).", tone: "warn" };
  }
  // ZaloPay auto-refund thất bại → pending_manual, hoặc method không xác định.
  return {
    text: "Hoàn tiền tự động chưa thành công — đang xử lý thủ công, vui lòng liên hệ hỗ trợ.",
    tone: "warn",
  };
}

function OrderDetailPage() {
  const { state } = useLocation();
  const initialOrder = state as Order;
  const [order, setOrder] = useState<Order>(initialOrder);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

  // Refresh từ server để lấy tracking events mới nhất — state.location chỉ là snapshot
  // tại thời điểm click vào order list, chưa có tracking_events.
  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (!token || !initialOrder?.id) return;
    let cancelled = false;
    request<{ error: boolean; data: ApiOrder }>(`/orders/${initialOrder.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (cancelled || !res?.data) return;
        setOrder(convertApiOrderToOrder(res.data));
      })
      .catch(() => {
        /* giữ snapshot ban đầu nếu refresh fail */
      });
    return () => {
      cancelled = true;
    };
  }, [initialOrder?.id]);

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const refundInfo = refundStatusInfo(order);

  return (
    <div className="w-full p-4 space-y-2 pb-24">
      <OrderInfo order={order} />
      <OrderTracking order={order} />
      <OrderSummary full order={order} />

      {order.status === "cancelled" && (
        <div className="bg-white rounded-lg p-4 space-y-2">
          <div className="text-sm font-medium text-danger">Đơn hàng đã huỷ</div>
          {order.cancellationReason && (
            <div className="text-xs text-subtitle">
              Lý do: {order.cancellationReason}
            </div>
          )}
          {refundInfo && (
            <div
              className={`text-xs ${
                refundInfo.tone === "ok"
                  ? "text-green-700"
                  : refundInfo.tone === "warn"
                  ? "text-green-700"
                  : "text-subtitle"
              }`}
            >
              {refundInfo.text}
            </div>
          )}
        </div>
      )}

      {canCancel && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-10">
          <Button
            fullWidth
            onClick={() => setCancelTarget(order)}
            className="bg-red-600 text-white"
          >
            Huỷ đơn hàng
          </Button>
        </div>
      )}

      <CancelOrderModal
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={(updated) => setOrder({ ...order, ...updated, items: order.items, delivery: order.delivery })}
      />
    </div>
  );
}

export default OrderDetailPage;
