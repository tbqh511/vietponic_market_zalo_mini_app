import OrderList from "./order-list";
import { allOrdersAtom, ordersState } from "@/state";
import { useNavigate, useParams } from "react-router-dom";
import ProfileGate from "@/components/profile-gate";
import { Navigate } from "react-router-dom";
import { OrderStatus } from "@/types";
import { useRef, useState, useCallback, useEffect } from "react";
import { useSetAtom } from "jotai";

const TABS: { key: OrderStatus; label: string }[] = [
  { key: "confirming", label: "Chờ xác nhận" },
  { key: "packing",    label: "Chờ lấy hàng" },
  { key: "shipping",   label: "Chờ giao hàng" },
  { key: "review",     label: "Đánh giá" },
  { key: "cancelled",  label: "Đã huỷ" },
];

const PULL_THRESHOLD = 60;

function OrdersPage() {
  const { status } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Phải gọi hooks trước early return — dùng fallback khi status chưa có
  const activeStatus = (status ?? "confirming") as OrderStatus;
  const refreshOrders = useSetAtom(allOrdersAtom);

  // Auto-refresh khi vào trang để đảm bảo data luôn mới
  useEffect(() => {
    refreshOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing) return;
      const scrollEl = scrollRef.current;
      if (!scrollEl || scrollEl.scrollTop > 0) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) {
        setPullDistance(Math.min(dy, PULL_THRESHOLD * 1.5));
      }
    },
    [isRefreshing]
  );

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      refreshOrders();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => setIsRefreshing(false), 1500);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, refreshOrders]);

  if (!status) {
    return <Navigate to="/orders/confirming" replace />;
  }

  const isPulledEnough = pullDistance >= PULL_THRESHOLD;
  const indicatorHeight = isRefreshing ? 44 : Math.min(pullDistance * 0.6, 40);

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

      {/* Pull-to-refresh indicator */}
      <div
        className="flex-shrink-0 bg-gray-50 flex items-center justify-center gap-2 text-sm overflow-hidden"
        style={{
          height: indicatorHeight,
          transition: isRefreshing ? "height 0.2s ease" : "none",
          opacity: indicatorHeight > 4 ? 1 : 0,
        }}
      >
        {isRefreshing ? (
          <>
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500">Đang tải...</span>
          </>
        ) : (
          <span
            className="text-gray-400 text-lg"
            style={{
              transform: `rotate(${isPulledEnough ? 180 : 0}deg)`,
              transition: "transform 0.2s ease",
            }}
          >
            ↓
          </span>
        )}
      </div>

      {/* Tab content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <OrderList ordersState={ordersState(activeStatus)} />
      </div>

      <ProfileGate />
    </div>
  );
}

export default OrdersPage;
