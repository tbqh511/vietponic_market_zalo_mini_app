import OrderList from "./order-list";
import { ordersState } from "@/state";
import { useNavigate, useParams } from "react-router-dom";
import ProfileGate from "@/components/profile-gate";
import { Navigate } from "react-router-dom";
import { OrderStatus } from "@/types";

const TABS: { key: OrderStatus; label: string }[] = [
  { key: "confirming", label: "Chờ xác nhận" },
  { key: "packing",    label: "Chờ lấy hàng" },
  { key: "shipping",   label: "Chờ giao hàng" },
  { key: "review",     label: "Đánh giá" },
  { key: "cancelled",  label: "Đã huỷ" },
];

function OrdersPage() {
  const { status } = useParams();
  const navigate = useNavigate();

  if (!status) {
    return <Navigate to="/orders/confirming" replace />;
  }

  const activeStatus = status as OrderStatus;

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable tab bar */}
      <div className="bg-white border-b border-black/10 flex-shrink-0">
        <div
          className="flex overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {TABS.map((tab) => {
            const isActive = activeStatus === tab.key;
            return (
              <button
                key={tab.key}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500"
                }`}
                onClick={() => navigate(`/orders/${tab.key}`)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <OrderList ordersState={ordersState(activeStatus)} />
      </div>

      <ProfileGate />
    </div>
  );
}

export default OrdersPage;
