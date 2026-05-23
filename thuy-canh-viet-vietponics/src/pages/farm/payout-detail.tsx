import { useEffect } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useFarmGuard, useEnsureJwt } from "@/hooks";
import { useFarmProfile, useFarmPayoutDetail } from "@/utils/farm-api";
import { FarmPayout, FarmPayoutOrder } from "@/types";

// Chi tiết một đợt thanh toán (route /farm/payouts/:id).
// Theo wireframe: list từng order trong kỳ + từng kg, có nút "Xuất PDF đối soát".
// Nút xuất file để DISABLE giai đoạn này (chưa có endpoint sinh file) — hiện
// "Sắp có" để không hứa tính năng chưa làm.
//
// Header tóm tắt gross/phí/net giống card xanh ở trang danh sách (đồng bộ số).
// Với đợt draft, danh sách đơn phản ánh trạng thái live (poll 60s).

const fmtMoney = (n: number) => Math.round(n).toLocaleString("vi-VN");

function fmtKg(n: number): string {
  return Number.isInteger(n) ? `${n}kg` : `${n.toFixed(1)}kg`;
}

function fmtDay(raw: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// "2026-05-13 08:30:00" / ISO → "13/05 08:30".
function fmtDateTime(raw: string): string {
  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function statusPill(status: FarmPayout["status"]): { label: string; className: string } {
  switch (status) {
    case "draft":
      return { label: "Đang tích lũy", className: "bg-green-100 text-green-800" };
    case "pending":
      return { label: "Chờ chuyển khoản", className: "bg-amber-50 text-amber-700" };
    case "paid":
      return { label: "Đã trả", className: "bg-green-50 text-green-700" };
    case "cancelled":
      return { label: "Đã huỷ", className: "bg-gray-100 text-gray-500" };
  }
}

export default function FarmPayoutDetailPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();
  const { id } = useParams<{ id: string }>();
  const payoutId = id ? Number(id) : null;

  useEffect(() => {
    ensureJwt();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFarmProfile(isFarm); // giữ profile warm (header layout dùng chung)
  const detail = useFarmPayoutDetail(payoutId, isFarm);

  if (!isFarm) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  const isInitialLoading = detail.loading && !detail.data;
  const payout = detail.data?.payout ?? null;
  const orders = detail.data?.orders ?? [];

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-y-auto">
      <div className="m-3 bg-white rounded-2xl border border-gray-200 p-3.5">
        {isInitialLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Đang tải chi tiết...
          </div>
        ) : detail.error ? (
          <div className="py-12 text-center text-red-500 text-sm">
            {detail.error}
            <button onClick={detail.refresh} className="ml-2 text-primary underline">
              Thử lại
            </button>
          </div>
        ) : !payout ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Không tìm thấy đợt thanh toán.
          </div>
        ) : (
          <>
            <SummaryHeader payout={payout} />

            <div className="flex items-center justify-between mt-4 mb-2">
              <div className="text-[13px] font-medium">
                Đơn đóng góp · {orders.length}
              </div>
              <button
                disabled
                onClick={() => toast("Sắp có: xuất file đối soát", { icon: "🧾" })}
                className="text-[11px] text-gray-400 border border-gray-200 rounded px-2 py-1 cursor-not-allowed"
              >
                Xuất PDF đối soát
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-[13px]">
                Chưa có đơn nào trong kỳ này.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {orders.map((o) => (
                  <OrderRow key={o.order_id} order={o} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Header tóm tắt: kỳ + status + breakdown gross/phí/net/kg.
function SummaryHeader({ payout }: { payout: FarmPayout }) {
  const pill = statusPill(payout.status);
  const net = payout.status === "paid" ? payout.net_payout : payout.net_estimated;
  return (
    <div className="p-3.5 rounded-xl bg-green-50 border border-green-300">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] text-green-800">
            {payout.status === "paid" ? "Đã thanh toán" : "Số tiền dự kiến"}
          </div>
          <div className="text-[24px] font-semibold text-green-900 leading-tight mt-0.5">
            {fmtMoney(net)}đ
          </div>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${pill.className}`}>
          {pill.label}
        </span>
      </div>

      <div className="text-[11px] text-green-800 mt-1.5">
        Kỳ {fmtDay(payout.period_start)} - {fmtDay(payout.period_end)}
        {payout.status === "paid" && payout.paid_at
          ? ` · trả ngày ${fmtDay(payout.paid_at)}`
          : payout.expected_pay_date
            ? ` · dự kiến trả ${fmtDay(payout.expected_pay_date)}`
            : ""}
      </div>

      <div className="mt-2.5 pt-2.5 border-t border-green-300 flex flex-col gap-1">
        <Row label="Doanh thu gộp" value={`${fmtMoney(payout.gross_revenue)}đ`} />
        <Row
          label={`Phí Vietponics (${Math.round((1 - payout.commission_rate) * 100)}%)`}
          value={`-${fmtMoney(payout.commission_amount)}đ`}
        />
        {payout.adjustment !== 0 && (
          <Row
            label="Điều chỉnh"
            value={`${payout.adjustment > 0 ? "+" : ""}${fmtMoney(payout.adjustment)}đ`}
          />
        )}
        <Row label="Đã bán" value={fmtKg(payout.total_sold)} />
      </div>

      {payout.transaction_ref && (
        <div className="text-[10px] text-green-700/80 mt-2">
          Mã GD: {payout.transaction_ref}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[11px] text-green-800">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// Một đơn đóng góp: mã + giờ + kg + doanh thu gộp của farm trong đơn.
function OrderRow({ order }: { order: FarmPayoutOrder }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
      <div>
        <div className="text-[13px] font-medium">#{order.order_id}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">
          {fmtDateTime(order.order_created_at)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-medium">{fmtMoney(order.gross)}đ</div>
        <div className="text-[11px] text-gray-500 mt-0.5">{fmtKg(order.qty)}</div>
      </div>
    </div>
  );
}
