import { Order, OrderHistoryAction, OrderHistoryEvent, VtpTrackingEvent } from "@/types";
import { formatDate } from "@/utils/format";

// ─── Flat SVG icons ────────────────────────────────────────────────────────

function IconCart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}
function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconPackage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}
function IconCheckBadge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  );
}
function IconXCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconArrowReturn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}
function IconExclamation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}
function IconArrows() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

// ─── Icon mapping ─────────────────────────────────────────────────────────

type IconKey =
  | "cart" | "check-circle" | "package" | "truck" | "check-badge"
  | "x-circle" | "arrow-return" | "exclamation" | "building" | "refresh"
  | "edit" | "arrows";

const ICON_MAP: Record<IconKey, () => JSX.Element> = {
  "cart":          IconCart,
  "check-circle":  IconCheckCircle,
  "package":       IconPackage,
  "truck":         IconTruck,
  "check-badge":   IconCheckBadge,
  "x-circle":      IconXCircle,
  "arrow-return":  IconArrowReturn,
  "exclamation":   IconExclamation,
  "building":      IconBuilding,
  "refresh":       IconRefresh,
  "edit":          IconEdit,
  "arrows":        IconArrows,
};

// Màu dot trên timeline theo loại action
type DotColor = "green" | "blue" | "yellow" | "red" | "gray";
const HISTORY_DOT: Record<OrderHistoryAction, DotColor> = {
  order_placed: "blue",
  confirmed:    "green",
  preparing:    "yellow",
  delivering:   "blue",
  delivered:    "green",
  cancelled:    "red",
  refunded:     "gray",
};

const HISTORY_ICON: Record<OrderHistoryAction, IconKey> = {
  order_placed: "cart",
  confirmed:    "check-circle",
  preparing:    "package",
  delivering:   "truck",
  delivered:    "check-badge",
  cancelled:    "x-circle",
  refunded:     "arrow-return",
};

// VTP status code → icon key + dot color
const VTP_ICON: Record<number, IconKey> = {
  103: "package",    // Điều phối bưu cục lấy hàng
  104: "truck",      // Bưu tá đi lấy hàng
  200: "check-circle", // Lấy hàng thành công
  202: "edit",       // Sửa phiếu gửi
  300: "truck",      // Khai thác đi
  400: "truck",      // Khai thác đến
  500: "truck",      // Bưu tá đi phát
  501: "check-badge", // Phát thành công
  503: "x-circle",   // Tiêu huỷ
  504: "arrow-return", // Chuyển hoàn về người gửi
  505: "arrow-return", // Yêu cầu chuyển hoàn
  506: "exclamation", // Phát thất bại
  507: "building",   // Khách đến bưu cục nhận
  508: "refresh",    // Đơn vị yêu cầu phát tiếp
  509: "arrows",     // Chuyển tiếp bưu cục khác
  515: "arrow-return", // Duyệt hoàn
  550: "refresh",    // Khách yêu cầu phát tiếp
  101: "x-circle",   // VTP huỷ lấy hàng
  107: "x-circle",   // Đối tác yêu cầu huỷ
  201: "x-circle",   // VTP huỷ đơn
};

const VTP_DOT: Record<number, DotColor> = {
  501: "green",
  506: "red", 503: "red", 101: "red", 107: "red", 201: "red",
  504: "gray", 505: "gray", 515: "gray",
};

const DOT_CLASS: Record<DotColor, string> = {
  green:  "bg-green-500",
  blue:   "bg-primary",
  yellow: "bg-yellow-400",
  red:    "bg-danger",
  gray:   "bg-gray-400",
};

// ─── Timeline entry type ──────────────────────────────────────────────────

interface TimelineEntry {
  key: string;
  iconKey: IconKey;
  dotColor: DotColor;
  title: string;
  subtitle?: string;   // description (history) hoặc location (VTP)
  note?: string;       // VTP note (italic)
  detail?: string;     // "Bưu tá: tên — SĐT"
  occurredAt: Date;
}

function toHistoryEntry(e: OrderHistoryEvent, i: number): TimelineEntry {
  return {
    key: `h-${i}`,
    iconKey: HISTORY_ICON[e.action] ?? "check-circle",
    dotColor: HISTORY_DOT[e.action] ?? "gray",
    title: e.title,
    subtitle: e.description ?? undefined,
    occurredAt: new Date(e.occurred_at),
  };
}

function toVtpEntry(e: VtpTrackingEvent, i: number): TimelineEntry {
  return {
    key: `v-${i}`,
    iconKey: VTP_ICON[e.status_code] ?? "package",
    dotColor: VTP_DOT[e.status_code] ?? "blue",
    title: e.status_name,
    subtitle: e.location ?? undefined,
    note: e.note ?? undefined,
    detail: e.employee_name
      ? `Bưu tá: ${e.employee_name}${e.employee_phone ? ` — ${e.employee_phone}` : ""}`
      : undefined,
    occurredAt: new Date(e.status_at),
  };
}

// ─── Component ────────────────────────────────────────────────────────────

function OrderTracking({ order }: { order: Order }) {
  const orderHistory = order.orderHistory ?? [];
  const trackingEvents = order.trackingEvents ?? [];
  const isShipping = order.delivery.type === "shipping";

  if (orderHistory.length === 0 && trackingEvents.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4">
        <div className="font-medium text-sm mb-2">Hành trình đơn hàng</div>
        <div className="text-2xs text-inactive">Chưa có sự kiện hành trình.</div>
      </div>
    );
  }

  // Merge order history + VTP events, sort DESC (mới nhất trên đầu)
  const timeline: TimelineEntry[] = [
    ...orderHistory.map(toHistoryEntry),
    ...(isShipping ? trackingEvents.map(toVtpEntry) : []),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  const vtpDelivery =
    isShipping && order.delivery.type === "shipping" ? order.delivery : null;

  return (
    <div className="bg-white rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">Hành trình đơn hàng</div>
        {vtpDelivery?.vtpOrderNumber && (
          <div className="text-xs text-inactive">
            Mã VTP: {vtpDelivery.vtpOrderNumber}
          </div>
        )}
      </div>

      {/* VTP status banner — chỉ khi đang giao qua VTP */}
      {vtpDelivery?.vtpStatusName && (
        <div className="bg-primary/5 border border-primary/20 rounded p-3 text-xs space-y-1">
          <div className="font-medium text-primary">
            {vtpDelivery.vtpStatusName}
            {vtpDelivery.vtpIsReturning && (
              <span className="ml-2 text-warning">(Đang hoàn)</span>
            )}
          </div>
          {vtpDelivery.vtpLocation && (
            <div className="text-subtitle">📍 {vtpDelivery.vtpLocation}</div>
          )}
          {vtpDelivery.vtpStatusAt && (
            <div className="text-inactive">{formatDate(vtpDelivery.vtpStatusAt)}</div>
          )}
        </div>
      )}

      {/* Timeline */}
      <ol className="space-y-3 relative border-l-2 border-gray-200 pl-5 ml-1">
        {timeline.map((entry) => {
          const Icon = ICON_MAP[entry.iconKey];
          return (
            <li key={entry.key} className="relative">
              {/* Dot trên đường kẻ */}
              <span
                className={`absolute -left-[25px] top-0.5 w-3 h-3 rounded-full border-2 border-white ${DOT_CLASS[entry.dotColor]} flex items-center justify-center`}
              />
              {/* Icon nhỏ bên trong dot — ẩn ở dot nhỏ, dùng icon riêng bên phải */}
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 ${entry.dotColor === "red" ? "text-danger" : entry.dotColor === "green" ? "text-green-600" : entry.dotColor === "yellow" ? "text-yellow-500" : "text-subtitle"}`}>
                  <Icon />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium leading-snug">{entry.title}</div>
                  {entry.subtitle && (
                    <div className="text-2xs text-subtitle mt-0.5">{entry.subtitle}</div>
                  )}
                  {entry.note && (
                    <div className="text-2xs text-subtitle italic mt-0.5">{entry.note}</div>
                  )}
                  {entry.detail && (
                    <div className="text-2xs text-subtitle mt-0.5">{entry.detail}</div>
                  )}
                  <div className="text-2xs text-inactive mt-0.5">
                    {formatDate(entry.occurredAt)}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default OrderTracking;
