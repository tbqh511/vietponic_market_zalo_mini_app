import { useEffect, useMemo, useState } from "react";
import { useFarmGuard, useEnsureJwt } from "@/hooks";
import {
  useFarmAnalytics,
  FarmAnalyticsPeriod,
  ANALYTICS_PERIOD_DAYS,
} from "@/utils/farm-api";
import { FarmRevenuePoint, FarmTopProduct } from "@/types";

// Trang Analytics của Farm Partner (route /farm/analytics).
// Theo wireframe: tabs 7/30/90 ngày → card doanh thu + sparkline + delta →
// top sản phẩm → so sánh hiệu suất (kỳ này vs kỳ trước).
//
// Màu chủ đạo: primary (#52b361, green) + nền trắng/xám nhạt — đồng bộ dashboard.
// Dữ liệu lấy từ GET /farm/analytics; delta tính bằng cách fetch thêm kỳ liền
// trước (periodBack=1) rồi so revenue/profit/orders.

const PERIODS: { key: FarmAnalyticsPeriod; label: string }[] = [
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "90d", label: "90 ngày" },
];

const PERIOD_NOUN: Record<FarmAnalyticsPeriod, string> = {
  "7d": "Tuần này",
  "30d": "Tháng này",
  "90d": "Quý này",
};

// Rút gọn tiền VND: 18.500.000 → "18.5M", 8_400_000 → "8.4M", < 1tr giữ nguyên.
function fmtCompact(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return Math.round(n).toLocaleString("vi-VN");
}

const fmtFull = (n: number) => Math.round(n).toLocaleString("vi-VN");

// % thay đổi so với kỳ trước; null nếu kỳ trước = 0 (không chia được).
function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export default function FarmAnalyticsPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();
  const [period, setPeriod] = useState<FarmAnalyticsPeriod>("7d");

  useEffect(() => {
    ensureJwt();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Kỳ hiện tại + kỳ liền trước (để so sánh). Cả hai cùng period nên đổi tab
  // là refetch cả hai.
  const current = useFarmAnalytics(period, isFarm, 0);
  const previous = useFarmAnalytics(period, isFarm, 1);

  const data = current.data;
  const prevOv = previous.data?.overview ?? null;

  const series = data?.revenue.series ?? [];
  const topProducts = data?.top_products ?? [];
  const ov = data?.overview ?? null;

  const revenueDelta = useMemo(
    () => (ov && prevOv ? deltaPct(ov.revenue, prevOv.revenue) : null),
    [ov, prevOv]
  );
  const profitDelta = useMemo(
    () => (ov && prevOv ? deltaPct(ov.profit, prevOv.profit) : null),
    [ov, prevOv]
  );
  const ordersDelta = useMemo(
    () => (ov && prevOv ? deltaPct(ov.orders_count, prevOv.orders_count) : null),
    [ov, prevOv]
  );

  if (!isFarm) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  const isInitialLoading = current.loading && !current.data;

  return (
    <div className="flex flex-col min-h-full bg-gray-100">
      <div className="m-3 bg-white rounded-2xl border border-gray-200 p-3.5">
        {/* Range tabs */}
        <div className="flex gap-1.5">
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`flex-1 py-2 text-center text-xs rounded-lg transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium border border-primary/30"
                    : "border border-gray-200 text-gray-500 active:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {isInitialLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Đang tải phân tích...
          </div>
        ) : current.error ? (
          <div className="py-16 text-center text-red-500 text-sm">
            {current.error}
            <button
              onClick={current.refresh}
              className="ml-2 text-primary underline"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* Revenue summary card + sparkline */}
            <div className="mt-3.5 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex justify-between items-baseline">
                <div>
                  <div className="text-[11px] text-gray-500">
                    {PERIOD_NOUN[period]}
                  </div>
                  <div className="text-[22px] font-semibold text-gray-900 mt-0.5">
                    {ov ? `${fmtFull(ov.revenue)}đ` : "—"}
                  </div>
                </div>
                <div className="text-right">
                  {revenueDelta !== null ? (
                    <div
                      className={`text-[11px] font-medium flex items-center justify-end gap-0.5 ${
                        revenueDelta >= 0 ? "text-primary" : "text-red-500"
                      }`}
                    >
                      {revenueDelta >= 0 ? "▲" : "▼"}{" "}
                      {revenueDelta >= 0 ? "+" : ""}
                      {revenueDelta}%
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400">—</div>
                  )}
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    vs kỳ trước
                  </div>
                </div>
              </div>

              <Sparkline series={series} />
            </div>

            {/* Top products */}
            <div className="mt-4">
              <div className="text-[13px] font-medium mb-2">
                Top sản phẩm {PERIOD_NOUN[period].toLowerCase()}
              </div>
              {topProducts.length === 0 ? (
                <div className="text-[12px] text-gray-400 text-center py-4">
                  Chưa có dữ liệu bán trong kỳ này.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {topProducts.slice(0, 5).map((p, i) => (
                    <TopProductRow key={p.product_id} rank={i + 1} product={p} />
                  ))}
                </div>
              )}
            </div>

            {/* Performance comparison */}
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-500 mb-2.5">So sánh hiệu suất</div>
              <div className="grid grid-cols-2 gap-3">
                <CompareMetric
                  label="Lợi nhuận"
                  value={ov ? `${fmtCompact(ov.profit)}đ` : "—"}
                  delta={profitDelta}
                />
                <CompareMetric
                  label="Số đơn"
                  value={ov ? `${ov.orders_count}` : "—"}
                  delta={ordersDelta}
                />
                <CompareMetric
                  label="Đã bán"
                  value={ov ? `${fmtFull(ov.items_sold)}` : "—"}
                  suffix="kg"
                />
                <CompareMetric
                  label="Giá trị đơn TB"
                  value={ov ? `${fmtCompact(ov.avg_order_value)}đ` : "—"}
                />
              </div>
              <div className="text-[10px] text-gray-400 mt-2.5">
                So với {ANALYTICS_PERIOD_DAYS[period]} ngày liền trước.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

// Sparkline doanh thu — SVG polyline tự scale theo max của series.
// Màu primary (green) khớp wireframe; phần fill mờ 8%.
function Sparkline({ series }: { series: FarmRevenuePoint[] }) {
  const W = 320;
  const H = 100;
  const PAD = 12;

  const path = useMemo(() => {
    if (series.length === 0) return null;
    const max = Math.max(...series.map((s) => s.revenue), 1);
    const n = series.length;
    const stepX = n > 1 ? (W - PAD * 2) / (n - 1) : 0;
    const points = series.map((s, i) => {
      const x = PAD + i * stepX;
      // y: 0 doanh thu ở đáy (H-15), max ở đỉnh (15).
      const y = H - 15 - (s.revenue / max) * (H - 30);
      return [Math.round(x), Math.round(y)] as const;
    });
    const line = points.map((p) => p.join(",")).join(" ");
    const area = `${line} ${points[points.length - 1][0]},${H - 5} ${points[0][0]},${H - 5}`;
    return { line, area, last: points[points.length - 1] };
  }, [series]);

  // Nhãn trục X: đầu / giữa / cuối kỳ (rút từ bucket key).
  const labels = useMemo(() => {
    if (series.length === 0) return [];
    const idxs = [0, Math.floor(series.length / 2), series.length - 1];
    return Array.from(new Set(idxs)).map((i) => ({
      i,
      text: bucketLabel(series[i].bucket),
    }));
  }, [series]);

  if (!path) {
    return (
      <div className="mt-2 h-[90px] flex items-center justify-center text-[11px] text-gray-400">
        Chưa có dữ liệu doanh thu
      </div>
    );
  }

  return (
    <div className="mt-2">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Biểu đồ doanh thu"
      >
        <polyline
          points={path.area}
          fill="var(--primary)"
          opacity="0.08"
          stroke="none"
        />
        <polyline
          points={path.line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={path.last[0]} cy={path.last[1]} r="3.5" fill="var(--primary)" />
      </svg>
      <div className="flex justify-between mt-1 px-1">
        {labels.map((l) => (
          <span key={l.i} className="text-[9px] text-gray-400">
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
}

// 'YYYY-MM-DD' → 'DD/MM'; 'YYYY-Www' → 'Wnn'.
function bucketLabel(bucket: string): string {
  const wk = bucket.match(/W(\d{2})$/);
  if (wk) return `Tuần ${parseInt(wk[1], 10)}`;
  const parts = bucket.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return bucket;
}

const RANK_STYLE: Record<number, string> = {
  1: "bg-[#FAEEDA] text-[#854F0B]",
  2: "bg-gray-100 text-gray-600",
  3: "bg-gray-100 text-gray-600",
};

function TopProductRow({
  rank,
  product,
}: {
  rank: number;
  product: FarmTopProduct;
}) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 ${
          RANK_STYLE[rank] ?? "bg-gray-100 text-gray-600"
        }`}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{product.name}</div>
        <div className="text-[11px] text-gray-500">
          {fmtFull(product.qty)}kg đã bán · {product.orders_count} đơn
        </div>
      </div>
      <div className="text-[13px] font-medium text-gray-900 flex-shrink-0">
        {fmtCompact(product.revenue)}
      </div>
    </div>
  );
}

function CompareMetric({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: string;
  delta?: number | null;
  suffix?: string;
}) {
  return (
    <div>
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-base font-semibold text-gray-900 mt-0.5">
        {value}
        {suffix && (
          <span className="text-xs font-normal text-gray-400"> {suffix}</span>
        )}
      </div>
      {typeof delta === "number" && (
        <div
          className={`text-[10px] mt-0.5 ${
            delta >= 0 ? "text-primary" : "text-red-500"
          }`}
        >
          {delta >= 0 ? "+" : ""}
          {delta}% vs kỳ trước
        </div>
      )}
    </div>
  );
}
