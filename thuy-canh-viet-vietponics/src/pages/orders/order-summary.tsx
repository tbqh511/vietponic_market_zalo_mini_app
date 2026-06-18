import { Order, BackendOrderStatus, CartItem } from "@/types";
import { formatPrice } from "@/utils/format";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { cartState } from "@/state";
import toast from "react-hot-toast";
import { ShopIcon } from "@/components/vectors";

const STATUS_CONFIG: Record<BackendOrderStatus, { label: string; badgeClass: string }> = {
  pending:    { label: "Chờ xác nhận",  badgeClass: "bg-yellow-100 text-yellow-700" },
  confirmed:  { label: "Đang chuẩn bị", badgeClass: "bg-blue-100 text-blue-700" },
  preparing:  { label: "Đang đóng gói", badgeClass: "bg-blue-100 text-blue-700" },
  delivering: { label: "Đang giao",     badgeClass: "bg-orange-100 text-orange-700" },
  delivered:  { label: "Đã giao",       badgeClass: "bg-green-100 text-green-700" },
  cancelled:  { label: "Đã huỷ",        badgeClass: "bg-red-100 text-red-600" },
};

const REFUND_LABEL: Record<string, { text: string; color: string }> = {
  processing:     { text: "Đang hoàn tiền",        color: "text-yellow-700" },
  pending_manual: { text: "Chờ hoàn tiền (2–7 ngày)", color: "text-yellow-700" },
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
      className="bg-white rounded-xl overflow-hidden border border-black/10 mx-4 mb-3 cursor-pointer active:opacity-80 transition-opacity"
      onClick={handleCardClick}
    >
      {/* Header: shop name + status badge */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <ShopIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Vietponics</span>
        </div>
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
          <span className="text-xs text-gray-500">
            Tổng tiền ({itemCount} sản phẩm):{" "}
          </span>
          <span className="text-sm font-semibold text-gray-800">{formatPrice(order.total)}</span>
        </div>
        <button
          className="flex-shrink-0 text-sm text-primary border border-primary rounded-lg px-4 py-1.5 font-medium active:bg-primary/5"
          onClick={handleBuyAgain}
        >
          Mua lại
        </button>
      </div>
    </div>
  );
}

export default OrderSummary;
