import { useEffect, useMemo, useState } from "react";
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
// HUB-01: 2 chỉ số tách basis. Mặc định "placed" (đã đặt) — đúng tinh thần use
// case: owner đối chiếu đơn vừa tạo trong ngày.
type DashboardBasis = "placed" | "delivered";

export default function FarmDashboardPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();
  const [basis, setBasis] = useState<DashboardBasis>("placed");

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
  // Card + list LUÔN cùng basis (không trộn): cả 2 đọc theo tab đang chọn.
  const metrics = ov ? ov[basis] : null;
  const products =
    (basis === "placed"
      ? productsToday.data?.products_placed
      : productsToday.data?.products_delivered) ?? [];
  const hint = productsToday.data?.hint ?? null;

  // Nhãn động theo tab.
  const isPlaced = basis === "placed";
  const ordersSubtitle = metrics
    ? `${metrics.orders_count} ${isPlaced ? "đơn đã đặt" : "đơn đã giao"}`
    : undefined;

  // Format số tiền VND ngắn gọn — không kèm "đ" (chèn ngoài JSX).
  const fmtMoney = (n: number) => Math.round(n).toLocaleString("vi-VN");

  return (
    <div className="flex flex-col min-h-full bg-gray-100">
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

        {/* HUB-01: tab tách basis "Đã đặt" / "Đã giao". Đổi tab → cả card lẫn
            list "Sản phẩm hôm nay" đổi đồng bộ theo cùng basis. */}
        <div className="flex gap-1.5 mt-3 p-0.5 bg-gray-100 rounded-md">
          {([
            ["placed", "Đã đặt hôm nay"],
            ["delivered", "Đã giao hôm nay"],
          ] as [DashboardBasis, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setBasis(key)}
              className={`flex-1 text-[12px] py-1.5 rounded transition-colors ${
                basis === key
                  ? "bg-white font-medium text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 2x2 Metric grid — đọc theo basis đang chọn */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <StatCard
            label={isPlaced ? "Doanh thu (đã đặt)" : "Doanh thu (đã giao)"}
            value={metrics ? `${fmtMoney(metrics.revenue)}đ` : "—"}
            subtitle={ordersSubtitle}
            tone="success"
          />
          <StatCard
            label={isPlaced ? "Đã đặt hôm nay" : "Đã giao hôm nay"}
            value={metrics ? `${metrics.items_sold}` : "—"}
            subtitle="kg/đơn vị"
            tone="muted"
          />
          <StatCard
            label="Lợi nhuận"
            value={metrics ? `${fmtMoney(metrics.profit)}đ` : "—"}
            subtitle={metrics && metrics.revenue > 0 ? `${Math.round((metrics.profit / metrics.revenue) * 100)}% biên` : undefined}
            tone={metrics && metrics.profit >= 0 ? "success" : "danger"}
          />
          <StatCard
            label="AOV"
            value={metrics ? `${fmtMoney(metrics.avg_order_value)}đ` : "—"}
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
            {isPlaced
              ? "Hôm nay chưa có đơn đặt."
              : "Hôm nay chưa có đơn giao."}
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
