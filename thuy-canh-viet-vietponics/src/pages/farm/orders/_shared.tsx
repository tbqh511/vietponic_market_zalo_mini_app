// Helpers dùng chung cho khu đóng gói: list (orders.tsx) + chi tiết (detail.tsx).
// Tách ra để hai màn không lặp logic format/nhãn/trạng thái và hook hành động.
import { useState } from "react";
import { FarmIncomingOrder, FarmMemberRole, PackingStatus } from "@/types";

// Dòng "người nhận" hiển thị ở card/chi tiết. Đơn pickup hiện TÊN TRẠM (không lộ
// địa chỉ giao); đơn shipping hiện địa chỉ ĐÃ CHE từ server. Trả chuỗi rỗng nếu
// không có gì để hiện (caller tự quyết cách ghép).
export function recipientLocation(o: {
  is_pickup: boolean;
  station_name: string | null;
  delivery_address: string | null;
}): string {
  if (o.is_pickup) return o.station_name ?? "Nhận tại trạm";
  return o.delivery_address ?? "";
}

export function fmtKg(n: number): string {
  return Number.isInteger(n) ? `${n}kg` : `${n.toFixed(1)}kg`;
}

export function fmtTime(raw: string | null): string {
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
export function shortenName(name: string | null): string {
  if (!name) return "Khách lẻ";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name;
  return parts.map((p) => p[0].toUpperCase()).join(".");
}

// Nhãn nhân viên: "Nguyễn Văn Tuấn" → "NV. Tuấn".
export function staffLabel(name: string | null): string {
  if (!name) return "Nhân viên";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name;
  const initials = parts.slice(0, -1).map((p) => p[0].toUpperCase()).join("");
  return `${initials}. ${parts[parts.length - 1]}`;
}

// Initials cho avatar tròn: "A Farm" → "AF", "Nguyễn Tuấn" → "NT".
export function avatarInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Pill trạng thái ĐƠN — trả object {label, bg, color} để render bằng inline style.
// Dùng inline style thay Tailwind vì màu là design token chính xác theo pixel.
export function statusPill(status: FarmIncomingOrder["order_status"]): {
  label: string;
  bg: string;
  color: string;
} {
  switch (status) {
    case "pending":
      return { label: "Chờ xác nhận", bg: "#ececec", color: "#5a5a5a" };
    case "confirmed":
      return { label: "Đã xác nhận", bg: "#dbe8ff", color: "#2a5bd7" };
    case "preparing":
      return { label: "Đang chuẩn bị", bg: "#fdf0c8", color: "#9a7b10" };
    case "delivering":
      return { label: "Đang giao", bg: "#ffe1cc", color: "#c4630f" };
    case "delivered":
      return { label: "Đã giao", bg: "#d6f2dd", color: "#1f8a4c" };
    case "cancelled":
      return { label: "Đã huỷ", bg: "#ffdcdc", color: "#c43838" };
    default:
      return { label: status, bg: "#ececec", color: "#5a5a5a" };
  }
}

// Pill trạng thái PHÂN CÔNG (assignment_status) cho owner view.
export function assignmentPill(status: PackingStatus): {
  label: string;
  bg: string;
  color: string;
} {
  switch (status) {
    case "unassigned":
      return { label: "Chưa có người", bg: "#ececec", color: "#5a5a5a" };
    case "assigned":
      return { label: "Đã giao việc", bg: "#dbe8ff", color: "#2a5bd7" };
    case "packing":
      return { label: "Đang đóng", bg: "#fdf0c8", color: "#9a7b10" };
    case "packed":
      return { label: "Đã đóng xong", bg: "#d6f2dd", color: "#1f8a4c" };
    default:
      return { label: status, bg: "#ececec", color: "#5a5a5a" };
  }
}

// Hook hành động dùng chung: chặn double-click, hiện lỗi, refresh sau khi xong.
export function useAction(onChanged: () => void) {
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

// ─── Bottom Sheet: Chọn người đóng gói (Màn 1.3) ─────────────────────────────

function farmRoleLabel(role: FarmMemberRole | null): string {
  if (role === "owner") return "Chủ farm";
  if (role === "admin") return "Quản lý";
  if (role === "packer") return "Đóng gói";
  if (role === "shipper") return "Shipper";
  return "";
}

export function AssignPickerSheet({
  staff,
  currentPackerId,
  busy,
  onSelect,
  onClose,
}: {
  staff: { id: number; name: string; farm_role: FarmMemberRole | null }[];
  currentPackerId: number | null;
  busy: boolean;
  onSelect: (staffId: number) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(currentPackerId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Dim overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-2xl"
        style={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#d4d0c7]" />
        </div>

        <div className="px-4 pb-2 pt-1 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#1a1a1a]">
            Chọn người đóng gói
          </h3>
          <button
            onClick={onClose}
            className="text-[#8a857c] text-[22px] leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="px-4 pb-2 flex flex-col gap-2">
          {staff.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-gray-400">
              Farm chưa có nhân viên.
            </div>
          ) : (
            staff.map((s) => {
              const selected = selectedId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border transition-colors text-left"
                  style={
                    selected
                      ? { borderColor: "#1f8a4c", backgroundColor: "rgba(31,138,76,0.06)" }
                      : { borderColor: "#d4d0c7", backgroundColor: "#fff" }
                  }
                >
                  {/* Avatar initials */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0"
                    style={
                      selected
                        ? { backgroundColor: "#1f8a4c", color: "#fff" }
                        : { backgroundColor: "#edebe5", color: "#6a655c" }
                    }
                  >
                    {avatarInitials(s.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-[#1a1a1a]">
                      {s.name}
                    </div>
                    {farmRoleLabel(s.farm_role) && (
                      <div className="text-[12px] text-[#8a857c] mt-0.5">
                        {farmRoleLabel(s.farm_role)}
                      </div>
                    )}
                  </div>

                  {/* Radio dot */}
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={
                      selected
                        ? { borderColor: "#1f8a4c", backgroundColor: "#1f8a4c" }
                        : { borderColor: "#d4d0c7", backgroundColor: "#fff" }
                    }
                  >
                    {selected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Nút xác nhận */}
        <div className="px-4 pt-2 pb-6">
          <button
            disabled={busy || selectedId === null || selectedId === currentPackerId}
            onClick={() => selectedId !== null && onSelect(selectedId)}
            className="w-full py-3 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#1f8a4c" }}
          >
            {busy ? "Đang phân công..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Sheet: Bàn giao giao hàng (Màn 1.4) ──────────────────────────────

export type HandoffMethod = "vtp" | "internal";

export function HandoffMethodSheet({
  busy,
  onSelect,
  onClose,
}: {
  busy: boolean;
  onSelect: (method: HandoffMethod) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<HandoffMethod | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Dim overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="relative bg-white rounded-t-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#d4d0c7]" />
        </div>

        <div className="px-4 pb-2 pt-1 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#1a1a1a]">
            Bàn giao giao hàng
          </h3>
          <button
            onClick={onClose}
            className="text-[#8a857c] text-[22px] leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="px-4 pb-2 flex flex-col gap-2">
          {/* Option 1: Giao qua VTP */}
          <button
            onClick={() => setSelected("vtp")}
            className="flex items-center gap-3 p-4 rounded-xl border text-left transition-colors"
            style={
              selected === "vtp"
                ? { borderColor: "#e07514", backgroundColor: "rgba(224,117,20,0.05)" }
                : { borderColor: "#d4d0c7", backgroundColor: "#fff" }
            }
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[20px] shrink-0"
              style={{ backgroundColor: selected === "vtp" ? "rgba(224,117,20,0.1)" : "#f1efe9" }}
            >
              🚚
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#1a1a1a]">
                Giao qua ViettelPost
              </div>
              <div className="text-[12px] text-[#8a857c] mt-0.5">
                Bàn giao cho đơn vị vận chuyển VTP
              </div>
            </div>
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
              style={
                selected === "vtp"
                  ? { borderColor: "#e07514", backgroundColor: "#e07514" }
                  : { borderColor: "#d4d0c7", backgroundColor: "#fff" }
              }
            >
              {selected === "vtp" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </button>

          {/* Option 2: Giao nội bộ */}
          <button
            onClick={() => setSelected("internal")}
            className="flex items-center gap-3 p-4 rounded-xl border text-left transition-colors"
            style={
              selected === "internal"
                ? { borderColor: "#e07514", backgroundColor: "rgba(224,117,20,0.05)" }
                : { borderColor: "#d4d0c7", backgroundColor: "#fff" }
            }
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[20px] shrink-0"
              style={{ backgroundColor: selected === "internal" ? "rgba(224,117,20,0.1)" : "#f1efe9" }}
            >
              🏍️
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#1a1a1a]">
                Giao nội bộ
              </div>
              <div className="text-[12px] text-[#8a857c] mt-0.5">
                Shipper của farm tự giao đến khách
              </div>
            </div>
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
              style={
                selected === "internal"
                  ? { borderColor: "#e07514", backgroundColor: "#e07514" }
                  : { borderColor: "#d4d0c7", backgroundColor: "#fff" }
              }
            >
              {selected === "internal" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        </div>

        {/* Nút xác nhận */}
        <div className="px-4 pt-2 pb-6">
          <button
            disabled={busy || selected === null}
            onClick={() => selected !== null && onSelect(selected)}
            className="w-full py-3 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#e07514" }}
          >
            {busy ? "Đang bàn giao..." : "Xác nhận bàn giao"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TruckIcon() {
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
