import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FarmOrderDetail, FarmStaffMember } from "@/types";
import { useFarmGuard, useEnsureJwt } from "@/hooks";
import {
  useFarmProfile,
  useFarmStaff,
  useFarmOrderDetail,
  assignPacker,
  claimOrder,
  startPacking,
  confirmPacked,
  confirmOrder,
  handoffShip,
} from "@/utils/farm-api";
import {
  fmtKg,
  fmtTime,
  shortenName,
  staffLabel,
  statusPill,
  useAction,
  recipientLocation,
  TruckIcon,
} from "./_shared";

// Chi tiết một đơn cho khâu ĐÓNG GÓI (route /farm/orders/:id → FarmPackingController@show).
// PACK-07: NV/owner mở đơn để xem thông tin người nhận (SĐT/địa chỉ ĐÃ CHE server-side;
// đơn nhận-tại-trạm hiện TÊN TRẠM thay địa chỉ giao) + thao tác theo vai trò.
//
// Phân quyền do backend enforce (owner-only: confirm-order/handoff/assign; staff:
// claim/start/confirm-packed phiếu mình). Farm thường (read_only) → ẩn toàn bộ nút.

export default function FarmOrderDetailPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();
  const { id } = useParams<{ id: string }>();
  const orderId = id ? Number(id) : null;

  useEffect(() => {
    ensureJwt();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const profile = useFarmProfile(isFarm);
  const detail = useFarmOrderDetail(orderId, isFarm);
  const viewer = profile.data?.viewer;
  const isOwner = viewer?.is_owner ?? false;
  const isHub =
    viewer?.is_packing_hub ?? profile.data?.is_packing_hub ?? false;
  // Owner của hub mới cần danh sách nhân viên (dropdown phân công).
  const staffList = useFarmStaff(isFarm && isHub && isOwner);

  if (!isFarm) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  const isInitialLoading = detail.loading && !detail.data;
  const order = detail.data;

  return (
    <div className="flex flex-col min-h-full bg-gray-100">
      <div className="m-3">
        {isInitialLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Đang tải chi tiết đơn...
          </div>
        ) : detail.error ? (
          <div className="py-12 text-center text-red-500 text-sm">
            {detail.error}
            <button
              onClick={detail.refresh}
              className="ml-2 text-primary underline"
            >
              Thử lại
            </button>
          </div>
        ) : !order ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Không tìm thấy đơn này.
          </div>
        ) : (
          <OrderDetailBody
            order={order}
            isHub={isHub}
            isOwner={isOwner}
            staff={staffList.data ?? []}
            onChanged={detail.refresh}
          />
        )}
      </div>
    </div>
  );
}

function OrderDetailBody({
  order,
  isHub,
  isOwner,
  staff,
  onChanged,
}: {
  order: FarmOrderDetail;
  isHub: boolean;
  isOwner: boolean;
  staff: FarmStaffMember[];
  onChanged: () => void;
}) {
  const { busy, err, run } = useAction(onChanged);
  const [picking, setPicking] = useState(false);

  const pill = statusPill(order.order_status);
  const isDelivering = order.order_status === "delivering";
  const isPending = order.order_status === "pending";
  const isPacked = order.assignment_status === "packed";
  const canHandoff = isPacked && !isDelivering;
  const totalQty = order.items.reduce((s, it) => s + it.quantity, 0);

  const packerName =
    order.assigned_customer_name ??
    (order.assigned_customer_id != null
      ? staff.find((s) => s.id === order.assigned_customer_id)?.name ?? null
      : null);

  // Trạng thái đóng gói của riêng người đang xem (staff) — quyết định nút.
  const isMine = order.is_mine;
  const isUnassigned = order.assignment_status === "unassigned";
  const isMineAssigned = isMine && order.assignment_status === "assigned";
  const isMinePacking = isMine && order.assignment_status === "packing";

  // Chỉ hub mới thao tác; farm thường read-only.
  const canAct = isHub && !order.read_only;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header đơn */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
        <div>
          <div className="text-[15px] font-semibold">#{order.order_id}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {fmtTime(order.order_created_at)}
          </div>
        </div>
        <div
          className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${pill.className}`}
        >
          {pill.label}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Thông tin người nhận — SĐT/địa chỉ đã che; pickup hiện tên trạm */}
        <div className="p-3 bg-gray-50 rounded-xl text-[12px]">
          <div className="text-[11px] text-gray-400 mb-1">Người nhận</div>
          <div className="font-medium text-gray-800">
            {shortenName(order.customer_name)}
          </div>
          {order.customer_phone && (
            <div className="text-gray-600 mt-0.5">SĐT: {order.customer_phone}</div>
          )}
          <div className="text-gray-600 mt-0.5">
            {order.is_pickup
              ? `Nhận tại trạm: ${recipientLocation(order)}`
              : `Giao tới: ${order.delivery_address ?? "—"}`}
          </div>
        </div>

        {/* Danh sách hàng cần đóng */}
        <div>
          <div className="text-[11px] text-gray-400 mb-1.5">
            Hàng cần đóng · {fmtKg(totalQty)}
          </div>
          <div className="p-3 bg-gray-50 rounded-xl text-[12px] flex flex-col gap-1.5">
            {order.items.map((it) => (
              <div key={it.item_id} className="flex justify-between">
                <span className="text-gray-700 truncate pr-2">
                  {it.product_name}
                </span>
                <span className="font-medium shrink-0">
                  ×{fmtKg(it.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trạng thái đóng gói + người đóng */}
        {isDelivering ? (
          <div className="flex items-center gap-1.5 text-[12px] text-green-700">
            <TruckIcon />
            <span>Đã bàn giao vận chuyển</span>
          </div>
        ) : order.assignment_status === "packing" && packerName ? (
          <div className="text-[12px] text-amber-700">
            ◐ Đang đóng: {staffLabel(packerName)}
            {order.packing_started_at
              ? ` · ${fmtTime(order.packing_started_at)}`
              : ""}
          </div>
        ) : isPacked ? (
          <div className="text-[12px] text-green-700">
            ✓ Đóng bởi: {staffLabel(packerName)}
            {order.packed_at ? ` · ${fmtTime(order.packed_at)}` : ""}
          </div>
        ) : order.assignment_status === "assigned" && packerName ? (
          <div className="text-[12px] text-blue-700">
            ⊙ Đã giao: {staffLabel(packerName)}
          </div>
        ) : isHub ? (
          <div className="text-[12px] text-gray-400">Chưa phân công</div>
        ) : null}

        {/* Farm thường: chỉ-đọc */}
        {!canAct && (
          <div className="text-[12px] text-gray-400">
            Đơn được xử lý bởi bộ phận đóng gói Vietponics.
          </div>
        )}

        {err && <div className="text-[12px] text-red-500">{err}</div>}

        {/* Hành động theo vai trò */}
        {canAct && (
          <div className="flex flex-col gap-2">
            {/* Owner: xác nhận đơn */}
            {isOwner && isPending && (
              <button
                disabled={busy}
                onClick={() => run(() => confirmOrder(order.order_id))}
                className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-primary text-white font-medium disabled:opacity-50"
              >
                Xác nhận đơn
              </button>
            )}

            {/* Owner: bàn giao ship */}
            {isOwner && canHandoff && (
              <button
                disabled={busy}
                onClick={() => run(() => handoffShip(order.order_id))}
                className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
              >
                Bàn giao ship
              </button>
            )}

            {/* Owner: phân công / đổi người — ẩn khi đã đóng xong hoặc đang giao */}
            {isOwner && !isPending && !isPacked && !isDelivering && (
              <button
                onClick={() => setPicking((p) => !p)}
                className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-primary text-primary active:bg-primary/5"
              >
                {order.assigned_customer_id ? "Đổi người đóng" : "Phân công"}
              </button>
            )}

            {/* Picker phân công (owner) */}
            {isOwner && picking && (
              <div className="p-2 bg-gray-50 rounded-lg">
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
                        className={`text-left px-2.5 py-1.5 text-[12px] rounded-md border disabled:opacity-50 ${
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

            {/* Staff: nhận / bắt đầu / hoàn tất (chỉ đơn đã xác nhận) */}
            {!isPending && isUnassigned && (
              <button
                disabled={busy}
                onClick={() => run(() => claimOrder(order.order_id))}
                className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-primary text-white font-medium disabled:opacity-50"
              >
                Nhận đóng gói
              </button>
            )}
            {isMineAssigned && (
              <button
                disabled={busy}
                onClick={() => run(() => startPacking(order.order_id))}
                className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-primary text-white font-medium disabled:opacity-50"
              >
                Bắt đầu đóng gói
              </button>
            )}
            {isMinePacking && (
              <button
                disabled={busy}
                onClick={() => run(() => confirmPacked(order.order_id))}
                className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
              >
                Hoàn tất đóng gói
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
