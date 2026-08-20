import { useEffect, useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";
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
  pickupOrder,
  deliverOrder,
} from "@/utils/farm-api";
import { farmPendingOrdersCountState } from "@/state";
import { FarmIncomingOrder, FarmMemberRole, PackingStatus } from "@/types";
import {
  fmtKg,
  fmtTime,
  shortenName,
  staffLabel,
  statusPill,
  assignmentPill,
  useAction,
  recipientLocation,
  TruckIcon,
  AssignPickerSheet,
  HandoffMethodSheet,
} from "./_shared";

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
// Filter cho shipper (Màn 3.1).
type ShipperFilter = "to_pickup" | "delivering";

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
  const myRole = viewer?.farm_role ?? null;
  // Shipper: farm_role "shipper" VÀ không phải owner.
  const isShipper = myRole === "shipper" && !isOwner;
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
  const farmName = profile.data?.name ?? "Farm";

  // Accent color và label theo role
  const isReadOnly = !isHub && !isShipper;
  // Packer = thành viên hub, không phải owner, không phải shipper.
  const isPacker = isHub && !isOwner && !isShipper;
  const accentColor = isShipper
    ? "#e07514"
    : isReadOnly
    ? "#9a958c"
    : isPacker
    ? "#c79a12"
    : "#1f8a4c";
  return (
    <div className="flex flex-col min-h-full bg-gray-100">

      <div className="flex-1">
        {isInitialLoading ? (
          <LoadingSkeleton />
        ) : incoming.error ? (
          <div className="py-12 text-center text-red-500 text-sm px-4">
            {incoming.error}
            <button
              onClick={incoming.refresh}
              className="ml-2 text-primary underline"
            >
              Thử lại
            </button>
          </div>
        ) : !isHub && !isShipper ? (
          <ReadOnlyView orders={orders} />
        ) : isOwner ? (
          <OwnerView
            orders={orders}
            staff={staffList.data ?? []}
            onChanged={incoming.refresh}
          />
        ) : isShipper ? (
          <ShipperView
            orders={orders}
            myId={myId}
            onChanged={incoming.refresh}
          />
        ) : (
          <StaffView
            orders={orders}
            myId={myId}
            accentColor={accentColor}
            onChanged={incoming.refresh}
          />
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="px-4 pt-4 flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[110px] bg-[#ede9e0] rounded-xl animate-pulse"
        />
      ))}
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
  staff: { id: number; name: string; farm_role: FarmMemberRole | null }[];
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
      {/* Hero header — nền primary */}
      <div style={{ background: "var(--primary)" }} className="px-4 pt-4 pb-0">
        {/* Metric */}
        <div className="flex items-baseline gap-2">
          <span className="text-[32px] font-bold text-white leading-none">
            {fmtKg(summary.totalQty)}
          </span>
          <span className="text-[14px] text-white/75">
            · cần chuẩn bị hôm nay
          </span>
        </div>
        <div className="text-[13px] text-white/60 mt-1 mb-3">
          {summary.count} đơn
        </div>

        {/* Underline tabs — nằm trong hero, indicator trắng */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-4 px-4">
          {filters.map((f) => {
            const active = f.key === filter;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-shrink-0 px-3 pb-2.5 pt-1 text-[13px] whitespace-nowrap transition-colors border-b-2 ${
                  active
                    ? "text-white font-semibold border-white"
                    : "text-white/65 font-normal border-transparent"
                }`}
              >
                {f.label} · {f.count}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-4xl mb-3">📦</div>
          <div className="text-[15px] font-medium text-[#2a2a2a]">
            Không có đơn nào
          </div>
          <div className="text-[13px] text-[#8a857c] mt-1">
            Kéo xuống để làm mới
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
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
  staff: { id: number; name: string; farm_role: FarmMemberRole | null }[];
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const pill = statusPill(order.order_status);
  const aPill = assignmentPill(order.assignment_status);
  const { busy, err, run } = useAction(onChanged);
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [showHandoffSheet, setShowHandoffSheet] = useState(false);

  const isDelivering = order.order_status === "delivering";
  const isPending = order.order_status === "pending";
  const isPacked = order.assignment_status === "packed";
  // Có thể bàn giao ship khi đơn đã đóng xong (packed) mà chưa đang giao.
  const canHandoff = isPacked && !isDelivering;
  const recipient = recipientLocation(order);

  return (
    <div
      onClick={() => navigate(`/farm/orders/${order.order_id}`)}
      className="bg-white rounded-xl shadow-sm border border-[#d4d0c7] p-3 active:bg-gray-50 cursor-pointer"
    >
      {/* Dòng 1: mã đơn + badge trạng thái */}
      <div className="flex justify-between items-center gap-2">
        <div className="text-[17px] font-semibold text-[#1a1a1a]">
          #{order.order_id}
        </div>
        <div
          className="px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0"
          style={{ backgroundColor: pill.bg, color: pill.color }}
        >
          {pill.label}
        </div>
      </div>

      {/* Dòng 2: meta KH · địa chỉ · giờ */}
      <div className="text-[12px] text-[#8a857c] mt-1 truncate">
        {shortenName(order.customer_name)}
        {recipient ? ` · ${recipient}` : ""}
        {` · ${fmtTime(order.order_created_at)}`}
      </div>

      {/* Dòng 3: pill phân công + indicator giao hàng nếu có */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <div
          className="px-2 py-0.5 text-[11px] font-medium rounded-full"
          style={{ backgroundColor: aPill.bg, color: aPill.color }}
        >
          {aPill.label}
        </div>
        {isDelivering && (
          <div className="flex items-center gap-1 text-[11px] text-[#c4630f]">
            <TruckIcon />
            <span>Đã bàn giao vận chuyển</span>
          </div>
        )}
      </div>

      {/* Dòng 4: tóm tắt hàng */}
      <div className="text-[12px] text-[#8a857c] mt-1.5">
        {order.items.length} sản phẩm · {fmtKg(order.total_qty)}
      </div>

      {err && <div className="text-[11px] text-red-500 mt-1.5">{err}</div>}

      {/* Action bar — chặn bubble để bấm nút không mở màn chi tiết */}
      <div onClick={(e) => e.stopPropagation()}>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {isPending && (
            <button
              disabled={busy}
              onClick={() => run(() => confirmOrder(order.order_id))}
              className="flex-1 min-w-[8rem] px-3 py-2.5 text-[13px] rounded-[10px] bg-[var(--primary)] text-white font-medium disabled:bg-[#edebe5] disabled:text-[#a7a299]"
            >
              Xác nhận đơn
            </button>
          )}

          {canHandoff && (
            <button
              disabled={busy}
              onClick={() => setShowHandoffSheet(true)}
              className="flex-1 min-w-[8rem] px-3 py-2.5 text-[13px] rounded-[10px] bg-[#e07514] text-white font-medium disabled:bg-[#edebe5] disabled:text-[#a7a299]"
            >
              Bàn giao giao hàng
            </button>
          )}

          {/* Phân công / đổi người — ẩn khi đã đóng xong hoặc đang giao */}
          {!isPending && !isPacked && !isDelivering && (
            <button
              onClick={() => setShowAssignSheet(true)}
              className="px-3 py-2.5 text-[13px] rounded-[10px] border border-primary text-primary active:bg-primary/5"
            >
              {order.assigned_customer_id ? "Đổi người" : "Phân công"}
            </button>
          )}
        </div>
      </div>

      {/* Bottom sheet chọn người đóng gói */}
      {showAssignSheet && (
        <AssignPickerSheet
          staff={staff}
          currentPackerId={order.assigned_customer_id}
          busy={busy}
          onSelect={(staffId) =>
            run(async () => {
              await assignPacker(order.order_id, staffId);
              setShowAssignSheet(false);
            })
          }
          onClose={() => setShowAssignSheet(false)}
        />
      )}

      {/* Bottom sheet chọn phương thức bàn giao */}
      {showHandoffSheet && (
        <HandoffMethodSheet
          busy={busy}
          onSelect={(_method) =>
            run(async () => {
              await handoffShip(order.order_id);
              setShowHandoffSheet(false);
            })
          }
          onClose={() => setShowHandoffSheet(false)}
        />
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

  const READ_ONLY_ACCENT = "#9a958c";

  return (
    <>
      {/* Banner chỉ xem */}
      <div
        className="mx-4 mt-3 p-3 rounded-xl flex items-start gap-2"
        style={{ backgroundColor: "#f1efe9" }}
      >
        <span className="text-[15px] shrink-0">👁</span>
        <div>
          <div
            className="text-[12px] font-medium"
            style={{ color: READ_ONLY_ACCENT }}
          >
            Chế độ chỉ xem
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "#6a655c" }}>
            Bạn chỉ thấy đơn có hàng của mình, không thao tác được.
          </div>
        </div>
      </div>

      {/* Tóm tắt số lượng */}
      <div className="px-4 pt-2 pb-1">
        <p className="text-sm" style={{ color: "#6a655c" }}>
          <span className="font-semibold" style={{ color: "#2a2a2a" }}>
            {fmtKg(summary.totalQty)}
          </span>
          {" · "}{summary.count} đơn đang đến
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-4xl mb-3">📦</div>
          <div className="text-[15px] font-medium text-[#2a2a2a]">
            Không có đơn nào
          </div>
          <div className="text-[13px] text-[#8a857c] mt-1">
            Kéo xuống để làm mới
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
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
    <div className="bg-white rounded-xl shadow-sm border border-[#d4d0c7] p-3">
      {/* Top: mã đơn + status pill */}
      <div className="flex justify-between items-center mb-1.5 gap-2">
        <div className="text-[15px] font-semibold text-[#1a1a1a]">
          #{order.order_id}
        </div>
        <div
          className="px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0"
          style={{ backgroundColor: pill.bg, color: pill.color }}
        >
          {pill.label}
        </div>
      </div>

      {/* Meta: giờ · số sản phẩm */}
      <div className="text-[12px] text-[#8a857c] mb-2">
        {fmtTime(order.order_created_at)} · {order.items.length} sản phẩm
      </div>

      {/* Box xám: items của farm mình trong đơn */}
      <div className="p-2 bg-[#f1efe9] rounded-md text-xs">
        {order.items.map((it, i) => (
          <div
            key={it.item_id}
            className={`flex justify-between ${i > 0 ? "mt-1" : ""}`}
          >
            <span className="text-[#2a2a2a] truncate pr-2">
              {it.product_name}
            </span>
            <span className="font-medium shrink-0 text-[#6a655c]">×{fmtKg(it.quantity)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Màn 2: Nhân viên đóng gói ────────────────────────────────────────────────

function StaffView({
  orders,
  myId,
  accentColor,
  onChanged,
}: {
  orders: GroupedOrder[];
  myId: number | null;
  accentColor: string;
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
      <div className="px-4 py-2 text-[12px] text-gray-600">
        <span className="font-medium text-gray-800">{confirmedWaiting} đơn</span>{" "}
        đã xác nhận, chờ đóng gói
      </div>

      {/* Filter tabs scrollable */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 border-b border-[#f0ede5]">
        {filters.map((f) => {
          const active = f.key === filter;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 text-[13px] rounded-full whitespace-nowrap transition-colors"
              style={
                active
                  ? { backgroundColor: accentColor, color: "#fff", fontWeight: 500 }
                  : { border: "1px solid #d4d0c7", color: "#8a857c" }
              }
            >
              {f.label} · {f.count}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-4xl mb-3">📦</div>
          <div className="text-[15px] font-medium text-[#2a2a2a]">
            Không có đơn nào
          </div>
          <div className="text-[13px] text-[#8a857c] mt-1">
            Kéo xuống để làm mới
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
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
  const navigate = useNavigate();
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
    ? { label: "Bạn đang đóng", bg: "rgba(31,138,76,0.12)", color: "#1f8a4c" }
    : isMineAssigned
    ? { label: "Của bạn", bg: "#dbe8ff", color: "#2a5bd7" }
    : isMinePacked
    ? { label: "Đã đóng xong", bg: "#d6f2dd", color: "#1f8a4c" }
    : isLockedByOther
    ? { label: "Đang đóng gói", bg: "#fdf0c8", color: "#9a7b10" }
    : { label: "Chờ đóng gói", bg: "#dbe8ff", color: "#2a5bd7" };
  // pillByState dùng {bg, color} → phải render bằng inline style, không phải .className

  return (
    <div
      onClick={() => navigate(`/farm/orders/${order.order_id}`)}
      className={`bg-white rounded-xl shadow-sm border cursor-pointer active:bg-gray-50 p-3 ${
        isMinePacking
          ? "border-primary ring-1 ring-primary/30"
          : isLockedByOther
          ? "border-[#d4d0c7] opacity-70"
          : "border-[#d4d0c7]"
      }`}
    >
      {/* Top */}
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-medium">#{order.order_id}</div>
          <div className="text-[11px] text-[#8a857c] mt-0.5 truncate">
            {shortenName(order.customer_name)}
            {recipientLocation(order) ? ` · ${recipientLocation(order)}` : ""}
          </div>
        </div>
        <div
          className="px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0"
          style={{ backgroundColor: pillByState.bg, color: pillByState.color }}
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
        <div className="text-[11px] text-[#8a857c] mt-1.5">
          SĐT: {order.customer_phone}
        </div>
      )}

      {err && <div className="text-[11px] text-red-500 mt-1.5">{err}</div>}

      {/* Hành động — chặn bubble để bấm nút không mở màn chi tiết */}
      <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
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

// ─── Màn 3.1: Shipper nội bộ ──────────────────────────────────────────────────

const SHIPPER_ACCENT = "#e07514";

function ShipperView({
  orders,
  myId,
  onChanged,
}: {
  orders: GroupedOrder[];
  myId: number | null;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<ShipperFilter>("to_pickup");

  // Đơn của shipper: delivering + is_mine. Phân biệt "cần lấy" vs "đang giao"
  // bằng heuristic packed_at — khi backend thêm field pickup_at, đổi điều kiện lọc ở đây.
  const myDelivering = useMemo(
    () => orders.filter((o) => o.order_status === "delivering" && o.is_mine),
    [orders]
  );

  const toPickup = useMemo(
    () => myDelivering.filter((o) => o.packed_at != null),
    [myDelivering]
  );

  const inDelivery = useMemo(
    () => myDelivering.filter((o) => o.packed_at == null),
    [myDelivering]
  );

  const tabs: { key: ShipperFilter; label: string; count: number }[] = [
    { key: "to_pickup", label: "Cần lấy hàng", count: toPickup.length },
    { key: "delivering", label: "Đang giao", count: inDelivery.length },
  ];

  const visible = tab === "to_pickup" ? toPickup : inDelivery;

  return (
    <>
      {/* Tóm tắt số đơn */}
      <div className="px-4 py-2">
        <p className="text-sm text-[#5a5a5a] italic">
          {myDelivering.length} đơn · {toPickup.length} chờ lấy hàng
        </p>
      </div>

      {/* Filter tabs scrollable */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 border-b border-[#f0ede5]">
        {tabs.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-1.5 text-[13px] rounded-full whitespace-nowrap transition-colors"
              style={
                active
                  ? { backgroundColor: SHIPPER_ACCENT, color: "#fff", fontWeight: 500 }
                  : { border: "1px solid #d4d0c7", color: "#8a857c" }
              }
            >
              {t.label} · {t.count}
            </button>
          );
        })}
      </div>

      {tab === "delivering" && inDelivery.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-4xl mb-3">🚗</div>
          <div className="text-[15px] font-medium text-[#2a2a2a]">
            Chưa có đơn đang giao
          </div>
          <div className="text-[13px] text-[#8a857c] mt-1">
            Các đơn bạn đã lấy sẽ hiển thị ở đây
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-4xl mb-3">📦</div>
          <div className="text-[15px] font-medium text-[#2a2a2a]">
            Không có đơn nào
          </div>
          <div className="text-[13px] text-[#8a857c] mt-1">
            Kéo xuống để làm mới
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
          {visible.map((o) => (
            <ShipperCard
              key={o.order_id}
              order={o}
              isPickupTab={tab === "to_pickup"}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ShipperCard({
  order,
  isPickupTab,
  onChanged,
}: {
  order: GroupedOrder;
  isPickupTab: boolean;
  onChanged: () => void;
}) {
  const { busy, err, run } = useAction(onChanged);
  const recipient = recipientLocation(order);

  const pill = isPickupTab
    ? { label: "Chờ lấy", bg: "#ffe1cc", color: "#c4630f" }
    : { label: "Đang giao", bg: "#ece1ff", color: "#6b3fc4" };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#d4d0c7] p-3">
      {/* Top: mã đơn + badge */}
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="min-w-0">
          <div className="text-[17px] font-semibold text-[#1a1a1a]">
            #{order.order_id}
          </div>
          <div className="text-[12px] text-[#8a857c] mt-0.5 truncate">
            {shortenName(order.customer_name)}
            {recipient ? ` · ${recipient}` : ""}
            {` · ${fmtTime(order.order_created_at)}`}
          </div>
        </div>
        <div
          className="px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0"
          style={{ backgroundColor: pill.bg, color: pill.color }}
        >
          {pill.label}
        </div>
      </div>

      {/* Box xám: items */}
      <div className="p-2 bg-gray-50 rounded-md text-xs mb-2">
        {order.items.map((it, i) => (
          <div key={it.item_id} className={`flex justify-between ${i > 0 ? "mt-1" : ""}`}>
            <span className="text-gray-700 truncate pr-2">{it.product_name}</span>
            <span className="font-medium shrink-0">×{fmtKg(it.quantity)}</span>
          </div>
        ))}
      </div>

      {/* SĐT bấm-để-gọi — chỉ tab "Đang giao" */}
      {!isPickupTab && order.customer_phone && (
        <a
          href={`tel:${order.customer_phone}`}
          className="flex items-center gap-1.5 text-[12px] text-blue-600 mb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          {order.customer_phone}
        </a>
      )}

      {err && <div className="text-[11px] text-red-500 mb-1.5">{err}</div>}

      {/* Hành động */}
      <div onClick={(e) => e.stopPropagation()}>
        {isPickupTab ? (
          <button
            disabled={busy}
            onClick={() => run(() => pickupOrder(order.order_id))}
            className="w-full px-3 py-2.5 text-[13px] rounded-[10px] text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: SHIPPER_ACCENT }}
          >
            {busy ? "Đang xử lý..." : "Tôi đã lấy hàng"}
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => run(() => deliverOrder(order.order_id))}
            className="w-full px-3 py-2.5 text-[13px] rounded-[10px] text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: "#1f8a4c" }}
          >
            {busy ? "Đang xử lý..." : "Xác nhận đã giao"}
          </button>
        )}
      </div>
    </div>
  );
}
