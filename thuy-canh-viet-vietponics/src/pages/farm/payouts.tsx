import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFarmGuard, useEnsureJwt, useCustomerSupport } from "@/hooks";
import { useFarmProfile, useFarmPayouts } from "@/utils/farm-api";
import { FarmPayout } from "@/types";

// Trang Payouts — Công nợ & Thanh toán của Farm Partner (route /farm/payouts).
// Theo wireframe vietponics_farm_payouts_wireframe.html:
//   1. Card xanh nổi bật: số "đang tích lũy" (đợt draft) + ngày dự kiến trả +
//      breakdown gross / phí Vietponics / kg. Mở rộng được (toggle breakdown).
//   2. Card info chu kỳ thanh toán (rút từ farm.payment_cycle).
//   3. Lịch sử payouts: period range + số tiền + status pill + ngày trả thật.
//      Tap vào → /farm/payouts/:id (chi tiết từng đơn).
//   4. Footer: link Zalo OA để khiếu nại (CRITICAL — tăng niềm tin).
//
// Màu chủ đạo: primary (green #52b361) + nền trắng/xám — đồng bộ dashboard.
// Số "đang tích lũy" chỉ tính từ đơn delivering/delivered (backend) — không tính
// pending để tránh farm thấy ảo.

const fmtMoney = (n: number) => Math.round(n).toLocaleString("vi-VN");

// Số kg gọn: 187 → "187kg", 2.5 → "2.5kg".
function fmtKg(n: number): string {
  return Number.isInteger(n) ? `${n}kg` : `${n.toFixed(1)}kg`;
}

// "2026-05-13" → "13/05". Fallback giữ nguyên nếu parse fail.
function fmtDay(raw: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// "13/05 - 19/05" cho 1 kỳ.
function fmtPeriod(p: FarmPayout): string {
  return `${fmtDay(p.period_start)} - ${fmtDay(p.period_end)}`;
}

// Mô tả chu kỳ thanh toán cho card info.
function cycleText(cycle: "weekly" | "biweekly" | "monthly"): {
  title: string;
  sub: string;
} {
  switch (cycle) {
    case "weekly":
      return { title: "Chu kỳ thanh toán: hàng tuần", sub: "Vietponics trả vào đầu tuần kế tiếp" };
    case "biweekly":
      return { title: "Chu kỳ thanh toán: 2 tuần/lần", sub: "Vietponics trả sau mỗi 2 tuần" };
    case "monthly":
      return { title: "Chu kỳ thanh toán: hàng tháng", sub: "Vietponics trả vào đầu tháng kế tiếp" };
  }
}

// Style status pill cho lịch sử. draft = đang tích lũy (xanh nhạt), pending =
// chờ chuyển khoản (amber), paid = đã trả (xanh), cancelled = huỷ (xám).
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

// Tên phương thức thanh toán cho dòng "ngày trả · phương thức".
function methodLabel(method: string | null): string {
  if (!method) return "";
  const m = method.toLowerCase();
  if (m.includes("bank") || m === "bank_transfer") return "Chuyển khoản";
  if (m === "cash") return "Tiền mặt";
  return method;
}

export default function FarmPayoutsPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();
  const openSupport = useCustomerSupport();
  const [showBreakdown, setShowBreakdown] = useState(true);

  useEffect(() => {
    ensureJwt();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const profile = useFarmProfile(isFarm);
  // Thu nhập (payout) chỉ dành cho CHỦ farm. Staff vào thẳng URL sẽ bị chặn.
  const isOwner = profile.data?.viewer?.is_owner ?? false;
  const profileLoaded = !!profile.data;
  // Defense-in-depth: staff KHÔNG fetch dữ liệu payout (BE cũng đã trả 403).
  const payouts = useFarmPayouts(isFarm && isOwner);

  // Tách đợt "đang tích lũy" (draft) làm card nổi bật; phần còn lại vào lịch sử.
  // Backend sort period_end desc → draft kỳ hiện tại thường ở đầu. Lấy draft mới
  // nhất nếu có nhiều (an toàn).
  const { current, history } = useMemo(() => {
    const rows = payouts.data ?? [];
    const drafts = rows.filter((p) => p.status === "draft");
    const current = drafts[0] ?? null;
    const history = rows.filter((p) => p !== current);
    return { current, history };
  }, [payouts.data]);

  if (!isFarm) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // Chưa biết vai trò (chưa có /farm/me) → chờ, tránh chớp màn chặn cho owner.
  if (!profileLoaded) {
    if (profile.error) {
      return (
        <div className="flex flex-col items-center justify-center h-40 gap-2 px-6">
          <p className="text-gray-400 text-sm text-center">
            Không thể kiểm tra quyền truy cập.
          </p>
          <button onClick={profile.refresh} className="text-primary text-sm underline">
            Thử lại
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // Staff (không phải owner) → chặn, KHÔNG render dữ liệu tài chính.
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full bg-gray-100 px-8 text-center gap-2">
        <LockIcon />
        <p className="text-gray-700 text-sm font-medium">
          Bạn không có quyền xem mục này
        </p>
        <p className="text-gray-400 text-xs">Mục Thu nhập chỉ dành cho chủ farm.</p>
        <Link to="/farm" className="mt-2 text-primary text-sm underline">
          Quay lại Tổng quan
        </Link>
      </div>
    );
  }

  const isInitialLoading = payouts.loading && !payouts.data;
  const cycle = profile.data?.payment_cycle ?? "weekly";
  const ct = cycleText(cycle);

  return (
    <div className="flex flex-col min-h-full bg-gray-100">
      <div className="m-3 bg-white rounded-2xl border border-gray-200 p-3.5">
        {/* Card xanh nổi bật: đang tích lũy */}
        {isInitialLoading ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            Đang tải thanh toán...
          </div>
        ) : (
          <AccrualCard
            payout={current}
            expanded={showBreakdown}
            onToggle={() => setShowBreakdown((v) => !v)}
          />
        )}

        {/* Card info chu kỳ thanh toán */}
        <div className="mt-3.5 p-2.5 bg-gray-50 rounded-xl flex items-center gap-2.5">
          <CalendarIcon />
          <div className="flex-1 text-xs">
            <div className="text-gray-900">{ct.title}</div>
            <div className="text-gray-500 mt-0.5">{ct.sub}</div>
          </div>
        </div>

        {/* Lịch sử payouts */}
        <div className="mt-4">
          <div className="text-[13px] font-medium mb-2">Lịch sử thanh toán</div>

          {!isInitialLoading && history.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-[13px]">
              Chưa có đợt thanh toán nào.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {history.map((p) => (
                <HistoryRow key={p.id} payout={p} />
              ))}
            </div>
          )}
        </div>

        {/* Footer: khiếu nại qua Zalo OA */}
        <button
          onClick={openSupport}
          className="mt-4 w-full p-2.5 bg-blue-50 rounded-xl flex items-center gap-2 text-left active:bg-blue-100"
        >
          <HeadsetIcon />
          <span className="text-[11px] text-blue-700 flex-1">
            Có sai sót về thanh toán? Liên hệ Vietponics qua Zalo OA
          </span>
        </button>

        {payouts.error && (
          <div className="mt-3 p-2 bg-red-50 rounded text-[11px] text-red-700">
            {payouts.error}
            <button onClick={payouts.refresh} className="ml-2 underline">
              Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Card xanh "Sắp được thanh toán" — điểm wow. Hiển thị net đang tích lũy + ngày
// dự kiến + breakdown gross/phí/kg (mở rộng được). Khi chưa có đợt draft → state
// rỗng nhẹ nhàng (chưa phát sinh doanh thu kỳ này).
function AccrualCard({
  payout,
  expanded,
  onToggle,
}: {
  payout: FarmPayout | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!payout) {
    return (
      <div className="p-3.5 rounded-xl bg-green-50 border border-green-200">
        <div className="text-[11px] text-green-800">Sắp được thanh toán</div>
        <div className="text-[22px] font-semibold text-green-900 mt-1">0đ</div>
        <div className="text-[11px] text-green-700/80 mt-1">
          Chưa phát sinh doanh thu trong kỳ này.
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/farm/payouts/${payout.id}`}
      className="block p-3.5 rounded-xl bg-green-50 border border-green-300 active:bg-green-100"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] text-green-800">Sắp được thanh toán</div>
          <div className="text-[24px] font-semibold text-green-900 leading-tight mt-0.5">
            {fmtMoney(payout.net_estimated)}đ
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-medium bg-green-500 text-green-950 rounded-full">
          Đang tích lũy
        </span>
      </div>

      <div className="text-[11px] text-green-800 mt-1.5">
        Kỳ {fmtPeriod(payout)}
        {payout.expected_pay_date && ` · dự kiến trả ${fmtDay(payout.expected_pay_date)}`}
      </div>

      {/* Breakdown gross / phí / kg — toggle bằng nút (chặn navigate khi bấm) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className="mt-2 flex items-center gap-1 text-[11px] text-green-700 font-medium"
      >
        {expanded ? "Ẩn chi tiết" : "Xem chi tiết"}
        <ChevronIcon open={expanded} />
      </button>

      {expanded && (
        <div className="mt-2 pt-2.5 border-t border-green-300 flex flex-col gap-1">
          <BreakdownRow label="Doanh thu gộp" value={`${fmtMoney(payout.gross_revenue)}đ`} />
          <BreakdownRow
            label={`Phí Vietponics (${Math.round((1 - payout.commission_rate) * 100)}%)`}
            value={`-${fmtMoney(payout.commission_amount)}đ`}
          />
          {payout.adjustment !== 0 && (
            <BreakdownRow
              label="Điều chỉnh"
              value={`${payout.adjustment > 0 ? "+" : ""}${fmtMoney(payout.adjustment)}đ`}
            />
          )}
          <BreakdownRow label="Đã bán" value={fmtKg(payout.total_sold)} />
        </div>
      )}

      <div className="mt-2 text-[10px] text-green-700/70">
        Chạm để xem từng đơn đóng góp ›
      </div>
    </Link>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[11px] text-green-800">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// Một dòng lịch sử payout — tap vào xem chi tiết.
function HistoryRow({ payout }: { payout: FarmPayout }) {
  const pill = statusPill(payout.status);
  const amount = payout.status === "paid" ? payout.net_payout : payout.net_estimated;
  return (
    <Link
      to={`/farm/payouts/${payout.id}`}
      className="block p-3 bg-gray-50 rounded-xl active:bg-gray-100"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs text-gray-500">{fmtPeriod(payout)}</div>
          <div className="text-[15px] font-medium mt-0.5">{fmtMoney(amount)}đ</div>
        </div>
        <div className="text-right">
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${pill.className}`}>
            {pill.label}
          </span>
          {payout.status === "paid" && payout.paid_at && (
            <div className="text-[10px] text-gray-500 mt-1">
              {fmtDay(payout.paid_at)}
              {methodLabel(payout.payment_method) && ` · ${methodLabel(payout.payment_method)}`}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function LockIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-300"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-500 shrink-0"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-blue-600 shrink-0"
    >
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
