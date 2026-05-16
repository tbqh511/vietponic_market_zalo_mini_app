import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "zmp-ui";
import { Order } from "@/types";
import OrderSummary from "./order-summary";
import OrderInfo from "./order-info";
import CancelOrderModal from "./cancel-modal";

const CANCELLABLE_STATUSES: Order["status"][] = ["pending", "confirmed", "preparing"];

const REFUND_STATUS_LABEL: Record<NonNullable<Order["refundStatus"]>, { text: string; tone: "info" | "ok" | "warn" }> = {
  not_required: { text: "Không phát sinh hoàn tiền", tone: "info" },
  pending_manual: { text: "Chờ hoàn tiền — kế toán đang xử lý (2–7 ngày)", tone: "warn" },
  processing: { text: "Đang hoàn tiền về ví thanh toán...", tone: "warn" },
  refunded: { text: "Đã hoàn tiền ✓", tone: "ok" },
  failed: { text: "Hoàn tiền thất bại — bộ phận hỗ trợ sẽ liên hệ bạn", tone: "warn" },
};

function OrderDetailPage() {
  const { state } = useLocation();
  const initialOrder = state as Order;
  const [order, setOrder] = useState<Order>(initialOrder);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const refundInfo = order.refundStatus ? REFUND_STATUS_LABEL[order.refundStatus] : null;

  return (
    <div className="w-full p-4 space-y-2 pb-24">
      <OrderInfo order={order} />
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
                  ? "text-yellow-700"
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
