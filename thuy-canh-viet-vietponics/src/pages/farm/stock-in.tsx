import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useStockInSuggestions } from "@/hooks";
import { request } from "@/utils/request";
import { StockInSuggestion } from "@/types";

// Mỗi dòng trong khai báo: số lượng nhập (kg) cho một SKU.
interface DeclLine {
  product_id: number;
  quantity: number;
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} · ${WEEKDAYS[d.getDay()]}`;
}

// "23/05 · 5 ngày" — hạn dùng tươi.
function formatExpiry(iso: string, todayIso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date(todayIso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const days = Math.max(0, Math.round((d.getTime() - today.getTime()) / 86400000));
  return `${dd}/${mm} · ${days} ngày`;
}

const fmtVnd = (n: number) => n.toLocaleString("vi-VN");

export default function StockInDeclaration() {
  const navigate = useNavigate();
  const { items, meta, loading, error, refresh } = useStockInSuggestions();

  // Số lượng nhập theo product_id. Mặc định chỉ thêm dòng khi user chạm vào.
  const [lines, setLines] = useState<Record<number, number>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const byId = useMemo(() => {
    const m: Record<number, StockInSuggestion> = {};
    items.forEach((it) => (m[it.product_id] = it));
    return m;
  }, [items]);

  // Dòng đang khai báo: ưu tiên SKU cháy hàng & có gợi ý > 0 hiển thị sẵn.
  const activeIds = useMemo(() => {
    const explicit = Object.keys(lines).map(Number);
    const auto = items
      .filter((it) => it.sold_out_yesterday || it.suggested_qty > 0)
      .map((it) => it.product_id);
    return Array.from(new Set([...auto, ...explicit]));
  }, [items, lines]);

  const qtyOf = (id: number) => lines[id] ?? byId[id]?.suggested_qty ?? 0;

  const setQty = (id: number, q: number) =>
    setLines((prev) => ({ ...prev, [id]: Math.max(0, q) }));

  const removeLine = (id: number) =>
    setLines((prev) => ({ ...prev, [id]: 0 }));

  // Dòng có số lượng > 0 mới được gửi.
  const payloadLines: DeclLine[] = useMemo(
    () =>
      activeIds
        .map((id) => ({ product_id: id, quantity: qtyOf(id) }))
        .filter((l) => l.quantity > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIds, lines, byId]
  );

  const totalKg = payloadLines.reduce((s, l) => s + l.quantity, 0);
  const projectedRevenue = payloadLines.reduce(
    (s, l) => s + l.quantity * (byId[l.product_id]?.price ?? 0),
    0
  );

  // SKU chưa nằm trong khai báo — để chọn thêm.
  const pickableItems = items.filter((it) => !activeIds.includes(it.product_id));

  const handleSubmit = async () => {
    if (payloadLines.length === 0) {
      toast.error("Vui lòng nhập số lượng cho ít nhất một sản phẩm.");
      return;
    }
    const token = localStorage.getItem("jwt_token");
    if (!token) return;

    setSubmitting(true);
    try {
      await request("/farm/stock-in/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: payloadLines }),
      });
      toast.success("Gửi khai báo nhập kho thành công!");
      setLines({});
      refresh();
    } catch (e: any) {
      const msg = e?.body ? JSON.parse(e.body)?.message : null;
      toast.error(msg || "Gửi khai báo thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const todayIso = meta?.date ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100">
        <button onClick={() => navigate(-1)} aria-label="Quay lại" className="text-gray-600">
          ←
        </button>
        <h1 className="font-medium text-[15px] flex-1">Khai báo nhập kho</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-32">
        {/* Suggestion banner */}
        {meta && meta.suggested_total > 0 && (
          <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg mb-3">
            <span className="text-blue-500 text-sm leading-none mt-0.5">💡</span>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Dựa trên {meta.window_days} ngày qua, hôm nay nên nhập khoảng{" "}
              <span className="font-medium">{fmtVnd(meta.suggested_total)}kg</span>
            </p>
          </div>
        )}

        {/* Date row */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-[13px] font-medium">Ngày nhập</span>
          <span className="text-xs text-gray-500">{formatDate(todayIso)}</span>
        </div>

        <p className="text-[13px] font-medium mb-2">Sản phẩm nhập hôm nay</p>

        {loading && items.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Đang tải gợi ý nhập kho...
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 text-sm">
            {error}
            <button onClick={refresh} className="ml-2 text-blue-600 underline">
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Farm chưa được gán sản phẩm nào.
          </div>
        ) : (
          <>
            {/* Declaration cards */}
            <div className="flex flex-col gap-2">
              {activeIds.map((id) => {
                const it = byId[id];
                if (!it) return null;
                return (
                  <DeclCard
                    key={id}
                    item={it}
                    quantity={qtyOf(id)}
                    todayIso={todayIso}
                    onChange={(q) => setQty(id, q)}
                    onRemove={() => removeLine(id)}
                  />
                );
              })}
            </div>

            {/* Add product */}
            {pickableItems.length > 0 && (
              <button
                onClick={() => setShowPicker((v) => !v)}
                className="w-full mt-2.5 p-2.5 border border-dashed border-gray-300 rounded-lg flex items-center gap-2 text-gray-500 text-xs active:bg-gray-50"
              >
                <span className="text-base leading-none">＋</span>
                Thêm sản phẩm khác
              </button>
            )}

            {showPicker && pickableItems.length > 0 && (
              <div className="mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
                {pickableItems.map((it) => (
                  <button
                    key={it.product_id}
                    onClick={() => {
                      setQty(it.product_id, it.suggested_qty || 1);
                      setShowPicker(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 last:border-b-0 active:bg-gray-50 flex justify-between items-center"
                  >
                    <span className="truncate">{it.name}</span>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      tồn {fmtVnd(it.stock)}kg
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="mt-3.5 p-3 bg-gray-100 rounded-lg">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Tổng nhập</span>
                <span className="font-medium">
                  {fmtVnd(totalKg)}kg · {payloadLines.length} sản phẩm
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">Dự kiến doanh thu</span>
                <span className="font-medium text-green-600">
                  ~{fmtVnd(Math.round(projectedRevenue))}đ
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={submitting || payloadLines.length === 0}
          className="w-full py-3 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {submitting ? "Đang gửi..." : "Gửi khai báo"}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function DeclCard({
  item,
  quantity,
  todayIso,
  onChange,
  onRemove,
}: {
  item: StockInSuggestion;
  quantity: number;
  todayIso: string;
  onChange: (q: number) => void;
  onRemove: () => void;
}) {
  const danger = item.sold_out_yesterday;

  return (
    <div
      className={`p-3 rounded-lg border ${
        danger ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <span
          className={`text-[13px] font-medium ${danger ? "text-red-800" : ""}`}
        >
          {item.name}
        </span>
        <button
          onClick={onRemove}
          aria-label="Bỏ sản phẩm"
          className={`text-sm ${danger ? "text-red-500" : "text-gray-300"}`}
        >
          ✕
        </button>
      </div>

      {danger ? (
        <p className="text-[11px] text-red-600 mb-2">
          Hôm qua cháy hàng! Nên nhập thêm
        </p>
      ) : (
        <p className="text-[11px] text-gray-500 mb-2">
          TB {item.window_days} ngày: {item.avg_daily_sold}kg/ngày · Giá:{" "}
          {fmtVnd(item.price)}đ/kg
        </p>
      )}

      {/* Stepper */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
          <button
            onClick={() => onChange(quantity - 1)}
            className="px-3 py-2 bg-gray-50 text-gray-500 text-sm active:bg-gray-100"
            aria-label="Giảm"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange(isNaN(v) ? 0 : v);
            }}
            className="flex-1 min-w-0 text-center text-sm font-medium py-2 outline-none"
          />
          <button
            onClick={() => onChange(quantity + 1)}
            className="px-3 py-2 bg-gray-50 text-gray-500 text-sm active:bg-gray-100"
            aria-label="Tăng"
          >
            +
          </button>
        </div>
        <span className="text-xs text-gray-500 w-6">kg</span>
      </div>

      {!danger && (
        <div className="mt-2 flex justify-between text-[11px] text-gray-500">
          <span>Hạn sử dụng (tươi)</span>
          <span className="font-medium">
            {formatExpiry(item.suggested_expire_date, todayIso)}
          </span>
        </div>
      )}
    </div>
  );
}
