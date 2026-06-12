import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { request } from "@/utils/request";
import {
  useFarmBatches,
  formatYmdDisplay,
  daysUntil,
} from "@/utils/farm-api";
import { StockMovement, InventoryBatch } from "@/types";
import MovementItem from "./movement-item";

interface MovementsResponse {
  error: boolean;
  product: { id: number; name: string };
  data: { data: StockMovement[] };
}

type Tab = "movements" | "batches";

export default function FarmMovementsPage() {
  const { id } = useParams<{ id: string }>();
  const productId = id ? Number(id) : null;
  const [tab, setTab] = useState<Tab>("movements");

  const [productName, setProductName] = useState("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lô hàng: poll qua usePolling (chỉ fetch khi tab batches đang mở).
  const {
    data: batches,
    loading: batchesLoading,
    error: batchesError,
  } = useFarmBatches(productId, tab === "batches");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        setError("Chưa đăng nhập.");
        setLoading(false);
        return;
      }
      try {
        const res = await request<MovementsResponse>(`/farm/inventory/${id}/movements`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setProductName(res.product?.name ?? "");
          setMovements(res.data?.data ?? []);
        }
      } catch {
        if (!cancelled) setError("Không thể tải lịch sử biến động.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="flex flex-col h-full">
      {productName && (
        <div className="px-4 py-3 bg-white border-b">
          <p className="font-semibold text-gray-800">{productName}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100">
        <TabButton active={tab === "movements"} onClick={() => setTab("movements")}>
          Biến động
        </TabButton>
        <TabButton active={tab === "batches"} onClick={() => setTab("batches")}>
          Lô hàng
        </TabButton>
      </div>

      <div className="flex-1 overflow-auto bg-white px-4">
        {tab === "movements" ? (
          loading ? (
            <p className="text-center text-gray-400 text-sm py-10">Đang tải...</p>
          ) : error ? (
            <p className="text-center text-red-500 text-sm py-10">{error}</p>
          ) : movements.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">
              Chưa có biến động nào.
            </p>
          ) : (
            movements.map((m) => <MovementItem key={m.id} movement={m} />)
          )
        ) : batchesLoading && !batches ? (
          <p className="text-center text-gray-400 text-sm py-10">Đang tải lô hàng...</p>
        ) : batchesError ? (
          <p className="text-center text-red-500 text-sm py-10">{batchesError}</p>
        ) : !batches || batches.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">
            Chưa có lô hàng còn tồn.
          </p>
        ) : (
          <div className="py-2 flex flex-col gap-2">
            {batches.map((b) => (
              <BatchRow key={b.id} batch={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function TabButton({
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
      className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? "text-green-600 border-green-600" : "text-gray-500 border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function BatchRow({ batch }: { batch: InventoryBatch }) {
  // Cảnh báo hạn: <0 đã hết hạn (đỏ), 0..6 sắp hết hạn (cam), còn lại bình thường.
  const exp = batch.expire_date;
  const days = exp ? daysUntil(exp) : NaN;
  const expired = !isNaN(days) && days < 0;
  const soon = !isNaN(days) && days >= 0 && days < 7;

  const cardTone = expired
    ? "border-red-300 bg-red-50"
    : soon
    ? "border-orange-300 bg-orange-50"
    : "border-gray-200 bg-white";

  return (
    <div className={`p-3 rounded-xl border ${cardTone}`}>
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400 font-mono leading-none">
            Lô #{batch.id}
          </p>
          <p className="text-[12px] text-gray-500 mt-1">
            Ngày nhập:{" "}
            <span className="text-gray-700 font-medium">
              {batch.batch_date ? formatYmdDisplay(batch.batch_date) : "—"}
            </span>
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Hạn dùng:{" "}
            <span className="text-gray-700 font-medium">
              {exp ? formatYmdDisplay(exp) : "Không hạn"}
            </span>
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-base text-gray-800">
            {batch.quantity_remaining}
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">
            Nhập: {batch.quantity_in}
          </p>
        </div>
      </div>

      {(expired || soon) && (
        <p
          className={`mt-2 inline-flex items-center gap-1 text-[11px] font-medium rounded px-1.5 py-0.5 ${
            expired ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
          }`}
        >
          {expired ? "⚠️ Đã hết hạn" : `⏳ Sắp hết hạn · còn ${days} ngày`}
        </p>
      )}
    </div>
  );
}
