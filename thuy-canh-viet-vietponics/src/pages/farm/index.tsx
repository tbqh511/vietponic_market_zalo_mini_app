import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFarmGuard, useEnsureJwt } from "@/hooks";
import {
  useFarmProfile,
  useFarmOverview,
  useFarmProductsToday,
} from "@/utils/farm-api";
import StatCard from "@/components/farm/stat-card";
import ProductProgress from "@/components/farm/product-progress";

// Dashboard chính của Farm Partner Hub (route /farm).
// Layout theo wireframe:
//   1. Header: avatar farm + tên + địa chỉ · sản phẩm count + Live indicator
//   2. Grid 2x2 metric: doanh thu / đã bán / đơn / sellthrough
//   3. List "Sản phẩm hôm nay" — mỗi row ProductProgress
//   4. AI hint card (nếu có)
//
// Polling 30s (qua hooks farm-api). Dashboard chỉ cho farm partner — useFarmGuard
// sẽ redirect customer thường về /. Inventory CRUD ở route riêng /farm/inventory.
export default function FarmDashboardPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();

  // Đảm bảo có JWT trước khi gọi farm endpoints (re-auth nếu hết hạn).
  useEffect(() => {
    ensureJwt();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chỉ fetch khi đã verified là farm partner — tránh gọi API 403.
  const profile = useFarmProfile(isFarm);
  const overview = useFarmOverview("today", isFarm);
  const productsToday = useFarmProductsToday(isFarm);

  // Avatar farm = 2 ký tự đầu của tên (vd "Joiley Farm" → "JF").
  const initials = useMemo(() => {
    const name = profile.data?.name ?? "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "—";
  }, [profile.data?.name]);

  if (!isFarm) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // Đang load lần đầu (cả 3 hook chưa có data) — show skeleton đơn giản.
  const isInitialLoading =
    profile.loading && overview.loading && productsToday.loading && !profile.data && !overview.data;

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang tải dashboard...</p>
      </div>
    );
  }

  const ov = overview.data;
  const products = productsToday.data?.products ?? [];
  const hint = productsToday.data?.hint ?? null;

  // Format số tiền VND ngắn gọn — không kèm "đ" (chèn ngoài JSX).
  const fmtMoney = (n: number) => Math.round(n).toLocaleString("vi-VN");

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-y-auto">
      <div className="m-3 bg-white rounded-lg border border-gray-200 p-3.5">
        {/* Header farm */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-[13px] font-medium text-green-700">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile.data?.name ?? "—"}</div>
            <div className="text-[11px] text-gray-500 truncate">
              {profile.data?.address ?? "—"}
            </div>
          </div>
          <Link
            to="/farm/inventory"
            className="text-[11px] text-primary border border-primary rounded px-2 py-1"
          >
            Quản lý kho
          </Link>
          <div className="flex items-center gap-1 text-[10px] text-green-600 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        </div>

        {/* 2x2 Metric grid */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <StatCard
            label="Doanh thu hôm nay"
            value={ov ? `${fmtMoney(ov.revenue)}đ` : "—"}
            subtitle={ov ? `${ov.orders_count} đơn đã giao` : undefined}
            tone="success"
          />
          <StatCard
            label="Đã bán hôm nay"
            value={ov ? `${ov.items_sold}` : "—"}
            subtitle="kg/đơn vị"
            tone="muted"
          />
          <StatCard
            label="Lợi nhuận"
            value={ov ? `${fmtMoney(ov.profit)}đ` : "—"}
            subtitle={ov && ov.revenue > 0 ? `${Math.round((ov.profit / ov.revenue) * 100)}% biên` : undefined}
            tone={ov && ov.profit >= 0 ? "success" : "danger"}
          />
          <StatCard
            label="AOV"
            value={ov ? `${fmtMoney(ov.avg_order_value)}đ` : "—"}
            subtitle="Giá trị đơn TB"
            tone="muted"
          />
        </div>

        {/* List sản phẩm hôm nay */}
        <div className="text-xs font-medium mt-4 mb-2 flex justify-between">
          <span>Sản phẩm hôm nay</span>
          <span className="text-gray-500 font-normal">đã bán / nhập</span>
        </div>

        {products.length === 0 ? (
          <div className="text-[12px] text-gray-400 text-center py-4">
            Hôm nay chưa có hoạt động bán/nhập.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {products.map((p) => (
              <ProductProgress key={p.product_id} product={p} />
            ))}
          </div>
        )}

        {/* AI hint */}
        {hint && (
          <div className="mt-3.5 p-2.5 bg-blue-50 rounded-md flex gap-2 items-start">
            <span className="text-blue-600 text-base leading-none mt-0.5">💡</span>
            <div className="text-[12px] text-blue-700 leading-relaxed">{hint.message}</div>
          </div>
        )}

        {/* Điều hướng tới trang "Đơn đang đến" — màn farm xem buổi sáng để biết
            cần chuẩn bị bao nhiêu rau giao cho Vietponics hôm nay. Dùng nền
            primary đậm cho nổi bật hơn các nút phụ. */}
        <Link
          to="/farm/orders"
          className="mt-4 w-full flex items-center justify-between gap-2 p-3 bg-primary rounded-xl active:bg-primary/90"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-base leading-none">
              📦
            </span>
            <div>
              <div className="text-[13px] font-medium text-white">
                Đơn đang đến
              </div>
              <div className="text-[11px] text-white/80">
                Xem cần chuẩn bị & giao gì hôm nay
              </div>
            </div>
          </div>
          <span className="text-white text-lg leading-none">›</span>
        </Link>

        {/* Điều hướng tới trang phân tích chi tiết */}
        <Link
          to="/farm/analytics"
          className="mt-4 w-full flex items-center justify-between gap-2 p-3 bg-primary/5 border border-primary/15 rounded-xl active:bg-primary/10"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-base leading-none">
              📈
            </span>
            <div>
              <div className="text-[13px] font-medium text-gray-900">
                Phân tích & xu hướng
              </div>
              <div className="text-[11px] text-gray-500">
                Doanh thu 7/30/90 ngày · top sản phẩm
              </div>
            </div>
          </div>
          <span className="text-primary text-lg leading-none">›</span>
        </Link>

        {/* Điều hướng tới trang Payouts (Công nợ & Thanh toán) — màn nhạy cảm
            về tiền nên dùng nền xanh nhạt nổi bật, tách khỏi nhóm nút phụ. */}
        <Link
          to="/farm/payouts"
          className="mt-4 w-full flex items-center justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded-xl active:bg-green-100"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-base leading-none">
              💰
            </span>
            <div>
              <div className="text-[13px] font-medium text-green-900">
                Công nợ & Thanh toán
              </div>
              <div className="text-[11px] text-green-700/80">
                Tiền đang tích lũy · lịch sử thanh toán
              </div>
            </div>
          </div>
          <span className="text-green-700 text-lg leading-none">›</span>
        </Link>

        {/* Errors */}
        {(profile.error || overview.error || productsToday.error) && (
          <div className="mt-3 p-2 bg-red-50 rounded text-[11px] text-red-700">
            {profile.error || overview.error || productsToday.error}
          </div>
        )}
      </div>
    </div>
  );
}
