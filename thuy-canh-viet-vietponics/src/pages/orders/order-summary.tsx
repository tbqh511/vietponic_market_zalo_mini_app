import { Order, BackendOrderStatus, CartItem } from "@/types";
import { formatPrice, formatDistant } from "@/utils/format";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { cartState } from "@/state";
import toast from "react-hot-toast";

const STATUS_CONFIG: Record<BackendOrderStatus, { label: string; badgeClass: string }> = {
  pending:    { label: "Chờ xác nhận",  badgeClass: "bg-green-100 text-green-700" },
  confirmed:  { label: "Đang chuẩn bị", badgeClass: "bg-green-100 text-green-700" },
  preparing:  { label: "Đang đóng gói", badgeClass: "bg-green-100 text-green-700" },
  delivering: { label: "Đang giao",     badgeClass: "bg-green-100 text-green-700" },
  delivered:  { label: "Đã giao",       badgeClass: "bg-green-600 text-white" },
  cancelled:  { label: "Đã huỷ",        badgeClass: "bg-red-100 text-red-600" },
};

const REFUND_LABEL: Record<string, { text: string; color: string }> = {
  processing:     { text: "Đang hoàn tiền",        color: "text-green-700" },
  pending_manual: { text: "Chờ hoàn tiền (2–7 ngày)", color: "text-green-700" },
  refunded:       { text: "Đã hoàn tiền ✓",         color: "text-green-700" },
  failed:         { text: "Hoàn tiền thất bại",     color: "text-red-600" },
};

function OrderSummary({ order, full }: { order: Order; full?: boolean }) {
  const navigate = useNavigate();
  const setCart = useSetAtom(cartState);

  const statusCfg = STATUS_CONFIG[order.status];
  const refundLabel = order.status === "cancelled" && order.refundStatus
    ? REFUND_LABEL[order.refundStatus]
    : null;

  const firstItem = order.items[0];
  const itemCount = order.items.length;

  const handleBuyAgain = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCart((prev) => {
      const next = [...prev];
      for (const item of order.items) {
        const existing = next.find((c) => c.product.id === item.product.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          next.push({ product: item.product, quantity: item.quantity } as CartItem);
        }
      }
      return next;
    });
    toast.success("Đã thêm vào giỏ hàng");
    navigate("/cart");
  };

  const handleCardClick = () => {
    if (!full) {
      navigate(`/order/${order.id}`, { state: order, viewTransition: true });
    }
  };

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden border border-black/10 cursor-pointer active:opacity-80 transition-opacity${full ? "" : " mx-4 mb-3"}`}
      onClick={handleCardClick}
    >
      {/* Header: delivery method + status badge */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
        {order.delivery.type === "pickup" ? (
          <div className="flex items-center gap-1.5 text-primary">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs font-medium">
              Tự đến lấy
              {order.delivery.distanceKm !== undefined && (
                <span className="text-primary/70 font-normal"> · {formatDistant(order.delivery.distanceKm)}</span>
              )}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-primary">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
              <path d="M3 4a1 1 0 00-1 1v7h1.05A2.5 2.5 0 017 10.05V9h6v1.05A2.5 2.5 0 0115.95 12H17V9.586a1 1 0 00-.293-.707l-2-2A1 1 0 0014 6.586V5a1 1 0 00-1-1H3z"/>
            </svg>
            <span className="text-xs font-medium">Giao tận nhà</span>
          </div>
        )}
        <div className="flex flex-col items-end gap-0.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.badgeClass}`}>
            {statusCfg.label}
          </span>
          {refundLabel && (
            <span className={`text-3xs ${refundLabel.color}`}>{refundLabel.text}</span>
          )}
        </div>
      </div>

      {/* Items */}
      {(full ? order.items : [firstItem]).map((item) => (
        <div key={item.product.id} className="flex gap-3 px-4 py-3">
          <img
            src={item.product.image}
            alt={item.product.name}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 line-clamp-2 leading-snug">{item.product.name}</p>
            <p className="text-sm font-semibold text-primary mt-1">{formatPrice(item.product.price)}</p>
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap pt-0.5">x{item.quantity}</span>
        </div>
      ))}

      {/* "Xem thêm" khi list mode và có nhiều hơn 1 sản phẩm */}
      {!full && itemCount > 1 && (
        <p className="text-xs text-gray-400 px-4 pb-2 -mt-1">
          + {itemCount - 1} sản phẩm khác
        </p>
      )}

      {/* Footer: total + Mua lại */}
      <div className="border-t border-black/5 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs text-gray-500">Tổng tiền: </span>
          <span className="text-sm font-semibold text-gray-800">{formatPrice(order.total)}</span>
        </div>
        <button
          className="flex-shrink-0 text-sm text-white bg-primary rounded-lg px-4 py-1.5 font-medium active:opacity-80"
          onClick={handleBuyAgain}
        >
          Mua lại
        </button>
      </div>
    </div>
  );
}

export default OrderSummary;
