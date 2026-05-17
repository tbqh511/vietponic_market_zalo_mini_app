import { Order } from "@/types";
import { formatDate } from "@/utils/format";

// Map VTP status codes → icon hiển thị bên cạnh timeline entry
const STATUS_ICON: Record<number, string> = {
  103: "📦", // Điều phối bưu cục lấy hàng
  104: "🚚", // Bưu tá đi lấy hàng
  200: "✅", // Lấy hàng thành công
  202: "📝", // Sửa phiếu gửi
  300: "🚛", // Khai thác đi
  400: "🚛", // Khai thác đến
  500: "🛵", // Bưu tá đi phát
  501: "🎉", // Phát thành công
  503: "🚫", // Tiêu huỷ
  504: "↩️", // Chuyển hoàn về người gửi (thành công)
  505: "↩️", // Yêu cầu chuyển hoàn
  506: "❌", // Phát thất bại
  507: "🏤", // Khách đến bưu cục nhận
  508: "🔁", // Đơn vị yêu cầu phát tiếp
  509: "🔀", // Chuyển tiếp bưu cục khác
  515: "↩️", // Duyệt hoàn
  550: "🔁", // Khách yêu cầu phát tiếp
  101: "🚫", // VTP huỷ lấy hàng
  107: "🚫", // Đối tác yêu cầu huỷ
  201: "🚫", // VTP huỷ đơn
};

function OrderTracking({ order }: { order: Order }) {
  // Chỉ hiển thị cho đơn shipping đã có mã VTP
  if (order.delivery.type !== "shipping" || !order.delivery.vtpOrderNumber) {
    return null;
  }

  const { vtpOrderNumber, vtpStatusName, vtpLocation, vtpStatusAt, vtpIsReturning } = order.delivery;
  const events = order.trackingEvents ?? [];

  return (
    <div className="bg-white rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">Hành trình đơn hàng</div>
        <div className="text-xs text-inactive">Mã VTP: {vtpOrderNumber}</div>
      </div>

      {vtpStatusName && (
        <div className="bg-primary/5 border border-primary/20 rounded p-3 text-xs space-y-1">
          <div className="font-medium text-primary">
            {vtpStatusName}
            {vtpIsReturning && <span className="ml-2 text-warning">(Đang hoàn)</span>}
          </div>
          {vtpLocation && <div className="text-subtitle">📍 {vtpLocation}</div>}
          {vtpStatusAt && <div className="text-inactive">{formatDate(vtpStatusAt)}</div>}
        </div>
      )}

      {events.length > 0 ? (
        <ol className="space-y-3 relative border-l-2 border-gray-200 pl-5 ml-1">
          {events.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[28px] top-0 text-base leading-none">
                {STATUS_ICON[e.status_code] ?? "•"}
              </span>
              <div className="text-xs font-medium leading-snug">{e.status_name}</div>
              {e.location && <div className="text-2xs text-subtitle mt-0.5">{e.location}</div>}
              {e.note && <div className="text-2xs text-subtitle italic mt-0.5">{e.note}</div>}
              {e.employee_name && (
                <div className="text-2xs text-subtitle mt-0.5">
                  Bưu tá: {e.employee_name}
                  {e.employee_phone ? ` — ${e.employee_phone}` : ""}
                </div>
              )}
              <div className="text-2xs text-inactive mt-0.5">
                {formatDate(new Date(e.status_at))}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="text-2xs text-inactive">Chưa có sự kiện hành trình.</div>
      )}
    </div>
  );
}

export default OrderTracking;
