// Helpers dùng chung cho khu đóng gói: list (orders.tsx) + chi tiết (detail.tsx).
// Tách ra để hai màn không lặp logic format/nhãn/trạng thái và hook hành động.
import { useState } from "react";
import { FarmIncomingOrder, PackingStatus } from "@/types";

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
