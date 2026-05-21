import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { categoriesStateUpwrapped } from "@/state";
import { useFarmInventory } from "@/hooks";
import {
  InventoryProduct,
  InventoryStockStatus,
  InventorySort,
} from "@/types";
import ImportSheet from "./import-sheet";
import ExportSheet from "./export-sheet";

const STATUS_TABS: { key: InventoryStockStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "in_stock", label: "Còn hàng" },
  { key: "low", label: "Sắp hết" },
  { key: "out", label: "Hết hàng" },
];

const SORT_OPTIONS: { key: InventorySort; label: string }[] = [
  { key: "name", label: "Tên A → Z" },
  { key: "low_first", label: "Sắp hết trước" },
  { key: "stock_asc", label: "Tồn ít nhất" },
  { key: "stock_desc", label: "Tồn nhiều nhất" },
];

export default function InventoryList() {
  const navigate = useNavigate();
  const categories = useAtomValue(categoriesStateUpwrapped);
  const {
    items,
    stats,
    filters,
    loading,
    loadingMore,
    hasMore,
    error,
    setFilters,
    loadMore,
    refresh,
  } = useFarmInventory();

  const [importTarget, setImportTarget] = useState<InventoryProduct | null>(null);
  const [exportTarget, setExportTarget] = useState<InventoryProduct | null>(null);
  const [showSort, setShowSort] = useState(false);

  const handleSuccess = () => {
    setImportTarget(null);
    setExportTarget(null);
    refresh();
  };

  // ── Infinite scroll sentinel ──────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── Pull-to-refresh (touch-based) ─────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const PULL_THRESHOLD = 70;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0 && !refreshing) {
        pullStartY.current = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pullStartY.current === null) return;
      const delta = e.touches[0].clientY - pullStartY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.5, PULL_THRESHOLD * 1.5));
      }
    };
    const onTouchEnd = () => {
      if (pullDistance >= PULL_THRESHOLD && !refreshing) {
        setRefreshing(true);
        refresh();
      }
      pullStartY.current = null;
      setPullDistance(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing, refresh]);

  // Clear refreshing flag once loading completes.
  useEffect(() => {
    if (refreshing && !loading) setRefreshing(false);
  }, [loading, refreshing]);

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center text-xs text-gray-500"
            style={{
              height: refreshing ? PULL_THRESHOLD : pullDistance,
              transition: refreshing ? "height 0.2s" : "none",
            }}
          >
            {refreshing
              ? "Đang tải..."
              : pullDistance >= PULL_THRESHOLD
              ? "Thả để làm mới"
              : "Kéo để làm mới"}
          </div>
        )}

        {/* Stats card */}
        <div className="px-4 pt-3 pb-2 bg-gray-50">
          <div className="grid grid-cols-4 gap-2">
            <StatTile
              label="Tổng SP"
              value={stats?.total_products ?? 0}
              tone="default"
            />
            <StatTile
              label="Sắp hết"
              value={stats?.low_stock_count ?? 0}
              tone="warning"
            />
            <StatTile
              label="Hết hàng"
              value={stats?.out_of_stock_count ?? 0}
              tone="danger"
            />
            <StatTile
              label="Tổng tồn"
              value={stats?.total_stock ?? 0}
              tone="success"
            />
          </div>
        </div>

        {/* Sticky filter bar */}
        <div className="sticky top-0 z-10 bg-gray-50 pb-2">
          {/* Search + sort */}
          <div className="px-4 pt-1 pb-2 flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                type="search"
                value={filters.q}
                onChange={(e) => setFilters({ q: e.target.value })}
                placeholder="Tìm tên sản phẩm..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                🔍
              </span>
            </div>
            <button
              onClick={() => setShowSort((v) => !v)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 active:bg-gray-100 whitespace-nowrap"
            >
              ⇅ Sắp xếp
            </button>
          </div>

          {/* Sort dropdown */}
          {showSort && (
            <div className="px-4 pb-2">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setFilters({ sort: opt.key });
                      setShowSort(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 last:border-b-0 active:bg-gray-50 ${
                      filters.sort === opt.key
                        ? "text-green-600 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {filters.sort === opt.key ? "✓ " : ""}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category chips */}
          <div className="overflow-x-auto px-4 pb-2 no-scrollbar">
            <div className="flex gap-2">
              <Chip
                active={filters.category_id === "all"}
                onClick={() => setFilters({ category_id: "all" })}
              >
                Tất cả danh mục
              </Chip>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  active={filters.category_id === c.id}
                  onClick={() => setFilters({ category_id: c.id })}
                >
                  {c.name}
                </Chip>
              ))}
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex bg-white border-y border-gray-100">
            {STATUS_TABS.map((tab) => {
              const active = filters.stock_status === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilters({ stock_status: tab.key })}
                  className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    active
                      ? "text-green-600 border-green-600"
                      : "text-gray-500 border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List body */}
        {error ? (
          <div className="p-4 text-center text-red-500 text-sm">
            {error}
            <button
              onClick={refresh}
              className="ml-2 text-blue-600 underline"
            >
              Thử lại
            </button>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-400 text-sm">Đang tải tồn kho...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Không tìm thấy sản phẩm nào.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 bg-white">
            {items.map((p) => (
              <InventoryItem
                key={p.id}
                product={p}
                onImport={() => setImportTarget(p)}
                onExport={() => setExportTarget(p)}
                onHistory={() => navigate(`/farm/movements/${p.id}`)}
              />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="py-4 text-center text-gray-400 text-xs">
                Đang tải thêm...
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <div className="py-4 text-center text-gray-300 text-xs">
                — Hết danh sách —
              </div>
            )}
          </div>
        )}
      </div>

      <ImportSheet
        product={importTarget}
        onClose={() => setImportTarget(null)}
        onSuccess={handleSuccess}
      />
      <ExportSheet
        product={exportTarget}
        onClose={() => setExportTarget(null)}
        onSuccess={handleSuccess}
      />
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "warning" | "danger" | "success";
}) {
  const toneClass = {
    default: "text-gray-800",
    warning: "text-orange-500",
    danger: "text-red-500",
    success: "text-green-600",
  }[tone];

  return (
    <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
      <p className={`text-base font-semibold leading-tight ${toneClass}`}>
        {value.toLocaleString("vi-VN")}
      </p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full border transition-colors ${
        active
          ? "bg-green-600 text-white border-green-600"
          : "bg-white text-gray-700 border-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function InventoryItem({
  product,
  onImport,
  onExport,
  onHistory,
}: {
  product: InventoryProduct;
  onImport: () => void;
  onExport: () => void;
  onHistory: () => void;
}) {
  const stockTone = product.is_out_of_stock
    ? "text-red-500"
    : product.is_low_stock
    ? "text-orange-500"
    : "text-gray-800";

  return (
    <div className="bg-white px-4 py-3">
      <div className="flex gap-3 mb-2.5">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-14 h-14 rounded-lg object-cover bg-gray-100 flex-shrink-0"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.visibility = "hidden";
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 font-mono leading-none">
            #{product.id}
          </p>
          <p className="font-medium text-sm text-gray-800 leading-snug line-clamp-2 mt-0.5">
            {product.name}
          </p>
          {product.category && (
            <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            {product.is_out_of_stock ? (
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                Hết hàng
              </span>
            ) : product.is_low_stock ? (
              <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">
                Sắp hết
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-semibold text-base ${stockTone}`}>
            {product.stock_available}
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">
            Tổng: {product.stock}
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">
            Giữ: {product.stock_reserved}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onImport}
          className="flex-1 text-sm py-2 rounded-lg bg-green-50 text-green-700 font-medium border border-green-200 active:bg-green-100"
        >
          + Nhập kho
        </button>
        <button
          onClick={onExport}
          disabled={product.stock_available <= 0}
          className="flex-1 text-sm py-2 rounded-lg bg-red-50 text-red-600 font-medium border border-red-200 active:bg-red-100 disabled:opacity-40 disabled:active:bg-red-50"
        >
          − Xuất kho
        </button>
        <button
          onClick={onHistory}
          className="px-3 text-sm py-2 rounded-lg bg-gray-50 text-gray-600 font-medium border border-gray-200 active:bg-gray-100"
          aria-label="Lịch sử"
        >
          Lịch sử
        </button>
      </div>
    </div>
  );
}
