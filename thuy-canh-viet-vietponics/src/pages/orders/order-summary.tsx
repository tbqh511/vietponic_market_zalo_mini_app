import HorizontalDivider from "@/components/horizontal-divider";
import Section from "@/components/section";
import { Order } from "@/types";
import { formatPrice, formatDate } from "@/utils/format";
import CollapsibleOrderItems from "./collapsible-order-items";
import { useNavigate } from "react-router-dom";

function OrderSummary(props: { order: Order; full?: boolean }) {
  const navigate = useNavigate();
  const isCancelled = props.order.status === "cancelled";
  const refundStatus = props.order.refundStatus;

  // Subtitle phụ cho refund (chỉ hiển thị khi đơn đã huỷ)
  let refundSubtitle: { text: string; color: string } | null = null;
  if (isCancelled && refundStatus) {
    if (refundStatus === "processing") {
      refundSubtitle = { text: "Đang hoàn tiền", color: "text-yellow-700" };
    } else if (refundStatus === "pending_manual") {
      refundSubtitle = { text: "Chờ hoàn tiền (2–7 ngày)", color: "text-yellow-700" };
    } else if (refundStatus === "refunded") {
      refundSubtitle = { text: "Đã hoàn tiền ✓", color: "text-green-700" };
    } else if (refundStatus === "failed") {
      refundSubtitle = { text: "Hoàn tiền thất bại", color: "text-danger" };
    }
  }

  return (
    <Section
      title={
        <div className="w-full flex justify-between items-center space-x-2 font-normal">
          <span className="text-xs truncate">
            {isCancelled
              ? `Đã huỷ: ${props.order.cancelledAt ? formatDate(props.order.cancelledAt) : ""}`
              : `Dự kiến nhận: ${formatDate(props.order.receivedAt)}`}
          </span>
          {isCancelled ? (
            <div className="flex flex-col items-end">
              <span className="text-xs text-danger font-medium">Đã huỷ</span>
              {refundSubtitle && (
                <span className={`text-4xs ${refundSubtitle.color}`}>
                  {refundSubtitle.text}
                </span>
              )}
            </div>
          ) : (
            <span
              className={`text-xs ${
                props.order.paymentStatus === "failed"
                  ? "text-danger"
                  : "text-primary"
              }`}
            >
              {
                {
                  pending: "Chờ xác nhận",
                  success: "Đã thanh toán",
                  failed: "Thanh toán thất bại",
                }[props.order.paymentStatus]
              }
            </span>
          )}
        </div>
      }
      className="flex-1 overflow-y-auto rounded-lg"
      onClick={() => {
        if (!props.full) {
          navigate(`/order/${props.order.id}`, {
            state: props.order,
            viewTransition: true,
          });
        }
      }}
    >
      <div className="w-full">
        <CollapsibleOrderItems
          items={props.order.items}
          defaultExpanded={props.full}
        />
      </div>
      <HorizontalDivider />
      <div className="flex justify-between items-center px-4 py-2 space-x-4">
        <div className="text-xs">Tổng tiền hàng</div>
        <div className="text-sm font-medium">
          {formatPrice(props.order.total)}
        </div>
      </div>
    </Section>
  );
}

export default OrderSummary;
