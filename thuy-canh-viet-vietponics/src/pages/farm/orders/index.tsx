import { useEffect, useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { useFarmGuard, useEnsureJwt } from "@/hooks";
import {
  useFarmIncomingOrders,
  useFarmProfile,
  useFarmStaff,
  assignPacker,
  claimOrder,
  startPacking,
  confirmPacked,
  confirmOrder,
  handoffShip,
} from "@/utils/farm-api";
import { farmPendingOrdersCountState } from "@/state";
import { FarmIncomingOrder, PackingStatus } from "@/types";

// Trang "Đơn đến" của Farm Partner (route /farm/orders) — kiêm khu vực ĐÓNG GÓI.
// Hai giao diện theo vai trò (wireframe Màn 1 / Màn 2):
//
//   Màn 1 — Chủ farm / Admin (is_owner):
//     Header "Đơn đến" + badge "Chủ farm". Card highlight "Cần chuẩn bị hôm nay".
//     Filter: Tất cả / Chờ xác nhận / Đang đóng / Đã đóng.
//     Hành động: "Xác nhận đơn" (pending→confirmed), "Phân công"/"Đổi người",
//     "Bàn giao ship" (preparing→delivering khi mọi phần farm đã đóng xong).
//
//   Màn 2 — Nhân viên đóng gói (staff):
//     Header "Đơn cần đóng gói" + badge "NV. <tên>". Mô hình self-claim:
//     thấy mọi đơn của farm; đơn chưa ai nhận → "Nhận đóng gói" (claim);
//     đơn của mình → "Bắt đầu" → "Hoàn tất đóng gói"; đơn người khác đang đóng
//     → khoá ("NV. X đang đóng — không thể nhận").
//
// Phân quyền do backend enforce (owner-only: confirm-order/handoff/assign;
// staff: claim/start/confirm-packed của phiếu mình). Bảo mật: customer
// name/phone/address đã được server CHE — FE hiển thị trực tiếp.

interface GroupedOrder {
  order_id: number;
  order_status: FarmIncomingOrder["order_status"];
  order_created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  is_pickup: boolean;
  station_name: string | null;
  items: { item_id: number; product_name: string; quantity: number }[];
  total_qty: number;
  assignment_status: PackingStatus;
  assigned_customer_id: number | null;
  assigned_customer_name: string | null;
  packing_started_at: string | null;
  packed_at: string | null;
  is_mine: boolean;
}

// Filter cho owner (Màn 1) — theo wireframe.
type OwnerFilter = "all" | "to_confirm" | "packing" | "packed";
// Filter cho staff (Màn 2).
type StaffFilter = "available" | "mine" | "locked";

function fmtKg(n: number): string {
  return Number.isInteger(n) ? `${n}kg` : `${n.toFixed(1)}kg`;
}

function fmtTime(raw: string | null): string {
  if (!raw) return "";
  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Tên rút gọn: "Nguyễn Văn A" → "N.V.A". Server đã che một phần; rút thêm
// làm lớp phòng vệ thứ hai.
function shortenName(name: string | null): string {
  if (!name) return "Khách lẻ";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name;
  return parts.map((p) => p[0].toUpperCase()).join(".");
}

// Nhãn nhân viên: "Nguyễn Văn Tuấn" → "NV. Tuấn" (chữ cái đầu các tên + tên cuối).
function staffLabel(name: string | null): string {
  if (!name) return "Nhân viên";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name;
  const initials = parts.slice(0, -1).map((p) => p[0].toUpperCase()).join("");
  return `${initials}. ${parts[parts.length - 1]}`;
}

// Initials cho avatar tròn: "A Farm" → "AF", "Nguyễn Tuấn" → "NT".
function avatarInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Pill trạng thái ĐƠN (góc phải card).
function statusPill(status: FarmIncomingOrder["order_status"]): {
  label: string;
  className: string;
} {
  switch (status) {
    case "delivering":
      return { label: "Đang giao", className: "bg-green-50 text-green-700" };
    case "pending":
      return { label: "Chờ xác nhận", className: "bg-gray-100 text-gray-600" };
    case "preparing":
      return { label: "Đang chuẩn bị", className: "bg-amber-50 text-amber-700" };
    default:
      return { label: "Đã xác nhận", className: "bg-blue-50 text-blue-700" };
  }
}

export default function FarmOrdersPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();
  const setPendingCount = useSetAtom(farmPendingOrdersCountState);

  useEffect(() => {
    ensureJwt();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const profile = useFarmProfile(isFarm);
  const incoming = useFarmIncomingOrders(isFarm);
  const viewer = profile.data?.viewer;
  const isOwner = viewer?.is_owner ?? false;
  // Chỉ Package Hub mới thao tác đơn; farm thường = xem chỉ-đọc.
  const isHub =
    viewer?.is_packing_hub ?? profile.data?.is_packing_hub ?? false;
  const myId = viewer?.customer_id ?? null;
  // Owner CỦA HUB mới cần danh sách nhân viên (để dropdown phân công).
  const staffList = useFarmStaff(isFarm && isHub && isOwner);

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
          customer_phone: r.customer_phone,
          delivery_address: r.delivery_address,
          is_pickup: r.is_pickup,
          station_name: r.station_name,
          items: [],
          total_qty: 0,
          assignment_status: r.assignment_status,
          assigned_customer_id: r.assigned_customer_id,
          assigned_customer_name: r.assigned_customer_name,
          packing_started_at: r.packing_started_at,
          packed_at: r.packed_at,
          is_mine: r.is_mine,
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

  // Badge tab "Đơn đến" — đếm đơn distinct status 'pending'. Chỉ có ý nghĩa cho
  // hub (người xử lý đơn); farm thường không thao tác nên badge = 0.
  useEffect(() => {
    const pending = isHub
      ? orders.filter((o) => o.order_status === "pending").length
      : 0;
    setPendingCount(pending);
  }, [orders, isHub, setPendingCount]);

  if (!isFarm) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  const isInitialLoading = (incoming.loading && !incoming.data) || !profile.data;

  return (
    <div className="flex flex-col min-h-full bg-gray-100">
      <div className="m-3 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header gradient: avatar + tên farm + badge vai trò */}
        <div className="flex items-center gap-3 px-4 py-3 bg-primary text-white">
          <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-sm font-semibold shrink-0">
            {avatarInitials(profile.data?.name ?? null)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold truncate">
              {profile.data?.name ?? "Farm"}
            </div>
            <div className="text-[11px] text-white/85">
              {!isHub
                ? "Đơn có hàng của bạn"
                : isOwner
                ? "Đơn đến"
                : "Đơn cần đóng gói"}
            </div>
          </div>
          <div className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white/20 whitespace-nowrap">
            {!isHub
              ? "Chỉ xem"
              : isOwner
              ? "Chủ farm"
              : staffLabel(viewer?.name ?? null)}
          </div>
        </div>

        <div className="p-3.5">
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
          ) : !isHub ? (
            <ReadOnlyView orders={orders} />
          ) : isOwner ? (
            <OwnerView
              orders={orders}
              staff={staffList.data ?? []}
              onChanged={incoming.refresh}
            />
          ) : (
            <StaffView
              orders={orders}
              myId={myId}
              onChanged={incoming.refresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Màn 1: Chủ farm / Admin ──────────────────────────────────────────────────

function OwnerView({
  orders,
  staff,
  onChanged,
}: {
  orders: GroupedOrder[];
  staff: { id: number; name: string; farm_role: string | null }[];
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<OwnerFilter>("all");

  const summary = useMemo(() => {
    let totalQty = 0;
    for (const o of orders) totalQty += o.total_qty;
    return { totalQty, count: orders.length };
  }, [orders]);

  const counts = useMemo(() => {
    let toConfirm = 0;
    let packing = 0;
    let packed = 0;
    for (const o of orders) {
      if (o.order_status === "pending") toConfirm++;
      if (
        o.assignment_status === "assigned" ||
        o.assignment_status === "packing"
      )
        packing++;
      if (o.assignment_status === "packed") packed++;
    }
    return { all: orders.length, toConfirm, packing, packed };
  }, [orders]);

  const filters: { key: OwnerFilter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: counts.all },
    { key: "to_confirm", label: "Chờ xác nhận", count: counts.toConfirm },
    { key: "packing", label: "Đang đóng", count: counts.packing },
    { key: "packed", label: "Đã đóng", count: counts.packed },
  ];

  const visible = useMemo(() => {
    switch (filter) {
      case "to_confirm":
        return orders.filter((o) => o.order_status === "pending");
      case "packing":
        return orders.filter(
          (o) =>
            o.assignment_status === "assigned" ||
            o.assignment_status === "packing"
        );
      case "packed":
        return orders.filter((o) => o.assignment_status === "packed");
      default:
        return orders;
    }
  }, [orders, filter]);

  return (
    <>
      {/* Card highlight: cần chuẩn bị hôm nay */}
      <div className="p-3 bg-primary/10 rounded-xl">
        <div className="text-[11px] text-primary">Cần chuẩn bị hôm nay</div>
        <div className="flex items-baseline gap-1.5 mt-1">
          <div className="text-[22px] font-semibold text-primary leading-none">
            {fmtKg(summary.totalQty)}
          </div>
          <div className="text-xs text-primary">· {summary.count} đơn</div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mt-3 overflow-x-auto -mx-0.5 px-0.5 pb-0.5">
        {filters.map((f) => {
          const active = f.key === filter;
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
              {f.label} · {f.count}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          {orders.length === 0
            ? "Chưa có đơn nào đang đến."
            : "Không có đơn trong mục này."}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {visible.map((o) => (
            <OwnerCard
              key={o.order_id}
              order={o}
              staff={staff}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </>
  );
}

function OwnerCard({
  order,
  staff,
  onChanged,
}: {
  order: GroupedOrder;
  staff: { id: number; name: string; farm_role: string | null }[];
  onChanged: () => void;
}) {
  const pill = statusPill(order.order_status);
  const { busy, err, run } = useAction(onChanged);
  const [picking, setPicking] = useState(false);

  const isDelivering = order.order_status === "delivering";
  const isPending = order.order_status === "pending";
  const isPacked = order.assignment_status === "packed";
  // Có thể bàn giao ship khi đơn đã đóng xong (packed) mà chưa đang giao.
  const canHandoff = isPacked && !isDelivering;
  const packerName =
    order.assigned_customer_name ??
    (order.assigned_customer_id != null
      ? staff.find((s) => s.id === order.assigned_customer_id)?.name ?? null
      : null);

  return (
    <div className="p-3 border border-gray-200 rounded-xl">
      {/* Top: mã đơn + giờ·KH·địa chỉ | status pill */}
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-medium">#{order.order_id}</div>
          <div className="text-[11px] text-gray-500 mt-0.5 truncate">
            {shortenName(order.customer_name)}
            {!order.is_pickup && order.delivery_address
              ? ` · ${order.delivery_address}`
              : order.is_pickup
              ? " · Pickup"
              : ""}
          </div>
        </div>
        <div
          className={`px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0 ${pill.className}`}
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
            <span className="font-medium shrink-0">×{fmtKg(it.quantity)}</span>
          </div>
        ))}
      </div>

      {/* Dòng trạng thái đóng gói + người đóng */}
      {isDelivering ? (
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-green-700">
          <TruckIcon />
          <span>Đã bàn giao vận chuyển</span>
        </div>
      ) : order.assignment_status === "packing" && packerName ? (
        <div className="text-[11px] text-amber-700 mt-2">
          ◐ Đang đóng: {staffLabel(packerName)}
        </div>
      ) : isPacked ? (
        <div className="text-[11px] text-green-700 mt-2">
          ✓ Đóng bởi: {staffLabel(packerName)}
          {order.packed_at ? ` · ${fmtTime(order.packed_at)}` : ""}
        </div>
      ) : order.assignment_status === "assigned" && packerName ? (
        <div className="text-[11px] text-blue-700 mt-2">
          ⊙ Đã giao: {staffLabel(packerName)}
        </div>
      ) : (
        <div className="text-[11px] text-gray-400 mt-2">Chưa phân công</div>
      )}

      {err && <div className="text-[11px] text-red-500 mt-1.5">{err}</div>}

      {/* Hành động owner */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {isPending && (
          <button
            disabled={busy}
            onClick={() => run(() => confirmOrder(order.order_id))}
            className="flex-1 min-w-[8rem] px-3 py-2 text-[12px] rounded-lg bg-primary text-white font-medium disabled:opacity-50"
          >
            Xác nhận đơn
          </button>
        )}

        {canHandoff && (
          <button
            disabled={busy}
            onClick={() => run(() => handoffShip(order.order_id))}
            className="flex-1 min-w-[8rem] px-3 py-2 text-[12px] rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
          >
            Bàn giao ship
          </button>
        )}

        {/* Phân công / đổi người — ẩn khi đã đóng xong hoặc đang giao */}
        {!isPending && !isPacked && !isDelivering && (
          <button
            onClick={() => setPicking((p) => !p)}
            className="px-3 py-2 text-[12px] rounded-lg border border-primary text-primary active:bg-primary/5"
          >
            {order.assigned_customer_id ? "Đổi người" : "Phân công"}
          </button>
        )}
      </div>

      {/* Picker phân công */}
      {picking && (
        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
          <div className="text-[11px] text-gray-500 mb-1.5">
            Chọn người đóng gói:
          </div>
          <div className="flex flex-col gap-1">
            {staff.length === 0 ? (
              <div className="text-[11px] text-gray-400">
                Farm chưa có nhân viên.
              </div>
            ) : (
              staff.map((s) => (
                <button
                  key={s.id}
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await assignPacker(order.order_id, s.id);
                      setPicking(false);
                    })
                  }
                  className={`text-left px-2.5 py-1.5 text-[11px] rounded-md border disabled:opacity-50 ${
                    order.assigned_customer_id === s.id
                      ? "border-primary text-primary bg-primary/5"
                      : "border-gray-200 text-gray-700 active:bg-white"
                  }`}
                >
                  {s.name}
                  {s.farm_role === "owner" ? " (chủ farm)" : ""}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Màn 3: Farm thường (chỉ xem) ─────────────────────────────────────────────
// Farm KHÔNG phải Package Hub: chỉ thấy đơn có hàng của mình, KHÔNG thao tác.
// Đơn được xử lý bởi bộ phận đóng gói Vietponics (hub).

function ReadOnlyView({ orders }: { orders: GroupedOrder[] }) {
  const summary = useMemo(() => {
    let totalQty = 0;
    for (const o of orders) totalQty += o.total_qty;
    return { totalQty, count: orders.length };
  }, [orders]);

  return (
    <>
      {/* Card thông báo: đơn do hub xử lý */}
      <div className="p-3 bg-blue-50 rounded-xl">
        <div className="text-[11px] text-blue-700">
          Hàng của bạn trong đơn đang đến
        </div>
        <div className="flex items-baseline gap-1.5 mt-1">
          <div className="text-[22px] font-semibold text-blue-700 leading-none">
            {fmtKg(summary.totalQty)}
          </div>
          <div className="text-xs text-blue-700">· {summary.count} đơn</div>
        </div>
        <div className="text-[11px] text-blue-600/80 mt-1.5">
          Đơn được đóng gói bởi bộ phận đóng gói Vietponics.
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          Chưa có đơn nào chứa hàng của bạn.
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {orders.map((o) => (
            <ReadOnlyCard key={o.order_id} order={o} />
          ))}
        </div>
      )}
    </>
  );
}

function ReadOnlyCard({ order }: { order: GroupedOrder }) {
  const pill = statusPill(order.order_status);

  return (
    <div className="p-3 border border-gray-200 rounded-xl">
      {/* Top: mã đơn + giờ | status pill */}
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-medium">#{order.order_id}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {fmtTime(order.order_created_at)}
          </div>
        </div>
        <div
          className={`px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0 ${pill.className}`}
        >
          {pill.label}
        </div>
      </div>

      {/* Box xám: items của farm mình trong đơn */}
      <div className="p-2 bg-gray-50 rounded-md text-xs">
        {order.items.map((it, i) => (
          <div
            key={it.item_id}
            className={`flex justify-between ${i > 0 ? "mt-1" : ""}`}
          >
            <span className="text-gray-700 truncate pr-2">
              {it.product_name}
            </span>
            <span className="font-medium shrink-0">×{fmtKg(it.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-gray-400 mt-2">
        Đang được xử lý bởi bộ phận đóng gói Vietponics
      </div>
    </div>
  );
}

// ─── Màn 2: Nhân viên đóng gói ────────────────────────────────────────────────

function StaffView({
  orders,
  myId,
  onChanged,
}: {
  orders: GroupedOrder[];
  myId: number | null;
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<StaffFilter>("available");

  // Staff chỉ làm việc trên đơn đã xác nhận (>= confirmed) — đơn pending còn
  // chờ chủ farm xác nhận, chưa vào khâu đóng gói.
  const packable = useMemo(
    () => orders.filter((o) => o.order_status !== "pending"),
    [orders]
  );

  const counts = useMemo(() => {
    let available = 0;
    let mine = 0;
    let locked = 0;
    for (const o of packable) {
      if (o.is_mine && o.assignment_status !== "packed") mine++;
      else if (o.assignment_status === "unassigned") available++;
      else if (!o.is_mine && o.assignment_status !== "packed") locked++;
    }
    return { available, mine, locked };
  }, [packable]);

  const filters: { key: StaffFilter; label: string; count: number }[] = [
    { key: "available", label: "Có thể nhận", count: counts.available },
    { key: "mine", label: "Của tôi", count: counts.mine },
    { key: "locked", label: "Người khác", count: counts.locked },
  ];

  const visible = useMemo(() => {
    switch (filter) {
      case "mine":
        return packable.filter(
          (o) => o.is_mine && o.assignment_status !== "packed"
        );
      case "locked":
        return packable.filter(
          (o) => !o.is_mine && o.assignment_status !== "packed"
        );
      default: // available
        return packable.filter((o) => o.assignment_status === "unassigned");
    }
  }, [packable, filter]);

  const confirmedWaiting = counts.available + counts.mine;

  return (
    <>
      <div className="text-[12px] text-gray-600 px-0.5">
        <span className="font-medium text-gray-800">{confirmedWaiting} đơn</span>{" "}
        đã xác nhận, chờ đóng gói
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mt-3 overflow-x-auto -mx-0.5 px-0.5 pb-0.5">
        {filters.map((f) => {
          const active = f.key === filter;
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
              {f.label} · {f.count}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          {packable.length === 0
            ? "Chưa có đơn nào cần đóng gói."
            : "Không có đơn trong mục này."}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {visible.map((o) => (
            <StaffCard
              key={o.order_id}
              order={o}
              myId={myId}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </>
  );
}

function StaffCard({
  order,
  myId,
  onChanged,
}: {
  order: GroupedOrder;
  myId: number | null;
  onChanged: () => void;
}) {
  const { busy, err, run } = useAction(onChanged);

  const isMine = order.is_mine;
  const isUnassigned = order.assignment_status === "unassigned";
  const isMinePacking = isMine && order.assignment_status === "packing";
  const isMineAssigned = isMine && order.assignment_status === "assigned";
  const isMinePacked = isMine && order.assignment_status === "packed";
  // Đơn người khác đang giữ (đã nhận / đang đóng) — khoá, không thể nhận.
  const isLockedByOther =
    !isMine &&
    order.assigned_customer_id != null &&
    order.assigned_customer_id !== myId;

  const pillByState = isMinePacking
    ? { label: "Bạn đang đóng", className: "bg-primary/10 text-primary" }
    : isMineAssigned
    ? { label: "Của bạn", className: "bg-blue-50 text-blue-700" }
    : isMinePacked
    ? { label: "Đã đóng xong", className: "bg-green-100 text-green-700" }
    : isLockedByOther
    ? { label: "Đang đóng gói", className: "bg-amber-50 text-amber-700" }
    : { label: "Chờ đóng gói", className: "bg-blue-50 text-blue-700" };

  return (
    <div
      className={`p-3 border rounded-xl ${
        isMinePacking
          ? "border-primary ring-1 ring-primary/30"
          : isLockedByOther
          ? "border-gray-200 bg-gray-50/60 opacity-70"
          : "border-gray-200"
      }`}
    >
      {/* Top */}
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-medium">#{order.order_id}</div>
          <div className="text-[11px] text-gray-500 mt-0.5 truncate">
            {shortenName(order.customer_name)}
            {!order.is_pickup && order.delivery_address
              ? ` · ${order.delivery_address}`
              : order.is_pickup
              ? " · Pickup"
              : ""}
          </div>
        </div>
        <div
          className={`px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0 ${pillByState.className}`}
        >
          {pillByState.label}
        </div>
      </div>

      {/* Box xám: items */}
      <div className="p-2 bg-gray-50 rounded-md text-xs">
        {order.items.map((it, i) => (
          <div
            key={it.item_id}
            className={`flex justify-between ${i > 0 ? "mt-1" : ""}`}
          >
            <span className="text-gray-700 truncate pr-2">
              {it.product_name}
            </span>
            <span className="font-medium shrink-0">×{fmtKg(it.quantity)}</span>
          </div>
        ))}
      </div>

      {/* SĐT đã che (cần cho dán nhãn đóng gói) */}
      {order.customer_phone && (
        <div className="text-[11px] text-gray-400 mt-1.5">
          SĐT: {order.customer_phone}
        </div>
      )}

      {err && <div className="text-[11px] text-red-500 mt-1.5">{err}</div>}

      {/* Hành động */}
      <div className="mt-2.5">
        {isUnassigned && (
          <button
            disabled={busy}
            onClick={() => run(() => claimOrder(order.order_id))}
            className="w-full px-3 py-2 text-[12px] rounded-lg bg-primary text-white font-medium disabled:opacity-50"
          >
            Nhận đóng gói
          </button>
        )}
        {isMineAssigned && (
          <button
            disabled={busy}
            onClick={() => run(() => startPacking(order.order_id))}
            className="w-full px-3 py-2 text-[12px] rounded-lg bg-primary text-white font-medium disabled:opacity-50"
          >
            Bắt đầu đóng gói
          </button>
        )}
        {isMinePacking && (
          <button
            disabled={busy}
            onClick={() => run(() => confirmPacked(order.order_id))}
            className="w-full px-3 py-2 text-[12px] rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
          >
            Hoàn tất đóng gói
          </button>
        )}
        {isMinePacked && (
          <div className="text-center text-[11px] text-green-700 py-1">
            ✓ Đã đóng gói xong — chờ chủ farm bàn giao
          </div>
        )}
        {isLockedByOther && (
          <div className="text-center text-[11px] text-gray-400 py-1">
            {staffLabel(order.assigned_customer_name)} đang đóng — không thể nhận
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hook hành động dùng chung: chặn double-click, hiện lỗi, refresh ──────────

function useAction(onChanged: () => void) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e: any) {
      setErr(e?.message || "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  return { busy, err, run };
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
