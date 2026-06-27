import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FarmOrderDetail, FarmProfile, FarmStaffMember } from "@/types";
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
  pickupOrder,
  deliverOrder,
} from "@/utils/farm-api";
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

// Chi tiết một đơn cho khâu ĐÓNG GÓI (route /farm/orders/:id).
// Phân nhánh theo role:
//   - isPacker (hub staff, không phải owner) → PackerDetailView (Màn 2.2: checklist soạn hàng)
//   - isOwner / isAdmin → OrderDetailBody (Màn 1.2: quản lý, phân công, bàn giao)
//   - farm thường (read_only) → OrderDetailBody nhưng không có nút thao tác

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
  const myRole = viewer?.farm_role ?? null;
  const isShipper = myRole === "shipper" && !isOwner;
  const isHub =
    viewer?.is_packing_hub ?? profile.data?.is_packing_hub ?? false;
  // Packer = thành viên hub không phải owner và không phải shipper.
  const isPacker = isHub && !isOwner && !isShipper;
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

  // Màn 3.2 — Shipper: giao diện riêng, full-page.
  if (isShipper && !isInitialLoading && order && profile.data) {
    return (
      <ShipperDetailView
        order={order}
        profile={profile.data}
        onChanged={detail.refresh}
      />
    );
  }

  // Màn 2.2 — Packer: layout chuyên dụng với checklist soạn hàng + action bar cố định đáy.
  if (isPacker && !isInitialLoading && order && profile.data) {
    return (
      <PackerDetailView
        order={order}
        profile={profile.data}
        onChanged={detail.refresh}
      />
    );
  }

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

// ─── Màn 3.2: Chi tiết giao hàng (shipper view) ─────────────────────────────

function ShipperDetailView({
  order,
  profile: _profile,
  onChanged,
}: {
  order: FarmOrderDetail;
  profile: FarmProfile;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const { busy, err, run } = useAction(onChanged);
  const [showConfirm, setShowConfirm] = useState(false);

  const pill = assignmentPill(order.assignment_status);
  const totalQty = order.items.reduce((s, it) => s + it.quantity, 0);

  // Heuristic từ assignment_status (backend chưa có out_for_delivery):
  // assigned = chưa lấy (mốc 2 pending)
  // packing  = đã lấy, đang giao (mốc 2 done, mốc 3 current)
  // packed   = đã giao xong (mốc 3 done)
  const isAssigned = order.assignment_status === "assigned";
  const isPacking = order.assignment_status === "packing";
  const isPacked = order.assignment_status === "packed";
  const isUnassigned = order.assignment_status === "unassigned";

  const step1Done = true; // đóng gói luôn xong khi shipper thấy đơn
  const step2Done = isPacking || isPacked;
  const step3Done = isPacked;

  const ACCENT = "#e07514";
  const COLOR_DONE = "#1f8a4c";
  const COLOR_CURRENT = ACCENT;
  const COLOR_WAIT = "#d4d0c7";

  function dotColor(done: boolean, current: boolean): string {
    if (done) return COLOR_DONE;
    if (current) return COLOR_CURRENT;
    return COLOR_WAIT;
  }

  function lineColor(done: boolean): string {
    return done ? COLOR_DONE : COLOR_WAIT;
  }

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    order.delivery_address ?? ""
  )}`;

  return (
    <div className="flex flex-col min-h-full bg-[#fbfaf7] relative">
      {/* Dải accent cam 5px */}
      <div style={{ height: 5, backgroundColor: ACCENT }} />

      {/* TopBar */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white border-b"
        style={{ borderColor: "#d4d0c7" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-xl font-medium text-gray-600 leading-none"
          aria-label="Quay lại"
        >
          ‹
        </button>
        <div className="flex-1 text-[15px] font-semibold">
          #{order.order_id}
        </div>
        <div
          className="px-2.5 py-1 text-[11px] font-medium rounded-full"
          style={{ backgroundColor: pill.bg, color: pill.color }}
        >
          {pill.label}
        </div>
      </div>

      {/* Nội dung cuộn */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 py-4 flex flex-col gap-4">

        {/* Khối Khách hàng */}
        <div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          style={{ border: "1px solid #d4d0c7" }}
        >
          <div className="px-4 py-2 border-b" style={{ borderColor: "#f0ede5" }}>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Khách hàng
            </span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            {/* Tên + nút Gọi */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-medium text-gray-800">
                {shortenName(order.customer_name)}
              </span>
              {order.customer_phone && (
                <a
                  href={`tel:${order.customer_phone}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                  </svg>
                  Gọi
                </a>
              )}
            </div>
            {order.customer_phone && (
              <div className="text-[12px] text-gray-500">
                SĐT: {order.customer_phone}
              </div>
            )}
            {/* Địa chỉ + link bản đồ */}
            {!order.is_pickup && order.delivery_address && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12px] text-gray-600 flex-1">
                  {order.delivery_address}
                </span>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[11px] font-medium underline"
                  style={{ color: ACCENT }}
                >
                  Mở bản đồ ↗
                </a>
              </div>
            )}
            {order.is_pickup && (
              <div className="text-[12px] text-gray-600">
                Nhận tại trạm: {order.station_name ?? "—"}
              </div>
            )}
          </div>
        </div>

        {/* Khối Đơn hàng */}
        <div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          style={{ border: "1px solid #d4d0c7" }}
        >
          <div className="px-4 py-2 border-b" style={{ borderColor: "#f0ede5" }}>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Đơn hàng · {fmtKg(totalQty)}
            </span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-1.5">
            {order.items.map((it) => (
              <div key={it.item_id} className="flex justify-between text-[13px]">
                <span className="text-gray-700 truncate pr-2">{it.product_name}</span>
                <span className="font-medium shrink-0">×{fmtKg(it.quantity)}</span>
              </div>
            ))}
            <div
              className="flex justify-between text-[12px] font-medium pt-2 mt-1"
              style={{ borderTop: "1px solid #f0ede5", color: "#555" }}
            >
              <span>Tổng</span>
              <span>{fmtKg(totalQty)}</span>
            </div>
          </div>
        </div>

        {/* Khối Tiến trình (timeline 3 mốc) */}
        <div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          style={{ border: "1px solid #d4d0c7" }}
        >
          <div className="px-4 py-2 border-b" style={{ borderColor: "#f0ede5" }}>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Tiến trình
            </span>
          </div>
          <div className="px-4 py-4">
            {/* Mốc 1: Đã đóng gói */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: dotColor(step1Done, false) }}
                >
                  ✓
                </div>
                <div className="w-0.5 mt-1" style={{ height: 28, backgroundColor: lineColor(step2Done) }} />
              </div>
              <div className="pb-4">
                <div className="text-[13px] font-medium text-gray-800">Đã đóng gói</div>
                {order.packed_at && (
                  <div className="text-[11px] text-gray-400 mt-0.5">{fmtTime(order.packed_at)}</div>
                )}
              </div>
            </div>

            {/* Mốc 2: Đã lấy hàng */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: dotColor(step2Done, isAssigned) }}
                >
                  {step2Done ? "✓" : "●"}
                </div>
                <div className="w-0.5 mt-1" style={{ height: 28, backgroundColor: lineColor(step3Done) }} />
              </div>
              <div className="pb-4">
                <div
                  className="text-[13px] font-medium"
                  style={{ color: step2Done ? COLOR_DONE : isAssigned ? COLOR_CURRENT : "#9ca3af" }}
                >
                  Đã lấy hàng
                </div>
                {!step2Done && isAssigned && (
                  <div className="text-[11px] mt-0.5" style={{ color: COLOR_CURRENT }}>Chờ lấy hàng</div>
                )}
              </div>
            </div>

            {/* Mốc 3: Đã giao khách */}
            <div className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: dotColor(step3Done, isPacking) }}
              >
                {step3Done ? "✓" : "○"}
              </div>
              <div>
                <div
                  className="text-[13px] font-medium"
                  style={{ color: step3Done ? COLOR_DONE : isPacking ? COLOR_CURRENT : "#9ca3af" }}
                >
                  Đã giao khách
                </div>
                {isPacking && (
                  <div className="text-[11px] mt-0.5" style={{ color: COLOR_CURRENT }}>Đang trên đường giao</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {err && <div className="text-[12px] text-red-500 text-center">{err}</div>}
      </div>

      {/* Action bar cố định đáy */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-white border-t"
        style={{ borderColor: "#d4d0c7" }}
      >
        {isUnassigned && (
          <button disabled className="w-full py-3 text-[14px] font-medium rounded-xl cursor-not-allowed" style={{ background: "#edebe5", color: "#a7a299" }}>
            Chưa được phân công
          </button>
        )}
        {isAssigned && (
          <button
            disabled={busy}
            onClick={() => run(() => pickupOrder(order.order_id))}
            className="w-full py-3 text-[14px] font-medium rounded-xl text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {busy ? "Đang xử lý..." : "Tôi đã lấy hàng"}
          </button>
        )}
        {isPacking && (
          <button
            disabled={busy}
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 text-[14px] font-medium rounded-xl text-white disabled:opacity-60"
            style={{ backgroundColor: COLOR_DONE }}
          >
            {busy ? "Đang xử lý..." : "Xác nhận giao thành công"}
          </button>
        )}
        {isPacked && (
          <div className="text-center text-[13px] font-medium py-2" style={{ color: COLOR_DONE }}>
            ✓ Đơn đã giao thành công
          </div>
        )}
      </div>

      {/* Dialog xác nhận giao thành công */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 mx-4 shadow-xl w-full max-w-xs">
            <h3 className="text-[16px] font-semibold text-gray-800 mb-2">
              Xác nhận giao thành công?
            </h3>
            <p className="text-[13px] text-gray-500">
              Đơn #{order.order_id} đã được giao đến tay khách hàng.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 text-[13px] font-medium rounded-xl border border-gray-200 text-gray-600 active:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setShowConfirm(false);
                  run(() => deliverOrder(order.order_id));
                }}
                className="flex-1 px-4 py-2.5 text-[13px] font-medium rounded-xl text-white disabled:opacity-50"
                style={{ backgroundColor: COLOR_DONE }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Màn 2.2: Phiếu đóng gói (packer checklist view) ───────────────────────

function PackerDetailView({
  order,
  profile,
  onChanged,
}: {
  order: FarmOrderDetail;
  profile: FarmProfile;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const { busy, err, run } = useAction(onChanged);

  const [checklist, setChecklist] = useState<Record<number, boolean>>({});

  const viewerCustomerId = profile.viewer?.customer_id ?? null;
  const isMyOrder =
    order.assigned_customer_id != null &&
    order.assigned_customer_id === viewerCustomerId;

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const allChecked = order.items.length > 0 && checkedCount === order.items.length;
  const remaining = order.items.length - checkedCount;

  const asmPill = assignmentPill(order.assignment_status);

  function toggleItem(itemId: number) {
    setChecklist((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  async function handleStartPacking() {
    await run(async () => {
      await startPacking(order.order_id);
      setChecklist({});
    });
  }

  async function handleConfirmPacked() {
    await run(() => confirmPacked(order.order_id));
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#fbfaf7" }}>
      {/* Dải accent vàng 5px */}
      <div style={{ height: 5, background: "#c79a12", flexShrink: 0 }} />

      {/* TopBar */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white border-b"
        style={{ borderColor: "#d4d0c7" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-xl font-medium text-gray-600 leading-none"
          aria-label="Quay lại"
        >
          ‹
        </button>
        <span className="text-[15px] font-semibold flex-1">
          #{order.order_id}
        </span>
        <span
          className="px-2.5 py-1 text-[11px] font-medium rounded-full"
          style={{ backgroundColor: asmPill.bg, color: asmPill.color }}
        >
          {asmPill.label}
        </span>
      </div>

      {/* Nội dung cuộn — pb-24 để không bị action bar che */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="flex flex-col gap-3 p-4">
          {/* Khối Khách hàng (read-only) */}
          <div
            className="bg-white rounded-xl p-4 border shadow-sm"
            style={{ borderColor: "#d4d0c7" }}
          >
            <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wide">
              Người nhận
            </div>
            <div className="font-semibold text-gray-800 text-[14px]">
              {shortenName(order.customer_name)}
            </div>
            {order.customer_phone && (
              <div className="text-[12px] text-gray-600 mt-0.5">
                SĐT: {order.customer_phone}
              </div>
            )}
            <div className="text-[12px] text-gray-600 mt-0.5">
              {order.is_pickup
                ? `Nhận tại trạm: ${recipientLocation(order)}`
                : `Giao tới: ${order.delivery_address ?? "—"}`}
            </div>
          </div>

          {/* Checklist soạn hàng */}
          <div
            className="bg-white rounded-xl border shadow-sm overflow-hidden"
            style={{ borderColor: "#d4d0c7" }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-800">
                Soạn hàng
              </span>
              <span className="text-[12px] text-gray-500">
                {checkedCount}/{order.items.length}
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "#f0ede5" }}>
              {order.items.map((item) => {
                const checked = !!checklist[item.item_id];
                return (
                  <button
                    key={item.item_id}
                    onClick={() => {
                      if (order.assignment_status === "packing" && isMyOrder) {
                        toggleItem(item.item_id);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity ${
                      checked ? "opacity-50" : ""
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0 border-2"
                      style={
                        checked
                          ? { background: "#1f8a4c", borderColor: "#1f8a4c", color: "#fff" }
                          : { borderColor: "#d4d0c7", background: "#fff" }
                      }
                    >
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 text-[13px] text-gray-800 truncate">
                      {item.product_name}
                    </span>
                    <span className="text-[13px] font-medium text-gray-700 shrink-0">
                      ×{fmtKg(item.quantity)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ghi chú của khách */}
          {order.note && (
            <div
              className="bg-white rounded-xl border shadow-sm overflow-hidden"
              style={{ borderColor: "#d4d0c7" }}
            >
              <div className="px-4 pt-3 pb-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Ghi chú của khách
                </span>
              </div>
              <div className="px-4 pb-3">
                <p className="text-[13px] text-gray-700 italic">"{order.note}"</p>
              </div>
            </div>
          )}

          {/* Không phải đơn của mình → cảnh báo */}
          {!isMyOrder && order.assignment_status !== "unassigned" && (
            <div
              className="bg-white rounded-xl border px-4 py-3 text-[12px] text-gray-500 shadow-sm"
              style={{ borderColor: "#d4d0c7" }}
            >
              Đơn này đang do nhân viên khác thực hiện. Bạn chỉ xem được thông tin.
            </div>
          )}

          {err && <div className="text-[12px] text-red-500 px-1">{err}</div>}
        </div>
      </div>

      {/* Action bar cố định đáy */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3"
        style={{ borderColor: "#d4d0c7" }}
      >
        {order.assignment_status === "assigned" && isMyOrder ? (
          <button
            disabled={busy}
            onClick={handleStartPacking}
            className="w-full py-3 rounded-xl text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ background: "#2a5bd7" }}
          >
            {busy ? "Đang xử lý..." : "Bắt đầu đóng gói"}
          </button>
        ) : order.assignment_status === "packing" && isMyOrder ? (
          allChecked ? (
            <button
              disabled={busy}
              onClick={handleConfirmPacked}
              className="w-full py-3 rounded-xl text-[14px] font-semibold text-white disabled:opacity-60"
              style={{ background: "#1f8a4c" }}
            >
              {busy ? "Đang xử lý..." : "Hoàn tất đóng gói"}
            </button>
          ) : (
            <button
              disabled
              className="w-full py-3 rounded-xl text-[14px] font-semibold cursor-not-allowed"
              style={{ background: "#edebe5", color: "#a7a299" }}
            >
              (còn {remaining} món)
            </button>
          )
        ) : order.assignment_status === "packed" ? (
          <button
            disabled
            className="w-full py-3 rounded-xl text-[14px] font-semibold cursor-not-allowed"
            style={{ background: "#d6f2dd", color: "#1f8a4c" }}
          >
            Đã đóng xong ✓{order.packed_at ? ` · ${fmtTime(order.packed_at)}` : ""}
          </button>
        ) : (
          <button
            disabled
            className="w-full py-3 rounded-xl text-[14px] font-semibold cursor-not-allowed"
            style={{ background: "#edebe5", color: "#a7a299" }}
          >
            Chờ phân công
          </button>
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
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [showHandoffSheet, setShowHandoffSheet] = useState(false);

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

  const isMine = order.is_mine;
  const isUnassigned = order.assignment_status === "unassigned";
  const isMineAssigned = isMine && order.assignment_status === "assigned";
  const isMinePacking = isMine && order.assignment_status === "packing";

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
          className="px-2.5 py-1 text-[11px] font-medium rounded-full"
          style={{ backgroundColor: pill.bg, color: pill.color }}
        >
          {pill.label}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Thông tin người nhận */}
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

        {!canAct && (
          <div className="text-[12px] text-gray-400">
            Đơn được xử lý bởi bộ phận đóng gói Vietponics.
          </div>
        )}

        {err && <div className="text-[12px] text-red-500">{err}</div>}

        {/* Hành động theo vai trò */}
        {canAct && (
          <div className="flex flex-col gap-2">
            {isOwner && isPending && (
              <button
                disabled={busy}
                onClick={() => run(() => confirmOrder(order.order_id))}
                className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-primary text-white font-medium disabled:opacity-50"
              >
                Xác nhận đơn
              </button>
            )}

            {isOwner && canHandoff && (
              <button
                disabled={busy}
                onClick={() => setShowHandoffSheet(true)}
                className="w-full px-3 py-2.5 text-[13px] rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: "#e07514" }}
              >
                Bàn giao giao hàng
              </button>
            )}

            {isOwner && !isPending && !isPacked && !isDelivering && (
              <button
                onClick={() => setShowAssignSheet(true)}
                className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-primary text-primary active:bg-primary/5"
              >
                {order.assigned_customer_id ? "Đổi người đóng" : "Phân công"}
              </button>
            )}

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

      {/* Bottom sheet phân công nhân viên */}
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

      {/* Bottom sheet bàn giao giao hàng */}
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
