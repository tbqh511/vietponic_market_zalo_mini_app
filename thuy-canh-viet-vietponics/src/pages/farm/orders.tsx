import { useEffect, useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { useFarmGuard, useEnsureJwt } from "@/hooks";
import { useFarmIncomingOrders } from "@/utils/farm-api";
import { farmPendingOrdersCountState } from "@/state";
import { FarmIncomingOrder } from "@/types";

// Trang "Đơn đang đến" của Farm Partner (route /farm/orders).
// Theo wireframe vietponics_farm_orders_wireframe.html:
//   1. Header "Đơn đang đến" + Live indicator (poll 30s qua useFarmIncomingOrders)
//   2. Card highlight "Cần chuẩn bị hôm nay": tổng kg · số đơn · ship/pickup split
//   3. Filter pills cuộn ngang: Tất cả / Chờ / Đang giao
//   4. List order card: mã đơn + giờ + tên KH (rút gọn) + status pill +
//      box xám liệt kê item CỦA FARM MÌNH + dòng giao hàng (ship/pickup)
//
// Backend (/farm/orders/incoming) trả flat order_items — FE group theo order_id.
// Không có cờ ship/pickup → suy từ delivery_address: có địa chỉ = ship, null = pickup.
// Màu chủ đạo: primary (green) + nền trắng/xám — đồng bộ dashboard & analytics.

// Đơn đã group: gộp các item cùng order_id thành 1 card.
interface GroupedOrder {
  order_id: number;
  order_status: FarmIncomingOrder["order_status"];
  order_created_at: string;
  customer_name: string | null;
  delivery_address: string | null;
  items: { item_id: number; product_name: string; quantity: number }[];
  total_qty: number;
  is_pickup: boolean;
}

// Hai nhóm tab FE: "chờ" gộp pending/confirmed/preparing; "đang giao" = delivering.
type FilterKey = "all" | "waiting" | "delivering";

const WAITING_STATUSES = ["pending", "confirmed", "preparing"] as const;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "waiting", label: "Chờ" },
  { key: "delivering", label: "Đang giao" },
];

// Format số lượng với 1 chữ số thập phân, ẩn .0 (2.0kg → 2kg). Đơn vị kg theo
// wireframe — sản phẩm rau của farm bán theo kg.
function fmtKg(n: number): string {
  return Number.isInteger(n) ? `${n}kg` : `${n.toFixed(1)}kg`;
}

// "2026-05-23 08:30:00" / ISO → "08:30". Fallback giữ nguyên nếu parse fail.
function fmtTime(raw: string): string {
  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Rút gọn tên KH để bảo vệ thông tin: "Nguyễn Văn A" → "N.V.A".
function shortenName(name: string | null): string {
  if (!name) return "Khách lẻ";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name;
  return parts.map((p) => p[0].toUpperCase()).join(".");
}

// Rút gọn địa chỉ giao xuống quận + tỉnh (2 đoạn cuối) cho gọn card.
function shortenAddress(addr: string | null): string {
  if (!addr) return "Giao tận nơi";
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 2) return addr;
  return parts.slice(-2).join(", ");
}

// Style cho status pill — bám màu hệ thống: chờ = amber, đang giao = green.
function statusPill(status: FarmIncomingOrder["order_status"]): {
  label: string;
  className: string;
} {
  if (status === "delivering") {
    return {
      label: "Đang giao",
      className: "bg-green-50 text-green-700",
    };
  }
  // pending / confirmed / preparing → gom thành "Chờ chuẩn bị".
  return {
    label: "Chờ chuẩn bị",
    className: "bg-amber-50 text-amber-700",
  };
}

export default function FarmOrdersPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();
  const [filter, setFilter] = useState<FilterKey>("all");
  const setPendingCount = useSetAtom(farmPendingOrdersCountState);

  useEffect(() => {
    ensureJwt();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const incoming = useFarmIncomingOrders(isFarm);

  // Group flat items → orders, sort theo created_at desc (mới nhất trên cùng).
  const orders = useMemo<GroupedOrder[]>(() => {
    const rows = incoming.data ?? [];
    const map = new Map<number, GroupedOrder>();
    for (const r of rows) {
      let g = map.get(r.order_id);
      if (!g) {
        g = {
          order_id: r.order_id,
          order_status: r.order_status,
          order_created_at: r.order_created_at,
          customer_name: r.customer_name,
          delivery_address: r.delivery_address,
          items: [],
          total_qty: 0,
          is_pickup: !r.delivery_address,
        };
        map.set(r.order_id, g);
      }
      g.items.push({
        item_id: r.item_id,
        product_name: r.product_name,
        quantity: r.quantity,
      });
      g.total_qty += r.quantity;
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.order_created_at.replace(" ", "T")).getTime() -
        new Date(a.order_created_at.replace(" ", "T")).getTime()
    );
  }, [incoming.data]);

  // Đếm cho filter pill + card highlight. waiting/delivering theo nhóm FE.
  const counts = useMemo(() => {
    let waiting = 0;
    let delivering = 0;
    for (const o of orders) {
      if (o.order_status === "delivering") delivering++;
      else waiting++;
    }
    return { all: orders.length, waiting, delivering };
  }, [orders]);

  // Đồng bộ badge tab "Đơn đến" — đếm đơn distinct có status 'pending'.
  // Chạy theo nhịp polling 30s của useFarmIncomingOrders (qua incoming.data).
  useEffect(() => {
    const pending = orders.filter((o) => o.order_status === "pending").length;
    setPendingCount(pending);
  }, [orders, setPendingCount]);

  // Highlight: tổng kg cần chuẩn bị + ship/pickup split (toàn bộ đơn đang đến).
  const summary = useMemo(() => {
    let totalQty = 0;
    let ship = 0;
    let pickup = 0;
    for (const o of orders) {
      totalQty += o.total_qty;
      if (o.is_pickup) pickup++;
      else ship++;
    }
    return { totalQty, ship, pickup };
  }, [orders]);

  const visible = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "delivering")
      return orders.filter((o) => o.order_status === "delivering");
    return orders.filter((o) =>
      (WAITING_STATUSES as readonly string[]).includes(o.order_status)
    );
  }, [orders, filter]);

  if (!isFarm) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  const isInitialLoading = incoming.loading && !incoming.data;

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-y-auto">
      <div className="m-3 bg-white rounded-2xl border border-gray-200 p-3.5">
        {/* Header + Live */}
        <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
          <div className="flex-1 text-[15px] font-medium">Đơn đang đến</div>
          <div className="flex items-center gap-1 text-[10px] text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        </div>

        {/* Card highlight: cần chuẩn bị hôm nay */}
        <div className="mt-3 p-3 bg-primary/10 rounded-xl">
          <div className="text-[11px] text-primary">Cần chuẩn bị hôm nay</div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-[22px] font-semibold text-primary leading-none">
              {fmtKg(summary.totalQty)}
            </div>
            <div className="text-xs text-primary">
              trong {counts.all} đơn
            </div>
          </div>
          <div className="text-[11px] text-primary/80 mt-1.5">
            {summary.ship} đơn ship · {summary.pickup} đơn pickup
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto -mx-0.5 px-0.5 pb-0.5">
          {FILTERS.map((f) => {
            const active = f.key === filter;
            const n = counts[f.key];
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-[11px] rounded-full whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary text-white font-medium"
                    : "border border-gray-200 text-gray-500 active:bg-gray-50"
                }`}
              >
                {f.label} · {n}
              </button>
            );
          })}
        </div>

        {/* List */}
        {isInitialLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Đang tải đơn hàng...
          </div>
        ) : incoming.error ? (
          <div className="py-12 text-center text-red-500 text-sm">
            {incoming.error}
            <button
              onClick={incoming.refresh}
              className="ml-2 text-primary underline"
            >
              Thử lại
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {orders.length === 0
              ? "Chưa có đơn nào đang đến."
              : "Không có đơn trong mục này."}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {visible.map((o) => (
              <OrderCard key={o.order_id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: GroupedOrder }) {
  const pill = statusPill(order.order_status);
  return (
    <div className="p-3 border border-gray-200 rounded-xl">
      {/* Top: mã đơn + giờ·KH | status pill */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-[13px] font-medium">#{order.order_id}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {fmtTime(order.order_created_at)} · {shortenName(order.customer_name)}
          </div>
        </div>
        <div
          className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${pill.className}`}
        >
          {pill.label}
        </div>
      </div>

      {/* Box xám: items của farm mình */}
      <div className="p-2 bg-gray-50 rounded-md text-xs">
        {order.items.map((it, i) => (
          <div
            key={it.item_id}
            className={`flex justify-between ${i > 0 ? "mt-1" : ""}`}
          >
            <span className="text-gray-700 truncate pr-2">
              {it.product_name}
            </span>
            <span className="font-medium shrink-0">{fmtKg(it.quantity)}</span>
          </div>
        ))}
      </div>

      {/* Dòng giao hàng: ship (truck) hoặc pickup (store) */}
      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500">
        {order.is_pickup ? (
          <>
            <StoreIcon />
            <span>Pickup tại cửa hàng</span>
          </>
        ) : (
          <>
            <TruckIcon />
            <span>Giao tận nơi · {shortenAddress(order.delivery_address)}</span>
          </>
        )}
      </div>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M3 9l1-5h16l1 5M4 9v11h16V9M3 9h18" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}
